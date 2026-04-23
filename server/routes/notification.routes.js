const express = require('express');
const router = express.Router();
const {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getPreferences,
    updatePreferences,
    fireTestNotification
} = require('../controllers/notification.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

// Static paths first (must come before /:id)
router.get('/unread-count', getUnreadCount);
router.get('/preferences',  getPreferences);
router.put('/preferences',  updatePreferences);
router.patch('/read-all',   markAllAsRead);
router.post('/test',        fireTestNotification);

// List
router.get('/', getNotifications);

// Item actions
router.patch('/:id/read', markAsRead);
router.delete('/:id',     deleteNotification);

module.exports = router;
