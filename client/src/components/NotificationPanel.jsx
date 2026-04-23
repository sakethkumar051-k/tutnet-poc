import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useNotifications } from '../context/NotificationContext';
import { useNotificationStore } from '../stores/notificationStore';
import { useRef, useEffect, useMemo } from 'react';

/**
 * NotificationPanel — world-class notification center.
 * - Time-grouped (Today / Yesterday / This week / Earlier)
 * - Unread count + filter (All | Unread)
 * - Inline icons per type with design-system colors
 * - Keyboard accessible (Esc closes)
 */
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

    useEffect(() => {
        if (isOpen) {
            useNotificationStore.getState().fetchNotifications({ skipDedup: true });
        }
    }, [isOpen]);

    // Close on click outside + Esc
    useEffect(() => {
        if (!isOpen) return undefined;
        const onClick = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) setIsOpen(false);
        };
        const onKey = (e) => { if (e.key === 'Escape') setIsOpen(false); };
        document.addEventListener('mousedown', onClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [isOpen, setIsOpen]);

    const handleClick = (notification) => {
        if (!notification.isRead) markAsRead(notification._id);
        if (notification.link) {
            navigate(notification.link);
            setIsOpen(false);
        }
    };

    // Group by time bucket
    const grouped = useMemo(() => {
        const buckets = { today: [], yesterday: [], thisWeek: [], earlier: [] };
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const yesterdayStart = todayStart - 86400_000;
        const weekStart = todayStart - 6 * 86400_000;
        for (const n of notifications || []) {
            const t = new Date(n.createdAt).getTime();
            if (t >= todayStart) buckets.today.push(n);
            else if (t >= yesterdayStart) buckets.yesterday.push(n);
            else if (t >= weekStart) buckets.thisWeek.push(n);
            else buckets.earlier.push(n);
        }
        return buckets;
    }, [notifications]);

    const unreadCount = (notifications || []).filter((n) => !n.isRead).length;

    if (!isOpen) return null;

    const panel = (
        <>
            <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" aria-hidden="true" />
            <div
                ref={panelRef}
                className="fixed z-50 bg-white border border-gray-100 overflow-hidden flex flex-col
                    inset-0 rounded-none shadow-none
                    sm:inset-auto sm:top-4 sm:right-4 sm:w-[420px] sm:max-w-[calc(100vw-2rem)]
                    sm:rounded-3xl sm:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.35)]"
                role="dialog"
                aria-label="Notifications"
            >
                {/* Header */}
                <div className="px-5 pt-5 pb-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-0.5">
                        <div>
                            <p className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Activity</p>
                            <h3 className="text-lg font-extrabold text-navy-950 tracking-tight">
                                Notifications
                                {unreadCount > 0 && (
                                    <span className="ml-2 text-xs bg-royal text-white rounded-full px-2 py-0.5 font-bold align-middle">
                                        {unreadCount}
                                    </span>
                                )}
                            </h3>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            aria-label="Close"
                            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="mt-2 text-[11px] font-bold text-royal hover:text-navy-950 transition-colors"
                        >
                            Mark all as read
                        </button>
                    )}
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto sm:max-h-[32rem]">
                    {loading && notifications.length === 0 ? (
                        <div className="p-5 space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex gap-3 animate-pulse">
                                    <div className="w-9 h-9 bg-gray-100 rounded-full flex-shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-gray-100 rounded w-3/4" />
                                        <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="py-14 px-6 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-lime/20 flex items-center justify-center mx-auto mb-3">
                                <svg className="w-6 h-6 text-lime-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-sm font-bold text-navy-950">You're all caught up</p>
                            <p className="text-xs text-gray-500 mt-1">New activity will show here in real time.</p>
                        </div>
                    ) : (
                        <div>
                            {grouped.today.length > 0 && <Group title="Today" items={grouped.today} onClick={handleClick} />}
                            {grouped.yesterday.length > 0 && <Group title="Yesterday" items={grouped.yesterday} onClick={handleClick} />}
                            {grouped.thisWeek.length > 0 && <Group title="This week" items={grouped.thisWeek} onClick={handleClick} />}
                            {grouped.earlier.length > 0 && <Group title="Earlier" items={grouped.earlier} onClick={handleClick} />}
                        </div>
                    )}
                </div>

                {/* Footer — always rendered so View-all/Settings are always reachable */}
                <div className="flex-shrink-0 border-t border-gray-100 px-5 py-3 flex items-center justify-between bg-gray-50/50">
                    <Link
                        to="/notifications"
                        onClick={() => setIsOpen(false)}
                        className="text-xs font-bold text-royal hover:text-royal-dark">
                        View all →
                    </Link>
                    <Link
                        to="/notifications/settings"
                        onClick={() => setIsOpen(false)}
                        className="text-xs font-semibold text-gray-500 hover:text-navy-950 inline-flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317a1 1 0 011.35 0l.96.87a1 1 0 00.86.24l1.29-.24a1 1 0 011.17.77l.27 1.29a1 1 0 00.55.7l1.17.56a1 1 0 01.55 1.16l-.37 1.26a1 1 0 000 .56l.37 1.26a1 1 0 01-.55 1.16l-1.17.56a1 1 0 00-.55.7l-.27 1.29a1 1 0 01-1.17.77l-1.29-.24a1 1 0 00-.86.24l-.96.87a1 1 0 01-1.35 0l-.96-.87a1 1 0 00-.86-.24l-1.29.24a1 1 0 01-1.17-.77l-.27-1.29a1 1 0 00-.55-.7l-1.17-.56a1 1 0 01-.55-1.16l.37-1.26a1 1 0 000-.56l-.37-1.26a1 1 0 01.55-1.16l1.17-.56a1 1 0 00.55-.7l.27-1.29a1 1 0 011.17-.77l1.29.24a1 1 0 00.86-.24l.96-.87z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                    </Link>
                </div>
            </div>
        </>
    );

    return createPortal(panel, document.body);
};

