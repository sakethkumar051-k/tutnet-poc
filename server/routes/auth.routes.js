const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    getMe,
    verifyAdminSecret,
    forgotPassword,
    resetPassword,
    updateProfile
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile); // New onboarding route
router.post('/verify-admin', protect, verifyAdminSecret);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Google OAuth Routes
const passport = require('passport');
const jwt = require('jsonwebtoken');

// @desc    Initiate Google OAuth
// @route   GET /api/auth/google
router.get('/google',
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        prompt: 'select_account' // Force account picker
    })
);

// @desc    Google OAuth Callback
// @route   GET /api/auth/google/callback
router.get('/google/callback',
    (req, res, next) => {
        console.log('Google Callback Hit');
        next();
    },
    passport.authenticate('google', {
        failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=oauth_failed`,
        session: false // We use JWT, so no session needed after auth
    }),
    async (req, res) => {
        console.log('Google Auth Successful, User:', req.user?._id);
        try {
            // Generate JWT token
            const token = jwt.sign(
                { id: req.user.id },
                process.env.JWT_SECRET,
                { expiresIn: '30d' }
            );

            const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

            // Check if user is new or missing required fields
            // req.user.isNew is attached in passport config for new users
            // Also check if phone or location is missing
            const needsOnboarding = req.user.isNew || !req.user.phone || !req.user.location || !req.user.location.city;

            if (needsOnboarding) {
                console.log('User needs onboarding, redirecting to complete profile...');
                res.redirect(`${clientUrl}/complete-profile?token=${token}&isNew=true`);
            } else {
                console.log('User complete, redirecting to success...');
                res.redirect(`${clientUrl}/oauth-success?token=${token}`);
            }
        } catch (error) {
            console.error('OAuth Callback Error:', error);
            const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
            res.redirect(`${clientUrl}/login?error=token_generation_failed`);
        }
    }
);

module.exports = router;
