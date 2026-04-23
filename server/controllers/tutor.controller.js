const mongoose = require('mongoose');
const TutorProfile = require('../models/TutorProfile');
const User = require('../models/User');
const { recordTutorSearchAppearances } = require('../utils/tutorSearchAnalytics');
const { createNotification } = require('../utils/notificationHelper');
const Favorite = require('../models/Favorite');
const Booking = require('../models/Booking');
const jwt = require('jsonwebtoken');
const { computeProfileCompletion, validateStructuredFields } = require('../services/profileCompletion.service');
const { BIO_MIN_LENGTH } = require('../constants/tutorProfile.constants');
const { safe500, sendError } = require('../utils/responseHelpers');

const tutorListCache = new Map();
const TUTOR_CACHE_TTL = 2 * 60 * 1000;

function getTutorCacheKey(query) {
    return JSON.stringify(query);
}

function invalidateTutorCache() {
    tutorListCache.clear();
}

// @desc    Get all tutors with filters (approved only in production; all in dev or when ?all=true)
// @route   GET /api/tutors
// @access  Public
const getTutors = async (req, res) => {
    try {
        const { subject, class: studentClass, area, minRate, maxRate, mode, minExperience, minRating, verifiedOnly, limit, all } = req.query;

        const page = parseInt(req.query.page, 10);
        const pageSize = parseInt(req.query.limit, 10);
        const useOffsetPagination =
            Number.isFinite(page) && page > 0 && Number.isFinite(pageSize) && pageSize > 0 && pageSize <= 60;
        // `limit` alone (no page) = legacy cap on DB rows; with `page`+`limit`, limit is page size — slice later.
        const legacyDbLimitOnly = Boolean(limit) && !useOffsetPagination;

        // Tutor not visible until profileStatus === 'approved'. Fallback to approvalStatus for legacy records.
        const showAllTutors = process.env.NODE_ENV !== 'production' || all === 'true';
        let query = showAllTutors ? {} : {
            $or: [
                { profileStatus: 'approved' },
                { approvalStatus: 'approved', $or: [{ profileStatus: { $exists: false } }, { profileStatus: null }] }
            ]
        };

        // Filter by subject
        if (subject) {
            query.subjects = { $in: [new RegExp(subject, 'i')] };
        }

        // Filter by class
        if (studentClass) {
            query.classes = { $in: [new RegExp(studentClass, 'i')] };
        }

        // Filter by rate
        if (minRate || maxRate) {
            query.hourlyRate = {};
            if (minRate) query.hourlyRate.$gte = Number(minRate);
            if (maxRate) query.hourlyRate.$lte = Number(maxRate);
        }

        // Filter by mode (online / home / both)
        if (mode && mode !== 'all') {
            query.mode = mode;
        }

        // Filter by minimum experience
        if (minExperience) {
            query.experienceYears = { $gte: Number(minExperience) };
        }

        // Hide tutors currently on active vacation (unless they explicitly opt in to show via ?includeOnVacation)
        if (req.query.includeOnVacation !== 'true') {
            query['vacation.active'] = { $ne: true };
        }

        // Find tutors matching profile criteria
        let tutorsQuery = TutorProfile.find(query).populate('userId', 'name email phone location isActive lastSeenAt timezone');

        if (legacyDbLimitOnly) {
            tutorsQuery = tutorsQuery.limit(parseInt(limit, 10));
        }

        let studentUser = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                if (decoded.typ !== 'refresh') {
                    studentUser = await User.findById(decoded.id).select('role');
                }
            } catch {
                studentUser = null;
            }
        }

        if (!studentUser) {
            res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=60');
            const cacheKey = getTutorCacheKey(req.query);
            const cached = tutorListCache.get(cacheKey);
            if (cached && Date.now() - cached.ts < TUTOR_CACHE_TTL) {
                return res.json(cached.data);
            }
        }

        let tutors = await tutorsQuery;

        // Filter by area (which is in the User model)
        if (area) {
            tutors = tutors.filter(tutor =>
                tutor.userId &&
                tutor.userId.location &&
                tutor.userId.location.area &&
                tutor.userId.location.area.toLowerCase().includes(area.toLowerCase())
            );
        }

        // Filter by isActive
        tutors = tutors.filter(tutor => tutor.userId && tutor.userId.isActive);

        await recordTutorSearchAppearances(tutors);

        // Add rating information to response
        let tutorsWithRating = tutors.map(tutor => ({
            ...tutor.toObject(),
            averageRating: tutor.averageRating || 0,
            reviewCount: tutor.totalReviews || 0
        }));

        // Filter by minimum rating (post-join)
        if (minRating) {
            tutorsWithRating = tutorsWithRating.filter(t => t.averageRating >= Number(minRating));
        }

        if (studentUser?.role === 'student' && tutorsWithRating.length > 0) {
            const tutorUserIds = tutorsWithRating
                .map(t => t.userId?._id?.toString())
                .filter(Boolean);

            const [favoriteRows, trialRows, activeBookingTutorIds] = await Promise.all([
                Favorite.find({
                    studentId: studentUser._id,
                    tutorId: { $in: tutorUserIds }
                }).select('tutorId'),
                Booking.find({
                    studentId: studentUser._id,
                    tutorId: { $in: tutorUserIds },
                    bookingCategory: 'trial'
                })
                    .select('tutorId status subject preferredSchedule createdAt')
                    .sort({ createdAt: -1 }),
                Booking.find({
                    studentId: studentUser._id,
                    tutorId: { $in: tutorUserIds },
                    status: { $in: ['pending', 'approved'] }
                }).distinct('tutorId')
            ]);

            const favoritedTutorIds = new Set(
                favoriteRows.map(row => row.tutorId.toString())
            );
            const hasActiveBookingSet = new Set(
                activeBookingTutorIds.map(id => id.toString())
            );

            const trialSummaryByTutorId = {};
            for (const trial of trialRows) {
                const tutorId = trial.tutorId.toString();
                if (!trialSummaryByTutorId[tutorId]) {
                    trialSummaryByTutorId[tutorId] = {
                        status: trial.status,
                        count: 1,
                        maxReached: false,
                        hasTriedTutor: true,
                        latestTrial: {
                            _id: trial._id,
                            status: trial.status,
                            subject: trial.subject,
                            preferredSchedule: trial.preferredSchedule,
                            createdAt: trial.createdAt
                        }
                    };
                } else {
                    trialSummaryByTutorId[tutorId].count += 1;
                }
            }

            Object.values(trialSummaryByTutorId).forEach(summary => {
                summary.maxReached = summary.count >= 2;
            });

            tutorsWithRating = tutorsWithRating.map(tutor => {
                const tutorUserId = tutor.userId?._id?.toString();
                const trialStatus = tutorUserId && trialSummaryByTutorId[tutorUserId]
                    ? trialSummaryByTutorId[tutorUserId]
                    : { status: null, count: 0, maxReached: false, hasTriedTutor: false };

                return {
                    ...tutor,
                    isFavorited: tutorUserId ? favoritedTutorIds.has(tutorUserId) : false,
                    trialStatus,
                    hasActiveBooking: tutorUserId ? hasActiveBookingSet.has(tutorUserId) : false
                };
            });
        } else {
            tutorsWithRating = tutorsWithRating.map(tutor => ({
                ...tutor,
                isFavorited: false,
                trialStatus: { status: null, count: 0, maxReached: false, hasTriedTutor: false },
                hasActiveBooking: false
            }));
        }

        let payload;
        if (useOffsetPagination) {
            const total = tutorsWithRating.length;
            const start = (page - 1) * pageSize;
            const slice = tutorsWithRating.slice(start, start + pageSize);
            payload = {
                success: true,
                tutors: slice,
                pagination: {
                    page,
                    limit: pageSize,
                    total,
                    pages: Math.max(1, Math.ceil(total / pageSize))
                }
            };
        } else {
            payload = tutorsWithRating;
        }

        if (!studentUser) {
            const cacheKey = getTutorCacheKey(req.query);
            tutorListCache.set(cacheKey, { data: payload, ts: Date.now() });
        }

        return res.json(payload);
    } catch (error) {
        return safe500(res, error, '[getTutors]');
    }
};

