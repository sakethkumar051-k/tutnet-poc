/**
 * Optional FCM (Firebase Cloud Messaging) for native/device tokens stored on User.deviceTokens.
 * Set FIREBASE_SERVICE_ACCOUNT_JSON to a JSON string of the service account, or
 * GOOGLE_APPLICATION_CREDENTIALS to a file path (firebase-admin default).
 */

let adminApp = null;

function getFirebaseApp() {
    if (adminApp) return adminApp;
    try {
        const admin = require('firebase-admin');
        if (admin.apps.length) {
            adminApp = admin.app();
            return adminApp;
        }
        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            const cred = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
            adminApp = admin.initializeApp({ credential: admin.credential.cert(cred) });
            return adminApp;
        }
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            adminApp = admin.initializeApp();
            return adminApp;
        }
    } catch (e) {
        console.error('[push] Firebase init failed:', e.message);
    }
    return null;
}

/**
 * Send a data+notification message to FCM registration tokens (best-effort, ignores invalid tokens).
 */
async function sendPushToTokens(tokens, { title, body, data = {} }) {
    const app = getFirebaseApp();
    if (!app || !tokens?.length) {
        if (process.env.NODE_ENV !== 'production' && tokens?.length) {
            console.log('[push] (not configured) would notify', tokens.length, 'device(s):', title);
        }
        return { sent: 0, skipped: true };
    }
    const admin = require('firebase-admin');
    const messaging = admin.messaging();
    const dataPayload = Object.fromEntries(
        Object.entries({ ...data, title: title || '', body: body || '' }).map(([k, v]) => [k, String(v ?? '')])
    );
    let sent = 0;
    for (const token of tokens) {
        try {
            await messaging.send({
                token,
                notification: title ? { title, body: body || '' } : undefined,
                data: dataPayload
            });
            sent += 1;
        } catch (err) {
            if (process.env.NODE_ENV !== 'production') {
                console.warn('[push] token send failed:', err.message);
            }
        }
    }
    return { sent };
}

/**
 * Send session reminder push to a user document (uses deviceTokens + preferences).
 */
async function sendSessionReminderPushIfEnabled(userLean, { title, body, data }) {
    if (!userLean) return { sent: 0 };
    if (!userLean.preferences?.reminderChannels?.includes('push')) {
        return { sent: 0, skipped: 'channel' };
    }
    const tokens = (userLean.deviceTokens || []).map((d) => d.token).filter(Boolean);
    if (!tokens.length) return { sent: 0, skipped: 'no_tokens' };
    return sendPushToTokens(tokens, { title, body, data });
}

module.exports = {
    sendPushToTokens,
    sendSessionReminderPushIfEnabled,
    getFirebaseApp
};
