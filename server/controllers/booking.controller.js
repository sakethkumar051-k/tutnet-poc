const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Booking = require('../models/Booking');
const TutorProfile = require('../models/TutorProfile');
const User = require('../models/User');
const CurrentTutor = require('../models/CurrentTutor');
const { createNotification } = require('../utils/notificationHelper');
const { safe500, isValidObjectId, sanitizeString } = require('../utils/responseHelpers');
const { generateRecurringSessionBookings } = require('../services/recurringSessions.service');
const {
    canTransition,
    getTutorTimeConflicts,
    getStudentTimeConflicts,
    DEFAULT_SESSION_DURATION_MIN
} = require('../services/bookingLifecycle.service');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Booking lifecycle (canonical):
 * pending -> approved -> completed
 * pending -> rejected
 * approved -> cancelled
 */
function resolveBookingCategory(bookingCategory, bookingType) {
    if (bookingCategory) return bookingCategory;
    if (bookingType === 'demo') return 'trial';
    if (bookingType === 'regular') return 'session';
    return 'session';
}

/** Check if a date/time falls within tutor's weeklyAvailability or availableSlots */
function isWithinTutorAvailability(tutorProfile, dateTime) {
    const d = new Date(dateTime);
    const dayName = DAY_NAMES[d.getDay()];
    const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

    const wa = tutorProfile.weeklyAvailability || [];
    if (wa.length > 0) {
        const daySlot = wa.find((x) => x.day === dayName);
        if (!daySlot || !daySlot.slots || daySlot.slots.length === 0) return false;
        for (const slot of daySlot.slots) {
            const start = (slot.start || '').substring(0, 5);
            const end = (slot.end || '').substring(0, 5);
            if (start && end && timeStr >= start && timeStr < end) return true;
        }
        return false;
    }

    const legacy = tutorProfile.availableSlots || [];
    const dayAbbr = dayName.substring(0, 3);
    for (const s of legacy) {
        if (typeof s !== 'string') continue;
        if (!s.toLowerCase().includes(dayAbbr.toLowerCase())) continue;
        const range = s.match(/(\d{1,2})\s*-\s*(\d{1,2})/);
        if (range) {
            const hour = d.getHours();
            const startH = parseInt(range[1], 10);
            const endH = parseInt(range[2], 10);
            if (hour >= startH && hour < endH) return true;
        }
    }
    return false;
}

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
            preferredStartDate, weeklySchedule, subjects, frequency, durationCommitment, learningGoals, studyGoals, currentLevel, focusAreas, additionalNotes, termsAccepted
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
        const booking = await Booking.create(bookingPayload);

        // If tutor created booking AND it's a regular session, update relationship stats
        if (req.user.role === 'tutor' && currentTutor && finalCategory === 'session') {
            currentTutor.totalSessionsBooked += 1;
            if (currentTutor.status === 'new') {
                currentTutor.status = 'active';
            }
            await currentTutor.save();
        }

        const populatedBooking = await Booking.findById(booking._id)
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email');

        // Send notification to tutor (only if student created the booking)
        if (req.user.role === 'student') {
            const notificationType = finalCategory === 'trial' ? 'new_trial_request' : isDedicated ? 'new_booking_request' : 'new_booking_request';
            const notificationTitle = finalCategory === 'trial' ? 'New Trial Request!' : isDedicated ? 'New Dedicated Tutor Request!' : 'New Booking Request';
            const notificationMessage = finalCategory === 'trial'
                ? `${populatedBooking.studentId.name} requested a free demo class for ${subjectVal}`
                : isDedicated
                ? `${populatedBooking.studentId.name} requested a dedicated tutor for ${(subjects && subjects[0]) || subjectVal}`
                : `${populatedBooking.studentId.name} requested a session for ${subjectVal}`;

            await createNotification({
                userId: finalTutorId,
                type: notificationType,
                title: notificationTitle,
                message: notificationMessage,
                link: '/tutor-dashboard?tab=sessions',
                bookingId: booking._id
            });

            // Parent P0: Notify student/parent when demo is requested (confirmation)
            if (finalCategory === 'trial') {
                const tutorName = populatedBooking.tutorId?.name || 'your tutor';
                const scheduleText = preferredSchedule || (sessionDate ? new Date(sessionDate).toLocaleString() : '');
                await createNotification({
                    userId: finalStudentId,
                    type: 'demo_booking_created',
                    title: 'Demo request sent',
                    message: `Your free demo request with ${tutorName} for ${subject} has been sent.${scheduleText ? ` Requested: ${scheduleText}` : ''} We'll notify you when the tutor responds.`,
                    link: '/student-dashboard?tab=sessions',
                    bookingId: booking._id
                });
            }
        }

        res.status(201).json(populatedBooking);
    } catch (error) {
        return safe500(res, error, '[createBooking]');
    }
};

