const Booking = require('../models/Booking');

const BOOKING_CATEGORIES = ['trial', 'session', 'permanent', 'dedicated'];

const CATEGORY_REQUEST_KEY = {
    trial: 'trialRequests',
    session: 'sessionRequests',
    permanent: 'permanentRequests',
    dedicated: 'dedicatedRequests'
};

function resolveBookingCategory(bookingCategory, bookingType) {
    if (BOOKING_CATEGORIES.includes(bookingCategory)) {
        return bookingCategory;
    }
    if (bookingType === 'demo') return 'trial';
    if (bookingType === 'regular') return 'session';
    return 'session';
}

function isCategoryMatch(routeCategory, bookingCategory, bookingType) {
    return resolveBookingCategory(bookingCategory, bookingType) === routeCategory;
}

function validateRouteCategoryPayload(routeCategory, payload = {}) {
    if (payload.bookingCategory && payload.bookingCategory !== routeCategory) {
        return `Category mismatch. This route only accepts "${routeCategory}" bookings.`;
    }
    return null;
}

function validateCategorySpecificFields(routeCategory, payload = {}) {
    if (routeCategory === 'trial') {
        const forbiddenFields = ['preferredStartDate', 'monthsCommitted', 'durationCommitment', 'frequency'];
        const invalidField = forbiddenFields.find((field) => payload[field] !== undefined && payload[field] !== null && payload[field] !== '');
        if (invalidField) {
            return {
                code: 'INVALID_TRIAL_FIELD',
                message: `Field "${invalidField}" is not allowed for trial bookings.`
            };
        }
    }

    const isDedicated = routeCategory === 'dedicated' || routeCategory === 'permanent';
    if (isDedicated) {
        if (!payload.preferredStartDate) {
            return {
                code: 'MISSING_PREFERRED_START_DATE',
                message: 'preferredStartDate is required for dedicated tutor bookings.'
            };
        }
        if (!payload.monthsCommitted && !payload.durationCommitment) {
            return {
                code: 'MISSING_MONTHS_COMMITTED',
                message: 'monthsCommitted or durationCommitment is required for dedicated tutor bookings.'
            };
        }
        if (payload.termsAccepted !== true && payload.termsAccepted !== 'true') {
            return {
                code: 'TERMS_NOT_ACCEPTED',
                message: 'termsAccepted must be true for dedicated tutor bookings.'
            };
        }
    }

    return null;
}

async function getBookingInScope(bookingId, routeCategory) {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
        return {
            ok: false,
            status: 404,
            body: { message: 'Booking not found' }
        };
    }

    const actualCategory = resolveBookingCategory(booking.bookingCategory, booking.bookingType);
    if (actualCategory !== routeCategory) {
        return {
            ok: false,
            status: 400,
            body: {
                message: `Category mismatch. Booking belongs to "${actualCategory}", not "${routeCategory}".`,
                code: 'BOOKING_CATEGORY_MISMATCH'
            }
        };
    }

    return { ok: true, booking, actualCategory };
}

async function getScopedBookingsForUser(user, routeCategory) {
    const query = { bookingCategory: routeCategory };
    if (user.role === 'student') query.studentId = user.id;
    else if (user.role === 'tutor') query.tutorId = user.id;
    else return null;

    return Booking.find(query)
        .populate('studentId', 'name email')
        .populate('tutorId', 'name email')
        .sort({ createdAt: -1 });
}

async function getScopedPendingRequestsForUser(user, routeCategory) {
    const query = { status: 'pending', bookingCategory: routeCategory };
    if (user.role === 'student') query.studentId = user.id;
    else if (user.role === 'tutor') query.tutorId = user.id;
    else return null;

    const requests = await Booking.find(query)
        .populate('studentId', 'name email')
        .populate('tutorId', 'name email')
        .sort({ createdAt: -1 });

    return requests;
}

function buildCategorizedRequestsResponse({
    trialRequests = [],
    sessionRequests = [],
    permanentRequests = [],
    dedicatedRequests = []
}) {
    const dedicated = dedicatedRequests.length ? dedicatedRequests : permanentRequests;
    return {
        trialRequests,
        sessionRequests,
        permanentRequests: dedicated,
        dedicatedRequests: dedicated,
        demoRequests: trialRequests // client expects demoRequests
    };
}

module.exports = {
    BOOKING_CATEGORIES,
    CATEGORY_REQUEST_KEY,
    resolveBookingCategory,
    isCategoryMatch,
    validateRouteCategoryPayload,
    validateCategorySpecificFields,
    getBookingInScope,
    getScopedBookingsForUser,
    getScopedPendingRequestsForUser,
    buildCategorizedRequestsResponse
};
