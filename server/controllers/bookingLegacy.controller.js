const Booking = require('../models/Booking');
const trialBookingController = require('./trialBooking.controller');
const sessionBookingController = require('./sessionBooking.controller');
const dedicatedBookingController = require('./dedicatedBooking.controller');
const { getTrialStatus } = require('./booking.controller');
const {
    resolveBookingCategory,
    getScopedBookingsForUser,
    getScopedPendingRequestsForUser,
    buildCategorizedRequestsResponse
} = require('../services/bookingScope.service');

function logLegacyRoute(req) {
    console.warn(`[DEPRECATED] Legacy booking route used: ${req.method} ${req.originalUrl}`);
}

function getControllerForCategory(category) {
    if (category === 'trial') return trialBookingController;
    if (category === 'session') return sessionBookingController;
    if (category === 'permanent' || category === 'dedicated') return dedicatedBookingController;
    return null;
}

async function dispatchUsingBookingId(req, res, action) {
    const booking = await Booking.findById(req.params.id).select('bookingCategory bookingType');
    if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
    }
    const category = resolveBookingCategory(booking.bookingCategory, booking.bookingType);
    const controller = getControllerForCategory(category);
    if (!controller || typeof controller[action] !== 'function') {
        return res.status(400).json({ message: 'Unsupported legacy booking route action' });
    }
    return controller[action](req, res);
}

const createBooking = async (req, res) => {
    logLegacyRoute(req);
    const category = resolveBookingCategory(req.body.bookingCategory, req.body.bookingType);
    const controller = getControllerForCategory(category);
    if (!controller) {
        return res.status(400).json({ message: 'Invalid booking category' });
    }
    req.body.bookingCategory = category;
    return controller.createBooking(req, res);
};

const getMyBookings = async (req, res) => {
    logLegacyRoute(req);
    const [trialBookings, sessionBookings, dedicatedBookings] = await Promise.all([
        getScopedBookingsForUser(req.user, 'trial'),
        getScopedBookingsForUser(req.user, 'session'),
        getScopedBookingsForUser(req.user, 'dedicated')
    ]);

    if (!trialBookings || !sessionBookings || !dedicatedBookings) {
        return res.status(400).json({ message: 'Invalid role for this route' });
    }

    const bookings = [...trialBookings, ...sessionBookings, ...dedicatedBookings]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json(bookings);
};

const getBookingRequests = async (req, res) => {
    logLegacyRoute(req);
    const [trialRequests, sessionRequests, dedicatedRequests] = await Promise.all([
        getScopedPendingRequestsForUser(req.user, 'trial'),
        getScopedPendingRequestsForUser(req.user, 'session'),
        getScopedPendingRequestsForUser(req.user, 'dedicated')
    ]);

    if (!trialRequests || !sessionRequests || !dedicatedRequests) {
        return res.status(400).json({ message: 'Invalid role for this route' });
    }

    return res.json(buildCategorizedRequestsResponse({
        trialRequests,
        sessionRequests,
        permanentRequests: dedicatedRequests,
        dedicatedRequests
    }));
};

const cancelBooking = async (req, res) => {
    logLegacyRoute(req);
    return dispatchUsingBookingId(req, res, 'cancelBooking');
};

const approveBooking = async (req, res) => {
    logLegacyRoute(req);
    return dispatchUsingBookingId(req, res, 'approveBooking');
};

const rejectBooking = async (req, res) => {
    logLegacyRoute(req);
    return dispatchUsingBookingId(req, res, 'rejectBooking');
};

const completeBooking = async (req, res) => {
    logLegacyRoute(req);
    return dispatchUsingBookingId(req, res, 'completeBooking');
};

const requestReschedule = async (req, res) => {
    logLegacyRoute(req);
    return dispatchUsingBookingId(req, res, 'requestReschedule');
};

const respondReschedule = async (req, res) => {
    logLegacyRoute(req);
    return dispatchUsingBookingId(req, res, 'respondReschedule');
};

const tutorRequestChange = async (req, res) => {
    logLegacyRoute(req);
    return dispatchUsingBookingId(req, res, 'tutorRequestChange');
};

const respondTutorChange = async (req, res) => {
    logLegacyRoute(req);
    return dispatchUsingBookingId(req, res, 'respondTutorChange');
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
