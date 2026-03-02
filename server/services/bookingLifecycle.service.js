const Booking = require('../models/Booking');

/** Default session duration in minutes for conflict detection */
const DEFAULT_SESSION_DURATION_MIN = 60;

/** Allowed status transitions: fromStatus -> [toStatus1, toStatus2, ...] */
const VALID_TRANSITIONS = {
    pending: ['approved', 'rejected'],
    approved: ['cancelled', 'completed'],
    rejected: [],
    cancelled: [],
    completed: []
};

/**
 * Check if a status transition is allowed.
 * @param {string} fromStatus - Current booking status
 * @param {string} toStatus - Desired status
 * @returns {boolean}
 */
function canTransition(fromStatus, toStatus) {
    if (!fromStatus || !toStatus) return false;
    const allowed = VALID_TRANSITIONS[fromStatus];
    return Array.isArray(allowed) && allowed.includes(toStatus);
}

/**
 * Whether two sessions overlap (same time window).
 * Sessions are [sessionDate, sessionDate + durationMin).
 * @param {Date} sessionDateA
 * @param {Date} sessionDateB
 * @param {number} durationMin - Duration in minutes (same for both)
 * @returns {boolean}
 */
function sessionsOverlap(sessionDateA, sessionDateB, durationMin = DEFAULT_SESSION_DURATION_MIN) {
    const a = new Date(sessionDateA).getTime();
    const b = new Date(sessionDateB).getTime();
    const d = durationMin * 60 * 1000;
    return a < b + d && a + d > b;
}

/**
 * Find other bookings for the same tutor that overlap the given session time.
 * Considers pending and approved bookings only.
 * @param {ObjectId} tutorId
 * @param {Date} sessionDate
 * @param {number} durationMin
 * @param {ObjectId|null} excludeBookingId - Booking to exclude (e.g. current one)
 * @returns {Promise<Booking[]>}
 */
async function getTutorTimeConflicts(tutorId, sessionDate, durationMin = DEFAULT_SESSION_DURATION_MIN, excludeBookingId = null) {
    const start = new Date(sessionDate);
    const startMs = start.getTime();
    const dMs = durationMin * 60 * 1000;
    const query = {
        tutorId,
        status: { $in: ['pending', 'approved'] },
        sessionDate: { $gt: new Date(startMs - dMs), $lt: new Date(startMs + dMs) }
    };
    if (excludeBookingId) query._id = { $ne: excludeBookingId };

    return Booking.find(query).select('_id sessionDate status subject').lean();
}

/**
 * Find other bookings for the same student that overlap the given session time.
 * @param {ObjectId} studentId
 * @param {Date} sessionDate
 * @param {number} durationMin
 * @param {ObjectId|null} excludeBookingId
 * @returns {Promise<Booking[]>}
 */
async function getStudentTimeConflicts(studentId, sessionDate, durationMin = DEFAULT_SESSION_DURATION_MIN, excludeBookingId = null) {
    const start = new Date(sessionDate);
    const startMs = start.getTime();
    const dMs = durationMin * 60 * 1000;
    const query = {
        studentId,
        status: { $in: ['pending', 'approved'] },
        sessionDate: { $gt: new Date(startMs - dMs), $lt: new Date(startMs + dMs) }
    };
    if (excludeBookingId) query._id = { $ne: excludeBookingId };

    return Booking.find(query).select('_id sessionDate status subject').lean();
}

module.exports = {
    DEFAULT_SESSION_DURATION_MIN,
    VALID_TRANSITIONS,
    canTransition,
    sessionsOverlap,
    getTutorTimeConflicts,
    getStudentTimeConflicts
};
