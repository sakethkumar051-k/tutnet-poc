import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const statusBadge = (status) => {
    const map = {
        pending: 'bg-amber-100 text-amber-800 border-amber-200',
        approved: 'bg-green-100 text-green-800 border-green-200',
        rejected: 'bg-red-100 text-red-800 border-red-200',
        declined: 'bg-red-100 text-red-800 border-red-200'
    };
    const c = map[status] || 'bg-gray-100 text-gray-800 border-gray-200';
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${c}`}>{status}</span>;
};

// Booking type from category only (Demo / Dedicated / One-time). Reschedule is a separate badge.
function getBookingTypeLabel(booking) {
    if (booking.bookingCategory === 'trial') return 'Demo';
    if (booking.bookingCategory === 'permanent' || booking.bookingCategory === 'dedicated') return 'Dedicated';
    return 'One-time';
}

function RequestCard({ request: b, isStudent, isTutor, onApprove, onReject, onRescheduleRespond, onTutorChangeRespond }) {
    const [expanded, setExpanded] = useState(true);
    const isDemo = b.bookingCategory === 'trial';
    const isPermanent = b.bookingCategory === 'permanent' || b.bookingCategory === 'dedicated';
    const isReschedule = b.tutorChangeRequest?.status === 'pending' || b.rescheduleRequest?.status === 'pending';
    const typeLabel = getBookingTypeLabel(b);
    const sessionDate = b.sessionDate ? new Date(b.sessionDate) : null;
    const preferredStart = b.preferredStartDate ? new Date(b.preferredStartDate) : null;
    const dateStr = sessionDate
        ? sessionDate.toLocaleDateString(undefined, { dateStyle: 'medium' })
        : preferredStart
            ? preferredStart.toLocaleDateString(undefined, { dateStyle: 'medium' })
            : b.preferredSchedule ? null : '—';
    const timeStr = sessionDate
        ? sessionDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        : b.preferredSchedule || null;
    const submittedAt = b.createdAt ? new Date(b.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '';

    const hasDetails =
        b.learningGoals || b.studyGoals || b.currentLevel || b.focusAreas || b.additionalNotes ||
        (Array.isArray(b.weeklySchedule) && b.weeklySchedule.length > 0) || b.sessionsPerWeek || b.durationCommitment;

    // Show approve/reject ONLY for tutors (never students, never unknown roles)
    const showRescheduleActions = isStudent && isReschedule && b.tutorChangeRequest?.status === 'pending';
    const showBookingActions = isTutor && b.status === 'pending' && !isReschedule;
    const showRescheduleRespondActions = isTutor && b.rescheduleRequest?.status === 'pending';

    const primaryActions = showRescheduleActions ? (
        <>
            <button onClick={() => onTutorChangeRespond(b._id, 'approve')} className="px-3 py-1.5 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700">Approve</button>
            <button onClick={() => onTutorChangeRespond(b._id, 'decline')} className="px-3 py-1.5 text-sm font-medium border border-red-300 text-red-700 rounded-lg hover:bg-red-50">Decline</button>
        </>
    ) : showRescheduleRespondActions ? (
        <>
            <button onClick={() => onRescheduleRespond(b._id, 'approve')} className="px-3 py-1.5 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700">Approve</button>
            <button onClick={() => onRescheduleRespond(b._id, 'decline')} className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50">Decline</button>
        </>
    ) : showBookingActions ? (
        <>
            <button onClick={() => onApprove(b._id)} className="px-3 py-1.5 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700">Approve</button>
            <button onClick={() => onReject(b._id)} className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50">Reject</button>
        </>
    ) : null;

    return (
        <li className={`rounded-xl border overflow-hidden ${isPermanent ? 'border-indigo-200 bg-indigo-50/20' : 'border-gray-200 bg-white'}`}>
            <div className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className="text-sm font-semibold text-gray-900">{b.subject}</span>
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${isDemo ? 'bg-violet-100 text-violet-800' : isPermanent ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'}`}>
                                {typeLabel}
                            </span>
                            {isReschedule && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">Reschedule requested</span>
                            )}
                            {statusBadge(b.status)}
                        </div>
                        <div className="text-xs text-gray-600 space-y-0.5">
                            {(dateStr || timeStr || b.preferredSchedule) && (
                                <p>
                                    <span className="font-medium text-gray-500">Date & time:</span>{' '}
                                    {[dateStr, timeStr].filter(Boolean).join(' · ') || b.preferredSchedule || '—'}
                                </p>
                            )}
                            {submittedAt && (
                                <p className="text-gray-400">Submitted {submittedAt}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {primaryActions}
                        {hasDetails && (
                            <button
                                type="button"
                                onClick={() => setExpanded((e) => !e)}
                                className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                            >
                                {expanded ? 'Less' : 'More details'}
                            </button>
                        )}
                    </div>
                </div>

                {expanded && hasDetails && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
                        {b.learningGoals && (
                            <div>
                                <span className="font-medium text-gray-600">Learning goals:</span>
                                <p className="text-gray-800 mt-0.5">{b.learningGoals}</p>
                            </div>
                        )}
                        {b.studyGoals && (
                            <div>
                                <span className="font-medium text-gray-600">Study goals:</span>
                                <p className="text-gray-800 mt-0.5">{b.studyGoals}</p>
                            </div>
                        )}
                        {b.currentLevel && (
                            <p><span className="font-medium text-gray-600">Current level:</span> {b.currentLevel}</p>
                        )}
                        {b.focusAreas && (
                            <p><span className="font-medium text-gray-600">Focus areas:</span> {b.focusAreas}</p>
                        )}
                        {Array.isArray(b.weeklySchedule) && b.weeklySchedule.length > 0 && (
                            <div>
                                <span className="font-medium text-gray-600">Weekly schedule:</span>
                                <p className="text-gray-800 mt-0.5">
                                    {b.weeklySchedule.map((s) => `${s.day || '—'} ${s.time || ''}`).filter(Boolean).join(', ') || '—'}
                                </p>
                            </div>
                        )}
                        {(b.sessionsPerWeek || b.durationCommitment) && (
                            <p className="text-gray-700">
                                {b.sessionsPerWeek && `${b.sessionsPerWeek} session(s)/week`}
                                {b.sessionsPerWeek && b.durationCommitment && ' · '}
                                {b.durationCommitment && `Duration: ${b.durationCommitment}`}
                            </p>
                        )}
                        {b.additionalNotes && (
                            <div>
                                <span className="font-medium text-gray-600">Notes:</span>
                                <p className="text-gray-800 mt-0.5">{b.additionalNotes}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </li>
    );
}

export default function RequestsHub({ onNavigateToSessions, onRequestProcessed }) {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();
    const [data, setData] = useState({ demoRequests: [], permanentRequests: [], rescheduleRequests: [], sessionRequests: [], allPending: [] });
    const [loading, setLoading] = useState(true);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyList, setHistoryList] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const emptyState = { demoRequests: [], permanentRequests: [], rescheduleRequests: [], sessionRequests: [], allPending: [] };
    const toArray = (v) => (Array.isArray(v) ? v : []);

    const refetchRequests = () => {
        return api.get('/bookings/requests')
            .then((res) => {
                const d = res.data || {};
                setData({
                    demoRequests: toArray(d.demoRequests ?? d.trialRequests),
                    permanentRequests: toArray(d.permanentRequests ?? d.dedicatedRequests),
                    rescheduleRequests: toArray(d.rescheduleRequests),
                    sessionRequests: toArray(d.sessionRequests),
                    allPending: toArray(d.allPending)
                });
            })
            .catch(() => setData(emptyState));
    };

    useEffect(() => {
        refetchRequests().finally(() => setLoading(false));
    }, [onRequestProcessed]);

    const fetchHistory = () => {
        if (historyList.length > 0) return;
        setHistoryLoading(true);
        api.get('/bookings/mine')
            .then((res) => {
                const list = (res.data || []).filter(
                    (b) => b.status === 'rejected' || b.status === 'cancelled'
                );
                setHistoryList(
                    list.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
                );
            })
            .catch(() => setHistoryList([]))
            .finally(() => setHistoryLoading(false));
    };

    const removeFromAll = (prev, id) => ({
        sessionRequests: prev.sessionRequests.filter((b) => b._id !== id),
        demoRequests: prev.demoRequests.filter((b) => b._id !== id),
        permanentRequests: prev.permanentRequests.filter((b) => b._id !== id),
        rescheduleRequests: prev.rescheduleRequests.filter((b) => b._id !== id),
        allPending: prev.allPending.filter((b) => b._id !== id)
    });

    const handleApprove = async (id) => {
        try {
            await api.patch(`/bookings/${id}/approve`);
            showSuccess('Request approved');
            onRequestProcessed?.();
            setData((prev) => ({ ...prev, ...removeFromAll(prev, id) }));
            await refetchRequests();
        } catch (e) {
            showError(e.response?.data?.message || 'Failed to approve');
        }
    };

    const handleReject = async (id) => {
        try {
            await api.patch(`/bookings/${id}/reject`);
            showSuccess('Request rejected');
            onRequestProcessed?.();
            setData((prev) => ({ ...prev, ...removeFromAll(prev, id) }));
            await refetchRequests();
            setHistoryList([]);
        } catch (e) {
            showError(e.response?.data?.message || 'Failed to reject');
        }
    };

    const handleRescheduleRespond = async (id, action) => {
        try {
            await api.patch(`/bookings/${id}/reschedule-respond`, { action });
            showSuccess(action === 'approve' ? 'Reschedule approved' : 'Reschedule declined');
            onRequestProcessed?.();
            setData((prev) => ({
                ...prev,
                rescheduleRequests: prev.rescheduleRequests.filter((b) => b._id !== id),
                allPending: prev.allPending.filter((b) => b._id !== id)
            }));
            await refetchRequests();
        } catch (e) {
            showError(e.response?.data?.message || 'Failed');
        }
    };

    const handleTutorChangeRespond = async (id, action) => {
        try {
            await api.patch(`/bookings/${id}/tutor-change-respond`, { action });
            showSuccess(`Change ${action}d`);
            onRequestProcessed?.();
            setData((prev) => ({
                ...prev,
                rescheduleRequests: prev.rescheduleRequests.filter((b) => b._id !== id),
                allPending: prev.allPending.filter((b) => b._id !== id)
            }));
            await refetchRequests();
        } catch (e) {
            showError(e.response?.data?.message || 'Failed');
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    // Guard: if user role isn't loaded yet (token-only state), don't show any approve/reject actions
    const isStudent = user?.role === 'student';
    const isTutor = user?.role === 'tutor';
    const demoRequests = toArray(data.demoRequests);
    const permanentRequests = toArray(data.permanentRequests);
    const rescheduleRequests = toArray(data.rescheduleRequests);
    const sessionRequests = toArray(data.sessionRequests);
    const merged = isStudent
        ? [...demoRequests, ...permanentRequests, ...rescheduleRequests]
        : [...sessionRequests, ...demoRequests, ...permanentRequests];
    // Deduplicate by booking id (same booking can appear in multiple categories from API)
    const seen = new Set();
    const pending = merged
        .filter((b) => {
            if (!b?._id) return false;
            if (seen.has(b._id)) return false;
            seen.add(b._id);
            return true;
        })
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const renderHistorySection = () => (
            <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                    type="button"
                    onClick={() => { setHistoryOpen((o) => !o); if (!historyOpen) fetchHistory(); }}
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                    {historyOpen ? '▼' : '▶'} Declined & rejected history
                    {historyList.length > 0 && !historyLoading && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">{historyList.length}</span>
                    )}
                </button>
                {historyOpen && (
                    <div className="mt-3">
                        {historyLoading ? (
                            <div className="flex justify-center py-4">
                                <div className="w-5 h-5 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
                            </div>
                        ) : historyList.length === 0 ? (
                            <p className="text-sm text-gray-500 py-2">No declined or rejected requests.</p>
                        ) : (
                            <ul className="space-y-2 max-h-64 overflow-y-auto">
                                {historyList.map((b) => {
                                    const typeLabel = getBookingTypeLabel(b);
                                    const dateStr = b.sessionDate ? new Date(b.sessionDate).toLocaleDateString(undefined, { dateStyle: 'medium' }) : b.preferredSchedule || '—';
                                    const when = b.updatedAt ? new Date(b.updatedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '';
                                    return (
                                        <li key={b._id} className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <div>
                                                <span className="text-sm font-medium text-gray-800">{b.subject}</span>
                                                <span className="text-xs text-gray-500 ml-2">{typeLabel}</span>
                                                <span className="text-xs text-gray-400 ml-2">{dateStr}</span>
                                            </div>
                                            <span className="text-xs text-gray-500">{b.status === 'rejected' ? 'Rejected' : 'Cancelled'} {when}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                )}
            </div>
    );

    if (pending.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-base font-bold text-gray-900 mb-2">Booking requests</h3>
                <p className="text-sm text-gray-500">
                    No pending requests.{' '}
                    {onNavigateToSessions && (
                        <button type="button" onClick={onNavigateToSessions} className="text-indigo-600 hover:underline font-medium">
                            View sessions
                        </button>
                    )}
                </p>
                {renderHistorySection()}
            </div>
        );
    }

    return (
        <div id="booking-requests" className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Booking requests</h3>
                {onNavigateToSessions && (
                    <button type="button" onClick={onNavigateToSessions} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                        View all sessions →
                    </button>
                )}
            </div>
            <ul className="space-y-4">
                {pending.map((b) => (
                    <RequestCard
                        key={b._id}
                        request={b}
                        isStudent={isStudent}
                        isTutor={isTutor}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onRescheduleRespond={handleRescheduleRespond}
                        onTutorChangeRespond={handleTutorChangeRespond}
                    />
                ))}
            </ul>
            {renderHistorySection()}
        </div>
    );
}
