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
router.get('/recommendations', protect, authorize('student'), getRecommendations);
router.get('/profile-by-user/:userId', getTutorProfileByUserId);
router.put('/profile', protect, authorize('tutor'), updateTutorProfile);
router.patch('/profile/submit', protect, authorize('tutor'), submitForApproval);
router.patch('/availability', protect, authorize('tutor'), async (req, res) => {
    try {
        const TutorProfile = require('../models/TutorProfile');
        const { weeklyAvailability } = req.body;
        if (!Array.isArray(weeklyAvailability))
            return res.status(400).json({ message: 'weeklyAvailability must be an array' });
        const profile = await TutorProfile.findOneAndUpdate(
            { userId: req.user.id },
            { weeklyAvailability },
            { new: true }
        );
        if (!profile) return res.status(404).json({ message: 'Tutor profile not found' });
        res.json({ weeklyAvailability: profile.weeklyAvailability });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
// Parameterized route must be last
router.get('/:id', getTutorById);

module.exports = router;
