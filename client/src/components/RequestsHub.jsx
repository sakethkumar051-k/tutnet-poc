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

export default function RequestsHub({ onNavigateToSessions, onRequestProcessed }) {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();
    const [data, setData] = useState({ demoRequests: [], permanentRequests: [], rescheduleRequests: [], sessionRequests: [], allPending: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/bookings/requests')
            .then((res) => setData(res.data))
            .catch(() => setData({ demoRequests: [], permanentRequests: [], rescheduleRequests: [], sessionRequests: [], allPending: [] }))
            .finally(() => setLoading(false));
    }, [onRequestProcessed]);

    const handleApprove = async (id) => {
        try {
            await api.patch(`/bookings/${id}/approve`);
            showSuccess('Request approved');
            onRequestProcessed?.();
            setData((prev) => ({
                ...prev,
                sessionRequests: prev.sessionRequests.filter((b) => b._id !== id),
                demoRequests: prev.demoRequests.filter((b) => b._id !== id),
                permanentRequests: prev.permanentRequests.filter((b) => b._id !== id),
                allPending: prev.allPending.filter((b) => b._id !== id)
            }));
        } catch (e) {
            showError(e.response?.data?.message || 'Failed to approve');
        }
    };

    const handleReject = async (id) => {
        try {
            await api.patch(`/bookings/${id}/reject`);
            showSuccess('Request rejected');
            onRequestProcessed?.();
            setData((prev) => ({
                ...prev,
                sessionRequests: prev.sessionRequests.filter((b) => b._id !== id),
                demoRequests: prev.demoRequests.filter((b) => b._id !== id),
                permanentRequests: prev.permanentRequests.filter((b) => b._id !== id),
                allPending: prev.allPending.filter((b) => b._id !== id)
            }));
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

    const isStudent = user?.role === 'student';
    const pending = isStudent
        ? [...data.demoRequests, ...data.permanentRequests, ...data.rescheduleRequests]
        : [...data.sessionRequests, ...data.demoRequests, ...data.permanentRequests];

    if (pending.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-base font-bold text-gray-900 mb-2">Requests</h3>
                <p className="text-sm text-gray-500">No pending requests. {onNavigateToSessions && (
                    <button type="button" onClick={onNavigateToSessions} className="text-indigo-600 hover:underline font-medium">View sessions</button>
                )}</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900">Requests</h3>
                {onNavigateToSessions && (
                    <button type="button" onClick={onNavigateToSessions} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                        View all sessions →
                    </button>
                )}
            </div>
            <ul className="space-y-3">
                {pending.map((b) => {
                    const isDemo = b.bookingCategory === 'trial';
                    const isPermanent = b.bookingCategory === 'permanent';
                    const isReschedule = b.tutorChangeRequest?.status === 'pending' || b.rescheduleRequest?.status === 'pending';
                    const label = isDemo ? 'Demo request' : isPermanent ? 'Permanent engagement' : isReschedule ? 'Reschedule / change' : 'Session request';
                    const other = isStudent ? b.tutorId : b.studentId;
                    const date = b.sessionDate ? new Date(b.sessionDate).toLocaleDateString() : b.preferredStartDate ? new Date(b.preferredStartDate).toLocaleDateString() : b.preferredSchedule || '—';
                    return (
                        <li key={b._id} className={`flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border ${isPermanent ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-100 bg-gray-50/50'}`}>
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{other?.name} · {b.subject}</p>
                                <p className="text-xs text-gray-500">{label} · {date}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{new Date(b.createdAt).toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {statusBadge(b.status)}
                                {isStudent && isReschedule && b.tutorChangeRequest?.status === 'pending' && (
                                    <>
                                        <button onClick={() => handleTutorChangeRespond(b._id, 'approve')} className="px-2 py-1 text-xs font-semibold bg-green-600 text-white rounded hover:bg-green-700">Approve</button>
                                        <button onClick={() => handleTutorChangeRespond(b._id, 'decline')} className="px-2 py-1 text-xs font-medium border border-red-300 text-red-700 rounded hover:bg-red-50">Decline</button>
                                    </>
                                )}
                                {!isStudent && b.status === 'pending' && (
                                    <>
                                        <button onClick={() => handleApprove(b._id)} className="px-2 py-1 text-xs font-semibold bg-green-600 text-white rounded hover:bg-green-700">Approve</button>
                                        <button onClick={() => handleReject(b._id)} className="px-2 py-1 text-xs font-medium border border-gray-300 rounded hover:bg-gray-50">Reject</button>
                                    </>
                                )}
                                {!isStudent && b.rescheduleRequest?.status === 'pending' && (
                                    <>
                                        <button onClick={() => handleRescheduleRespond(b._id, 'approve')} className="px-2 py-1 text-xs font-semibold bg-green-600 text-white rounded hover:bg-green-700">Approve</button>
                                        <button onClick={() => handleRescheduleRespond(b._id, 'decline')} className="px-2 py-1 text-xs font-medium border border-gray-300 rounded hover:bg-gray-50">Decline</button>
                                    </>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
