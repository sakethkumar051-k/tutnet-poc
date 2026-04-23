const mongoose = require('mongoose');
const Booking = require('../../models/Booking');
const TutorProfile = require('../../models/TutorProfile');
const User = require('../../models/User');
const CurrentTutor = require('../../models/CurrentTutor');
const { createNotification } = require('../../utils/notificationHelper');
const { safe500, isValidObjectId, sanitizeString } = require('../../utils/responseHelpers');
const { resolveBookingCategory, isWithinTutorAvailability } = require('./shared');
const { emitBookingInvalidate } = require('../../socket/io');
// @desc    Create a new booking
// @route   POST /api/bookings
// @access  Private (Student or Tutor)
const createBooking = async (req, res) => {
    try {
        if (process.env.NODE_ENV !== 'production') {
            console.log('=== BOOKING REQUEST RECEIVED ===');
            console.log('User:', req.user);
            console.log('Request Body:', JSON.stringify(req.body, null, 2));
            console.log('Headers:', req.headers.authorization);
        }

        let {
            tutorId, studentId, subject, preferredSchedule, sessionDate, currentTutorId, bookingCategory, bookingType,
            preferredStartDate, weeklySchedule, subjects, frequency, durationCommitment, learningGoals, studyGoals, currentLevel, focusAreas, additionalNotes, termsAccepted,
            sessionJoinUrl: sessionJoinUrlRaw
        } = req.body;

        // Sanitize string inputs (trim, cap length)
        if (subject != null) subject = sanitizeString(subject, 200);
        if (preferredSchedule != null) preferredSchedule = sanitizeString(preferredSchedule, 500);
        if (tutorId != null && typeof tutorId === 'string') tutorId = tutorId.trim();
        if (studentId != null && typeof studentId === 'string') studentId = studentId.trim();

        // CRITICAL: Check if user is authenticated
        if (!req.user || !req.user.id) {
            console.log('ERROR: No user found in request');
            return res.status(401).json({ message: 'Authentication required. Please log in.' });
        }

        // bookingCategory is canonical; bookingType is temporary legacy fallback.
        const finalCategory = resolveBookingCategory(bookingCategory, bookingType);
        if (!['trial', 'session', 'permanent', 'dedicated'].includes(finalCategory)) {
            return res.status(400).json({
                message: 'Invalid booking category',
                code: 'INVALID_BOOKING_CATEGORY'
            });
        }

        let finalTutorId, finalStudentId;

        // Determine tutor and student IDs based on user role
        if (req.user.role === 'student') {
            // Student booking a tutor
            finalStudentId = req.user.id;
            finalTutorId = tutorId;

            if (!finalTutorId || !isValidObjectId(finalTutorId)) {
                return res.status(400).json({ message: 'Valid tutor ID is required', code: 'INVALID_TUTOR_ID' });
            }

            // Check if tutor exists
            const tutor = await User.findById(finalTutorId);
            if (!tutor || tutor.role !== 'tutor') {
                return res.status(404).json({ message: 'Tutor not found' });
            }

            // Check if tutor has a profile (relaxed check - don't require approval status)
            const tutorProfile = await TutorProfile.findOne({ userId: finalTutorId });
            if (!tutorProfile) {
                return res.status(400).json({ message: 'Tutor profile not found. Please contact the tutor to set up their profile.' });
            }

            // Optional: Warn if tutor is not approved, but allow booking
            if (tutorProfile.approvalStatus !== 'approved') {
                console.log(`Warning: Booking created for tutor ${finalTutorId} with approval status: ${tutorProfile.approvalStatus}`);
            }

            // TRIAL-SPECIFIC VALIDATION
            if (finalCategory === 'trial') {
                // Check active trial limit (max 2-3)
                const activeTrialCount = await Booking.countActiveTrials(finalStudentId);
                const maxActiveTrials = 3; // Configurable

                if (activeTrialCount >= maxActiveTrials) {
                    return res.status(400).json({
                        message: `You already have ${activeTrialCount} active trial bookings. Please complete or cancel existing trials before requesting more.`,
                        code: 'MAX_TRIALS_EXCEEDED'
                    });
                }

                // Check if student can request trial with this tutor (max 2 per tutor rule)
                const canRequest = await Booking.canRequestTrial(finalStudentId, finalTutorId);
                if (!canRequest) {
                    return res.status(400).json({
                        message: 'You already have 2 trial bookings with this tutor. Book a regular session instead!',
                        code: 'TRIAL_LIMIT_REACHED'
                    });
                }
            }

        } else if (req.user.role === 'tutor') {
            // Tutor booking for a student (must be a current student)
            finalTutorId = req.user.id;
            finalStudentId = studentId;

            if (!finalStudentId || !isValidObjectId(finalStudentId)) {
                return res.status(400).json({ message: 'Valid student ID is required', code: 'INVALID_STUDENT_ID' });
            }

            // Verify this is a current student
            if (currentTutorId) {
                const currentTutor = await CurrentTutor.findById(currentTutorId);
                if (!currentTutor || currentTutor.tutorId.toString() !== finalTutorId ||
                    currentTutor.studentId.toString() !== finalStudentId) {
                    return res.status(403).json({ message: 'Not authorized to book for this student' });
                }
            } else {
                // Check if there's an active relationship
                const currentTutor = await CurrentTutor.findOne({
                    tutorId: finalTutorId,
                    studentId: finalStudentId,
                    isActive: true
                });
                if (!currentTutor) {
                    return res.status(403).json({ message: 'No active relationship with this student' });
                }
            }

            // Check if student exists
            const student = await User.findById(finalStudentId);
            if (!student || student.role !== 'student') {
                return res.status(404).json({ message: 'Student not found' });
            }
        } else {
            return res.status(403).json({ message: 'Only students and tutors can create bookings' });
        }

        // Require non-empty subject for trial and session (dedicated may use subjects array)
        if (finalCategory !== 'dedicated') {
            const subjectStr = subject != null ? String(subject).trim() : '';
            if (!subjectStr) {
                return res.status(400).json({
                    message: 'Subject is required for this booking.',
                    code: 'SUBJECT_REQUIRED'
                });
            }
        }

        // Parse session date and time (so availability check uses correct time of day)
        let parsedSessionDate = null;
        if (sessionDate) {
            parsedSessionDate = new Date(sessionDate);
        }
        if (!parsedSessionDate && preferredSchedule) {
            const dateMatch = preferredSchedule.match(/\d{4}-\d{2}-\d{2}/);
            if (dateMatch) parsedSessionDate = new Date(dateMatch[0]);
        }
        // Apply time from preferredSchedule (e.g. "2026-03-06 14:31" or "2026-03-06 02:31 PM")
        if (parsedSessionDate && preferredSchedule && typeof preferredSchedule === 'string') {
            const timeMatch = preferredSchedule.match(/(\d{1,2}):(\d{2})(?:\s*[AP]M)?/i) || preferredSchedule.match(/(\d{2}):(\d{2})/);
            if (timeMatch) {
                let hours = parseInt(timeMatch[1], 10);
                const mins = parseInt(timeMatch[2], 10) || 0;
                if (preferredSchedule.toUpperCase().includes('PM') && hours < 12) hours += 12;
                else if (preferredSchedule.toUpperCase().includes('AM') && hours === 12) hours = 0;
                parsedSessionDate.setHours(hours, mins, 0, 0);
            }
        }

        // Block booking for past/completed dates (frontend + backend)
        if (parsedSessionDate && parsedSessionDate < new Date()) {
            return res.status(400).json({
                message: 'Cannot book a session in the past. Please choose a future date and time.',
                code: 'PAST_DATE'
            });
        }

        // Session only: enforce slot check when tutor has fixed availability. Demo/trial = never block by slots (tutor confirms later).
        if (req.user.role === 'student' && finalCategory === 'session' && parsedSessionDate) {
            const tutorProfile = await TutorProfile.findOne({ userId: finalTutorId }).lean();
            const hasFixedSlots = tutorProfile?.availabilityMode === 'fixed' &&
                Array.isArray(tutorProfile.weeklyAvailability) &&
                tutorProfile.weeklyAvailability.some(d => d.slots?.length > 0);
            if (hasFixedSlots && !isWithinTutorAvailability(tutorProfile, parsedSessionDate)) {
                return res.status(400).json({
                    message: 'The selected date/time is not within the tutor\'s availability. Please choose a slot from their available times.',
                    code: 'OUTSIDE_AVAILABILITY'
                });
            }
        }

        // Calculate trial expiry (48 hours for pending trials)
        let trialExpiresAt = null;
        if (finalCategory === 'trial') {
            trialExpiresAt = new Date();
            trialExpiresAt.setHours(trialExpiresAt.getHours() + 48);
        }

        // Dedicated tutor: require preferredStartDate (future), terms accepted; block past dates
        const isDedicated = finalCategory === 'permanent' || finalCategory === 'dedicated';
        if (isDedicated) {
            const startDate = preferredStartDate ? new Date(preferredStartDate) : null;
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            if (!startDate) {
                return res.status(400).json({
                    message: 'Please provide a preferred start date in the future.',
                    code: 'INVALID_START_DATE'
                });
            }
            const startOnly = new Date(startDate);
            startOnly.setHours(0, 0, 0, 0);
            if (startOnly < now) {
                return res.status(400).json({
                    message: 'Start date must be in the future.',
                    code: 'INVALID_START_DATE'
                });
            }
            if (termsAccepted !== true) {
                return res.status(400).json({
                    message: 'You must accept the terms to request a dedicated tutor.',
                    code: 'TERMS_NOT_ACCEPTED'
                });
            }
            // Optional: validate weeklySchedule vs tutor fixed availability and prevent overlapping tutor slots
            const schedule = Array.isArray(weeklySchedule) ? weeklySchedule.filter(s => s && (s.day || s.time)) : [];
            if (schedule.length > 0 && finalTutorId) {
                const tutorProfile = await TutorProfile.findOne({ userId: finalTutorId }).lean();
                if (tutorProfile && tutorProfile.availabilityMode === 'fixed' && Array.isArray(tutorProfile.weeklyAvailability)) {
                    for (const slot of schedule) {
                        const day = (slot.day || '').trim();
                        const time = (slot.time || '').trim();
                        if (!day || !time) continue;
                        const daySlot = tutorProfile.weeklyAvailability.find(wa => (wa.day || '').toLowerCase() === day.toLowerCase());
                        if (!daySlot || !Array.isArray(daySlot.slots) || daySlot.slots.length === 0) {
                            return res.status(400).json({
                                message: `The selected time (${day} ${time}) is not in the tutor's fixed availability. Please choose from their available slots.`,
                                code: 'OUTSIDE_AVAILABILITY'
                            });
                        }
                        const timeMatch = daySlot.slots.some(s => {
                            const start = (s.start || s).toString().substring(0, 5);
                            const end = (s.end || s).toString().substring(0, 5);
                            return time >= start && time < end;
                        });
                        if (!timeMatch) {
                            return res.status(400).json({
                                message: `The selected time (${day} ${time}) is not in the tutor's fixed availability.`,
                                code: 'OUTSIDE_AVAILABILITY'
                            });
                        }
                    }
                }
                // Prevent overlapping approved dedicated bookings for this tutor (same day + time)
                const existingDedicated = await Booking.find({
                    tutorId: finalTutorId,
                    bookingCategory: { $in: ['dedicated', 'permanent'] },
                    status: 'approved',
                    _id: { $ne: req.body._id }
                }).select('weeklySchedule').lean();
                const requestedSet = new Set(schedule.map(s => `${(s.day || '').trim()}|${(s.time || '').trim()}`));
                for (const doc of existingDedicated) {
                    const existingSchedule = doc.weeklySchedule || [];
                    for (const es of existingSchedule) {
                        const key = `${(es.day || '').trim()}|${(es.time || '').trim()}`;
                        if (key && requestedSet.has(key)) {
                            return res.status(400).json({
                                message: 'One or more of the selected slots are already taken by another dedicated engagement. Please choose different times.',
                                code: 'SLOT_OVERLAP'
                            });
                        }
                    }
                }
            }
        }

        // IMPORTANT: Only find/create CurrentTutor relationship for REGULAR sessions, NOT trials or dedicated
        let currentTutor = null;
        if (finalCategory === 'session') {
            if (currentTutorId) {
                currentTutor = await CurrentTutor.findById(currentTutorId);
            } else {
                currentTutor = await CurrentTutor.findOne({
                    studentId: finalStudentId,
                    tutorId: finalTutorId,
                    subject: subject,
                    isActive: true
                });
            }
        }

        const subjectVal = subject || (currentTutor ? currentTutor.subject : 'General');
        let preferredScheduleFinal = preferredSchedule || (parsedSessionDate ? parsedSessionDate.toISOString() : '');
        if (isDedicated && (!preferredScheduleFinal || !String(preferredScheduleFinal).trim()) && Array.isArray(weeklySchedule) && weeklySchedule.length > 0) {
            preferredScheduleFinal = weeklySchedule.map(s => `${(s.day || '').trim()} ${(s.time || '').trim()}`.trim()).filter(Boolean).join(', ') || 'Dedicated schedule';
        }
        // Preserve category from scoped route (permanent vs dedicated); otherwise use finalCategory.
        const storedCategory = (req.body.bookingCategory && ['permanent', 'dedicated'].includes(req.body.bookingCategory))
            ? req.body.bookingCategory
            : (isDedicated ? 'dedicated' : finalCategory);

        const bookingPayload = {
            studentId: finalStudentId,
            tutorId: finalTutorId,
            subject: Array.isArray(subjects) && subjects.length > 0 ? subjects[0] : subjectVal,
            preferredSchedule: preferredScheduleFinal,
            sessionDate: isDedicated ? null : parsedSessionDate,
            status: req.user.role === 'tutor' && !isDedicated ? 'approved' : 'pending',
            currentTutorId: currentTutor?._id,
            bookingCategory: storedCategory,
            trialExpiresAt: trialExpiresAt,
            bookingType: finalCategory === 'trial' ? 'demo' : 'regular'
        };
        if (isDedicated) {
            bookingPayload.preferredStartDate = new Date(preferredStartDate);
            if (Array.isArray(weeklySchedule) && weeklySchedule.length > 0) {
                bookingPayload.weeklySchedule = weeklySchedule.filter(s => s && (s.day || s.time)).map(s => ({ day: s.day || '', time: s.time || '' }));
            }
            if (typeof req.body.monthsCommitted === 'number') bookingPayload.monthsCommitted = req.body.monthsCommitted;
            if (typeof req.body.sessionsPerWeek === 'number') bookingPayload.sessionsPerWeek = req.body.sessionsPerWeek;
            if (Array.isArray(subjects) && subjects.length > 0) bookingPayload.subjects = subjects;
            if (frequency) bookingPayload.frequency = frequency;
            if (durationCommitment) bookingPayload.durationCommitment = durationCommitment;
            if (learningGoals) bookingPayload.learningGoals = learningGoals;
            if (studyGoals) bookingPayload.studyGoals = studyGoals;
            if (currentLevel) bookingPayload.currentLevel = currentLevel;
            if (focusAreas) bookingPayload.focusAreas = focusAreas;
            if (additionalNotes) bookingPayload.additionalNotes = additionalNotes;
            bookingPayload.termsAccepted = termsAccepted === true;
        }

        if (sessionJoinUrlRaw != null && String(sessionJoinUrlRaw).trim()) {
            bookingPayload.sessionJoinUrl = sanitizeString(String(sessionJoinUrlRaw), 2000);
        }

        const rateSnap = await TutorProfile.findOne({ userId: finalTutorId }).select('hourlyRate').lean();
        if (rateSnap && typeof rateSnap.hourlyRate === 'number') {
            bookingPayload.lockedHourlyRate = rateSnap.hourlyRate;
            bookingPayload.priceLockedAt = new Date();
        }

        const idemRaw = req.headers['idempotency-key'] || req.body?.idempotencyKey;
        if (idemRaw != null && String(idemRaw).trim()) {
            const idem = sanitizeString(String(idemRaw), 128);
            const existing = await Booking.findOne({ idempotencyKey: idem })
                .populate('studentId', 'name email')
                .populate('tutorId', 'name email');
            if (existing) {
                return res.status(200).json(existing);
            }
            bookingPayload.idempotencyKey = idem;
        }

        let notifyTutorDisplayName = 'your tutor';
        if (req.user.role === 'student') {
            const tLean = await User.findById(finalTutorId).select('name').lean();
            notifyTutorDisplayName = tLean?.name || 'your tutor';
        }
        const studentDisplayName = req.user.name || 'Student';

        const persistBookingCreates = async (sess) => {
            const opt = sess ? { session: sess } : {};
            const [booking] = await Booking.create([bookingPayload], opt);

            if (req.user.role === 'tutor' && currentTutor && finalCategory === 'session') {
                currentTutor.totalSessionsBooked += 1;
                if (currentTutor.status === 'new') {
                    currentTutor.status = 'active';
                }
                await currentTutor.save(opt);
            }

            if (req.user.role === 'student') {
                const notificationType = finalCategory === 'trial' ? 'new_trial_request' : isDedicated ? 'new_booking_request' : 'new_booking_request';
                const notificationTitle = finalCategory === 'trial' ? 'New Trial Request!' : isDedicated ? 'New Dedicated Tutor Request!' : 'New Booking Request';
                const notificationMessage = finalCategory === 'trial'
                    ? `${studentDisplayName} requested a free demo class for ${subjectVal}`
                    : isDedicated
                    ? `${studentDisplayName} requested a dedicated tutor for ${(subjects && subjects[0]) || subjectVal}`
                    : `${studentDisplayName} requested a session for ${subjectVal}`;

                await createNotification({
                    userId: finalTutorId,
                    type: notificationType,
                    title: notificationTitle,
                    message: notificationMessage,
                    link: '/tutor-dashboard?tab=sessions',
                    bookingId: booking._id
                }, opt);

                if (finalCategory === 'trial') {
                    const scheduleText = preferredSchedule || (sessionDate ? new Date(sessionDate).toLocaleString() : '');
                    await createNotification({
                        userId: finalStudentId,
                        type: 'demo_booking_created',
                        title: 'Demo request sent',
                        message: `Your free demo request with ${notifyTutorDisplayName} for ${subject} has been sent.${scheduleText ? ` Requested: ${scheduleText}` : ''} We'll notify you when the tutor responds.`,
                        link: '/student-dashboard?tab=sessions',
                        bookingId: booking._id
                    }, opt);
                }
            }

            return booking;
        };

        let booking;
        let mongoSession = null;
        try {
            mongoSession = await mongoose.startSession();
        } catch (_) {
            /* standalone MongoDB — no replica set */
        }

        if (mongoSession) {
            try {
                await mongoSession.withTransaction(async () => {
                    booking = await persistBookingCreates(mongoSession);
                });
            } finally {
                await mongoSession.endSession();
            }
        } else {
            booking = await persistBookingCreates();
        }

        const populatedBooking = await Booking.findById(booking._id)
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email');

        emitBookingInvalidate(populatedBooking);
        res.status(201).json(populatedBooking);
    } catch (error) {
        return safe500(res, error, '[createBooking]');
    }
};

module.exports = { createBooking };
