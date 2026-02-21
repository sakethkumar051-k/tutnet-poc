const express = require('express');
const router = express.Router();
const {
    createReview,
    getTutorReviews,
    getStudentReviews
} = require('../controllers/review.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.post('/', protect, authorize('student'), createReview);
router.get('/tutor/:tutorId', getTutorReviews);
router.get('/student/:studentId', protect, getStudentReviews);

module.exports = router;

