const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/bookingLegacy.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.use(protect);

// Trial status check
router.get('/trial-status/:tutorId', authorize('student'), getTrialStatus);

// DEPRECATED compatibility surface.
// Internally dispatches to scoped controllers: /trial-bookings, /session-bookings, /permanent-bookings.
router.post('/', authorize('student', 'tutor'), createBooking);
router.get('/mine', getMyBookings);
router.get('/requests', getBookingRequests);
// Single booking fetch — used by SessionRoom / Jitsi page.
// Defined BEFORE the /:id/action patches so Express matches it correctly.
router.get('/:id', require('../controllers/booking/bookingQueries').getBookingById);
router.patch('/:id/cancel', authorize('student'), cancelBooking);
router.patch('/:id/approve', authorize('tutor'), approveBooking);
router.patch('/:id/reject', authorize('tutor'), rejectBooking);
router.patch('/:id/complete', authorize('tutor'), completeBooking);
router.patch('/:id/reschedule-request', authorize('student'), requestReschedule);
router.patch('/:id/reschedule-respond', authorize('tutor'), respondReschedule);
router.patch('/:id/tutor-change-request', authorize('tutor'), tutorRequestChange);
router.patch('/:id/tutor-change-respond', authorize('student'), respondTutorChange);

module.exports = router;

