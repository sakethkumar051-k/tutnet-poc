import { create } from 'zustand';
import api from '../utils/api';
import { useToastStore } from './toastStore';

const LIST_DEDUP_MS = 15_000;

// ── Toast burst debouncer ──────────────────────────────────────────────
// If 3 notifications arrive within 1.5s, show ONE toast saying "3 new notifications"
// instead of three stacked ones.
let _burstTimer = null;
let _burstBuffer = [];
function flushBurst() {
    if (_burstBuffer.length === 0) return;
    const toast = useToastStore.getState().showInfo;
    if (_burstBuffer.length === 1) {
        const n = _burstBuffer[0];
        toast(`🔔 ${n.title}${n.message ? ' — ' + n.message.slice(0, 80) : ''}`);
    } else {
        toast(`🔔 ${_burstBuffer.length} new notifications`);
    }
    _burstBuffer = [];
}
function queueBurstToast(n) {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return; // don't toast in background tab
    _burstBuffer.push(n);
    if (_burstTimer) clearTimeout(_burstTimer);
    _burstTimer = setTimeout(flushBurst, 1500);
}

export const useNotificationStore = create((set, get) => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    isOpen: false,
    lastListFetchedAt: null,
    filter: 'all',     // 'all' | 'unread'
    category: '',      // '' | category key

    setIsOpen:  (open)  => set({ isOpen: open }),
    setFilter:  (f)     => set({ filter: f, lastListFetchedAt: null }),
    setCategory:(c)     => set({ category: c, lastListFetchedAt: null }),

    fetchUnreadCount: async () => {
        try {
            const { data } = await api.get('/notifications/unread-count');
            set({ unreadCount: typeof data?.count === 'number' ? data.count : 0 });
        } catch { /* silent */ }
    },

    /**
     * Full list when opening the panel / page. Supports filter + category.
     * `since` merges server delta into the existing list.
     */
    fetchNotifications: async ({ since, skipDedup = false, page = 1, limit = 20 } = {}) => {
        const { lastListFetchedAt, filter, category } = get();
        if (!since && !skipDedup && lastListFetchedAt && Date.now() - lastListFetchedAt < LIST_DEDUP_MS) {
            return;
        }
        set({ loading: true });
        try {
            const params = { limit, page };
            if (since) params.since = since;
            if (filter === 'unread') params.filter = 'unread';
            if (category) params.category = category;
            const { data } = await api.get('/notifications', { params });
            const incoming = data.notifications || [];
            const list = Array.isArray(incoming) ? incoming : [];

            if (since && list.length) {
                set((s) => {
                    const map = new Map(s.notifications.map((n) => [n._id, n]));
                    list.forEach((n) => map.set(n._id, n));
                    const merged = Array.from(map.values()).sort(
                        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
                    );
                    return { notifications: merged, loading: false, lastListFetchedAt: Date.now() };
                });
            } else {
                set({
                    notifications: list,
                    loading: false,
                    lastListFetchedAt: Date.now()
                });
            }
            get().fetchUnreadCount();
            return data;
        } catch {
            set({ loading: false });
        }
    },

    /**
     * Called by the Socket.IO listener when a fresh notification arrives.
     * Prepends to list (if not already present), bumps unread count, queues a toast.
     */
    handleSocketNew: (notif) => {
        if (!notif || !notif._id) return;
        set((s) => {
            if (s.notifications.some((n) => n._id === notif._id)) return s; // dedupe
            return {
                notifications: [notif, ...s.notifications].slice(0, 100),
                unreadCount: notif.isRead ? s.unreadCount : s.unreadCount + 1
            };
        });
        if (!notif.isRead) queueBurstToast(notif);
    },

    markAsRead: async (id) => {
        set((s) => ({
            notifications: s.notifications.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
            unreadCount: Math.max(0, s.unreadCount - 1)
        }));
        try {
            await api.patch(`/notifications/${id}/read`);
            get().fetchUnreadCount();
        } catch {
            get().fetchNotifications({ skipDedup: true });
        }
    },

    markAllAsRead: async () => {
        set((s) => ({
            notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
            unreadCount: 0
        }));
        try {
            await api.patch('/notifications/read-all');
        } catch {
            get().fetchNotifications({ skipDedup: true });
        }
    },

    deleteNotification: async (id) => {
        const prev = get().notifications;
        const wasUnread = prev.find((n) => n._id === id && !n.isRead);
        set((s) => ({
            notifications: s.notifications.filter((n) => n._id !== id),
            unreadCount: wasUnread ? Math.max(0, s.unreadCount - 1) : s.unreadCount
        }));
        try {
            await api.delete(`/notifications/${id}`);
            get().fetchUnreadCount();
        } catch {
            set({ notifications: prev });
            get().fetchNotifications({ skipDedup: true });
        }
    },

    reset: () =>
        set({
            notifications: [],
            unreadCount: 0,
            loading: false,
            isOpen: false,
            lastListFetchedAt: null,
            filter: 'all',
            category: ''
        })
}));
