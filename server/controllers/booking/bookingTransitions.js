const mongoose = require('mongoose');
const Attendance = require('../../models/Attendance');
const Booking = require('../../models/Booking');
const TutorProfile = require('../../models/TutorProfile');
const User = require('../../models/User');
const CurrentTutor = require('../../models/CurrentTutor');
const { createNotification } = require('../../utils/notificationHelper');
const { safe500, isValidObjectId, sanitizeString } = require('../../utils/responseHelpers');
const { generateRecurringSessionBookings } = require('../../services/recurringSessions.service');
const {
    canTransition,
    getTutorTimeConflicts,
    getStudentTimeConflicts,
    DEFAULT_SESSION_DURATION_MIN
} = require('../../services/bookingLifecycle.service');
const { resolveBookingCategory, isWithinTutorAvailability } = require('./shared');

/**
 * Generate a deterministic, hard-to-guess Jitsi Meet URL for an online session.
 * Room names must be unique per booking; we hash the booking id + secret to prevent
 * cross-booking collisions even if two bookings are approved in the same second.
 */
function makeJitsiUrl(bookingId) {
    const crypto = require('crypto');
    const secret = process.env.JITSI_ROOM_SECRET || process.env.JWT_SECRET || 'tutnet';
    const hash = crypto.createHash('sha256').update(`${bookingId}:${secret}`).digest('hex').slice(0, 20);
    const domain = process.env.JITSI_DOMAIN || 'meet.jit.si';
    return `https://${domain}/tutnet-${hash}`;
}
const { emitBookingInvalidate } = require('../../socket/io');
const { evaluateAndPersistTier } = require('../../services/commissionTier.service');
const { onSessionCompleted, onTierUpgrade, onTrialConvertedParent, onDemoConverted } = require('../../services/incentiveEngine.service');

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
        booking.cancelledBy = 'student';
        if (req.body?.cancellationReason) {
            booking.cancellationReason = sanitizeString(String(req.body.cancellationReason), 1000);
        } else {
            booking.cancellationReason = 'Cancelled by student.';
        }
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
                const Payment = require('../../models/Payment');
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

        emitBookingInvalidate(booking);
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
            // Auto-generate a Jitsi meeting URL for online-mode tutors when one doesn't already exist.
            // Tutor mode comes from TutorProfile; we generate once per booking so the URL is stable.
            if (!b.sessionJoinUrl) {
                const tp = await TutorProfile.findOne({ userId: b.tutorId }).select('mode').lean();
                if (tp && (tp.mode === 'online' || tp.mode === 'both')) {
                    b.sessionJoinUrl = makeJitsiUrl(String(b._id));
                    await b.save(opts);
                }
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

        if (!booking.viewedByTutorAt) {
            booking.viewedByTutorAt = new Date();
            await booking.save();
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

        emitBookingInvalidate(populatedBooking);
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
        booking.cancelledBy = 'tutor';
        booking.cancellationReason = req.body?.cancellationReason
            ? sanitizeString(String(req.body.cancellationReason), 1000)
            : 'Declined by tutor.';
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

        emitBookingInvalidate(populatedBooking);
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
        if (booking.plan) {
            booking.sessionsConsumed = (booking.sessionsConsumed || 0) + 1;
        }
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

        // ═════════════════════════════════════════════════════════════════
        // REVENUE MODEL HOOKS — tier progression + milestone incentives
        // ═════════════════════════════════════════════════════════════════
        try {
            const tutorProfile = await TutorProfile.findOne({ userId: booking.tutorId });
            if (tutorProfile) {
                const previousTier = tutorProfile.tier;
                tutorProfile.totalSessions = (tutorProfile.totalSessions || 0) + 1;
                await tutorProfile.save();

                // Milestone incentives (first session, 10-session bonus)
                await onSessionCompleted({
                    tutorId: booking.tutorId,
                    bookingId: booking._id,
                    newTotalSessions: tutorProfile.totalSessions
                }).catch((e) => console.error('[completeBooking] onSessionCompleted:', e.message));

                // Re-evaluate tier (may promote to Silver/Gold/Platinum)
                const tierResult = await evaluateAndPersistTier(tutorProfile);
                if (tierResult?.transitioned && tierResult.isPromotion) {
                    await onTierUpgrade({
                        tutorId: booking.tutorId,
                        newTier: tierResult.to,
                        oldTier: tierResult.from
                    }).catch((e) => console.error('[completeBooking] onTierUpgrade:', e.message));

                    // Notify the tutor about their promotion
                    await createNotification({
                        userId: booking.tutorId,
                        type: 'tier_upgraded',
                        title: `You're now a ${tierResult.to.charAt(0).toUpperCase() + tierResult.to.slice(1)} tutor`,
                        message: `Commission drops to ${tutorProfile.currentCommissionRate}% starting your next session.`,
                        link: '/tutor-dashboard?tab=earnings'
                    }).catch(() => {});
                }
            }
        } catch (hookErr) {
            // Never let the revenue hook fail the booking transition
            console.error('[completeBooking] revenue hook error:', hookErr.message);
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

        emitBookingInvalidate(booking);
        res.json({ message: 'Booking marked as completed', booking });
    } catch (error) {
        return safe500(res, error, '[completeBooking]');
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

        emitBookingInvalidate(booking);
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

        emitBookingInvalidate(booking);
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

        emitBookingInvalidate(booking);
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

        emitBookingInvalidate(booking);
        res.json({ message: `Change request ${action}d`, booking });
    } catch (err) {
        return safe500(res, err, '[respondTutorChange]');
    }
};

module.exports = {
    cancelBooking,
    approveBooking,
    rejectBooking,
    completeBooking,
    requestReschedule,
    respondReschedule,
    tutorRequestChange,
    respondTutorChange
};
