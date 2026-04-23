const Booking = require('../models/Booking');
const User = require('../models/User');
const { createNotification } = require('../utils/notificationHelper');

async function notifyTrialExpired(booking) {
    const [student, tutor] = await Promise.all([
        User.findById(booking.studentId).select('name email').lean(),
        User.findById(booking.tutorId).select('name email').lean()
    ]);
    const subj = booking.subject || 'your subject';

    await createNotification({
        userId: booking.studentId,
        type: 'trial_expired',
        title: 'Demo request expired',
        message: `Your pending demo request for ${subj} with ${tutor?.name || 'the tutor'} was cancelled because there was no response within 48 hours. You can book again anytime.`,
        link: '/student-dashboard?tab=sessions',
        bookingId: booking._id
    });

    await createNotification({
        userId: booking.tutorId,
        type: 'trial_expired',
        title: 'Demo request expired',
        message: `A pending demo request from ${student?.name || 'a student'} for ${subj} expired without approval.`,
        link: '/tutor-dashboard?tab=sessions',
        bookingId: booking._id
    });
}

/**
 * Expire pending trials one document at a time so each expiry can trigger notifications.
 * Uses findOneAndUpdate with a filter so concurrent workers rarely double-process the same doc.
 */
async function expirePendingTrials() {
    const now = new Date();
    let modifiedCount = 0;

    for (;;) {
        const updated = await Booking.findOneAndUpdate(
            {
                bookingCategory: 'trial',
                status: 'pending',
                trialExpiresAt: { $lt: now }
            },
            {
                $set: {
                    status: 'cancelled',
                    cancelledBy: 'system',
                    cancellationReason: 'Demo request expired — no tutor response within the allowed time.'
                }
            },
            { new: true }
        );

        if (!updated) break;

        modifiedCount += 1;
        try {
            await notifyTrialExpired(updated);
        } catch (err) {
            console.error('[trialExpiry] notify failed:', err.message);
        }
    }

    if (modifiedCount > 0) {
        console.log(`[trialExpiry] Cancelled ${modifiedCount} expired trial(s) with notifications.`);
    }
    return { modifiedCount };
}

/**
 * Auto-expire pending trial/session bookings whose sessionDate has passed.
 */
async function expirePendingSessionsWithPastDate() {
    const now = new Date();
    let modifiedCount = 0;

    for (;;) {
        const updated = await Booking.findOneAndUpdate(
            {
                bookingCategory: { $in: ['trial', 'session'] },
                status: 'pending',
                sessionDate: { $lt: now }
            },
            {
                $set: {
                    status: 'cancelled',
                    cancelledBy: 'system',
                    cancellationReason: 'Scheduled time passed before the booking was confirmed.'
                }
            },
            { new: true }
        );

        if (!updated) break;

        modifiedCount += 1;
        try {
            const [student, tutor] = await Promise.all([
                User.findById(updated.studentId).select('name').lean(),
                User.findById(updated.tutorId).select('name').lean()
            ]);
            await createNotification({
                userId: updated.studentId,
                type: 'session_expired',
                title: 'Session request cancelled',
                message: `Your pending session for ${updated.subject || 'a class'} was cancelled because the scheduled time passed without confirmation.`,
                link: '/student-dashboard?tab=sessions',
                bookingId: updated._id
            });
            await createNotification({
                userId: updated.tutorId,
                type: 'session_expired',
                title: 'Session request cancelled',
                message: `A pending session with ${student?.name || 'a student'} for ${updated.subject || 'a class'} was cancelled (past date).`,
                link: '/tutor-dashboard?tab=sessions',
                bookingId: updated._id
            });
        } catch (err) {
            console.error('[pendingSessionExpiry] notify failed:', err.message);
        }
    }

    if (modifiedCount > 0) {
        console.log(`[pendingSessionExpiry] Cancelled ${modifiedCount} pending session(s) with past sessionDate.`);
    }
    return { modifiedCount };
}

module.exports = { expirePendingTrials, expirePendingSessionsWithPastDate };
