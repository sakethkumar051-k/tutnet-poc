const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const {
    createOrder,
    verifyPayment,
    handleWebhook,
    initiateRefund,
    getPaymentByBooking,
    getTutorEarnings,
    getStudentPaymentHistory,
    logManualPayment
} = require('../controllers/payment.controller');

// ---------------------------------------------------------------------------
// Webhook — must be BEFORE the global `protect` middleware because Razorpay
// does not send a Bearer token. Signature verification is inside the handler.
// ---------------------------------------------------------------------------
router.post('/webhook', handleWebhook);

// All routes below require authentication
router.use(protect);

// Student routes
router.post('/create-order', authorize('student'), createOrder);
router.post('/verify', authorize('student'), verifyPayment);
router.post('/refund/:bookingId', authorize('student'), initiateRefund);
router.get('/student-history', authorize('student'), getStudentPaymentHistory);
router.get('/booking/:bookingId', getPaymentByBooking); // student + tutor

// Tutor routes
router.get('/tutor-earnings', authorize('tutor'), getTutorEarnings);
router.post('/manual', authorize('tutor'), logManualPayment);

module.exports = router;
