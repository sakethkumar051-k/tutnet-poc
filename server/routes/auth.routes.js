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
const crypto = require('crypto');

// In-memory one-time code store { code -> { token, expiresAt } }
// Simple and sufficient for a single-instance server.
// For multi-instance deployments, replace with Redis.
const oauthCodeStore = new Map();

// Clean up expired codes every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [code, val] of oauthCodeStore.entries()) {
        if (val.expiresAt < now) oauthCodeStore.delete(code);
    }
}, 5 * 60 * 1000);

// @desc    Exchange a one-time OAuth code for a JWT
// @route   GET /api/auth/oauth-token/:code
router.get('/oauth-token/:code', (req, res) => {
    const { code } = req.params;
    const entry = oauthCodeStore.get(code);

    if (!entry) {
        return res.status(400).json({ message: 'Invalid or expired sign-in code. Please try again.' });
    }
    if (entry.expiresAt < Date.now()) {
        oauthCodeStore.delete(code);
        return res.status(400).json({ message: 'Sign-in code has expired. Please try again.' });
    }

    // One-time use — delete immediately after first exchange
    oauthCodeStore.delete(code);
    return res.json({ token: entry.token });
});

// @desc    Initiate Google OAuth
// @route   GET /api/auth/google
router.get('/google',
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        prompt: 'select_account'
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
        session: false
    }),
    async (req, res) => {
        console.log('Google Auth Successful, User:', req.user?._id);
        try {
            const token = jwt.sign(
                { id: req.user.id },
                process.env.JWT_SECRET,
                { expiresIn: '30d' }
            );

            // Generate a short-lived one-time code so the JWT never appears in the URL
            const code = crypto.randomBytes(32).toString('hex');
            oauthCodeStore.set(code, { token, expiresAt: Date.now() + 60_000 }); // 60s TTL

            const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
            const needsOnboarding = req.user.isNew ||
                !req.user.phone ||
                !req.user.location?.area ||
                req.user.location?.area === 'Not specified';

            if (needsOnboarding) {
                console.log('User needs onboarding, redirecting to complete profile...');
                res.redirect(`${clientUrl}/complete-profile?code=${code}`);
            } else {
                console.log('User complete, redirecting to oauth-success...');
                res.redirect(`${clientUrl}/oauth-success?code=${code}`);
            }
        } catch (error) {
            console.error('OAuth Callback Error:', error);
            const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
            res.redirect(`${clientUrl}/login?error=token_generation_failed`);
        }
    }
);

module.exports = router;
