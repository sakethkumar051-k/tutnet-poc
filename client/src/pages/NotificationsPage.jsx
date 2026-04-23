import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useNotificationStore } from '../stores/notificationStore';
import { CATEGORIES, CATEGORY_STYLE, categoryFor } from '../constants/notificationCategories';

/**
 * Full notification history — /notifications
 * Filters: All | Unread + category chip row.
 * Pagination: click "Load more" (cursor-ish — backend is page-based, we just walk pages).
 */
export default function NotificationsPage() {
    const navigate = useNavigate();
    const filter = useNotificationStore((s) => s.filter);
    const category = useNotificationStore((s) => s.category);
    const setFilter = useNotificationStore((s) => s.setFilter);
    const setCategory = useNotificationStore((s) => s.setCategory);
    const markAsRead = useNotificationStore((s) => s.markAsRead);
    const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
    const unreadCount = useNotificationStore((s) => s.unreadCount);

    const [rows, setRows] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = async ({ reset = false, nextPage = 1 } = {}) => {
        setLoading(true);
        setError('');
        try {
            const params = { page: nextPage, limit: 20 };
            if (filter === 'unread') params.filter = 'unread';
            if (category) params.category = category;
            const { data } = await api.get('/notifications', { params });
            const list = data.notifications || [];
            setRows((prev) => reset ? list : [...prev, ...list]);
            const { page: p, pages } = data.pagination || {};
            setHasMore((p || nextPage) < (pages || 0));
            setPage(nextPage);
        } catch (e) {
            setError(e?.response?.data?.message || 'Failed to load notifications');
        } finally {
            setLoading(false);
        }
    };

    // Initial + on-filter-change fetch
    useEffect(() => {
        load({ reset: true, nextPage: 1 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter, category]);

    const handleClick = async (n) => {
        if (!n.isRead) {
            markAsRead(n._id);
            setRows((r) => r.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
        }
        if (n.link) navigate(n.link);
    };

    const groupedByDay = useMemo(() => {
        const groups = new Map();
        for (const n of rows) {
            const d = new Date(n.createdAt);
            const key = d.toDateString();
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(n);
        }
        return [...groups.entries()];
    }, [rows]);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
                {/* Header */}
                <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
                    <div>
                        <p className="text-xs font-bold tracking-[0.2em] uppercase text-gray-400">Inbox</p>
                        <h1 className="text-3xl font-extrabold text-navy-950 tracking-tight mt-0.5">
                            Notifications
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {unreadCount > 0 ? `${unreadCount} unread` : 'You\'re all caught up'}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link to="/notifications/settings"
                            className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg hover:bg-white">
                            Settings
                        </Link>
                        {unreadCount > 0 && (
                            <button onClick={markAllAsRead}
                                className="px-3 py-2 text-xs font-semibold text-royal-dark bg-royal/5 border border-royal/20 rounded-lg hover:bg-royal/10">
                                Mark all read
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="mb-4 space-y-3">
                    <div className="inline-flex bg-white border border-gray-200 rounded-xl p-1">
                        {[{ k: 'all', label: 'All' }, { k: 'unread', label: 'Unread' }].map((f) => (
                            <button key={f.k}
                                onClick={() => setFilter(f.k)}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                    filter === f.k ? 'bg-navy-950 text-white' : 'text-gray-500 hover:text-navy-950'
                                }`}>
                                {f.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-1.5 flex-wrap">
                        <button onClick={() => setCategory('')}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border transition-colors ${
                                !category ? 'bg-navy-950 border-navy-950 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-navy-900/30'
                            }`}>
                            All types
                        </button>
                        {CATEGORIES.map((c) => (
                            <button key={c.key}
                                onClick={() => setCategory(c.key)}
                                className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border capitalize transition-colors ${
                                    category === c.key
                                        ? 'bg-navy-950 border-navy-950 text-white'
                                        : 'bg-white border-gray-200 text-gray-600 hover:border-navy-900/30'
                                }`}>
                                {c.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                {error ? (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-800">
                        {error}
                        <button onClick={() => load({ reset: true, nextPage: 1 })}
                            className="ml-2 underline font-semibold">Retry</button>
                    </div>
                ) : loading && rows.length === 0 ? (
                    <ListSkeleton />
                ) : rows.length === 0 ? (
                    <EmptyState filter={filter} category={category} onClear={() => { setFilter('all'); setCategory(''); }} />
                ) : (
                    <>
                        <div className="space-y-5">
                            {groupedByDay.map(([day, items]) => (
                                <section key={day}>
                                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2 px-1">
                                        {formatDayHeader(day)}
                                    </h2>
                                    <ul className="bg-white border border-gray-100 rounded-2xl divide-y divide-gray-100 overflow-hidden">
                                        {items.map((n) => (
                                            <Row key={n._id} notif={n} onClick={() => handleClick(n)} />
                                        ))}
                                    </ul>
                                </section>
                            ))}
                        </div>

                        {hasMore && (
                            <div className="mt-6 text-center">
                                <button onClick={() => load({ nextPage: page + 1 })}
                                    disabled={loading}
                                    className="px-4 py-2 text-sm font-bold text-royal-dark bg-white border border-royal/30 rounded-lg hover:bg-royal/5 disabled:opacity-50">
                                    {loading ? 'Loading…' : 'Load more'}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function Row({ notif, onClick }) {
    const cat = notif.category || categoryFor(notif.type);
    const style = CATEGORY_STYLE[cat] || CATEGORY_STYLE.system;
    const unread = !notif.isRead;
    return (
        <li>
            <button
                onClick={onClick}
                className={`w-full text-left px-4 py-3.5 flex gap-3 items-start hover:bg-gray-50 transition-colors ${
                    unread ? 'bg-royal/[0.02]' : ''
                }`}>
                <div className="relative flex-shrink-0 mt-1">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center ${style.chip}`}>
                        <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                    </span>
                    {unread && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-royal ring-2 ring-white" />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                        <p className={`text-sm truncate ${unread ? 'font-extrabold text-navy-950' : 'font-semibold text-gray-700'}`}>
                            {notif.title}
                        </p>
                        <span className={`inline-block px-1.5 py-0 rounded text-[9px] font-bold uppercase tracking-wider flex-shrink-0 ${style.chip}`}>
                            {cat}
                        </span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">{notif.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{relativeTime(notif.createdAt)}</p>
                </div>
            </button>
        </li>
    );
}

function ListSkeleton() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 flex gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0" />
                    <div className="flex-1">
                        <div className="h-3 bg-gray-100 rounded w-1/3 mb-2" />
                        <div className="h-3 bg-gray-100 rounded w-4/5 mb-1" />
                        <div className="h-2.5 bg-gray-100 rounded w-1/4" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function EmptyState({ filter, category, onClear }) {
    const isFiltered = filter !== 'all' || category;
    return (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-royal/5 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-7 h-7 text-royal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
            </div>
            <p className="text-sm font-bold text-navy-950">
                {isFiltered ? 'No matches' : 'Nothing yet'}
            </p>
            <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                {isFiltered
                    ? 'Try clearing filters to see the full inbox.'
                    : 'Notifications about sessions, payments, reviews, and messages will appear here.'}
            </p>
            {isFiltered && (
                <button onClick={onClear}
                    className="mt-4 px-3 py-1.5 text-xs font-bold text-royal hover:text-royal-dark">
                    Clear filters
                </button>
            )}
        </div>
    );
}

function formatDayHeader(dayStr) {
    const d = new Date(dayStr);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
}

function relativeTime(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.round(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
