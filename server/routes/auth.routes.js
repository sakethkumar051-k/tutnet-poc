const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    getMe,
    verifyAdminSecret,
    forgotPassword,
    resetPassword,
    updateProfile,
    refreshAccessToken,
    logoutUser
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh', refreshAccessToken);
router.post('/logout', logoutUser);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile); // New onboarding route
router.post('/verify-admin', protect, verifyAdminSecret);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Google OAuth Routes
const passport = require('passport');
const crypto = require('crypto');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwtTokens');
const { setRefreshTokenCookie, setOauthSignupRoleCookie, clearOauthSignupRoleCookie } = require('../utils/authCookies');

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
    if (entry.refreshToken) {
        setRefreshTokenCookie(res, entry.refreshToken);
    }
    return res.json({ token: entry.accessToken || entry.token });
});

// @desc    Initiate Google OAuth (?role=tutor|student — stored in session for new signups only)
// @route   GET /api/auth/google
router.get('/google',
    (req, res, next) => {
        const q = req.query?.role;
        const resolved = q === 'tutor' || q === 'student' ? q : 'student';
        req.session.oauthSignupRole = resolved;
        // Reliable fallback: session cookies often fail across SPA → API → Google redirects
        setOauthSignupRoleCookie(res, resolved);
        req.session.save((err) => {
            if (err) return next(err);
            next();
        });
    },
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
            try {
                if (req.session) {
                    delete req.session.oauthSignupRole;
                    await new Promise((resolve, reject) => {
                        req.session.save((err) => (err ? reject(err) : resolve()));
                    });
                }
            } catch (sessionErr) {
                console.warn('OAuth session cleanup (non-fatal):', sessionErr?.message || sessionErr);
            }
            clearOauthSignupRoleCookie(res);
            const accessToken = generateAccessToken(req.user.id);
            const refreshToken = generateRefreshToken(req.user.id);

            // Generate a short-lived one-time code so tokens never appear in the URL
            const code = crypto.randomBytes(32).toString('hex');
            oauthCodeStore.set(code, {
                accessToken,
                refreshToken,
                expiresAt: Date.now() + 60_000
            }); // 60s TTL

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