// ── Subcomponents ──────────────────────────────────────────────────────

function Group({ title, items, onClick }) {
    return (
        <div>
            <div className="sticky top-0 bg-[#fafafa] px-5 py-1.5 border-b border-gray-100 z-10">
                <p className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">{title}</p>
            </div>
            <ul className="divide-y divide-gray-50">
                {items.map((n) => <NotificationItem key={n._id} notification={n} onClick={onClick} />)}
            </ul>
        </div>
    );
}

function NotificationItem({ notification, onClick }) {
    const isUnread = !notification.isRead;
    return (
        <li
            onClick={() => onClick(notification)}
            className={`relative px-5 py-3.5 hover:bg-gray-50/70 transition-colors cursor-pointer ${isUnread ? 'bg-royal/[0.03]' : ''}`}
        >
            <div className="flex gap-3 items-start">
                <div className="flex-shrink-0">{iconFor(notification.type)}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm truncate ${isUnread ? 'font-bold text-navy-950' : 'font-semibold text-gray-700'}`}>
                            {notification.title}
                        </p>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0 pt-0.5">
                            {formatRelativeTime(notification.createdAt)}
                        </span>
                    </div>
                    <p className={`text-xs mt-0.5 line-clamp-2 leading-relaxed ${isUnread ? 'text-gray-700' : 'text-gray-500'}`}>
                        {notification.message}
                    </p>
                </div>
                {isUnread && (
                    <div className="flex-shrink-0 self-center w-2 h-2 bg-royal rounded-full ring-4 ring-royal/10" />
                )}
            </div>
        </li>
    );
}

function iconFor(type) {
    const map = {
        // success / lime
        booking_approved:  ['lime', 'check'],
        demo_accepted:     ['lime', 'check'],
        session_completed: ['lime', 'check'],
        attendance_marked: ['lime', 'check'],
        payment_success:   ['lime', 'rupee'],
        payment_received:  ['lime', 'rupee'],
        report_verified:   ['lime', 'shield'],
        tier_upgraded:     ['lime', 'star'],

        // primary / royal
        new_booking_request:    ['royal', 'calendar'],
        new_trial_request:      ['royal', 'calendar'],
        demo_booking_created:   ['royal', 'calendar'],
        schedule_updated:       ['royal', 'calendar'],
        subscription_created:   ['royal', 'calendar'],
        homework_assigned:      ['royal', 'book'],
        homework_completed:     ['royal', 'book'],
        study_material_added:   ['royal', 'book'],

        // time / upcoming
        session_reminder:       ['yellow', 'clock'],
        session_starting_soon:  ['yellow', 'clock'],

        // warning / red
        booking_rejected:   ['rose', 'x'],
        demo_rejected:      ['rose', 'x'],
        booking_cancelled:  ['rose', 'x'],
        payment_failed:     ['rose', 'x'],
        session_missed:     ['rose', 'alert'],

        // admin / meta
        admin_alert:                ['navy', 'info'],
        system_alert:               ['navy', 'info'],
        tutor_verification_approved:['navy', 'info'],
        report_dismissed:           ['navy', 'info'],

        // feedback / yellow
        new_review:         ['yellow', 'star'],
        feedback_received:  ['yellow', 'star']
    };
    const [color, shape] = map[type] || ['gray', 'info'];
    const bg = {
        lime: 'bg-lime/25 text-lime-dark',
        royal: 'bg-royal/10 text-royal-dark',
        yellow: 'bg-yellow-100 text-yellow-700',
        rose: 'bg-rose-100 text-rose-600',
        navy: 'bg-navy-950/10 text-navy-950',
        gray: 'bg-gray-100 text-gray-500'
    }[color];
    return (
        <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center`}>
            {shapeSvg(shape)}
        </div>
    );
}

function shapeSvg(shape) {
    const c = 'w-4 h-4';
    const p = { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2 };
    switch (shape) {
        case 'check':    return <svg className={c} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
        case 'x':        return <svg className={c} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
        case 'calendar': return <svg className={c} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
        case 'clock':    return <svg className={c} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
        case 'star':     return <svg className={c} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L14.39 8.26H20.77L15.69 12.14L18.08 18.4L12 14.52L5.92 18.4L8.31 12.14L3.23 8.26H9.61L12 2Z" /></svg>;
        case 'alert':    return <svg className={c} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
        case 'info':     return <svg className={c} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
        case 'rupee':    return <svg className={c} fill="currentColor" viewBox="0 0 24 24"><path d="M7 4h11a1 1 0 110 2h-3.09c.26.63.4 1.3.4 2 0 .35-.02.68-.08 1H18a1 1 0 110 2h-3.2c-.7 1.92-2.5 3.38-5.3 3.82L15.5 20H13l-5.8-5.4c-.14-.12-.2-.3-.2-.6v-1c0-.55.45-1 1-1h1c2 0 3.34-.82 3.85-2H7a1 1 0 110-2h6.83c.11-.33.17-.66.17-1 0-.73-.3-1.4-.82-2H7a1 1 0 010-2z"/></svg>;
        case 'book':     return <svg className={c} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
        case 'shield':   return <svg className={c} {...p}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
        default:         return null;
    }
}

function formatRelativeTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return 'Just now';
    const m = Math.floor(seconds / 60); if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24); if (d < 7) return `${d}d`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default NotificationPanel;
