const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const TutorProfile = require('../models/TutorProfile');
const { OAUTH_SIGNUP_ROLE_COOKIE } = require('../utils/authCookies');

// Resolve the OAuth callback URL Google must redirect back to.
// Priority: explicit GOOGLE_CALLBACK_URL > derived from SERVER_URL > localhost dev fallback.
// In production we refuse to silently use a localhost URL, since that guarantees a
// redirect_uri_mismatch with the Google Console registration.
const resolveCallbackURL = () => {
    if (process.env.GOOGLE_CALLBACK_URL) return process.env.GOOGLE_CALLBACK_URL;
    if (process.env.SERVER_URL) {
        return `${process.env.SERVER_URL.replace(/\/$/, '')}/api/auth/google/callback`;
    }
    if (process.env.NODE_ENV === 'production') return null;
    return 'http://localhost:5001/api/auth/google/callback';
};

// Whether Google OAuth is fully configured. The route layer checks this so we can
// surface a clear error to clients instead of letting passport ship placeholder
// credentials to Google (which is what was producing the "invalid client" error).
const isGoogleOAuthConfigured = () => Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    resolveCallbackURL()
);

module.exports = (passport) => {
    if (!isGoogleOAuthConfigured()) {
        const missing = [
            !process.env.GOOGLE_CLIENT_ID && 'GOOGLE_CLIENT_ID',
            !process.env.GOOGLE_CLIENT_SECRET && 'GOOGLE_CLIENT_SECRET',
            !resolveCallbackURL() && 'GOOGLE_CALLBACK_URL (or SERVER_URL)'
        ].filter(Boolean).join(', ');
        console.warn(
            `[auth] Google OAuth disabled — missing env: ${missing}. ` +
            `Set these on your host and ensure the callback URL matches the one ` +
            `registered in the Google Cloud Console.`
        );
        return;
    }

    const callbackURL = resolveCallbackURL();
    console.log(`[auth] Google OAuth enabled. Callback URL: ${callbackURL}`);

    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL,
        passReqToCallback: true
    },
        async (req, accessToken, refreshToken, profile, done) => {
            try {
                console.log('Google OAuth Profile:', profile.id, profile.emails[0].value);

                // Check if user exists with Google ID
                let user = await User.findOne({ googleId: profile.id });

                if (user) {
                    console.log('Existing Google user found:', user._id);
                    return done(null, user);
                }

                // Check if email already exists (link accounts)
                const email = profile.emails[0].value;
                user = await User.findOne({ email });

                if (user) {
                    // Link Google account to existing user (keep existing role)
                    console.log('Linking Google to existing user:', user._id);
                    user.googleId = profile.id;
                    user.authProvider = 'google';
                    user.profilePicture = profile.photos[0]?.value || user.profilePicture;
                    await user.save();
                    return done(null, user);
                }

                // Session may be empty after Google redirect; cookie is set on GET /auth/google (see auth.routes)
                const cookieRole = req.cookies?.[OAUTH_SIGNUP_ROLE_COOKIE];
                const sessionRole = req.session?.oauthSignupRole;
                const intentRole = sessionRole === 'tutor' || sessionRole === 'student'
                    ? sessionRole
                    : (cookieRole === 'tutor' || cookieRole === 'student' ? cookieRole : null);
                const newUserRole = intentRole === 'tutor' ? 'tutor' : 'student';

                // Create new user with Google auth
                console.log('Creating new Google user as', newUserRole);
                user = await User.create({
                    googleId: profile.id,
                    name: profile.displayName,
                    email: email,
                    profilePicture: profile.photos[0]?.value || '',
                    authProvider: 'google',
                    role: newUserRole,
                    isActive: true,
                    phone: '', // Not required for OAuth
                    location: {
                        city: 'Hyderabad',
                        area: 'Not specified'
                    }
                });

                if (newUserRole === 'tutor') {
                    await TutorProfile.create({
                        userId: user._id,
                        hourlyRate: 0,
                        approvalStatus: 'pending',
                        profileStatus: 'draft'
                    });
                }

                console.log('New Google user created:', user._id);
                // Attach temporary flag to indicate new user
                user.isNew = true;
                done(null, user);
            } catch (error) {
                console.error('Google OAuth Error:', error);
                done(error, null);
            }
        }));

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (error) {
            done(error, null);
        }
    });
};

module.exports.isGoogleOAuthConfigured = isGoogleOAuthConfigured;
module.exports.resolveCallbackURL = resolveCallbackURL;
