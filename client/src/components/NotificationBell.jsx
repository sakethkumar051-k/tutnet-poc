import { useNotificationStore } from '../stores/notificationStore';

/**
 * NotificationBell — header bell with unread badge.
 * - Accessible: aria-label, aria-haspopup, aria-expanded, aria-live badge.
 * - No layout shift: fixed 40px hit-target regardless of badge state.
 * - Badge caps at "9+" for 10 or more.
 */
const NotificationBell = () => {
    const unreadCount = useNotificationStore((s) => s.unreadCount);
    const isOpen = useNotificationStore((s) => s.isOpen);
    const setIsOpen = useNotificationStore((s) => s.setIsOpen);

    const badgeText = unreadCount > 9 ? '9+' : String(unreadCount);
    const hasUnread = unreadCount > 0;

    return (
        <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={hasUnread ? `Notifications (${unreadCount} unread)` : 'Notifications'}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                isOpen ? 'bg-royal/10 text-royal' : 'text-gray-500 hover:bg-gray-100 hover:text-navy-950'
            }`}
        >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>

            {/* Badge is always in the DOM — invisible when 0. Prevents layout shift. */}
            <span
                aria-hidden={!hasUnread}
                aria-live="polite"
                className={`absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-white transition-all ${
                    hasUnread ? 'bg-red-500 scale-100' : 'bg-transparent scale-0'
                }`}
            >
                {hasUnread && badgeText}
            </span>
        </button>
    );
};

export default NotificationBell;
