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
} = require('../controllers/trialBooking.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.use(protect);

// GET /api/trial-bookings — list trial bookings for the user
router.get('/', getMyBookings);
router.get('/trial-status/:tutorId', authorize('student'), getTrialStatus);
router.post('/', authorize('student', 'tutor'), createBooking);
router.get('/mine', getMyBookings);
router.get('/requests', getBookingRequests);
router.patch('/:id/cancel', authorize('student'), cancelBooking);
router.patch('/:id/approve', authorize('tutor'), approveBooking);
router.patch('/:id/reject', authorize('tutor'), rejectBooking);
router.patch('/:id/complete', authorize('tutor'), completeBooking);
router.patch('/:id/reschedule-request', authorize('student'), requestReschedule);
router.patch('/:id/reschedule-respond', authorize('tutor'), respondReschedule);
router.patch('/:id/tutor-change-request', authorize('tutor'), tutorRequestChange);
router.patch('/:id/tutor-change-respond', authorize('student'), respondTutorChange);

module.exports = router;
