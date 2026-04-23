const Notification = require('../models/Notification');
const User = require('../models/User');
const { CATEGORIES } = require('../constants/notificationCategories');
const { createNotification, invalidatePrefCache } = require('../utils/notificationHelper');

// @desc    List a user's notifications (paginated + filtered)
// @route   GET /api/notifications?page=&limit=&filter=all|unread&category=&since=
// @access  Private
const getNotifications = async (req, res) => {
    try {
        const page   = parseInt(req.query.page, 10)  || 1;
        const limit  = Math.min(parseInt(req.query.limit, 10) || 20, 100);
        const filter = req.query.filter || 'all'; // 'all' | 'unread'
        const category = req.query.category;
        const sinceRaw = req.query.since;

        const q = {
            userId: req.user.id,
            isDeleted: false
        };
        if (filter === 'unread') q.isRead = false;
        if (category && CATEGORIES.includes(category)) q.category = category;
        if (sinceRaw) {
            const sinceDate = new Date(sinceRaw);
            if (Number.isNaN(sinceDate.getTime())) {
                return res.status(400).json({ message: 'Invalid since parameter', code: 'INVALID_SINCE' });
            }
            q.updatedAt = { $gt: sinceDate };
        }

        const skip = sinceRaw ? 0 : (page - 1) * limit;
        const [notifications, total] = await Promise.all([
            Notification.find(q)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('bookingId', 'subject sessionDate')
                .lean(),
            sinceRaw ? Promise.resolve(null) : Notification.countDocuments(q)
        ]);

        res.json({
            notifications,
            pagination: sinceRaw
                ? { page: 1, limit: notifications.length, total: notifications.length, pages: 1, delta: true }
                : { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('[notifications] list failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Unread count (respects the user's non-deleted filter only; preferences already applied at insert time)
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            userId: req.user.id,
            isRead: false,
            isDeleted: false
        });
        res.json({ count });
    } catch (error) {
        console.error('[notifications] unread-count failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Mark one as read
// @route   PATCH /api/notifications/:id/read
// @access  Private (owner only)
const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOne({
            _id: req.params.id,
            userId: req.user.id
        });
        if (!notification) return res.status(404).json({ message: 'Notification not found' });
        notification.isRead = true;
        await notification.save();
        res.json({ message: 'Marked as read', notification });
    } catch (error) {
        console.error('[notifications] markAsRead failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Mark all as read
// @route   PATCH /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user.id, isRead: false, isDeleted: false },
            { isRead: true }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('[notifications] markAllAsRead failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Soft-delete
// @route   DELETE /api/notifications/:id
// @access  Private (owner only)
const deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.findOne({
            _id: req.params.id,
            userId: req.user.id
        });
        if (!notification) return res.status(404).json({ message: 'Notification not found' });
        notification.isDeleted = true;
        await notification.save();
        res.json({ message: 'Notification deleted' });
    } catch (error) {
        console.error('[notifications] delete failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Get user's notification category preferences
// @route   GET /api/notifications/preferences
// @access  Private
const getPreferences = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('notificationPreferences').lean();
        // Fill any missing keys with defaults so the client always gets a full object.
        const prefs = user?.notificationPreferences || {};
        const normalized = CATEGORIES.reduce((acc, key) => {
            acc[key] = prefs[key] !== undefined ? !!prefs[key] : (key !== 'marketing');
            return acc;
        }, {});
        res.json({ preferences: normalized });
    } catch (error) {
        console.error('[notifications] getPreferences failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update user's notification category preferences
// @route   PUT /api/notifications/preferences
// @access  Private
const updatePreferences = async (req, res) => {
    try {
        const incoming = req.body?.preferences || req.body || {};
        const clean = {};
        for (const key of CATEGORIES) {
            if (key in incoming) clean[`notificationPreferences.${key}`] = !!incoming[key];
        }
        if (Object.keys(clean).length === 0) {
            return res.status(400).json({ message: 'No preferences provided', code: 'EMPTY' });
        }
        await User.updateOne({ _id: req.user.id }, { $set: clean });
        invalidatePrefCache(req.user.id);
        const user = await User.findById(req.user.id).select('notificationPreferences').lean();
        const prefs = user?.notificationPreferences || {};
        const normalized = CATEGORIES.reduce((acc, key) => {
            acc[key] = prefs[key] !== undefined ? !!prefs[key] : (key !== 'marketing');
            return acc;
        }, {});
        res.json({ preferences: normalized });
    } catch (error) {
        console.error('[notifications] updatePreferences failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Fire a synthetic notification for the calling user (for QA/verification).
//         Dev-only — refuses outside non-production environments.
// @route   POST /api/notifications/test
// @access  Private (dev only)
const fireTestNotification = async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ message: 'Not found' });
    }
    const { type = 'system_alert', title = 'Test notification', message = 'This is a synthetic test notification.', link } = req.body || {};
    const result = await createNotification({
        userId: req.user.id,
        type, title, message, link,
        idempotencyKey: `test:${req.user.id}:${Date.now()}`
    });
    res.json(result);
};

module.exports = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getPreferences,
    updatePreferences,
    fireTestNotification
};