// @desc    Get my bookings
// @route   GET /api/bookings/mine
// @access  Private
const getMyBookings = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'student') {
            query.studentId = req.user.id;
        } else if (req.user.role === 'tutor') {
            query.tutorId = req.user.id;
        } else if (req.user.role === 'admin') {
            // admin sees all bookings — no filter
        } else {
            return res.status(400).json({ message: 'Invalid role for this route' });
        }

        const bookings = await Booking.find(query)
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email')
            .sort({ createdAt: -1 });

        res.json(bookings);
    } catch (error) {
        return safe500(res, error, '[getMyBookings]');
    }
};

// @desc    Get centralized requests (for Student: demo, permanent, reschedule; for Tutor: session, demo, permanent)
// @route   GET /api/bookings/requests
// @access  Private
const getBookingRequests = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        let query = {};
        if (role === 'student') query.studentId = userId;
        else if (role === 'tutor') query.tutorId = userId;
        else if (role === 'admin') { /* admin sees all */ }
        else return res.status(400).json({ message: 'Invalid role' });

        const bookings = await Booking.find(query)
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email')
            .sort({ createdAt: -1 });

        const demoRequests = bookings.filter((b) => b.bookingCategory === 'trial' && b.status === 'pending');
        const permanentRequests = bookings.filter((b) => (b.bookingCategory === 'permanent' || b.bookingCategory === 'dedicated') && b.status === 'pending');
        const sessionRequests = bookings.filter((b) => b.bookingCategory === 'session' && b.status === 'pending');
        const rescheduleRequests = bookings.filter(
            (b) => b.status === 'approved' && b.tutorChangeRequest?.status === 'pending'
        );
        const studentRescheduleRequests = bookings.filter(
            (b) => b.status === 'approved' && b.rescheduleRequest?.status === 'pending'
        );

        if (role === 'student') {
            return res.json({
                demoRequests,
                permanentRequests,
                rescheduleRequests: rescheduleRequests,
                allPending: [...demoRequests, ...permanentRequests, ...rescheduleRequests]
            });
        }
        res.json({
            sessionRequests,
            demoRequests,
            permanentRequests,
            allPending: [...sessionRequests, ...demoRequests, ...permanentRequests]
        });
    } catch (error) {
        return safe500(res, error, '[getBookingRequests]');
    }
};

