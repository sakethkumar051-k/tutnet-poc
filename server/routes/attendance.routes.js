const express = require('express');
const router = express.Router();
const {
    getAttendance,
    markAttendance,
    updateAttendance,
    getStudentAttendance,
    getTutorAttendance,
    getAttendanceStats,
    parentVerifyAttendance
} = require('../controllers/attendance.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.use(protect);

router.get('/', getAttendance);
router.get('/stats', getAttendanceStats);
router.get('/student/:studentId', authorize('student', 'tutor', 'admin'), getStudentAttendance);
router.get('/tutor', authorize('tutor'), getTutorAttendance);
router.post('/', authorize('tutor', 'admin'), markAttendance);
router.put('/:id', authorize('tutor', 'admin'), updateAttendance);
router.patch('/:id/parent-verify', authorize('student'), parentVerifyAttendance);

module.exports = router;

