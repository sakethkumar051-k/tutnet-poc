// Backward-compatible wrapper — delegates to Zustand notificationStore
import { useNotificationStore } from '../stores/notificationStore';

export const useNotifications = () => {
    const store = useNotificationStore();
    return {
        notifications: store.notifications,
        unreadCount: store.unreadCount,
        loading: store.loading,
        isOpen: store.isOpen,
        setIsOpen: store.setIsOpen,
        markAsRead: store.markAsRead,
        markAllAsRead: store.markAllAsRead,
        fetchNotifications: store.fetchNotifications,
    };
};

// No-op provider
export const NotificationProvider = ({ children }) => children;
