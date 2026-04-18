import { create } from 'zustand';
import api from '../utils/api';

export const useNotificationStore = create((set, get) => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    isOpen: false,

    setIsOpen: (open) => set({ isOpen: open }),

    fetchUnreadCount: async () => {
        try {
            const { data } = await api.get('/notifications/unread-count');
            set({ unreadCount: data.count });
        } catch {
            // silent
        }
    },

    fetchNotifications: async () => {
        set({ loading: true });
        try {
            const { data } = await api.get('/notifications?limit=20');
            set({ notifications: data.notifications, loading: false });
            get().fetchUnreadCount();
        } catch {
            set({ loading: false });
        }
    },

    markAsRead: async (id) => {
        // Optimistic update
        set((s) => ({
            notifications: s.notifications.map((n) =>
                n._id === id ? { ...n, isRead: true } : n
            ),
            unreadCount: Math.max(0, s.unreadCount - 1),
        }));
        try {
            await api.patch(`/notifications/${id}/read`);
            get().fetchUnreadCount();
        } catch {
            get().fetchNotifications();
        }
    },

    markAllAsRead: async () => {
        set((s) => ({
            notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
            unreadCount: 0,
        }));
        try {
            await api.patch('/notifications/read-all');
        } catch {
            get().fetchNotifications();
        }
    },
}));
