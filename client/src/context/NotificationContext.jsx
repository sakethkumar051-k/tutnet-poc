import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../utils/api';

// Phase 1 (booking): disable notification polling to reduce network requests on /find-tutors.
const PHASE = 'booking';

const NotificationContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const fetchUnreadCount = useCallback(async () => {
        if (!user) return;
        try {
            const { data } = await api.get('/notifications/unread-count');
            setUnreadCount(data.count);
        } catch (err) {
            console.error('Error fetching unread count:', err);
        }
    }, [user]);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data } = await api.get('/notifications?limit=20');
            setNotifications(data.notifications);
            // Update unread count as well to be safe
            if (data.notifications) {
                // Optional: calculate client side or just call endpoint
                fetchUnreadCount();
            }
        } catch (err) {
            console.error('Error fetching notifications:', err);
        } finally {
            setLoading(false);
        }
    }, [user, fetchUnreadCount]);

    const markAsRead = async (id) => {
        try {
            // Optimistic update
            setNotifications(prev =>
                prev.map(n => n._id === id ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));

            await api.patch(`/notifications/${id}/read`);
            fetchUnreadCount(); // Sync strict count
        } catch (err) {
            console.error('Error marking as read:', err);
            fetchNotifications(); // Revert on error
        }
    };

    const markAllAsRead = async () => {
        try {
            // Optimistic update
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);

            await api.patch('/notifications/read-all');
        } catch (err) {
            console.error('Error marking all as read:', err);
            fetchNotifications();
        }
    };

    // Initial fetch and polling (disabled in Phase 1 to avoid extra requests on /find-tutors)
    useEffect(() => {
        if (PHASE === 'booking') return;
        if (user) {
            fetchUnreadCount();
            fetchNotifications();

            const interval = setInterval(() => {
                fetchUnreadCount();
            }, 30000);

            return () => clearInterval(interval);
        } else {
            setNotifications([]);
            setUnreadCount(0);
        }
    }, [user, fetchUnreadCount, fetchNotifications]);

    // Re-fetch list when opening panel (disabled in Phase 1)
    useEffect(() => {
        if (PHASE === 'booking') return;
        if (isOpen && user) {
            fetchNotifications();
        }
    }, [isOpen, user, fetchNotifications]);

    const value = {
        notifications,
        unreadCount,
        loading,
        isOpen,
        setIsOpen,
        markAsRead,
        markAllAsRead,
        fetchNotifications
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};