// @desc    Get tutor availability by user ID (for booking calendar)
// @route   GET /api/tutors/profile-by-user/:userId
// @access  Private (student) or Public
const getTutorProfileByUserId = async (req, res) => {
    try {
        const profile = await TutorProfile.findOne({ userId: req.params.userId })
            .select('weeklyAvailability availableSlots subjects classes hourlyRate approvalStatus')
            .populate('userId', 'name');
        if (!profile) return sendError(res, 404, 'Tutor profile not found', 'NOT_FOUND');
        res.json(profile);
    } catch (error) {
        return safe500(res, error, '[getTutorProfileByUserId]');
    }
};

// @desc    Get tutor profile by ID. Tutor response includes trialBookings, sessionBookings, permanentBookings when requester is an authenticated student.
// @route   GET /api/tutors/:id
// @access  Public
const getTutorById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid id' });
        }
        // Accept either TutorProfile._id (common) OR User._id (defensive fallback)
        // so links that pass a user id — e.g. from relationships or messages — don't 404.
        let tutor = await TutorProfile.findById(id).populate('userId', 'name email phone location lastSeenAt timezone');
        if (!tutor) {
            tutor = await TutorProfile.findOne({ userId: id }).populate('userId', 'name email phone location lastSeenAt timezone');
        }
        if (!tutor) {
            return res.status(404).json({ message: 'Tutor not found' });
        }

        const tutorUserId = tutor.userId?._id || tutor.userId;
        let trialBookings = [];
        let sessionBookings = [];
        let permanentBookings = [];

        if (req.user?.role === 'student' && tutorUserId) {
            const bookings = await Booking.find({
                studentId: req.user.id,
                tutorId: tutorUserId
            })
                .populate('studentId', 'name email')
                .populate('tutorId', 'name email')
                .sort({ createdAt: -1 })
                .lean();
            trialBookings = bookings.filter(b => b.bookingCategory === 'trial');
            sessionBookings = bookings.filter(b => b.bookingCategory === 'session');
            permanentBookings = bookings.filter(b => b.bookingCategory === 'permanent' || b.bookingCategory === 'dedicated');
        }

        res.json({
            ...tutor.toObject(),
            trialBookings,
            sessionBookings,
            permanentBookings
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get current tutor profile
// @route   GET /api/tutors/me
// @access  Private (Tutor only)
const getMyProfile = async (req, res) => {
    try {
        const tutor = await TutorProfile.findOne({ userId: req.user.id });

        if (!tutor) {
            return res.status(404).json({ message: 'Tutor profile not found' });
        }

        res.json(tutor);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Check if tutor profile is complete
// @route   GET /api/tutors/profile/complete
// @access  Private (Any authenticated user - role might not be set during onboarding)
const checkProfileComplete = async (req, res) => {
    try {
        console.log('Checking profile completeness for user:', req.user.id);
        const user = await User.findById(req.user.id);

        if (!user) {
            console.log('User not found:', req.user.id);
            return res.status(200).json({
                isComplete: false,
                missingFields: ['user'],
                message: 'User not found',
                profile: null
            });
        }

        console.log('User role:', user.role);

        // If user is not a tutor, they don't need tutor profile completion
        if (user.role !== 'tutor') {
            console.log('User is not a tutor, returning complete=true');
            return res.status(200).json({
                isComplete: true, // Students don't need tutor profile
                missingFields: [],
                message: 'User is not a tutor',
                profile: null
            });
        }

        const tutor = await TutorProfile.findOne({ userId: req.user.id });
        console.log('Tutor profile found:', !!tutor);

        if (!tutor) {
            return res.status(200).json({
                isComplete: false,
                missingFields: ['profile'],
                message: 'Tutor profile not found. Please complete your profile.',
                profile: null,
                profileCompletionScore: 0
            });
        }

        const { completionScore, errors, isValid } = computeProfileCompletion(tutor, user);
        const missingFields = errors.map(e => e.field);

        // If profile is already approved or pending, consider it complete to avoid redirect loop if score is high enough
        const status = tutor.profileStatus || tutor.approvalStatus;
        if (status === 'approved' || status === 'pending') {
            if (isValid || completionScore >= 80) {
                return res.status(200).json({
                    isComplete: true,
                    missingFields: [],
                    profile: tutor,
                    profileCompletionScore: completionScore
                });
            }
        }

        // Allow tutor into dashboard if they have basic info (phone, area) so they can complete the 5-step form there
        const hasBasicInfo = user?.phone?.trim() && user?.location?.area?.trim();
        if (hasBasicInfo) {
            return res.status(200).json({
                isComplete: true,
                missingFields: [],
                profile: tutor,
                profileCompletionScore: completionScore,
                errors: errors
            });
        }

        res.status(200).json({
            isComplete: false,
            missingFields,
            profile: tutor,
            profileCompletionScore: completionScore,
            errors: errors
        });
    } catch (error) {
        console.error('Error in checkProfileComplete:', error);
        // Always return 200 with incomplete status on error, never 404 or 500
        res.status(200).json({
            isComplete: false,
            missingFields: [],
            message: 'Error checking profile completeness',
            profile: null
        });
    }
};

// @desc    Update tutor profile
// @route   PUT /api/tutors/profile
// @access  Private (Tutor only)
// @desc    Update tutor profile
// @route   PUT /api/tutors/profile
// @access  Private (Tutor only)
const updateTutorProfile = async (req, res) => {
    try {
        const {
            subjects, classes, hourlyRate, experienceYears, bio, availableSlots, mode, languages,
            profilePicture, education, qualifications, strengthTags, travelRadius, availabilityMode,
            weeklyAvailability, noticePeriodHours, maxSessionsPerDay,
            phone, location, name, timezone
        } = req.body;

        const tutor = await TutorProfile.findOne({ userId: req.user.id });
        if (!tutor) {
            return res.status(404).json({ message: 'Tutor profile not found' });
        }

        // Validate structured fields (predefined lists only)
        const updatePayload = {
            subjects: Array.isArray(subjects) ? subjects : (subjects ? [subjects] : undefined),
            classes: Array.isArray(classes) ? classes : (classes ? [classes] : undefined),
            strengthTags: Array.isArray(strengthTags) ? strengthTags : (strengthTags ? [strengthTags] : undefined),
            qualifications: Array.isArray(qualifications) ? qualifications : (qualifications ? [qualifications] : undefined)
        };
        const structErrors = validateStructuredFields({
            ...tutor.toObject(),
            ...updatePayload,
            subjects: updatePayload.subjects || tutor.subjects,
            classes: updatePayload.classes || tutor.classes,
            strengthTags: updatePayload.strengthTags || tutor.strengthTags,
            qualifications: updatePayload.qualifications || tutor.qualifications
        });
        if (structErrors.length > 0) {
            return res.status(400).json({
                message: structErrors[0].message,
                code: 'VALIDATION_ERROR',
                errors: structErrors
            });
        }

        // Bio min length
        if (bio !== undefined && bio.trim && bio.trim().length > 0 && bio.trim().length < BIO_MIN_LENGTH) {
            return res.status(400).json({
                message: `Bio must be at least ${BIO_MIN_LENGTH} characters`,
                code: 'VALIDATION_ERROR'
            });
        }

        let requiresApproval = false;
        const wasApproved = tutor.approvalStatus === 'approved' || tutor.profileStatus === 'approved';

        if (wasApproved) {
            if (profilePicture !== undefined) {
                const user = await User.findById(req.user.id);
                if (user && user.profilePicture !== profilePicture) {
                    requiresApproval = true;
                    user.profilePicture = profilePicture;
                    await user.save();
                }
            }
            const arraysEqual = (a, b) => {
                if (!a || !b) return a === b;
                return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
            };
            if (subjects && !arraysEqual(tutor.subjects, Array.isArray(subjects) ? subjects : [subjects])) {
                requiresApproval = true;
            }
            if (classes && !arraysEqual(tutor.classes, Array.isArray(classes) ? classes : [classes])) {
                requiresApproval = true;
            }
        } else {
            if (profilePicture !== undefined) {
                const user = await User.findById(req.user.id);
                if (user) {
                    user.profilePicture = profilePicture;
                    await user.save();
                }
            }
        }

        // Apply updates
        if (subjects !== undefined) tutor.subjects = Array.isArray(subjects) ? subjects : (subjects ? [subjects] : tutor.subjects);
        if (classes !== undefined) tutor.classes = Array.isArray(classes) ? classes : (classes ? [classes] : tutor.classes);
        if (hourlyRate !== undefined) {
            const newRate = Number(hourlyRate);
            // Rate band enforcement per REVENUE_MODEL.md §2
            const { validateRate } = require('../constants/rateBands');
            const profileSnapshot = {
                classes: tutor.classes,
                subjects: tutor.subjects,
                strengthTags: tutor.strengthTags
            };
            const nextMode = (mode !== undefined ? mode : tutor.mode) || 'home';
            const verdict = validateRate({ hourlyRate: newRate, mode: nextMode, profile: profileSnapshot });
            if (!verdict.ok) {
                return res.status(400).json({
                    message: verdict.reason,
                    code: 'RATE_OUT_OF_BAND',
                    band: verdict.band,
                    floor: verdict.floor,
                    ceiling: verdict.ceiling
                });
            }
            tutor.hourlyRate = newRate;
        }
        if (experienceYears !== undefined) tutor.experienceYears = Number(experienceYears);
        if (bio !== undefined) tutor.bio = bio;
        if (availableSlots !== undefined) tutor.availableSlots = Array.isArray(availableSlots) ? availableSlots : availableSlots;
        if (mode !== undefined) tutor.mode = mode;
        if (languages !== undefined) tutor.languages = Array.isArray(languages) ? languages : (languages ? [languages] : tutor.languages);
        if (education !== undefined) tutor.education = education;
        if (qualifications !== undefined) tutor.qualifications = Array.isArray(qualifications) ? qualifications : (qualifications ? [qualifications] : []);
        if (strengthTags !== undefined) tutor.strengthTags = Array.isArray(strengthTags) ? strengthTags : (strengthTags ? [strengthTags] : []);
        if (travelRadius !== undefined) tutor.travelRadius = travelRadius === '' ? undefined : Number(travelRadius);
        if (availabilityMode !== undefined) tutor.availabilityMode = availabilityMode;
        if (Array.isArray(weeklyAvailability)) tutor.weeklyAvailability = weeklyAvailability;
        if (noticePeriodHours !== undefined) tutor.noticePeriodHours = noticePeriodHours === '' ? undefined : Number(noticePeriodHours);
        if (maxSessionsPerDay !== undefined) tutor.maxSessionsPerDay = maxSessionsPerDay === '' ? undefined : Number(maxSessionsPerDay);

        let user = await User.findById(req.user.id);
        if (user) {
            if (name !== undefined && typeof name === 'string' && name.trim()) {
                user.name = name.trim().slice(0, 120);
            }
            if (timezone !== undefined && typeof timezone === 'string' && timezone.trim()) {
                user.timezone = timezone.trim().slice(0, 80);
            }
            if (phone !== undefined) user.phone = phone;
            if (location && typeof location === 'object') {
                if (!user.location) user.location = { city: 'Hyderabad', area: '', pincode: '' };
                if (location.area !== undefined) user.location.area = location.area;
                if (location.pincode !== undefined) user.location.pincode = location.pincode;
                if (location.city !== undefined) user.location.city = location.city;
                user.markModified('location');
            }
            await user.save();
        }
        const { completionScore } = computeProfileCompletion(tutor, user);
        tutor.profileCompletionScore = completionScore;

        if (requiresApproval && wasApproved) {
            tutor.approvalStatus = 'pending';
            tutor.profileStatus = 'pending';
            await createNotification({
                userId: req.user.id,
                type: 'system_alert',
                title: 'Profile Under Review',
                message: 'Your profile changes require admin approval. Your profile will be hidden until approved.',
                link: '/tutor-dashboard'
            });
        }

        await tutor.save();
        invalidateTutorCache();

        res.json({
            ...tutor.toObject(),
            _requiresApproval: requiresApproval
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Submit profile for approval
// @route   PATCH /api/tutors/profile/submit
// @access  Private (Tutor only)
const submitForApproval = async (req, res) => {
    try {
        const tutor = await TutorProfile.findOne({ userId: req.user.id });
        if (!tutor) {
            return res.status(404).json({ message: 'Tutor profile not found' });
        }

        const user = await User.findById(req.user.id);
        const { isValid, errors } = computeProfileCompletion(tutor, user);
        if (!isValid) {
            return res.status(400).json({
                message: 'Complete all required fields before submitting.',
                code: 'INCOMPLETE_PROFILE',
                errors
            });
        }

        tutor.approvalStatus = 'pending';
        tutor.profileStatus = 'pending';
        tutor.rejectionReason = undefined;
        await tutor.save();

        await createNotification({
            userId: req.user.id,
            type: 'system_alert',
            title: 'Profile Submitted',
            message: 'Your profile has been submitted for approval.',
            link: '/tutor-dashboard'
        });

        res.json(tutor);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc  Get predefined options for profile form (subjects, classes, strength tags, etc.)
// @route GET /api/tutors/profile/options
// @access Public (or Private - tutor only if you prefer)
const getProfileOptions = async (req, res) => {
    try {
        const {
            SUBJECTS,
            CLASSES_GRADES,
            STRENGTH_TAGS,
            CERTIFICATIONS,
            TEACHING_MODES,
            NOTICE_PERIOD_OPTIONS,
            DAYS_OF_WEEK,
            LANGUAGES_TEACHING,
            BIO_MIN_LENGTH
        } = require('../constants/tutorProfile.constants');
        res.json({
            subjects: SUBJECTS,
            classes: CLASSES_GRADES,
            strengthTags: STRENGTH_TAGS,
            certifications: CERTIFICATIONS,
            teachingModes: TEACHING_MODES,
            noticePeriodOptions: NOTICE_PERIOD_OPTIONS,
            daysOfWeek: DAYS_OF_WEEK,
            languages: LANGUAGES_TEACHING,
            bioMinLength: BIO_MIN_LENGTH
        });
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc  Personalized tutor recommendations for logged-in student
// @route GET /api/tutors/recommendations
// @access Private (student)
const getRecommendations = async (req, res) => {
    try {
        const student = await User.findById(req.user.id).select('classGrade location');
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const { classGrade, location } = student;

        // Build a scored list of approved tutors
        const allTutors = await TutorProfile.find({ approvalStatus: 'approved' })
            .populate('userId', 'name email location')
            .lean();

        const Review = require('../models/Review');
        const reviews = await Review.aggregate([
            { $group: { _id: '$tutorId', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);
        const reviewMap = {};
        reviews.forEach(r => { reviewMap[r._id.toString()] = r; });

        const scored = allTutors.map(t => {
            let score = 0;
            // Class match
            if (classGrade && t.classes?.some(c => c.toLowerCase().includes(classGrade.toLowerCase().replace('class ', '').trim()))) score += 40;
            // Location match (city)
            const studentCity = location?.city?.toLowerCase();
            const tutorCity = t.userId?.location?.city?.toLowerCase() || '';
            if (studentCity && tutorCity && tutorCity === studentCity) score += 30;
            // Area match (closer = better)
            const studentArea = location?.area?.toLowerCase();
            const tutorArea = t.userId?.location?.area?.toLowerCase() || '';
            if (studentArea && tutorArea && tutorArea.includes(studentArea.split(' ')[0])) score += 15;
            // Rating bonus
            const rev = reviewMap[t.userId?._id?.toString()];
            if (rev) score += Math.min(rev.avg * 3, 15);

            return {
                ...t,
                _score: score,
                _avgRating: rev ? parseFloat(rev.avg.toFixed(1)) : null,
                _reviewCount: rev?.count || 0
            };
        });

        const top = scored.sort((a, b) => b._score - a._score).slice(0, 6);
        await recordTutorSearchAppearances(top);
        res.json(top);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getTutors,
    getTutorById,
    getTutorProfileByUserId,
    updateTutorProfile,
    getMyProfile,
    submitForApproval,
    checkProfileComplete,
    getProfileOptions,
    getRecommendations,
    invalidateTutorCache
};
