const Booking = require('../models/Booking');

const MAX_ACTIVE_TRIALS = 3;

/** GET /api/demos/my-demos - Student's demo usage (for demo modal) */
const getMyDemos = async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ message: 'Students only' });
        }
        const demosUsed = await Booking.countActiveTrials(req.user.id);
        const demosRemaining = Math.max(0, MAX_ACTIVE_TRIALS - demosUsed);
        res.json({ demosUsed, demosRemaining });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = { getMyDemos };
