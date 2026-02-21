const express = require('express');
const router = express.Router();
const {
    getSessionFeedback,
    submitTutorFeedback,
    submitStudentFeedback,
    addStudyMaterial,
    updateStudyMaterial,
    addHomework,
    updateHomeworkStatus,
    markAttendance,
    getProgressReports
} = require('../controllers/sessionFeedback.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.use(protect);

router.get('/booking/:bookingId', getSessionFeedback);
router.post('/booking/:bookingId/tutor-feedback', authorize('tutor', 'admin'), submitTutorFeedback);
router.post('/booking/:bookingId/student-feedback', authorize('student'), submitStudentFeedback);
router.post('/booking/:bookingId/study-material', authorize('tutor', 'admin'), addStudyMaterial);
router.put('/study-material/:feedbackId/:materialIndex', authorize('tutor', 'admin'), updateStudyMaterial);
router.post('/booking/:bookingId/homework', authorize('tutor', 'admin'), addHomework);
router.patch('/homework/:feedbackId/:homeworkIndex', authorize('student', 'tutor', 'admin'), updateHomeworkStatus);
router.post('/booking/:bookingId/attendance', authorize('tutor', 'admin'), markAttendance);
router.get('/progress-reports', getProgressReports);

module.exports = router;

