const express = require('express');
const router = express.Router();
const {
    getPendingTutors,
    approveTutor,
    rejectTutor,
    getAllTutors,
    getTutorHistory,
    getPendingBookings,
    approveBooking,
    rejectBooking,
    getAnalytics,
    generateReport,
    getUserActivity,
    sendMassCommunication,
    sendAlertToUser,
    getUsers,
    getAttendanceCrossCheck,
    getAtRiskPatterns
} = require('../controllers/admin.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

// All routes are protected and restricted to admin
router.use(protect);
router.use(authorize('admin'));

router.get('/tutors/pending', getPendingTutors);
router.get('/tutors', getAllTutors);
router.get('/tutors/:id/history', getTutorHistory);
router.patch('/tutors/:id/approve', approveTutor);
router.patch('/tutors/:id/reject', rejectTutor);

router.get('/bookings/pending', getPendingBookings);
router.patch('/bookings/:id/approve', approveBooking);
router.patch('/bookings/:id/reject', rejectBooking);

router.get('/analytics', getAnalytics);
router.get('/reports', generateReport);
router.get('/activity', getUserActivity);
router.post('/mass-communication', sendMassCommunication);
router.post('/send-alert', sendAlertToUser);
router.get('/users', getUsers);
router.get('/attendance/cross-check', getAttendanceCrossCheck);
router.get('/patterns', getAtRiskPatterns);

module.exports = router;
