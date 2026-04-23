const express = require('express');
const router = express.Router();
const {
    getTutors,
    getTutorById,
    getTutorProfileByUserId,
    updateTutorProfile,
    getMyProfile,
    submitForApproval,
    checkProfileComplete,
    getProfileOptions,
    getRecommendations
} = require('../controllers/tutor.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

// Specific routes must come before parameterized routes
router.get('/', getTutors);
router.get('/me', protect, authorize('tutor'), getMyProfile);
router.get('/my-profile', protect, authorize('tutor'), getMyProfile); // Alias for frontend compatibility
// Allow profile/complete for any authenticated user (role might not be set yet during onboarding)
router.get('/profile/complete', protect, checkProfileComplete);
router.get('/profile/options', getProfileOptions);
router.get('/recommendations', protect, authorize('student'), getRecommendations);
router.get('/profile-by-user/:userId', getTutorProfileByUserId);
router.put('/profile', protect, authorize('tutor'), updateTutorProfile);
router.patch('/profile/submit', protect, authorize('tutor'), submitForApproval);
router.patch('/availability', protect, authorize('tutor'), async (req, res) => {
    try {
        const TutorProfile = require('../models/TutorProfile');
        const { weeklyAvailability, availabilityMode } = req.body;
        const update = {};
        if (Array.isArray(weeklyAvailability)) update.weeklyAvailability = weeklyAvailability;
        if (availabilityMode === 'fixed' || availabilityMode === 'flexible') update.availabilityMode = availabilityMode;
        if (Object.keys(update).length === 0)
            return res.status(400).json({ message: 'Provide weeklyAvailability and/or availabilityMode' });
        const profile = await TutorProfile.findOneAndUpdate(
            { userId: req.user.id },
            { $set: update },
            { new: true }
        );
        if (!profile) return res.status(404).json({ message: 'Tutor profile not found' });
        res.json({ weeklyAvailability: profile.weeklyAvailability, availabilityMode: profile.availabilityMode });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
// Toggle vacation mode — tutor goes on leave (hidden from search)
router.patch('/vacation', protect, authorize('tutor'), async (req, res) => {
    try {
        const TutorProfile = require('../models/TutorProfile');
        const { active, from, to, message } = req.body;
        if (typeof active !== 'boolean') {
            return res.status(400).json({ message: '`active` must be a boolean' });
        }
        const update = {
            'vacation.active': active,
            'vacation.from': active ? (from ? new Date(from) : new Date()) : null,
            'vacation.to': active && to ? new Date(to) : null,
            'vacation.message': active ? String(message || '').slice(0, 300) : ''
        };
        const profile = await TutorProfile.findOneAndUpdate(
            { userId: req.user.id },
            { $set: update },
            { new: true }
        );
        if (!profile) return res.status(404).json({ message: 'Tutor profile not found' });
        res.json({ vacation: profile.vacation });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Parameterized route must be last
router.get('/:id', getTutorById);

module.exports = router;
