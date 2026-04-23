/** HttpOnly refresh cookie — same options must be used for clearCookie. */

function refreshCookieBase() {
    const sameSite = process.env.COOKIE_SAME_SITE || 'lax';
    const allowed = ['lax', 'strict', 'none'];
    const ss = allowed.includes(String(sameSite).toLowerCase()) ? String(sameSite).toLowerCase() : 'lax';
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' || ss === 'none',
        sameSite: ss,
        path: '/',
        maxAge: 14 * 24 * 60 * 60 * 1000
    };
}

function setRefreshTokenCookie(res, refreshToken) {
    res.cookie('refreshToken', refreshToken, refreshCookieBase());
}

function clearRefreshTokenCookie(res) {
    const base = refreshCookieBase();
    res.clearCookie('refreshToken', {
        path: base.path,
        httpOnly: base.httpOnly,
        secure: base.secure,
        sameSite: base.sameSite
    });
}

/** Short-lived cookie so Google OAuth signup intent survives when express-session does not (cross-origin redirects). */
const OAUTH_SIGNUP_ROLE_COOKIE = 'tutnet_oauth_signup_role';

function setOauthSignupRoleCookie(res, role) {
    const base = refreshCookieBase();
    const value = role === 'tutor' ? 'tutor' : 'student';
    res.cookie(OAUTH_SIGNUP_ROLE_COOKIE, value, {
        httpOnly: true,
        secure: base.secure,
        sameSite: base.sameSite,
        path: '/',
        maxAge: 15 * 60 * 1000
    });
}

function clearOauthSignupRoleCookie(res) {
    const base = refreshCookieBase();
    res.clearCookie(OAUTH_SIGNUP_ROLE_COOKIE, {
        path: '/',
        httpOnly: true,
        secure: base.secure,
        sameSite: base.sameSite
    });
}

module.exports = {
    setRefreshTokenCookie,
    clearRefreshTokenCookie,
    refreshCookieBase,
    setOauthSignupRoleCookie,
    clearOauthSignupRoleCookie,
    OAUTH_SIGNUP_ROLE_COOKIE
};
