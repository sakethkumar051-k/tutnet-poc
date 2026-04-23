const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { RATE_BANDS, findBandForTutor } = require('../constants/rateBands');
const TutorProfile = require('../models/TutorProfile');

// Public: all rate bands (for the client pricing page to reference too)
router.get('/', (_req, res) => res.json({ bands: RATE_BANDS }));

// Authenticated: my applicable band based on my current profile
router.get('/mine', protect, async (req, res) => {
    try {
        const profile = await TutorProfile.findOne({ userId: req.user._id }).lean();
        if (!profile) return res.json({ band: null, message: 'No tutor profile yet' });
        const band = findBandForTutor(profile);
        res.json({ band, currentRate: profile.hourlyRate, mode: profile.mode });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
