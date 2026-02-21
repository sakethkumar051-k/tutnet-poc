const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { sendMessage, getConversation, getConversationList, getUnreadCount } = require('../controllers/message.controller');

router.use(protect);

router.post('/', sendMessage);
router.get('/conversations', getConversationList);
router.get('/unread-count', getUnreadCount);
router.get('/:userId', getConversation);

module.exports = router;
