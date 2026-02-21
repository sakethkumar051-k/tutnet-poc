const express = require('express');
const router = express.Router();
const {
    getProgressReports,
    getProgressReportById,
    createProgressReport,
    updateProgressReport,
    getStudentProgress,
    getTutorProgressReports
} = require('../controllers/progressReport.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.use(protect);

router.get('/', getProgressReports);
router.get('/student/:studentId', authorize('student', 'tutor', 'admin'), getStudentProgress);
router.get('/tutor', authorize('tutor'), getTutorProgressReports);
router.get('/:id', getProgressReportById);
router.post('/', authorize('tutor', 'admin'), createProgressReport);
router.put('/:id', authorize('tutor', 'admin'), updateProgressReport);

module.exports = router;

