import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useNotifications } from '../context/NotificationContext';
import { useRef, useEffect } from 'react';

const NotificationPanel = () => {
    const {
        notifications,
        loading,
        markAsRead,
        markAllAsRead,
        setIsOpen,
        isOpen
    } = useNotifications();
    const navigate = useNavigate();
    const panelRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (panelRef.current && !panelRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, setIsOpen]);

    if (!isOpen) return null;

    const handleClick = (notification) => {
        if (!notification.isRead) {
            markAsRead(notification._id);
        }
        if (notification.link) {
            navigate(notification.link);
            setIsOpen(false);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'booking_approved':
            case 'demo_accepted':
                return (
                    <div className="bg-lime/30 p-2 rounded-full">
                        <svg className="w-5 h-5 text-lime-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                );
            case 'booking_rejected':
            case 'demo_rejected':
            case 'booking_cancelled':
                return (
                    <div className="bg-red-100 p-2 rounded-full">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                );
            case 'new_booking_request':
            case 'new_trial_request':
            case 'demo_booking_created':
            case 'schedule_updated':
                return (
                    <div className="bg-royal/10 p-2 rounded-full">
                        <svg className="w-5 h-5 text-royal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                );
            case 'session_missed':
                return (
                    <div className="bg-lime/30 p-2 rounded-full">
                        <svg className="w-5 h-5 text-lime-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                );
            case 'admin_alert':
                return (
                    <div className="bg-purple-100 p-2 rounded-full">
                        <svg className="w-5 h-5 text-navy-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                );
            case 'session_reminder':
            case 'session_starting_soon':
                return (
                    <div className="bg-lime/30 p-2 rounded-full">
                        <svg className="w-5 h-5 text-lime-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                );
            case 'new_review':
            case 'feedback_received':
                return (
                    <div className="bg-yellow-100 p-2 rounded-full">
                        <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                    </div>
                );
            case 'homework_assigned':
            case 'homework_completed':
            case 'study_material_added':
                return (
                    <div className="bg-royal/10 p-2 rounded-full">
                        <svg className="w-5 h-5 text-royal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                );
            case 'attendance_marked':
            case 'session_completed':
                return (
                    <div className="bg-lime/30 p-2 rounded-full">
                        <svg className="w-5 h-5 text-lime-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                    </div>
                );
            case 'system_alert':
            case 'tutor_verification_approved':
                return (
                    <div className="bg-purple-100 p-2 rounded-full">
                        <svg className="w-5 h-5 text-navy-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                );
            default:
                return (
                    <div className="bg-gray-100 p-2 rounded-full">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                );
        }
    };

    const formatRelativeTime = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'Just now';

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;

        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;

        return date.toLocaleDateString();
    };

    const panel = (
        <>
            <div className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]" aria-hidden="true" />
            <div
                ref={panelRef}
                className="fixed top-4 right-4 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden ring-1 ring-black ring-opacity-5"
            >
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-100 bg-white flex justify-between items-center sticky top-0 z-10">
                    <h3 className="font-bold text-navy-950 text-sm uppercase tracking-wide">Notifications</h3>
                    <div className="flex items-center gap-3">
                        {notifications.length > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs font-medium text-royal hover:text-navy-900 transition-colors"
                            >
                                Mark all read
                            </button>
                        )}
                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-medium">
                            {notifications.length}
                        </span>
                    </div>
                </div>

                {/* List */}
                <div className="max-h-[32rem] overflow-y-auto custom-scrollbar">
                    {loading && notifications.length === 0 ? (
                        <div className="p-8 space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex gap-4 animate-pulse">
                                    <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                            <div className="bg-gray-50 p-4 rounded-full mb-3">
                                <span className="text-2xl">🎉</span>
                            </div>
                            <h4 className="text-navy-950 font-medium mb-1">You're all caught up!</h4>
                            <p className="text-gray-500 text-sm">No new notifications at the moment.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-50">
                            {notifications.map((notification) => (
                                <li
                                    key={notification._id}
                                    onClick={() => handleClick(notification)}
                                    className={`relative p-4 hover:bg-gray-50 transition-colors cursor-pointer group ${!notification.isRead ? 'bg-royal/5/40' : 'bg-white'}`}
                                >
                                    <div className="flex gap-3 items-start">
                                        <div className="flex-shrink-0 mt-0.5 transition-transform group-hover:scale-110 duration-200">
                                            {getIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start gap-2">
                                                <p className={`text-sm ${!notification.isRead ? 'font-bold text-navy-950' : 'font-medium text-gray-700'}`}>
                                                    {notification.title}
                                                </p>
                                                <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0 pt-0.5">
                                                    {formatRelativeTime(notification.createdAt)}
                                                </span>
                                            </div>
                                            <p className={`text-sm mt-0.5 line-clamp-2 ${!notification.isRead ? 'text-gray-800' : 'text-gray-500'}`}>
                                                {notification.message}
                                            </p>
                                        </div>
                                        {!notification.isRead && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-royal/50 rounded-full ring-4 ring-royal/10/50"></div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </>
    );

    return createPortal(panel, document.body);
};

export default NotificationPanel;
