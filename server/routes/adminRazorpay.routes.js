const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/adminRazorpay.controller');

const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    next();
};

router.use(protect, requireAdmin);
router.get('/status', ctrl.status);
router.get('/payments', ctrl.payments);
router.get('/orders', ctrl.orders);
router.get('/refunds', ctrl.refunds);

module.exports = router;