// @desc    Cancel a booking
// @route   PATCH /api/bookings/:id/cancel
// @access  Private (Student)
const cancelBooking = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || !isValidObjectId(id)) {
            return res.status(400).json({ message: 'Valid booking ID is required', code: 'INVALID_BOOKING_ID' });
        }
        const booking = await Booking.findById(id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Ensure user owns the booking
        if (booking.studentId.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // Centralized lifecycle: only approved -> cancelled allowed (completed cannot be cancelled)
        if (!canTransition(booking.status, 'cancelled')) {
            return res.status(400).json({
                message: booking.status === 'completed' ? 'Cannot cancel a completed booking' : 'Only approved bookings can be cancelled',
                code: 'INVALID_STATUS_TRANSITION'
            });
        }

        booking.status = 'cancelled';
        await booking.save();

        // Update CurrentTutor stats if relationship exists
        if (booking.currentTutorId) {
            const currentTutor = await CurrentTutor.findById(booking.currentTutorId);
            if (currentTutor) {
                currentTutor.sessionsCancelled += 1;
                await currentTutor.save();
            }
        }

        // Auto-initiate Razorpay refund if booking was paid online
        if (booking.isPaid) {
            try {
                const Payment = require('../models/Payment');
                const crypto = require('crypto');
                const Razorpay = require('razorpay');
                const payment = await Payment.findOne({
                    bookingId: booking._id,
                    status: 'completed',
                    refundStatus: 'none',
                    razorpayPaymentId: { $exists: true, $ne: null }
                });
                if (payment && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
                    const rz = new Razorpay({
                        key_id: process.env.RAZORPAY_KEY_ID,
                        key_secret: process.env.RAZORPAY_KEY_SECRET
                    });
                    const refund = await rz.payments.refund(payment.razorpayPaymentId, {
                        amount: Math.round(payment.amount * 100),
                        notes: { reason: 'Booking cancelled by student' }
                    });
                    payment.refundId = refund.id;
                    payment.refundStatus = 'initiated';
                    payment.refundReason = 'Booking cancelled by student';
                    await payment.save();
                    await createNotification({
                        userId: req.user.id,
                        type: 'refund_initiated',
                        title: 'Refund Initiated',
                        message: `Your refund of ₹${payment.amount} has been initiated and will reflect in 5-7 business days.`,
                        link: '/student-dashboard?tab=sessions',
                        bookingId: booking._id
                    });
                }
            } catch (refundErr) {
                // Log but don't fail the cancellation
                console.error('[cancelBooking] Refund initiation failed:', refundErr.message);
            }
        }

        res.json({ message: 'Booking cancelled', booking });
    } catch (error) {
        return safe500(res, error, '[cancelBooking]');
    }
};

