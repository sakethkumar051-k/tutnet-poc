const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/adminRevenue.controller');

const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

router.use(protect, requireAdmin);

router.get('/headline', ctrl.getHeadline);
router.get('/feed', ctrl.getLiveFeed);
router.get('/tiers', ctrl.getTierDistribution);
router.get('/risk', ctrl.getRiskWatchlist);

module.exports = router;
