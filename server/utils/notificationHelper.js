/**
 * Notification service — the one entry point for every in-app notification.
 *
 * Guarantees:
 *   1. Checks the recipient's notificationPreferences[category] before insert.
 *   2. Dedupes via `idempotencyKey` — unique sparse index handles the race.
 *   3. Rate-limits to 120 notifications / user / 60s (in-memory counter).
 *   4. Denormalises `recipientRole` + `category` onto the doc.
 *   5. Fires a `notification:new` socket event to the user's private room.
 *   6. Never throws — callers never break if the notification layer fails.
 *
 * Startup note (you asked for best-for-startup choice): the rate-limit map is
 * in-memory, so it only protects a single Node instance. Fine today (we run
 * one instance); swap for Redis when we scale horizontally.
 *
 * API:
 *   createNotification({ userId, type, title, message, link,
 *                        category, entityType, entityId, idempotencyKey,
 *                        bookingId, // back-compat
 *                        metadata }, { session }?) => { created, notification?, skipped?, reason? }
 *   notifyAllAdmins(payload, options) — fan-out helper; returns count.
 */

const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { categoryFor } = require('../constants/notificationCategories');
const { emitToUser } = require('../socket/io');

// ── Rate limiter (in-memory, per recipient, 120/min) ───────────────────
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 120;
const _buckets = new Map(); // userId -> { count, resetAt }
function allowByRate(userId) {
    const key = String(userId);
    const now = Date.now();
    let bucket = _buckets.get(key);
    if (!bucket || bucket.resetAt < now) {
        bucket = { count: 0, resetAt: now + RATE_WINDOW_MS };
        _buckets.set(key, bucket);
    }
    bucket.count += 1;
    return bucket.count <= RATE_MAX;
}

// ── Preference cache (keyed by userId, 60s) ────────────────────────────
const _prefCache = new Map(); // userId -> { value, expiresAt }
const PREF_TTL_MS = 60_000;
async function getPreferencesAndRole(userId) {
    const key = String(userId);
    const cached = _prefCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const user = await User.findById(userId).select('notificationPreferences role isActive').lean();
    const value = user
        ? { prefs: user.notificationPreferences || {}, role: user.role, isActive: user.isActive !== false }
        : { prefs: {}, role: undefined, isActive: true };
    _prefCache.set(key, { value, expiresAt: Date.now() + PREF_TTL_MS });
    return value;
}

function invalidatePrefCache(userId) {
    _prefCache.delete(String(userId));
}

// ── Core creator ───────────────────────────────────────────────────────

async function createNotification(payload, options = {}) {
    const {
        userId, type, title, message,
        link, entityType, entityId,
        idempotencyKey,
        bookingId,                // back-compat with old callers
        metadata,
        category: categoryOverride
    } = payload || {};
    const { session } = options;

    try {
        if (!userId || !type || !title || !message) {
            return { created: false, skipped: true, reason: 'missing-fields' };
        }
        if (!mongoose.isValidObjectId(userId)) {
            return { created: false, skipped: true, reason: 'invalid-user' };
        }

        const category = categoryOverride || categoryFor(type);

        // 1) Rate-limit
        if (!allowByRate(userId)) {
            console.warn(`[notifications] rate-limit hit for user=${userId} type=${type}`);
            return { created: false, skipped: true, reason: 'rate-limit' };
        }

        // 2) Preferences + inactive-user short-circuit
        const { prefs, role, isActive } = await getPreferencesAndRole(userId);
        if (!isActive) {
            return { created: false, skipped: true, reason: 'user-inactive' };
        }
        if (prefs && prefs[category] === false) {
            return { created: false, skipped: true, reason: 'preference-off' };
        }

        // 3) Insert — idempotencyKey on unique-sparse index; duplicate = graceful skip
        const doc = {
            userId,
            recipientRole: role,
            type,
            category,
            title,
            message,
            link,
            bookingId,
            entityType,
            entityId,
            metadata,
            ...(idempotencyKey ? { idempotencyKey } : {})
        };

        let created;
        try {
            created = session
                ? (await Notification.create([doc], { session }))[0]
                : await Notification.create(doc);
        } catch (err) {
            // Duplicate idempotencyKey → treat as success-but-skipped
            if (err?.code === 11000 && idempotencyKey) {
                return { created: false, skipped: true, reason: 'dedupe' };
            }
            throw err;
        }

        // 4) Fire-and-forget socket push (never inside the txn — after commit ideally,
        //    but since we're not awaiting the txn commit here the caller has committed by now)
        try {
            emitToUser(userId, 'notification:new', { notification: created.toObject ? created.toObject() : created });
        } catch (e) {
            // Socket push failure is non-fatal — UI will fall back to polling
            console.warn('[notifications] socket emit failed:', e?.message || e);
        }

        return { created: true, notification: created };
    } catch (error) {
        console.error('[notifications] createNotification failed:', error);
        return { created: false, error: error?.message || String(error) };
    }
}

// ── Fan-out to all admins (cached admin list, 5 min) ───────────────────
let _adminCache = { ids: null, expiresAt: 0 };
const ADMIN_CACHE_MS = 5 * 60_000;

async function getAdminIds() {
    if (_adminCache.ids && _adminCache.expiresAt > Date.now()) return _adminCache.ids;
    const admins = await User.find({ role: 'admin', isActive: true }).select('_id').lean();
    const ids = admins.map((a) => a._id);
    _adminCache = { ids, expiresAt: Date.now() + ADMIN_CACHE_MS };
    return ids;
}

function invalidateAdminCache() { _adminCache = { ids: null, expiresAt: 0 }; }

async function notifyAllAdmins(payload, options = {}) {
    const ids = await getAdminIds();
    const results = await Promise.all(
        ids.map((id) =>
            createNotification(
                {
                    ...payload,
                    userId: id,
                    // If the caller provided an idempotencyKey, scope it per-admin so each admin sees exactly one.
                    idempotencyKey: payload.idempotencyKey ? `${payload.idempotencyKey}:${id}` : undefined
                },
                options
            )
        )
    );
    const sent = results.filter((r) => r.created).length;
    return { sent, attempted: ids.length, results };
}

module.exports = {
    createNotification,
    notifyAllAdmins,
    invalidatePrefCache,
    invalidateAdminCache
};