// @desc    Approve a booking (Tutor)
// @route   PATCH /api/bookings/:id/approve
// @access  Private (Tutor)
const approveBooking = async (req, res) => {
    try {
        const bookingId = req.params.id;
        if (!bookingId || !isValidObjectId(bookingId)) {
            return res.status(400).json({ message: 'Valid booking ID is required', code: 'INVALID_BOOKING_ID' });
        }
        let booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found', code: 'BOOKING_NOT_FOUND' });
        }

        if (req.user.role !== 'tutor') {
            return res.status(403).json({ message: 'Only tutors can approve bookings', code: 'FORBIDDEN' });
        }

        if (booking.tutorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized', code: 'FORBIDDEN' });
        }

        // Centralized lifecycle: only pending -> approved allowed
        if (!canTransition(booking.status, 'approved')) {
            return res.status(400).json({
                message: 'Only pending bookings can be approved',
                code: 'INVALID_STATUS_TRANSITION'
            });
        }

        // Cannot approve expired trial
        if (booking.bookingCategory === 'trial' && booking.trialExpiresAt && new Date() > booking.trialExpiresAt) {
            return res.status(400).json({
                message: 'Cannot approve an expired trial',
                code: 'TRIAL_EXPIRED'
            });
        }

        // Resolve session date for conflict and availability checks
        let sessionDate = booking.sessionDate;
        if (!sessionDate) {
            try {
                const dateMatch = (booking.preferredSchedule || '').match(/\d{4}-\d{2}-\d{2}/);
                if (dateMatch) {
                    sessionDate = new Date(dateMatch[0]);
                } else {
                    sessionDate = new Date();
                }
            } catch (e) {
                sessionDate = new Date();
            }
        } else {
            sessionDate = new Date(sessionDate);
        }

        // Revalidate tutor availability at approval time only when tutor has fixed availability
        if (booking.bookingCategory === 'trial' || booking.bookingCategory === 'session') {
            const tutorProfile = await TutorProfile.findOne({ userId: booking.tutorId });
            if (tutorProfile && tutorProfile.availabilityMode === 'fixed' && !isWithinTutorAvailability(tutorProfile, sessionDate)) {
                return res.status(400).json({
                    message: 'Session time is outside tutor availability. Please choose a time within the tutor\'s available slots.',
                    code: 'TUTOR_UNAVAILABLE'
                });
            }
        }

        // Tutor time conflict detection
        const tutorConflicts = await getTutorTimeConflicts(
            booking.tutorId,
            sessionDate,
            DEFAULT_SESSION_DURATION_MIN,
            booking._id
        );
        if (tutorConflicts.length > 0) {
            return res.status(409).json({
                message: 'Tutor has another session at this time. Please choose a different slot or reject the other request first.',
                code: 'TUTOR_CONFLICT'
            });
        }

        // Student time conflict detection
        const studentConflicts = await getStudentTimeConflicts(
            booking.studentId,
            sessionDate,
            DEFAULT_SESSION_DURATION_MIN,
            booking._id
        );
        if (studentConflicts.length > 0) {
            return res.status(409).json({
                message: 'Student has another session at this time.',
                code: 'STUDENT_CONFLICT'
            });
        }

        // Atomic approval: use transaction when supported (replica set) so approval + recurring generation commit together
        let session = null;
        try {
            session = await mongoose.startSession();
        } catch (_) {
            // Standalone MongoDB or no replica set; proceed without transaction
        }

        const runApproval = async (opts = {}) => {
            const updateOptions = { new: true, ...opts };
            const updated = await Booking.findOneAndUpdate(
                { _id: booking._id, status: 'pending' },
                { $set: { status: 'approved', sessionDate } },
                updateOptions
            );
            if (!updated) {
                return null;
            }
            let b = updated;
            const resolvedCategory = resolveBookingCategory(b.bookingCategory, b.bookingType);
            const isTrialBooking = resolvedCategory === 'trial';
            if (!b.bookingCategory) {
                b.bookingCategory = resolvedCategory;
                await b.save(opts);
            }
            let currentTutor = null;
            const isDedicatedBooking = resolvedCategory === 'dedicated' || resolvedCategory === 'permanent';
            if (!isTrialBooking) {
                const tutorProfile = await TutorProfile.findOne({ userId: b.tutorId });

                // Resolve subject — dedicated bookings store subjects[] not subject
                const effectiveSubject = b.subject ||
                    (Array.isArray(b.subjects) && b.subjects[0]) ||
                    'General';

                currentTutor = await CurrentTutor.findOne({
                    studentId: b.studentId,
                    tutorId: b.tutorId,
                    subject: effectiveSubject,
                    isActive: true
                });
                if (!currentTutor) {
                    currentTutor = await CurrentTutor.create([{
                        studentId: b.studentId,
                        tutorId: b.tutorId,
                        subject: effectiveSubject,
                        classGrade: tutorProfile?.classes?.[0] || '',
                        relationshipStartDate: new Date(),
                        status: 'new',
                        totalSessionsBooked: 1,
                        isActive: true
                    }], opts);
                    currentTutor = currentTutor[0]; // create() with array returns array
                } else {
                    currentTutor.totalSessionsBooked += 1;
                    if (currentTutor.status === 'new' && currentTutor.totalSessionsBooked > 0) {
                        currentTutor.status = 'active';
                    }
                    await currentTutor.save(opts);
                }
                b.currentTutorId = currentTutor._id;
                await b.save(opts);
            }
            if (b.bookingCategory === 'permanent' || b.bookingCategory === 'dedicated') {
                const { created } = await generateRecurringSessionBookings(b, opts);
                if (created > 0) {
                    console.log(`[approveBooking] Generated ${created} recurring session(s) for dedicated booking ${b._id}`);
                }
            }
            return b;
        };

        if (session) {
            try {
                await session.withTransaction(async () => {
                    booking = await runApproval({ session });
                    if (!booking) {
                        throw new Error('STATUS_CHANGED');
                    }
                });
            } catch (err) {
                if (err.message === 'STATUS_CHANGED') {
                    return res.status(409).json({
                        message: 'Booking is no longer pending. It may have been approved, rejected, or expired.',
                        code: 'STATUS_CHANGED'
                    });
                }
                throw err;
            } finally {
                await session.endSession();
            }
        } else {
            const updated = await runApproval();
            if (!updated) {
                return res.status(409).json({
                    message: 'Booking is no longer pending. It may have been approved, rejected, or expired.',
                    code: 'STATUS_CHANGED'
                });
            }
            booking = updated;
        }

        const resolvedCategory = resolveBookingCategory(booking.bookingCategory, booking.bookingType);
        const populatedBooking = await Booking.findById(booking._id)
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email');

        // Send notification to student
        const notificationType = resolvedCategory === 'trial' ? 'demo_accepted' : 'booking_approved';
        const notificationTitle = resolvedCategory === 'trial' ? 'Demo Class Approved!' : 'Booking Approved!';
        const notificationMessage = resolvedCategory === 'trial'
            ? `Your demo class with ${populatedBooking.tutorId.name} for ${booking.subject} has been approved`
            : `Your booking with ${populatedBooking.tutorId.name} for ${booking.subject} has been approved`;

        await createNotification({
            userId: booking.studentId,
            type: notificationType,
            title: notificationTitle,
            message: notificationMessage,
            link: '/student-dashboard?tab=sessions',
            bookingId: booking._id
        });

        res.json({ message: 'Booking approved', booking: populatedBooking });
    } catch (error) {
        return safe500(res, error, '[approveBooking]');
    }
};

