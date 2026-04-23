import { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useBookingStore } from '../stores/bookingStore';

const statusBadge = (status) => {
    const map = {
        pending: 'bg-lime/30 text-navy-950 border-lime/40',
        approved: 'bg-lime/30 text-navy-950 border-lime/40',
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

function RequestCard({
    request: b,
    isStudent,
    isTutor,
    onApprove,
    onReject,
    onRescheduleRespond,
    onTutorChangeRespond,
    onMarkViewedByTutor
}) {
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
    const viewedAt = b.viewedByTutorAt ? new Date(b.viewedByTutorAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '';

    const hasDetails =
        b.learningGoals || b.studyGoals || b.currentLevel || b.focusAreas || b.additionalNotes ||
        (Array.isArray(b.weeklySchedule) && b.weeklySchedule.length > 0) || b.sessionsPerWeek || b.durationCommitment;

    // Tutor-change diff renders its own Approve/Decline, so don't duplicate in the header
    const showBookingActions = isTutor && b.status === 'pending' && !isReschedule;
    const showRescheduleRespondActions = isTutor && b.rescheduleRequest?.status === 'pending';

    const primaryActions = showRescheduleRespondActions ? (
        <>
            <button onClick={() => onRescheduleRespond(b._id, 'approve')} className="px-3 py-1.5 text-sm font-semibold bg-lime text-navy-950 rounded-lg hover:bg-lime-light">Approve</button>
            <button onClick={() => onRescheduleRespond(b._id, 'decline')} className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50">Decline</button>
        </>
    ) : showBookingActions ? (
        <>
            {!b.viewedByTutorAt && onMarkViewedByTutor && (
                <button
                    type="button"
                    onClick={() => onMarkViewedByTutor(b._id)}
                    className="px-3 py-1.5 text-xs font-semibold border border-royal/40 text-royal rounded-lg hover:bg-royal/5"
                >
                    Mark opened
                </button>
            )}
            <button onClick={() => onApprove(b._id)} className="px-3 py-1.5 text-sm font-semibold bg-lime text-navy-950 rounded-lg hover:bg-lime-light">Approve</button>
            <button onClick={() => onReject(b._id)} className="px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50">Reject</button>
        </>
    ) : null;

    const tcr = b.tutorChangeRequest;
    const showTutorChangeDiff = isStudent && tcr?.status === 'pending';

    return (
        <li className={`rounded-2xl border overflow-hidden ${isPermanent ? 'border-royal/30 bg-royal/[0.03]' : 'border-gray-100 bg-white'}`}>
            <div className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-base font-bold text-navy-950">{b.subject}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${isDemo ? 'bg-royal/10 text-royal-dark' : isPermanent ? 'bg-royal/10 text-royal-dark' : 'bg-gray-100 text-gray-600'}`}>
                                {typeLabel}
                            </span>
                            {isReschedule && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-bold uppercase tracking-wide">Change requested</span>
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
                            {isStudent && b.status === 'pending' && viewedAt && (
                                <p className="text-xs text-royal font-medium mt-1">Tutor opened your request · {viewedAt}</p>
                            )}
                            {isTutor && b.status === 'pending' && b.viewedByTutorAt && (
                                <p className="text-xs text-gray-500 mt-1">Opened {viewedAt}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {primaryActions}
                        {hasDetails && (
                            <button
                                type="button"
                                onClick={() => setExpanded((e) => !e)}
                                className="text-xs font-medium text-royal hover:text-royal-dark"
                            >
                                {expanded ? 'Less' : 'More details'}
                            </button>
                        )}
                    </div>
                </div>

                {showTutorChangeDiff && (
                    <TutorChangeDiff
                        booking={b}
                        onApprove={() => onTutorChangeRespond(b._id, 'approve')}
                        onDecline={() => onTutorChangeRespond(b._id, 'decline')}
                    />
                )}

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

// ── TutorChangeDiff: shows the student exactly what the tutor proposed ──
function TutorChangeDiff({ booking, onApprove, onDecline }) {
    const tcr = booking.tutorChangeRequest || {};
    const type = tcr.type;

    // Compute before/after
    const originalDate = booking.sessionDate ? new Date(booking.sessionDate) : null;
    const proposedDate = tcr.proposedDate ? new Date(tcr.proposedDate) : null;
    const fmt = (d) => d ? d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

    const changes = [];
    if ((type === 'reschedule' || type === 'both') && (proposedDate || tcr.proposedSchedule)) {
        changes.push({
            label: 'Session time',
            before: originalDate ? fmt(originalDate) : (booking.preferredSchedule || '—'),
            after: proposedDate ? fmt(proposedDate) : (tcr.proposedSchedule || '—')
        });
    }
    if ((type === 'subject' || type === 'both') && tcr.proposedSubject) {
        changes.push({
            label: 'Subject',
            before: booking.subject || '—',
            after: tcr.proposedSubject
        });
    }
    // Defensive: if API didn't populate a clear type, still show whatever's proposed
    if (changes.length === 0) {
        if (tcr.proposedDate || tcr.proposedSchedule) {
            changes.push({ label: 'Session time', before: booking.preferredSchedule || fmt(originalDate), after: tcr.proposedSchedule || fmt(proposedDate) });
        }
        if (tcr.proposedSubject) {
            changes.push({ label: 'Subject', before: booking.subject, after: tcr.proposedSubject });
        }
    }

    return (
        <div className="mt-4 border border-yellow-200 bg-yellow-50/60 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-yellow-200 flex items-center gap-2">
                <svg className="w-4 h-4 text-yellow-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                </svg>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-yellow-900">Your tutor proposed a change</p>
                    <p className="text-[11px] text-yellow-800/80 mt-0.5">Review the details below and approve or decline.</p>
                </div>
            </div>
            <div className="p-4 space-y-3">
                {changes.length === 0 ? (
                    <p className="text-xs text-yellow-900/80">
                        The tutor submitted a change request but didn't specify details. Ask them to resubmit with clearer info.
                    </p>
                ) : (
                    changes.map((c, i) => (
                        <div key={i}>
                            <p className="text-[10px] font-bold tracking-[0.18em] text-gray-500 uppercase">{c.label}</p>
                            <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm">
                                <div className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                                    <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Current</p>
                                    <p className="font-semibold text-gray-700 mt-0.5 truncate">{c.before}</p>
                                </div>
                                <svg className="w-4 h-4 text-yellow-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                                <div className="bg-white border border-yellow-300 rounded-lg px-3 py-2">
                                    <p className="text-[10px] font-bold tracking-wider text-yellow-700 uppercase">Proposed</p>
                                    <p className="font-semibold text-navy-950 mt-0.5 truncate">{c.after}</p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
                {tcr.reason && (
                    <div className="pt-3 border-t border-yellow-200/60">
                        <p className="text-[10px] font-bold tracking-[0.18em] text-gray-500 uppercase">Tutor's reason</p>
                        <p className="text-sm text-gray-700 mt-1 italic">"{tcr.reason}"</p>
                    </div>
                )}

                <div className="flex gap-2 pt-2">
                    <button
                        onClick={onApprove}
                        className="flex-1 py-2.5 rounded-full bg-lime hover:bg-lime-light text-navy-950 text-xs font-bold transition-colors"
                    >
                        Approve change
                    </button>
                    <button
                        onClick={onDecline}
                        className="flex-1 py-2.5 rounded-full border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors"
                    >
                        Decline
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function RequestsHub({ onNavigateToSessions, onRequestProcessed }) {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();
    const [data, setData] = useState({ demoRequests: [], permanentRequests: [], rescheduleRequests: [], sessionRequests: [], allPending: [] });
    const [loading, setLoading] = useState(true);
    const [historyOpen, setHistoryOpen] = useState(false);
    const storeBookings = useBookingStore((s) => s.bookings);
    const bookingsLoading = useBookingStore((s) => s.loading);
    const historyList = useMemo(
        () =>
            storeBookings
                .filter((b) => b.status === 'rejected' || b.status === 'cancelled')
                .sort(
                    (a, b) =>
                        new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
                ),
        [storeBookings]
    );
    const [rejectModal, setRejectModal] = useState({ id: null, reason: '' });

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

    const handleReject = (id) => {
        setRejectModal({ id, reason: '' });
    };

    const submitReject = async () => {
        const id = rejectModal.id;
        if (!id) return;
        try {
            const body = rejectModal.reason.trim()
                ? { cancellationReason: rejectModal.reason.trim() }
                : {};
            await api.patch(`/bookings/${id}/reject`, body);
            showSuccess('Request rejected');
            setRejectModal({ id: null, reason: '' });
            onRequestProcessed?.();
            setData((prev) => ({ ...prev, ...removeFromAll(prev, id) }));
            await refetchRequests();
        } catch (e) {
            showError(e.response?.data?.message || 'Failed to reject');
        }
    };

    const handleMarkViewedByTutor = async (id) => {
        try {
            await api.patch(`/booking-actions/${id}/viewed-by-tutor`);
            showSuccess('Marked as opened');
            onRequestProcessed?.();
            await refetchRequests();
        } catch (e) {
            showError(e.response?.data?.message || 'Could not update');
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
                    <div className="w-6 h-6 border-2 border-royal border-t-transparent rounded-full animate-spin" />
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
                    onClick={() => setHistoryOpen((o) => !o)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-navy-950"
                >
                    {historyOpen ? '▼' : '▶'} Declined & rejected history
                    {historyList.length > 0 && !bookingsLoading && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">{historyList.length}</span>
                    )}
                </button>
                    {historyOpen && (
                    <div className="mt-3">
                        {bookingsLoading && historyList.length === 0 ? (
                            <div className="flex justify-center py-4">
                                <div className="w-5 h-5 border-2 border-gray-300 border-t-royal rounded-full animate-spin" />
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
                                        <li key={b._id} className="flex flex-col gap-1 py-2 px-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <span className="text-sm font-medium text-gray-800">{b.subject}</span>
                                                    <span className="text-xs text-gray-500 ml-2">{typeLabel}</span>
                                                    <span className="text-xs text-gray-400 ml-2">{dateStr}</span>
                                                </div>
                                                <span className="text-xs text-gray-500">{b.status === 'rejected' ? 'Rejected' : 'Cancelled'} {when}</span>
                                            </div>
                                            {b.cancellationReason && (
                                                <p className="text-xs text-gray-600 pl-0.5 border-l-2 border-gray-200">{b.cancellationReason}</p>
                                            )}
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
                <h3 className="text-base font-bold text-navy-950 mb-2">Booking requests</h3>
                <p className="text-sm text-gray-500">
                    No pending requests.{' '}
                    {onNavigateToSessions && (
                        <button type="button" onClick={onNavigateToSessions} className="text-royal hover:underline font-medium">
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
                <h3 className="text-lg font-bold text-navy-950">Booking requests</h3>
                {onNavigateToSessions && (
                    <button type="button" onClick={onNavigateToSessions} className="text-sm font-semibold text-royal hover:text-royal-dark">
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
                        onMarkViewedByTutor={isTutor ? handleMarkViewedByTutor : undefined}
                    />
                ))}
            </ul>
            {rejectModal.id && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 border border-gray-200">
                        <h4 className="text-base font-bold text-navy-950 mb-2">Reject request</h4>
                        <p className="text-sm text-gray-600 mb-3">Optional note to the student (shown in their booking history).</p>
                        <textarea
                            value={rejectModal.reason}
                            onChange={(e) => setRejectModal((m) => ({ ...m, reason: e.target.value }))}
                            rows={3}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-royal/30"
                            placeholder="Reason (optional)"
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                type="button"
                                onClick={() => setRejectModal({ id: null, reason: '' })}
                                className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={submitReject}
                                className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {renderHistorySection()}
        </div>
    );
}
