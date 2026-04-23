const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const {
    markViewedByTutor,
    updateSessionPresence,
    updateSessionJoinUrl
} = require('../controllers/bookingActions.controller');

router.use(protect);

router.patch('/:id/viewed-by-tutor', authorize('tutor'), markViewedByTutor);
router.patch('/:id/session-presence', updateSessionPresence);
router.patch('/:id/session-join-url', authorize('tutor'), updateSessionJoinUrl);

module.exports = router;