// @desc    Reject a booking (Tutor)
// @route   PATCH /api/bookings/:id/reject
// @access  Private (Tutor)
const rejectBooking = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || !isValidObjectId(id)) {
            return res.status(400).json({ message: 'Valid booking ID is required', code: 'INVALID_BOOKING_ID' });
        }
        const booking = await Booking.findById(id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (req.user.role !== 'tutor') {
            return res.status(403).json({ message: 'Only tutors can reject bookings', code: 'FORBIDDEN' });
        }

        if (booking.tutorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized', code: 'FORBIDDEN' });
        }

        if (!canTransition(booking.status, 'rejected')) {
            return res.status(400).json({
                message: 'Only pending bookings can be rejected',
                code: 'INVALID_STATUS_TRANSITION'
            });
        }

        booking.status = 'rejected';
        await booking.save();

        // Populate for notification
        const populatedBooking = await Booking.findById(booking._id)
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email');

        // Send notification to student with appropriate type
        const resolvedCategory = resolveBookingCategory(booking.bookingCategory, booking.bookingType);
        const notificationType = resolvedCategory === 'trial' ? 'demo_rejected' : 'booking_rejected';
        const notificationTitle = resolvedCategory === 'trial' ? 'Demo Request Declined' : 'Booking Update';
        const notificationMessage = resolvedCategory === 'trial'
            ? `Your demo request with ${populatedBooking.tutorId.name} was declined. Try another tutor?`
            : `Your booking request with ${populatedBooking.tutorId.name} was declined. Try another time slot?`;

        await createNotification({
            userId: booking.studentId,
            type: notificationType,
            title: notificationTitle,
            message: notificationMessage,
            link: '/find-tutors',
            bookingId: booking._id
        });

        res.json({ message: 'Booking rejected', booking: populatedBooking });
    } catch (error) {
        return safe500(res, error, '[rejectBooking]');
    }
};

// @desc    Complete a booking (Tutor)
// @route   PATCH /api/bookings/:id/complete
// @access  Private (Tutor)
const completeBooking = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || !isValidObjectId(id)) {
            return res.status(400).json({ message: 'Valid booking ID is required', code: 'INVALID_BOOKING_ID' });
        }
        const booking = await Booking.findById(id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Ensure tutor owns the booking
        if (booking.tutorId.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        if (!canTransition(booking.status, 'completed')) {
            return res.status(400).json({
                message: 'Only approved bookings can be marked as completed',
                code: 'INVALID_STATUS_TRANSITION'
            });
        }

        // Cannot complete booking without attendance (attendance marking sets status to completed)
        const hasAttendance = await Attendance.exists({ bookingId: booking._id });
        if (!hasAttendance) {
            return res.status(400).json({
                message: 'Cannot complete booking without attendance. Mark attendance first.',
                code: 'ATTENDANCE_REQUIRED'
            });
        }

        booking.status = 'completed';
        await booking.save();

        // Update CurrentTutor stats
        if (booking.currentTutorId) {
            const currentTutor = await CurrentTutor.findById(booking.currentTutorId);
            if (currentTutor) {
                currentTutor.sessionsCompleted += 1;
                // Update status based on completion
                if (currentTutor.sessionsCompleted >= 10 && currentTutor.sessionsCompleted < 20) {
                    currentTutor.status = 'near_completion';
                }
                await currentTutor.save();
            }
        }

        // Send notification to student
        const populatedBooking = await Booking.findById(booking._id)
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email');

        await createNotification({
            userId: booking.studentId,
            type: 'session_completed',
            title: 'Session Completed',
            message: `Your session with ${populatedBooking.tutorId.name} for ${booking.subject} has been marked as completed.`,
            link: '/student-dashboard?tab=sessions',
            bookingId: booking._id
        });

        res.json({ message: 'Booking marked as completed', booking });
    } catch (error) {
        return safe500(res, error, '[completeBooking]');
    }
};

