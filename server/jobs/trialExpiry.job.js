const Booking = require('../models/Booking');

/**
 * Expire pending trials: set status to 'cancelled' when now > trialExpiresAt.
 * Rule: If bookingCategory = 'trial', status = 'pending', and now > trialExpiresAt → status = 'cancelled'.
 */
async function expirePendingTrials() {
    const now = new Date();
    const result = await Booking.updateMany(
        {
            bookingCategory: 'trial',
            status: 'pending',
            trialExpiresAt: { $lt: now }
        },
        { $set: { status: 'cancelled' } }
    );
    if (result.modifiedCount > 0) {
        console.log(`[trialExpiry] Cancelled ${result.modifiedCount} expired trial(s).`);
    }
    return result;
}

/**
 * Auto-expire pending trial/session bookings whose sessionDate has passed.
 * Rule: bookingCategory in ['trial','session'], status = 'pending', sessionDate < now → status = 'cancelled'.
 */
async function expirePendingSessionsWithPastDate() {
    const now = new Date();
    const result = await Booking.updateMany(
        {
            bookingCategory: { $in: ['trial', 'session'] },
            status: 'pending',
            sessionDate: { $lt: now }
        },
        { $set: { status: 'cancelled' } }
    );
    if (result.modifiedCount > 0) {
        console.log(`[pendingSessionExpiry] Cancelled ${result.modifiedCount} pending session(s) with past sessionDate.`);
    }
    return result;
}

module.exports = { expirePendingTrials, expirePendingSessionsWithPastDate };
