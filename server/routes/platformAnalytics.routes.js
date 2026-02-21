const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { getPlatformAnalytics } = require('../controllers/platformAnalytics.controller');

router.get('/platform', protect, authorize('admin'), getPlatformAnalytics);

module.exports = router;
