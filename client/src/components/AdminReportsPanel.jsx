import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';

/**
 * AdminReportsPanel — off-platform report review queue.
 * Embed in the AdminDashboard or show standalone.
 */
export default function AdminReportsPanel() {
    const { showSuccess, showError } = useToast();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('submitted');
    const [resolvingId, setResolvingId] = useState(null);
    const [adminNote, setAdminNote] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/off-platform-reports/admin', {
                params: filter === 'all' ? {} : { status: filter }
            });
            setReports(data.reports || []);
        } catch (_) {
            setReports([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [filter]);

    const resolve = async (id, verdict) => {
        try {
            await api.post(`/off-platform-reports/admin/${id}/resolve`, { verdict, adminNote });
            showSuccess(`Report ${verdict}.`);
            setResolvingId(null);
            setAdminNote('');
            load();
        } catch (err) {
            showError(err.response?.data?.message || 'Could not resolve');
        }
    };

    const filters = ['submitted', 'verified', 'dismissed', 'false_report', 'all'];

    return (
        <div>
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h2 className="text-lg font-bold text-navy-950">Off-Platform Reports</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Verified reports issue ₹500 credit to parent + bump tutor risk score.
                    </p>
                </div>
                <button onClick={load}
                    className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                    Refresh
                </button>
            </div>

            <div className="flex items-center gap-1.5 mb-4">
                {filters.map((f) => (
                    <button key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                            filter === f
                                ? 'bg-navy-950 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}>
                        {f.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-400">Loading…</div>
            ) : reports.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                    <p className="text-sm font-semibold text-navy-950">No reports</p>
                    <p className="text-xs text-gray-400 mt-1">Nothing in the <span className="lowercase">{filter}</span> queue.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {reports.map((r) => (
                        <div key={r._id} className="bg-white rounded-xl border border-gray-100 p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-bold text-navy-950">
                                            {r.studentId?.name || 'Student'}
                                        </span>
                                        <span className="text-xs text-gray-400">reports</span>
                                        <span className="text-xs font-bold text-rose-700">
                                            {r.tutorId?.name || 'Tutor'}
                                        </span>
                                        <StatusBadge status={r.status} />
                                    </div>
                                    <p className="text-sm text-gray-700 mt-2 whitespace-pre-line">
                                        {r.description}
                                    </p>
                                    <p className="text-[11px] text-gray-400 mt-2">
                                        Filed {new Date(r.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                        {r.reviewedAt && <> · Reviewed {new Date(r.reviewedAt).toLocaleString('en-IN', { dateStyle: 'medium' })}</>}
                                    </p>
                                    {r.adminNote && (
                                        <p className="text-xs text-gray-500 mt-2 italic">Admin note: {r.adminNote}</p>
                                    )}
                                </div>

                                {r.status === 'submitted' && (
                                    resolvingId === r._id ? (
                                        <div className="flex-shrink-0 w-[320px]">
                                            <textarea
                                                value={adminNote}
                                                onChange={(e) => setAdminNote(e.target.value)}
                                                placeholder="Admin note (optional)"
                                                rows={2}
                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs resize-none focus:outline-none focus:ring-2 focus:ring-royal/20"
                                            />
                                            <div className="flex gap-1.5 mt-2">
                                                <button onClick={() => resolve(r._id, 'verified')}
                                                    className="flex-1 px-2 py-1.5 bg-lime hover:bg-lime-light text-navy-950 text-xs font-bold rounded-lg transition-colors">
                                                    Verify (₹500 credit)
                                                </button>
                                                <button onClick={() => resolve(r._id, 'dismissed')}
                                                    className="flex-1 px-2 py-1.5 border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50">
                                                    Dismiss
                                                </button>
                                                <button onClick={() => resolve(r._id, 'false_report')}
                                                    className="flex-1 px-2 py-1.5 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg hover:bg-rose-50">
                                                    False report
                                                </button>
                                            </div>
                                            <button onClick={() => { setResolvingId(null); setAdminNote(''); }}
                                                className="text-[11px] text-gray-400 hover:text-gray-600 mt-1.5">
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setResolvingId(r._id)}
                                            className="flex-shrink-0 px-4 py-2 bg-royal hover:bg-royal-dark text-white text-xs font-bold rounded-lg transition-colors">
                                            Review
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }) {
    const cls = {
        submitted: 'bg-yellow-100 text-yellow-800',
        verified: 'bg-lime/30 text-navy-950',
        dismissed: 'bg-gray-100 text-gray-700',
        false_report: 'bg-rose-100 text-rose-800',
        under_review: 'bg-royal/10 text-royal-dark'
    }[status] || 'bg-gray-100 text-gray-700';
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${cls}`}>{status.replace('_', ' ')}</span>;
}
