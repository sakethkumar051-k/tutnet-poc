const express = require('express');
const router = express.Router();
const { getMyTutorForStudent } = require('../controllers/currentTutor.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.use(protect);

// GET /api/my-tutor/student — returns [{ tutorId, subjects, startDate, monthsCommitted, status }]
router.get('/student', authorize('student'), getMyTutorForStudent);

module.exports = router;
