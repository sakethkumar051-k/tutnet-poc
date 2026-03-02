const bookingController = require('./booking.controller');
const {
    CATEGORY_REQUEST_KEY,
    getBookingInScope,
    getScopedBookingsForUser,
    getScopedPendingRequestsForUser,
    validateRouteCategoryPayload,
    validateCategorySpecificFields
} = require('../services/bookingScope.service');

function buildScopedBookingController(routeCategory) {
    const withCategoryGuard = (handler) => async (req, res) => {
        const scoped = await getBookingInScope(req.params.id, routeCategory);
        if (!scoped.ok) {
            return res.status(scoped.status).json(scoped.body);
        }
        req.scopedBooking = scoped.booking;
        return handler(req, res);
    };

    const createBooking = async (req, res) => {
        const mismatchMessage = validateRouteCategoryPayload(routeCategory, req.body);
        if (mismatchMessage) {
            return res.status(400).json({
                message: mismatchMessage,
                code: 'BOOKING_CATEGORY_MISMATCH'
            });
        }

        const categoryValidationError = validateCategorySpecificFields(routeCategory, req.body);
        if (categoryValidationError) {
            return res.status(400).json(categoryValidationError);
        }

        // Permanent and dedicated are structurally separate; store as route category.
        const storageCategory = routeCategory;
        req.body.bookingCategory = storageCategory;
        if ((storageCategory === 'dedicated' || storageCategory === 'permanent') && req.body.monthsCommitted && !req.body.durationCommitment) {
            req.body.durationCommitment = `${req.body.monthsCommitted} months`;
        }

        return bookingController.createBooking(req, res);
    };

    const getMyBookings = async (req, res) => {
        const bookings = await getScopedBookingsForUser(req.user, routeCategory);
        if (!bookings) {
            return res.status(400).json({ message: 'Invalid role for this route' });
        }
        return res.json(bookings);
    };

    const getBookingRequests = async (req, res) => {
        const requests = await getScopedPendingRequestsForUser(req.user, routeCategory);
        if (!requests) {
            return res.status(400).json({ message: 'Invalid role for this route' });
        }

        return res.json({
            [CATEGORY_REQUEST_KEY[routeCategory]]: requests
        });
    };

    return {
        createBooking,
        getMyBookings,
        getBookingRequests,
        cancelBooking: withCategoryGuard(bookingController.cancelBooking),
        approveBooking: withCategoryGuard(bookingController.approveBooking),
        rejectBooking: withCategoryGuard(bookingController.rejectBooking),
        completeBooking: withCategoryGuard(bookingController.completeBooking),
        requestReschedule: withCategoryGuard(bookingController.requestReschedule),
        respondReschedule: withCategoryGuard(bookingController.respondReschedule),
        tutorRequestChange: withCategoryGuard(bookingController.tutorRequestChange),
        respondTutorChange: withCategoryGuard(bookingController.respondTutorChange),
        getTrialStatus: bookingController.getTrialStatus
    };
}

module.exports = { buildScopedBookingController };
