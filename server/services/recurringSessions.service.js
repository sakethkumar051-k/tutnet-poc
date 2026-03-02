const Booking = require('../models/Booking');
const { getTutorTimeConflicts, getStudentTimeConflicts, DEFAULT_SESSION_DURATION_MIN } = require('./bookingLifecycle.service');

/**
 * Derive monthsCommitted from dedicated/permanent booking (schema or durationCommitment string).
 * @param {Object} permanent - Dedicated or legacy permanent booking document
 * @returns {number}
 */
function getMonthsCommitted(permanent) {
    if (typeof permanent.monthsCommitted === 'number' && permanent.monthsCommitted >= 1) {
        return permanent.monthsCommitted;
    }
    if (permanent.durationCommitment && typeof permanent.durationCommitment === 'string') {
        const match = permanent.durationCommitment.match(/(\d+)\s*months?/i);
        if (match) return Math.max(1, parseInt(match[1], 10));
    }
    return 1;
}

/**
 * Derive sessionsPerWeek from dedicated/permanent booking (schema, weeklySchedule length, or frequency).
 * @param {Object} permanent - Dedicated or legacy permanent booking document
 * @returns {number}
 */
function getSessionsPerWeek(permanent) {
    if (typeof permanent.sessionsPerWeek === 'number' && permanent.sessionsPerWeek >= 1) {
        return permanent.sessionsPerWeek;
    }
    if (Array.isArray(permanent.weeklySchedule) && permanent.weeklySchedule.length > 0) {
        return permanent.weeklySchedule.length;
    }
    switch (permanent.frequency) {
        case 'weekly': return 1;
        case 'biweekly': return 1; // 1 session every 2 weeks => 0.5/week, round to 1 per 2 weeks - we'll generate every 14 days
        case 'monthly': return 1; // 1 session per month
        default: return 1;
    }
}

/**
 * Generate recurring session dates from preferredStartDate for monthsCommitted * sessionsPerWeek per month.
 * Uses ~4 weeks per month; spreads sessions evenly within each week when sessionsPerWeek > 1.
 * @param {Date} startDate
 * @param {number} monthsCommitted
 * @param {number} sessionsPerWeek
 * @returns {Date[]}
 */
function generateSessionDates(startDate, monthsCommitted, sessionsPerWeek) {
    const dates = [];
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const totalWeeks = Math.max(1, monthsCommitted * 4);
    const totalSessions = totalWeeks * sessionsPerWeek;
    const intervalDays = 7 / sessionsPerWeek;

    for (let i = 0; i < totalSessions; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + Math.round(i * intervalDays));
        dates.push(d);
    }

    return dates;
}

/**
 * Create child session bookings for an approved dedicated (or legacy permanent) booking.
 * Child bookings: bookingCategory = 'session', parentBookingId = parent._id, status = 'pending'.
 * @param {Object} permanentBooking - Approved dedicated/permanent Booking document
 * @param {{ session?: ClientSession }} options - Optional mongoose session for transactions
 * @returns {Promise<{ created: number, bookingIds: ObjectId[] }>}
 */
async function generateRecurringSessionBookings(permanentBooking, options = {}) {
    const permanent = permanentBooking;
    const startDate = permanent.preferredStartDate;
    if (!startDate) {
        return { created: 0, bookingIds: [] };
    }

    const monthsCommitted = getMonthsCommitted(permanent);
    const sessionsPerWeek = getSessionsPerWeek(permanent);
    const subject = permanent.subject || (Array.isArray(permanent.subjects) && permanent.subjects.length > 0 ? permanent.subjects[0] : 'General');

    const sessionDates = generateSessionDates(new Date(startDate), monthsCommitted, sessionsPerWeek);

    let countQuery = Booking.countDocuments({ parentBookingId: permanent._id });
    if (options.session) countQuery = countQuery.session(options.session);
    const existingChildCount = await countQuery;
    if (existingChildCount > 0) {
        return { created: 0, bookingIds: [] };
    }

    // Conflict check: only create child sessions that don't conflict with existing tutor or student bookings
    const nonConflictingDates = [];
    for (const sessionDate of sessionDates) {
        const [tutorConflicts, studentConflicts] = await Promise.all([
            getTutorTimeConflicts(permanent.tutorId, sessionDate, DEFAULT_SESSION_DURATION_MIN, null),
            getStudentTimeConflicts(permanent.studentId, sessionDate, DEFAULT_SESSION_DURATION_MIN, null)
        ]);
        if (tutorConflicts.length === 0 && studentConflicts.length === 0) {
            nonConflictingDates.push(sessionDate);
        }
    }

    const sessionBookings = nonConflictingDates.map((sessionDate) => ({
        studentId: permanent.studentId,
        tutorId: permanent.tutorId,
        subject,
        preferredSchedule: sessionDate.toISOString(),
        sessionDate,
        bookingCategory: 'session',
        parentBookingId: permanent._id,
        status: 'pending',
        currentTutorId: permanent.currentTutorId || undefined
    }));

    if (sessionBookings.length === 0) {
        return { created: 0, bookingIds: [] };
    }

    const insertOptions = options.session ? { session: options.session } : {};
    const inserted = await Booking.insertMany(sessionBookings, insertOptions);
    return { created: inserted.length, bookingIds: inserted.map((b) => b._id) };
}

module.exports = {
    generateRecurringSessionBookings,
    getMonthsCommitted,
    getSessionsPerWeek,
    generateSessionDates
};
