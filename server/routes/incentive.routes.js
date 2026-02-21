const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { getTutorIncentives } = require('../controllers/incentive.controller');

router.use(protect);
router.get('/summary', authorize('tutor'), getTutorIncentives);

module.exports = router;
