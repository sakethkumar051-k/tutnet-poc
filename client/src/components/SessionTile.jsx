import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import CheckoutModal from './CheckoutModal';

const SessionTile = ({ session, onAction, actionLabel, onRefresh }) => {
    const { user } = useAuth();
    const [showCheckout, setShowCheckout] = useState(false);

    const getStatusColor = (status) => {
        const colors = {
            scheduled: 'bg-blue-50 text-blue-700',
            approved: 'bg-green-50 text-green-700',
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
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                        {targetInitial}
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="text-gray-900 font-semibold truncate text-sm sm:text-base">
                                {targetName}
                            </h3>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 uppercase tracking-wide">
                                {session.subject}
                            </span>
                            {/* Payment badge */}
                            {session.status !== 'pending' && session.bookingCategory !== 'trial' && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${session.isPaid ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
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
                                <span className="flex items-center gap-1 text-green-600 font-medium">
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
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                            </svg>
                            Pay now
                        </button>
                    )}

                    {session.onlineLink && !['completed', 'cancelled'].includes(session.status) ? (
                        <a
                            href={session.onlineLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                            onClick={() => { if (onAction) onAction(session, 'join'); }}
                        >
                            Join
                        </a>
                    ) : (
                        <button
                            onClick={() => onAction && onAction(session, 'view')}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                            {actionLabel || 'Details'}
                        </button>
                    )}
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
