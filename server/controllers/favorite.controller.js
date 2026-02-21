const Favorite = require('../models/Favorite');
const TutorProfile = require('../models/TutorProfile');

// @desc    Get all favorites for student
// @route   GET /api/favorites
// @access  Private (Student)
const getFavorites = async (req, res) => {
    try {
        const favorites = await Favorite.find({ studentId: req.user.id })
            .populate('tutorId', 'name email phone location')
            .sort({ createdAt: -1 });

        // Get tutor profiles for favorites
        const tutorIds = favorites.map(f => f.tutorId._id);
        const profiles = await TutorProfile.find({ userId: { $in: tutorIds } })
            .populate('userId', 'name email');

        const favoritesWithProfiles = favorites.map(fav => {
            const profile = profiles.find(p => p.userId._id.toString() === fav.tutorId._id.toString());
            return {
                ...fav.toObject(),
                tutorProfile: profile
            };
        });

        res.json(favoritesWithProfiles);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Add favorite tutor
// @route   POST /api/favorites
// @access  Private (Student)
const addFavorite = async (req, res) => {
    try {
        const { tutorId } = req.body;

        if (!tutorId) {
            return res.status(400).json({ message: 'Tutor ID is required' });
        }

        // Check if already favorited
        const existing = await Favorite.findOne({
            studentId: req.user.id,
            tutorId: tutorId
        });

        if (existing) {
            return res.status(400).json({ message: 'Tutor already in favorites' });
        }

        const favorite = await Favorite.create({
            studentId: req.user.id,
            tutorId: tutorId
        });

        const populated = await Favorite.findById(favorite._id)
            .populate('tutorId', 'name email phone location');

        res.status(201).json(populated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Remove favorite tutor
// @route   DELETE /api/favorites/:tutorId
// @access  Private (Student)
const removeFavorite = async (req, res) => {
    try {
        const favorite = await Favorite.findOneAndDelete({
            studentId: req.user.id,
            tutorId: req.params.tutorId
        });

        if (!favorite) {
            return res.status(404).json({ message: 'Favorite not found' });
        }

        res.json({ message: 'Favorite removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Check if tutor is favorited
// @route   GET /api/favorites/check/:tutorId
// @access  Private (Student)
const checkFavorite = async (req, res) => {
    try {
        const favorite = await Favorite.findOne({
            studentId: req.user.id,
            tutorId: req.params.tutorId
        });

        res.json({ isFavorite: !!favorite });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getFavorites,
    addFavorite,
    removeFavorite,
    checkFavorite
};

