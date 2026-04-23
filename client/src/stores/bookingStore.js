import { create } from 'zustand';
import api from '../utils/api';

const POLL_MS = 5 * 60 * 1000;
const DEDUP_MS = 30_000;

function mergeBookingUpdates(prev, updates) {
    if (!updates?.length) return prev;
    const map = new Map(prev.map((b) => [b._id, b]));
    updates.forEach((b) => map.set(b._id, b));
    return Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
}

function roleOk(user) {
    return Boolean(user && ['student', 'tutor'].includes(user.role));
}

/**
 * Single source of truth for GET /bookings/mine + incremental since-sync.
 */
export const useBookingStore = create((set, get) => ({
    bookings: [],
    lastFetchedAt: null,
    lastSyncIso: null,
    loading: false,
    error: null,
    _pollTimer: null,
    _boundUserId: null,

    reset: () => {
        const t = get()._pollTimer;
        if (t) clearInterval(t);
        set({
            bookings: [],
            lastFetchedAt: null,
            lastSyncIso: null,
            loading: false,
            error: null,
            _pollTimer: null,
            _boundUserId: null
        });
    },

    updateOne: (id, patch) =>
        set((s) => ({
            bookings: s.bookings.map((b) => (String(b._id) === String(id) ? { ...b, ...patch } : b))
        })),

    removeOne: (id) =>
        set((s) => ({
            bookings: s.bookings.filter((b) => String(b._id) !== String(id))
        })),

    /**
     * Call when auth user changes (e.g. App or MyBookingsProvider).
     */
    initForUser: (user) => {
        if (!roleOk(user)) {
            get().reset();
            return;
        }
        const uid = user._id || user.id;
        const state = get();
        if (state._boundUserId && String(state._boundUserId) !== String(uid)) {
            get().reset();
            set({ _boundUserId: uid });
            get().fetch({ force: true });
            get()._ensurePoll();
            return;
        }
        if (!state._boundUserId) {
            set({ _boundUserId: uid });
            get().fetch({ force: true });
            get()._ensurePoll();
            return;
        }
        get().fetch({ force: false });
    },

    _ensurePoll: () => {
        const prev = get()._pollTimer;
        if (prev) clearInterval(prev);
        const id = setInterval(async () => {
            const last = get().lastSyncIso;
            if (!last) return;
            try {
                const { data } = await api.get('/bookings/mine', { params: { since: last } });
                if (data?.updates && Array.isArray(data.updates)) {
                    set((s) => ({
                        bookings: mergeBookingUpdates(s.bookings, data.updates),
                        lastSyncIso: data.syncedAt || new Date().toISOString()
                    }));
                }
            } catch {
                /* ignore */
            }
        }, POLL_MS);
        set({ _pollTimer: id });
    },

    fetch: async ({ force = false } = {}) => {
        if (!get()._boundUserId) return;

        const { lastFetchedAt, loading } = get();
        if (loading) return;
        if (!force && lastFetchedAt && Date.now() - lastFetchedAt < DEDUP_MS) return;

        set({ loading: true });
        try {
            const { data } = await api.get('/bookings/mine');
            const list = Array.isArray(data) ? data : [];
            const syncIso = new Date().toISOString();
            set({
                bookings: list,
                error: null,
                lastFetchedAt: Date.now(),
                lastSyncIso: syncIso,
                loading: false
            });
        } catch (e) {
            set({ error: e, loading: false });
        }
    },

}));

/** Selectors (stable references when used with useCallback pattern) */
export function selectPending(bookings) {
    return bookings.filter((b) => b.status === 'pending');
}

export function selectByStatus(bookings, status) {
    return bookings.filter((b) => b.status === status);
}
