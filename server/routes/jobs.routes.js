const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { sendSessionReminders } = require('../jobs/sessionReminders');

// Triggered by cron or admin — sends 24h and 1h reminders
router.post('/send-reminders', protect, authorize('admin'), async (req, res) => {
    try {
        const result = await sendSessionReminders();
        res.json({ message: 'Reminders sent', ...result });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
