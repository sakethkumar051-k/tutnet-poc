import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import CheckoutModal from './CheckoutModal';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';

const SessionTile = ({ session, onAction, actionLabel, onRefresh }) => {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();
    const [showCheckout, setShowCheckout] = useState(false);
    const [joinUrlDraft, setJoinUrlDraft] = useState('');
    const [savingJoinUrl, setSavingJoinUrl] = useState(false);

    const isTutor = user?.role === 'tutor';
    const hasJoinLink = Boolean(session.sessionJoinUrl || session.onlineLink);
    const canTrackPresence = ['approved', 'pending'].includes(session.status);

    useEffect(() => {
        setJoinUrlDraft(session.sessionJoinUrl || session.onlineLink || '');
    }, [session._id, session.sessionJoinUrl, session.onlineLink]);

    const notifyJoinPresence = () => {
        if (!session._id || !canTrackPresence) return;
        api.patch(`/booking-actions/${session._id}/session-presence`, { action: 'join' }).catch(() => {});
    };

    const saveJoinUrl = async (e) => {
        e?.preventDefault();
        const url = joinUrlDraft.trim();
        if (!url || !session._id) {
            showError('Enter a valid video link');
            return;
        }
        setSavingJoinUrl(true);
        try {
            await api.patch(`/booking-actions/${session._id}/session-join-url`, { sessionJoinUrl: url });
            showSuccess('Join link saved');
            onRefresh?.();
        } catch (err) {
            showError(err.response?.data?.message || 'Could not save link');
        } finally {
            setSavingJoinUrl(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            scheduled: 'bg-royal/5 text-royal-dark',
            approved: 'bg-lime/20 text-navy-950',
            completed: 'bg-gray-100 text-gray-600',
            pending: 'bg-yellow-50 text-yellow-700',
            cancelled: 'bg-red-50 text-red-700'
        };
        return colors[status] || colors.scheduled;
    };

    const formatTime = (dateStr, duration) => {
        if (!dateStr) return 'Unscheduled';
        const date = new Date(dateStr);
        const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const day = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        return `${day}, ${time}${duration ? ` • ${duration}m` : ''}`;
    };

    const targetUser = user?.role === 'student' ? session.tutorId : session.studentId;
    const targetName = targetUser?.name || 'Unknown User';
    const targetInitial = targetName.charAt(0).toUpperCase();

    // Show Pay button for students on approved, non-trial, unpaid sessions
    const showPayButton =
        user?.role === 'student' &&
        session.status === 'approved' &&
        session.bookingCategory !== 'trial' &&
        !session.isPaid;

    return (
        <>
            <div className="group bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-all duration-200 flex items-center justify-between gap-4">
                {/* Left: Avatar & Info */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-royal/5 text-royal flex items-center justify-center font-bold text-sm">
                        {targetInitial}
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="text-navy-950 font-semibold truncate text-sm sm:text-base">
                                {targetName}
                            </h3>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 uppercase tracking-wide">
                                {session.subject}
                            </span>
                            {/* Payment badge */}
                            {session.status !== 'pending' && session.bookingCategory !== 'trial' && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${session.isPaid ? 'bg-lime/20 text-navy-950' : 'bg-lime/20 text-navy-950'}`}>
                                    {session.isPaid ? '✓ Paid' : 'Unpaid'}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-500">
                            <span>{formatTime(session.sessionDate, session.duration)}</span>
                            {session.status !== 'approved' && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(session.status)}`}>
                                    {session.status}
                                </span>
                            )}
                            {session.attendanceStatus && (
                                <span className="flex items-center gap-1 text-lime-dark font-medium">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    Present
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex-shrink-0 flex items-center gap-2">
                    {/* Pay button — only for students with unpaid approved sessions */}
                    {showPayButton && (
                        <button
                            onClick={() => setShowCheckout(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-royal text-white text-xs font-semibold rounded-lg hover:bg-royal-dark transition-colors shadow-sm"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                            </svg>
                            Pay now
                        </button>
                    )}

                    {isTutor && !hasJoinLink && !['completed', 'cancelled', 'rejected'].includes(session.status) && (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-[min(100%,320px)]">
                            <form onSubmit={saveJoinUrl} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 min-w-0">
                                <input
                                    type="url"
                                    value={joinUrlDraft}
                                    onChange={(e) => setJoinUrlDraft(e.target.value)}
                                    placeholder="Paste Meet / Zoom link"
                                    className="flex-1 min-w-0 text-xs border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-royal/30"
                                />
                                <button
                                    type="submit"
                                    disabled={savingJoinUrl || !joinUrlDraft.trim()}
                                    className="px-3 py-2 bg-navy-950 text-white text-xs font-semibold rounded-lg hover:bg-navy-900 disabled:opacity-50 whitespace-nowrap"
                                >
                                    {savingJoinUrl ? 'Saving…' : 'Save link'}
                                </button>
                            </form>
                            <button
                                type="button"
                                onClick={() => onAction && onAction(session, 'view')}
                                className="px-3 py-2 text-xs font-medium text-gray-600 hover:text-royal border border-gray-200 rounded-lg whitespace-nowrap"
                            >
                                Details
                            </button>
                        </div>
                    )}
                    {hasJoinLink && !['completed', 'cancelled'].includes(session.status) ? (
                        <div className="flex gap-1.5">
                            <a
                                href={`/session/${session._id}`}
                                className="inline-flex items-center px-4 py-2 bg-royal text-white text-sm font-medium rounded-lg hover:bg-royal-dark transition-colors shadow-sm"
                                onClick={() => {
                                    notifyJoinPresence();
                                    if (onAction) onAction(session, 'join');
                                }}
                            >
                                Join
                            </a>
                            <a
                                href={session.sessionJoinUrl || session.onlineLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open in a new tab"
                                className="inline-flex items-center justify-center w-9 h-9 border border-gray-200 text-gray-500 hover:text-royal hover:border-royal/30 rounded-lg transition-colors"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                        </div>
                    ) : !isTutor || hasJoinLink ? (
                        <button
                            onClick={() => onAction && onAction(session, 'view')}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-royal hover:bg-gray-50 rounded-lg transition-colors"
                        >
                            {actionLabel || 'Details'}
                        </button>
                    ) : null}
                </div>
            </div>

            {/* Checkout modal */}
            {showCheckout && (
                <CheckoutModal
                    booking={session}
                    onClose={() => setShowCheckout(false)}
                    onSuccess={() => {
                        setShowCheckout(false);
                        if (onRefresh) onRefresh();
                    }}
                />
            )}
        </>
    );
};

export default SessionTile;
