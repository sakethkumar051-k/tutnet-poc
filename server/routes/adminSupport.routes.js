const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/adminSupport.controller');

const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

router.use(protect, requireAdmin);

router.get('/users', ctrl.listUsers);
router.get('/users/:id/full', ctrl.getUserFull);
router.patch('/users/:id/active', ctrl.toggleUserActive);
router.post('/users/:id/notes', ctrl.addAdminNote);
router.post('/users/:id/password-reset', ctrl.generatePasswordReset);
router.post('/users/:id/credit', ctrl.issueCredit);
router.post('/bookings/:id/cancel', ctrl.cancelBooking);
router.post('/payments/:id/refund', ctrl.refundPayment);
router.post('/tutors/:id/clear-risk', ctrl.clearTutorRisk);

module.exports = router;