// @desc    Get trial status between student and tutor
// @route   GET /api/bookings/trial-status/:tutorId
// @access  Private (Student)
const getTrialStatus = async (req, res) => {
    try {
        const { tutorId } = req.params;
        const studentId = req.user.id;

        // Find any trial bookings between this student and tutor
        const trials = await Booking.find({
            studentId,
            tutorId,
            bookingCategory: 'trial'
        }).sort({ createdAt: -1 });

        if (trials.length === 0) {
            return res.json({
                status: null,
                count: 0,
                hasTriedTutor: false
            });
        }

        const latestTrial = trials[0];

        return res.json({
            status: latestTrial.status,
            count: trials.length,
            maxReached: trials.length >= 2,
            hasTriedTutor: true,
            latestTrial: {
                _id: latestTrial._id,
                status: latestTrial.status,
                subject: latestTrial.subject,
                preferredSchedule: latestTrial.preferredSchedule,
                createdAt: latestTrial.createdAt
            }
        });
    } catch (error) {
        return safe500(res, error, '[getTrialStatus]');
    }
};

// @desc    Request a reschedule (student)
// @route   PATCH /api/bookings/:id/reschedule-request
// @access  Private (Student)
const requestReschedule = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        if (booking.studentId.toString() !== req.user.id)
            return res.status(403).json({ message: 'Not authorized' });
        if (booking.status !== 'approved')
            return res.status(400).json({ message: 'Cannot reschedule this booking' });

        const { proposedDate, proposedSchedule, reason } = req.body;
        if (!proposedSchedule && !proposedDate)
            return res.status(400).json({ message: 'Proposed date/schedule is required' });

        booking.rescheduleRequest = {
            requestedBy: req.user._id,
            proposedDate: proposedDate ? new Date(proposedDate) : null,
            proposedSchedule: proposedSchedule || '',
            reason: reason || '',
            status: 'pending',
            requestedAt: new Date()
        };
        await booking.save();

        const populated = await Booking.findById(booking._id)
            .populate('studentId', 'name')
            .populate('tutorId', 'name');

        await createNotification({
            userId: booking.tutorId,
            type: 'reschedule_request',
            title: 'Reschedule Requested',
            message: `${populated.studentId.name} wants to reschedule the ${booking.subject} session${reason ? ': ' + reason : ''}`,
            link: '/tutor-dashboard?tab=sessions',
            bookingId: booking._id
        });

        res.json({ message: 'Reschedule request sent', booking });
    } catch (err) {
        return safe500(res, err, '[requestReschedule]');
    }
};

// @desc    Respond to reschedule request (tutor approves/declines)
// @route   PATCH /api/bookings/:id/reschedule-respond
// @access  Private (Tutor)
const respondReschedule = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        if (booking.tutorId.toString() !== req.user.id)
            return res.status(403).json({ message: 'Not authorized' });
        if (!booking.rescheduleRequest || booking.rescheduleRequest.status !== 'pending')
            return res.status(400).json({ message: 'No pending reschedule request' });

        const { action } = req.body; // 'approve' | 'decline'
        if (!['approve', 'decline'].includes(action))
            return res.status(400).json({ message: 'action must be approve or decline' });

        booking.rescheduleRequest.status = action === 'approve' ? 'approved' : 'declined';

        if (action === 'approve') {
            if (booking.rescheduleRequest.proposedDate)
                booking.sessionDate = booking.rescheduleRequest.proposedDate;
            if (booking.rescheduleRequest.proposedSchedule)
                booking.preferredSchedule = booking.rescheduleRequest.proposedSchedule;
        }
        await booking.save();

        const populated = await Booking.findById(booking._id)
            .populate('studentId', 'name')
            .populate('tutorId', 'name');

        await createNotification({
            userId: booking.studentId,
            type: action === 'approve' ? 'reschedule_approved' : 'reschedule_declined',
            title: action === 'approve' ? 'Reschedule Approved' : 'Reschedule Declined',
            message: action === 'approve'
                ? `Your reschedule for the ${booking.subject} session with ${populated.tutorId.name} was approved`
                : `Your reschedule request for the ${booking.subject} session was declined`,
            link: '/student-dashboard?tab=sessions',
            bookingId: booking._id
        });

        res.json({ message: `Reschedule ${action}d`, booking });
    } catch (err) {
        return safe500(res, err, '[respondReschedule]');
    }
};

