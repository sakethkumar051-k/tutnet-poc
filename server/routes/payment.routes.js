const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { getTutorEarnings, logPayment, getStudentPaymentHistory } = require('../controllers/payment.controller');

router.use(protect);

router.get('/tutor-earnings', authorize('tutor'), getTutorEarnings);
router.post('/', authorize('tutor'), logPayment);
router.get('/student-history', authorize('student'), getStudentPaymentHistory);

module.exports = router;
