const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { validate, rules } = require('../utils/validate');
const ctrl = require('../controllers/offPlatformReport.controller');

// Admin check helper
const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

// Parent submits
router.post('/', protect,
    validate({
        tutorId: [rules.required, rules.objectId],
        bookingId: [rules.objectId],
        description: [rules.required, rules.string, rules.minLength(10), rules.maxLength(2000)]
    }),
    ctrl.submitReport
);
// Parent views own reports
router.get('/mine', protect, ctrl.getMyReports);

// Admin queue + resolve
router.get('/admin', protect, requireAdmin, ctrl.adminListReports);
router.post('/admin/:id/resolve', protect, requireAdmin,
    validate({
        verdict: [rules.required, rules.oneOf(['verified', 'dismissed', 'false_report'])],
        adminNote: [rules.string, rules.maxLength(1000)]
    }),
    ctrl.adminResolve
);

module.exports = router;