// @desc  Tutor proposes a schedule/subject change → notifies student
// @route PATCH /api/bookings/:id/tutor-change-request
// @access Private (Tutor)
const tutorRequestChange = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        if (booking.tutorId.toString() !== req.user.id)
            return res.status(403).json({ message: 'Not authorized' });
        if (booking.status !== 'approved')
            return res.status(400).json({ message: 'Cannot request change for this booking' });

        const { type = 'reschedule', proposedDate, proposedSchedule, proposedSubject, reason } = req.body;
        if (!reason?.trim()) return res.status(400).json({ message: 'Reason is required' });

        booking.tutorChangeRequest = {
            type,
            proposedDate: proposedDate ? new Date(proposedDate) : null,
            proposedSchedule: proposedSchedule || '',
            proposedSubject: proposedSubject || '',
            reason,
            status: 'pending',
            requestedAt: new Date()
        };
        await booking.save();

        const populated = await Booking.findById(booking._id)
            .populate('studentId', 'name')
            .populate('tutorId', 'name');

        await createNotification({
            userId: booking.studentId,
            type: 'tutor_change_request',
            title: 'Tutor Requested a Change',
            message: `${populated.tutorId.name} is requesting a ${type === 'subject' ? 'subject change' : 'schedule change'} for your ${booking.subject} session. Reason: ${reason}`,
            link: '/student-dashboard?tab=sessions',
            bookingId: booking._id
        });

        res.json({ message: 'Change request sent to student', booking });
    } catch (err) {
        return safe500(res, err, '[tutorRequestChange]');
    }
};

// @desc  Student/parent approves or declines tutor's change request
// @route PATCH /api/bookings/:id/tutor-change-respond
// @access Private (Student)
const respondTutorChange = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        if (booking.studentId.toString() !== req.user.id)
            return res.status(403).json({ message: 'Not authorized' });
        if (!booking.tutorChangeRequest || booking.tutorChangeRequest.status !== 'pending')
            return res.status(400).json({ message: 'No pending change request' });

        const { action } = req.body;
        if (!['approve', 'decline'].includes(action))
            return res.status(400).json({ message: 'action must be approve or decline' });

        booking.tutorChangeRequest.status = action === 'approve' ? 'approved' : 'declined';

        if (action === 'approve') {
            const tcr = booking.tutorChangeRequest;
            if (tcr.proposedSchedule) booking.preferredSchedule = tcr.proposedSchedule;
            if (tcr.proposedDate) booking.sessionDate = tcr.proposedDate;
            if (tcr.proposedSubject) booking.subject = tcr.proposedSubject;
        }
        await booking.save();

        const populated = await Booking.findById(booking._id)
            .populate('studentId', 'name')
            .populate('tutorId', 'name');

        await createNotification({
            userId: booking.tutorId,
            type: action === 'approve' ? 'change_request_approved' : 'change_request_declined',
            title: action === 'approve' ? 'Change Request Approved' : 'Change Request Declined',
            message: action === 'approve'
                ? `${populated.studentId.name} approved your change request for the ${booking.subject} session`
                : `${populated.studentId.name} declined your change request for the ${booking.subject} session`,
            link: '/tutor-dashboard?tab=sessions',
            bookingId: booking._id
        });

        res.json({ message: `Change request ${action}d`, booking });
    } catch (err) {
        return safe500(res, err, '[respondTutorChange]');
    }
};

module.exports = {
    createBooking,
    getMyBookings,
    getBookingRequests,
    cancelBooking,
    approveBooking,
    rejectBooking,
    completeBooking,
    getTrialStatus,
    requestReschedule,
    respondReschedule,
    tutorRequestChange,
    respondTutorChange
};
