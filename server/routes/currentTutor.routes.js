const express = require('express');
const router = express.Router();
const {
    getCurrentTutors,
    getCurrentStudents,
    getCurrentTutorDetails,
    endRelationship,
    endRelationshipAsTutor,
    getTodaysSessions,
    getProgressAnalytics
} = require('../controllers/currentTutor.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.use(protect);

// Student routes
router.get('/student/my-tutors', authorize('student'), getCurrentTutors);
router.get('/student/tutor/:tutorId', authorize('student'), getCurrentTutorDetails);
router.post('/student/end/:currentTutorId', authorize('student'), endRelationship);

// Tutor routes
router.get('/tutor/my-students', authorize('tutor'), getCurrentStudents);
router.get('/tutor/student/:studentId', authorize('tutor'), getCurrentTutorDetails);
router.post('/tutor/end/:currentTutorId', authorize('tutor'), endRelationshipAsTutor);

// Common routes
router.get('/today', getTodaysSessions);
router.get('/analytics/:currentTutorId', getProgressAnalytics);

module.exports = router;

