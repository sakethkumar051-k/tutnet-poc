const express = require('express');
const router = express.Router();
const { getMyDemos } = require('../controllers/demos.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

router.use(protect);
router.get('/my-demos', authorize('student'), getMyDemos);

module.exports = router;
