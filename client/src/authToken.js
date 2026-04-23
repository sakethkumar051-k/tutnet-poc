/**
 * Access tokens live in sessionStorage (not localStorage) so they are tab-scoped
 * and cleared when the tab closes. Refresh tokens are HttpOnly cookies on the API origin.
 * Legacy `localStorage.token` is migrated once on read.
 */

const KEY = 'tutnet_access';
const LEGACY = 'token';

export function getAccessToken() {
    let t = sessionStorage.getItem(KEY);
    if (!t) {
        try {
            t = localStorage.getItem(LEGACY);
            if (t) {
                sessionStorage.setItem(KEY, t);
                localStorage.removeItem(LEGACY);
            }
        } catch {
            /* private mode */
        }
    }
    return t;
}

export function setAccessToken(token) {
    try {
        if (token) sessionStorage.setItem(KEY, token);
        else sessionStorage.removeItem(KEY);
        localStorage.removeItem(LEGACY);
    } catch {
        /* ignore */
    }
}

export function clearAccessToken() {
    try {
        sessionStorage.removeItem(KEY);
        localStorage.removeItem(LEGACY);
    } catch {
        /* ignore */
    }
}
