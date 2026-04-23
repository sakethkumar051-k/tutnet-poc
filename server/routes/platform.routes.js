const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/platform.controller');

const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    next();
};

// Try to attach user if a Bearer token is present, but still allow anonymous contact.
const optionalProtect = (req, res, next) => {
    if (req.headers.authorization?.startsWith('Bearer ')) {
        return protect(req, res, () => next());
    }
    next();
};

// Public contact form
router.post('/contact', optionalProtect, ctrl.submitContact);

// Admin contact inbox
router.get('/admin/contact', protect, requireAdmin, ctrl.adminListContact);
router.patch('/admin/contact/:id', protect, requireAdmin, ctrl.adminUpdateContact);

// Calendar export — student or tutor
router.get('/calendar/mine.ics', protect, ctrl.icsExport);

// Tutor-facing payout ledger
router.get('/payouts/mine', protect, ctrl.myPayouts);

module.exports = router;
