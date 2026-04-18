import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';

// ─── tiny helpers ────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const map = {
        approved: 'bg-lime/30 text-navy-950 border-lime/40',
        pending:  'bg-lime/30  text-navy-950  border-lime/40',
        rejected: 'bg-red-100   text-red-800   border-red-200',
        verified: 'bg-lime/30 text-navy-950 border-lime/40',
        disputed: 'bg-red-100   text-red-800   border-red-200',
        unverified:'bg-gray-100 text-gray-600  border-gray-200'
    };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${map[status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
            {status}
        </span>
    );
};

const Stat = ({ label, value, sub, color = 'text-navy-950' }) => (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
);

// ─── approval history timeline ────────────────────────────────────────────────
const HistoryTimeline = ({ history }) => {
    if (!history?.length) return <p className="text-xs text-gray-400 py-2">No review history.</p>;
    const colorMap = {
        approved:    'bg-lime text-navy-950',
        rejected:    'bg-red-500   text-red-700',
        submitted:   'bg-royal text-royal-dark',
        resubmitted: 'bg-blue-400  text-royal-dark'
    };
    return (
        <ol className="relative border-l border-gray-200 ml-2 space-y-3 py-1">
            {[...history].sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).map((item, i) => {
                const parts = (colorMap[item.action] || 'bg-gray-400 text-gray-600').split(' ');
                return (
                    <li key={i} className="ml-4">
                        <div className={`absolute -left-1.5 mt-1 w-3 h-3 rounded-full border-2 border-white ${parts[0]}`} />
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-xs font-semibold capitalize ${parts[1]}`}>{item.action}</span>
                            {item.adminName && <span className="text-xs text-gray-500">by {item.adminName}</span>}
                            <span className="text-xs text-gray-400">
                                {new Date(item.timestamp).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                            </span>
                        </div>
                        {item.note && <p className="text-xs text-gray-600 mt-0.5 italic">"{item.note}"</p>}
                    </li>
                );
            })}
        </ol>
    );
};

// ─── tutor card ───────────────────────────────────────────────────────────────
const TutorCard = ({ tutor, onApprove, onReject }) => {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-royal/30 hover:shadow-sm transition-all">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-semibold text-navy-950 truncate">{tutor.userId?.name}</p>
                        {tutor.tutorCode && (
                            <span className="px-2 py-0.5 rounded-md bg-royal/5 text-royal-dark text-xs font-mono border border-royal/20">{tutor.tutorCode}</span>
                        )}
                        <StatusBadge status={tutor.approvalStatus} />
                    </div>
                    <p className="text-xs text-gray-500 mb-1">{tutor.userId?.email}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        {tutor.userId?.phone && <span>{tutor.userId.phone}</span>}
                        {(tutor.userId?.location?.area || tutor.userId?.location?.city) && (
                            <span>{[tutor.userId.location.area, tutor.userId.location.city].filter(Boolean).join(', ')}</span>
                        )}
                        {tutor.subjects?.length > 0 && <span>Subjects: {tutor.subjects.join(', ')}</span>}
                        {tutor.hourlyRate > 0 && <span>₹{tutor.hourlyRate}/hr</span>}
                        {tutor.experienceYears > 0 && <span>{tutor.experienceYears} yrs exp</span>}
                    </div>
                    {tutor.approvalStatus === 'rejected' && tutor.rejectionReason && (
                        <p className="mt-1 text-xs text-red-600">Reason: {tutor.rejectionReason}</p>
                    )}
                    {tutor.bio && expanded && (
                        <p className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                            {tutor.bio.slice(0, 300)}{tutor.bio.length > 300 ? '…' : ''}
                        </p>
                    )}
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-2">
                    <div className="flex gap-2">
                        {tutor.approvalStatus !== 'approved' && (
                            <button onClick={() => onApprove(tutor._id)}
                                className="px-3 py-1.5 bg-lime hover:bg-lime-light text-navy-950 text-xs font-semibold rounded-lg transition-colors">
                                Approve
                            </button>
                        )}
                        {tutor.approvalStatus !== 'rejected' && (
                            <button onClick={() => onReject(tutor._id)}
                                className="px-3 py-1.5 border border-red-300 hover:bg-red-50 text-red-700 text-xs font-semibold rounded-lg transition-colors">
                                {tutor.approvalStatus === 'approved' ? 'Revoke' : 'Reject'}
                            </button>
                        )}
                    </div>
                    <button onClick={() => setExpanded(v => !v)}
                        className="text-xs text-royal hover:text-navy-900">
                        {expanded ? 'Less ↑' : 'Details + History ↓'}
                    </button>
                </div>
            </div>
            {expanded && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                    {tutor.education?.degree && (
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Education</p>
                            <p className="text-sm text-gray-800">{tutor.education.degree} — {tutor.education.institution}</p>
                        </div>
                    )}
                    {tutor.qualifications?.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Qualifications</p>
                            <div className="flex flex-wrap gap-1.5">
                                {tutor.qualifications.map((q,i)=>(
                                    <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">{q}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Review History</p>
                        <HistoryTimeline history={tutor.approvalHistory} />
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── reject modal ─────────────────────────────────────────────────────────────
const RejectModal = ({ onClose, onConfirm }) => {
    const [reason, setReason] = useState('');
    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <h3 className="text-lg font-bold text-navy-950 mb-1">Reject Profile</h3>
                <p className="text-sm text-gray-500 mb-4">Provide a reason so the tutor knows what to fix.</p>
                <textarea autoFocus value={reason} onChange={e=>setReason(e.target.value)}
                    placeholder="e.g. Missing qualifications, incomplete bio…" rows={4}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-4" />
                <div className="flex gap-3 justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:border-gray-300">Cancel</button>
                    <button onClick={()=>{ if(reason.trim()) onConfirm(reason.trim()); }}
                        disabled={!reason.trim()}
                        className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg disabled:opacity-50">
                        Reject
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── attendance cross-check panel ────────────────────────────────────────────
const AttendanceCrossCheck = () => {
    const [data, setData]       = useState(null);
    const [filter, setFilter]   = useState('disputed');
    const [loading, setLoading] = useState(true);
    const { showSuccess, showError } = useToast();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data: res } = await api.get(`/admin/attendance/cross-check?filter=${filter}`);
            setData(res);
        } catch { showError('Failed to load cross-check data'); }
        finally { setLoading(false); }
    }, [filter]);

    useEffect(() => { load(); }, [load]);

    const handleAlert = async (userId, name) => {
        try {
            await api.post('/admin/send-alert', {
                userId,
                title: 'Attendance dispute under review',
                message: 'An admin is reviewing your disputed attendance record and will follow up shortly.'
            });
            showSuccess(`Alert sent to ${name}`);
        } catch { showError('Failed to send alert'); }
    };

    return (
        <div className="space-y-5">
            {data?.stats && (
                <div className="grid grid-cols-3 gap-4">
                    <Stat label="Disputed" value={data.stats.disputed} color="text-red-600" />
                    <Stat label="Unverified" value={data.stats.unverified} color="text-lime-dark" />
                    <Stat label="Verified" value={data.stats.verified} color="text-lime-dark" />
                </div>
            )}
            <div className="flex items-center gap-3">
                {['disputed','unverified','all'].map(f=>(
                    <button key={f} onClick={()=>setFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${filter===f?'bg-royal text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {f}
                    </button>
                ))}
                <button onClick={load} className="ml-auto px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Refresh</button>
            </div>

            {loading ? (
                <div className="text-center py-10 text-gray-400">Loading…</div>
            ) : !data?.records?.length ? (
                <div className="text-center py-14 bg-white rounded-xl border border-gray-200">
                    <svg className="w-10 h-10 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <p className="text-gray-500 font-medium">No records found</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                {['Student','Tutor','Subject','Session Date','Tutor Mark','Parent Status','Note','Action'].map(h=>(
                                    <th key={h} className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.records.map(r=>(
                                <tr key={r._id} className="hover:bg-gray-50">
                                    <td className="py-3 px-4 font-medium text-navy-950">{r.studentId?.name||'—'}</td>
                                    <td className="py-3 px-4 text-gray-600">{r.tutorId?.name||'—'}</td>
                                    <td className="py-3 px-4 text-gray-500">{r.bookingId?.subject||'—'}</td>
                                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                                        {r.sessionDate ? new Date(r.sessionDate).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '—'}
                                    </td>
                                    <td className="py-3 px-4 capitalize text-gray-600">{r.status}</td>
                                    <td className="py-3 px-4"><StatusBadge status={r.parentVerificationStatus}/></td>
                                    <td className="py-3 px-4 text-xs text-gray-500 max-w-[140px] truncate" title={r.parentVerificationNote}>
                                        {r.parentVerificationNote||'—'}
                                    </td>
                                    <td className="py-3 px-4">
                                        {r.parentVerificationStatus==='disputed' && (
                                            <button onClick={()=>handleAlert(r.studentId?._id, r.studentId?.name)}
                                                className="px-2 py-1 text-xs bg-royal/5 hover:bg-royal/10 text-royal-dark rounded-lg border border-royal/30 transition-colors">
                                                Alert Student
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// ─── platform analytics ───────────────────────────────────────────────────────
const PlatformAnalytics = () => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading]     = useState(true);
    const { showError } = useToast();

    useEffect(()=>{
        api.get('/admin/analytics')
            .then(({data})=>setAnalytics(data))
            .catch(()=>showError('Failed to load analytics'))
            .finally(()=>setLoading(false));
    },[]);

    if (loading) return <div className="text-center py-10 text-gray-400">Loading…</div>;
    if (!analytics) return null;

    const bookingCompletion = analytics.bookings.total > 0
        ? ((analytics.bookings.completed / analytics.bookings.total)*100).toFixed(1)
        : 0;
    const approvalRate = (analytics.users.tutors > 0)
        ? ((analytics.users.approvedTutors / analytics.users.tutors)*100).toFixed(1)
        : 0;

    return (
        <div className="space-y-6">
            {/* Platform health row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Stat label="Total Users"      value={analytics.users.total}            sub={`+${analytics.users.recent} this month`}      color="text-navy-950" />
                <Stat label="Students"         value={analytics.users.students}          color="text-royal-dark" />
                <Stat label="Tutors"           value={analytics.users.tutors}            sub={`${analytics.users.approvedTutors} approved`} color="text-royal-dark" />
                <Stat label="Pending Approval" value={analytics.users.pendingTutors}    color="text-navy-950" />
            </div>

            {/* Sessions row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Stat label="Total Bookings"  value={analytics.bookings.total}     color="text-navy-950" />
                <Stat label="Completed"       value={analytics.bookings.completed} color="text-navy-950" />
                <Stat label="Completion Rate" value={`${bookingCompletion}%`}      color="text-navy-950" />
                <Stat label="Recent (30d)"    value={analytics.bookings.recent}    color="text-royal-dark" />
            </div>

            {/* Trust & review row */}
            <div className="grid grid-cols-3 gap-4">
                <Stat label="Avg Platform Rating" value={`${analytics.reviews.averageRating} ★`} color="text-lime-dark" />
                <Stat label="Total Reviews"        value={analytics.reviews.total}               color="text-navy-950" />
                <Stat label="Tutor Approval Rate"  value={`${approvalRate}%`}                    color="text-navy-950" />
            </div>

            {/* Attendance */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-navy-950 uppercase tracking-wide mb-4">Platform Attendance Health</h3>
                <div className="flex items-center gap-6">
                    <div>
                        <p className="text-4xl font-bold text-navy-950">{analytics.attendance.rate}%</p>
                        <p className="text-xs text-gray-500 mt-1">Attendance rate</p>
                    </div>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${analytics.attendance.rate>=80?'bg-lime':analytics.attendance.rate>=60?'bg-lime-dark':'bg-red-500'}`}
                            style={{width:`${analytics.attendance.rate}%`}} />
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-semibold text-gray-700">{analytics.attendance.present} / {analytics.attendance.total}</p>
                        <p className="text-xs text-gray-500">Present / Total</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── at-risk patterns panel ───────────────────────────────────────────────────
// ─── Platform Analytics Panel ─────────────────────────────────────────────────
const PlatformAnalyticsPanel = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/analytics/platform')
            .then(res => setData(res.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-royal border-t-transparent rounded-full animate-spin" />
        </div>
    );
    if (!data) return <p className="text-sm text-gray-500">Failed to load analytics.</p>;

    const maxDay = Math.max(...data.dailySeries.map(d => d.count), 1);

    return (
        <div className="space-y-6">
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Students', value: data.users.totalStudents, sub: `+${data.users.newStudents30d} this month`, color: 'text-royal-dark' },
                    { label: 'Total Tutors', value: data.users.totalTutors, sub: `+${data.users.newTutors30d} this month`, color: 'text-purple-700' },
                    { label: 'Completed Sessions', value: data.sessions.completedSessions, sub: `${data.sessions.sessions30d} in 30d`, color: 'text-navy-950' },
                    { label: 'Est. Platform Revenue', value: `₹${data.estimatedRevenue.toLocaleString()}`, sub: 'from completed sessions', color: 'text-navy-950' }
                ].map((k, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                        <p className="text-xs text-gray-500 font-medium mb-1">{k.label}</p>
                        <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                        <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
                    </div>
                ))}
            </div>

            {/* Sessions over 30 days bar chart */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-navy-950 mb-4">Sessions — Last 30 Days</h3>
                <div className="flex items-end gap-1" style={{ height: '100px' }}>
                    {data.dailySeries.map((d, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                            <div
                                className="w-full rounded-sm bg-royal group-hover:bg-royal transition-colors"
                                style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: d.count > 0 ? '4px' : '1px', opacity: d.count > 0 ? 1 : 0.2 }}
                            />
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                {d.date.slice(5)}: {d.count}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between mt-1">
                    <p className="text-xs text-gray-400">{data.dailySeries[0]?.date?.slice(5)}</p>
                    <p className="text-xs text-gray-400">{data.dailySeries[data.dailySeries.length - 1]?.date?.slice(5)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top tutors */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-navy-950 mb-4">Top Tutors by Sessions</h3>
                    <div className="space-y-3">
                        {data.topTutors.map((t, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : 'bg-orange-50 text-orange-600'}`}>
                                    {i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-navy-950 truncate">{t.name}</p>
                                    <p className="text-xs text-gray-400">{t.subjects?.join(', ')}</p>
                                </div>
                                <span className="text-sm font-bold text-gray-700">{t.sessions} sessions</span>
                            </div>
                        ))}
                        {data.topTutors.length === 0 && <p className="text-sm text-gray-400">No completed sessions yet</p>}
                    </div>
                </div>

                {/* Rating distribution */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-navy-950 mb-4">Rating Distribution</h3>
                    <div className="space-y-2">
                        {[5, 4, 3, 2, 1].map(star => {
                            const count = data.ratingDistribution[star] || 0;
                            const total = Object.values(data.ratingDistribution).reduce((a, b) => a + b, 0);
                            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                            return (
                                <div key={star} className="flex items-center gap-3">
                                    <span className="text-xs font-semibold text-gray-600 w-4 text-right">{star}★</span>
                                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-lime-dark rounded-full transition-all" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-xs text-gray-400 w-12 text-right">{count} ({pct}%)</span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-5 pt-4 border-t border-gray-100">
                        <h4 className="text-xs font-bold text-gray-700 mb-3">Tutor Approval Funnel</h4>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-lime/20 rounded-lg px-2 py-2">
                                <p className="text-lg font-bold text-navy-950">{data.tutorFunnel.approved}</p>
                                <p className="text-xs text-lime-dark">Approved</p>
                            </div>
                            <div className="bg-lime/20 rounded-lg px-2 py-2">
                                <p className="text-lg font-bold text-navy-950">{data.tutorFunnel.pending}</p>
                                <p className="text-xs text-lime-dark">Pending</p>
                            </div>
                            <div className="bg-red-50 rounded-lg px-2 py-2">
                                <p className="text-lg font-bold text-red-600">{data.tutorFunnel.rejected}</p>
                                <p className="text-xs text-red-500">Rejected</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PatternsAlerts = () => {
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);
    const { showSuccess, showError } = useToast();

    useEffect(()=>{
        api.get('/admin/patterns')
            .then(({data})=>setData(data))
            .catch(()=>showError('Failed to load patterns'))
            .finally(()=>setLoading(false));
    },[]);

    const sendAlert = async (userId, name, role) => {
        try {
            await api.post('/admin/send-alert',{
                userId,
                title: role==='student' ? 'Attendance concern' : 'Student engagement notice',
                message: role==='student'
                    ? 'Your attendance rate has dropped. Please contact your tutor or our support team.'
                    : 'Several students in your sessions have low attendance. Please reach out to them.'
            });
            showSuccess(`Alert sent to ${name}`);
        } catch { showError('Failed to send'); }
    };

    if (loading) return <div className="text-center py-10 text-gray-400">Loading…</div>;

    return (
        <div className="space-y-6">
            {/* Summary */}
            {data && (
                <div className="grid grid-cols-3 gap-4">
                    <Stat label="At-risk Students" value={data.atRiskStudents?.length||0} color="text-red-700"
                        sub="≥30% absence or disputed" />
                    <Stat label="At-risk Tutors"   value={data.atRiskTutors?.length||0}  color="text-navy-950"
                        sub="≥40% student absence rate" />
                    <Stat label="Unresolved Disputes" value={data.unresolvedDisputes||0} color="text-red-700" />
                </div>
            )}

            {/* At-risk students */}
            {data?.atRiskStudents?.length > 0 && (
                <div className="bg-white border border-red-100 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-red-100 bg-red-50">
                        <h3 className="text-sm font-bold text-red-900">At-Risk Students</h3>
                        <p className="text-xs text-red-700 mt-0.5">Students with high absence or disputed attendance</p>
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                {['Student','Total Sessions','Absent','Disputed','Absence Rate','Action'].map(h=>(
                                    <th key={h} className="py-2 px-4 text-left text-xs font-semibold text-gray-500">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.atRiskStudents.map((s,i)=>(
                                <tr key={i} className="hover:bg-gray-50">
                                    <td className="py-3 px-4 font-medium text-navy-950">{s.student?.name||'Unknown'}</td>
                                    <td className="py-3 px-4 text-gray-600">{s.total}</td>
                                    <td className="py-3 px-4 text-red-600 font-semibold">{s.absent}</td>
                                    <td className="py-3 px-4">
                                        {s.disputed>0&&<span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">{s.disputed}</span>}
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`font-bold ${s.absenceRate>=50?'text-red-700':s.absenceRate>=30?'text-navy-950':'text-gray-700'}`}>
                                            {s.absenceRate}%
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <button onClick={()=>sendAlert(s.student?._id||s.student,s.student?.name,'student')}
                                            className="px-2 py-1 text-xs bg-lime/20 hover:bg-lime/30 text-navy-950 rounded-lg border border-lime/40">
                                            Send Alert
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* At-risk tutors */}
            {data?.atRiskTutors?.length > 0 && (
                <div className="bg-white border border-lime/30 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-lime/30 bg-lime/20">
                        <h3 className="text-sm font-bold text-amber-900">Tutors with High Student Absence</h3>
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                {['Tutor','Total Sessions','Student Absences','Rate','Action'].map(h=>(
                                    <th key={h} className="py-2 px-4 text-left text-xs font-semibold text-gray-500">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.atRiskTutors.map((t,i)=>(
                                <tr key={i} className="hover:bg-gray-50">
                                    <td className="py-3 px-4 font-medium text-navy-950">{t.tutor?.name||'Unknown'}</td>
                                    <td className="py-3 px-4 text-gray-600">{t.total}</td>
                                    <td className="py-3 px-4 text-navy-950 font-semibold">{t.absent}</td>
                                    <td className="py-3 px-4 font-bold text-navy-950">{t.absenceRate}%</td>
                                    <td className="py-3 px-4">
                                        <button onClick={()=>sendAlert(t.tutor?._id||t.tutor,t.tutor?.name,'tutor')}
                                            className="px-2 py-1 text-xs bg-royal/5 hover:bg-royal/10 text-royal-dark rounded-lg border border-royal/30">
                                            Alert Tutor
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {!data?.atRiskStudents?.length && !data?.atRiskTutors?.length && (
                <div className="text-center py-14 bg-white rounded-xl border border-gray-200">
                    <svg className="w-10 h-10 text-green-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <p className="text-gray-500 font-medium">No at-risk patterns detected</p>
                    <p className="text-xs text-gray-400 mt-1">Platform looks healthy</p>
                </div>
            )}
        </div>
    );
};

// ─── users management panel ───────────────────────────────────────────────────
// ─── Escalations panel ────────────────────────────────────────────────────────
const ESC_STATUS_MAP = {
    open: 'bg-lime/20 text-navy-950 border-lime/40',
    under_review: 'bg-royal/5 text-royal-dark border-royal/20',
    resolved: 'bg-lime/20 text-navy-950 border-lime/40',
    dismissed: 'bg-gray-100 text-gray-500 border-gray-200'
};
const EscalationsPanel = () => {
    const [escalations, setEscalations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('open');
    const [selected, setSelected] = useState(null);
    const [notes, setNotes] = useState('');
    const [updating, setUpdating] = useState(false);
    const { showSuccess, showError } = useToast();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/escalations${filter !== 'all' ? `?status=${filter}` : ''}`);
            setEscalations(res.data);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => { load(); }, [load]);

    const handleUpdate = async (id, status) => {
        setUpdating(true);
        try {
            await api.patch(`/escalations/${id}`, { status, adminNotes: notes });
            showSuccess('Escalation updated');
            setSelected(null);
            setNotes('');
            load();
        } catch {
            showError('Failed to update escalation');
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Filter tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                {['open', 'under_review', 'resolved', 'dismissed', 'all'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${filter === f ? 'bg-white text-navy-950 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                        {f.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="w-7 h-7 border-2 border-royal border-t-transparent rounded-full animate-spin" />
                </div>
            ) : escalations.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="text-4xl mb-3">🛡️</div>
                    <p className="text-sm font-medium text-gray-600">No {filter} reports</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {escalations.map(e => (
                        <div key={e._id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <span className="text-sm font-bold text-navy-950 capitalize">{e.type.replace(/_/g, ' ')}</span>
                                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border capitalize ${ESC_STATUS_MAP[e.status]}`}>
                                            {e.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-1">
                                        Raised by: <strong>{e.raisedBy?.name}</strong> ({e.raisedByRole}) · {new Date(e.createdAt).toLocaleDateString()}
                                    </p>
                                    {e.againstUser && <p className="text-xs text-gray-500 mb-2">Against: <strong>{e.againstUser?.name}</strong></p>}
                                    <p className="text-sm text-gray-700 leading-relaxed">{e.description}</p>
                                    {e.adminNotes && (
                                        <div className="mt-2 bg-royal/5 border border-royal/20 rounded-lg px-3 py-2">
                                            <p className="text-xs font-semibold text-royal-dark">Admin Note: <span className="font-normal">{e.adminNotes}</span></p>
                                        </div>
                                    )}
                                </div>
                                {e.status === 'open' || e.status === 'under_review' ? (
                                    <button onClick={() => { setSelected(e); setNotes(e.adminNotes || ''); }}
                                        className="shrink-0 px-3 py-1.5 bg-royal text-white text-xs font-semibold rounded-lg hover:bg-royal-dark">
                                        Review
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Review modal */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                        <div className="flex items-start justify-between">
                            <h3 className="text-base font-bold text-navy-950">Review Report</h3>
                            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-700">
                            <strong className="capitalize">{selected.type.replace(/_/g, ' ')}</strong> — {selected.description}
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Admin Notes / Response</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                                placeholder="Add a note visible to the reporter…"
                                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-royal/40 resize-none" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => handleUpdate(selected._id, 'under_review')} disabled={updating}
                                className="py-2 text-xs font-semibold text-royal-dark bg-royal/5 border border-royal/20 rounded-lg hover:bg-royal/10 disabled:opacity-60">
                                Under Review
                            </button>
                            <button onClick={() => handleUpdate(selected._id, 'resolved')} disabled={updating}
                                className="py-2 text-xs font-semibold text-navy-950 bg-lime/20 border border-lime/40 rounded-lg hover:bg-lime/30 disabled:opacity-60">
                                Resolve
                            </button>
                            <button onClick={() => handleUpdate(selected._id, 'dismissed')} disabled={updating}
                                className="py-2 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 disabled:opacity-60">
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const UsersPanel = () => {
    const [users, setUsers]     = useState([]);
    const [search, setSearch]   = useState('');
    const [role, setRole]       = useState('all');
    const [loading, setLoading] = useState(false);
    const [alertTarget, setAlertTarget] = useState(null);
    const [alertMsg, setAlertMsg] = useState({ title:'', message:'' });
    const { showSuccess, showError } = useToast();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ role, ...(search ? { search } : {}) });
            const { data } = await api.get(`/admin/users?${params}`);
            setUsers(data);
        } catch { showError('Failed to load users'); }
        finally { setLoading(false); }
    }, [role, search]);

    useEffect(()=>{ load(); },[load]);

    const handleSendAlert = async () => {
        if (!alertTarget || !alertMsg.title || !alertMsg.message) return;
        try {
            await api.post('/admin/send-alert',{ userId: alertTarget._id, ...alertMsg });
            showSuccess(`Alert sent to ${alertTarget.name}`);
            setAlertTarget(null);
            setAlertMsg({ title:'', message:'' });
        } catch { showError('Failed to send alert'); }
    };

    return (
        <div className="space-y-5">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <input value={search} onChange={e=>setSearch(e.target.value)}
                    placeholder="Search by name or email…"
                    className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal" />
                <select value={role} onChange={e=>setRole(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-royal">
                    <option value="all">All roles</option>
                    <option value="student">Students</option>
                    <option value="tutor">Tutors</option>
                    <option value="admin">Admins</option>
                </select>
                <button onClick={load} className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Search</button>
            </div>

            {loading ? (
                <div className="text-center py-10 text-gray-400">Loading…</div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                {['Name','Email','Role','Joined','Action'].map(h=>(
                                    <th key={h} className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map(u=>(
                                <tr key={u._id} className="hover:bg-gray-50">
                                    <td className="py-3 px-4 font-medium text-navy-950">{u.name}</td>
                                    <td className="py-3 px-4 text-gray-500">{u.email}</td>
                                    <td className="py-3 px-4"><StatusBadge status={u.role}/></td>
                                    <td className="py-3 px-4 text-gray-400 text-xs">
                                        {new Date(u.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                                    </td>
                                    <td className="py-3 px-4">
                                        <button onClick={()=>setAlertTarget(u)}
                                            className="px-2 py-1 text-xs bg-royal/5 hover:bg-royal/10 text-royal-dark rounded-lg border border-royal/30 transition-colors">
                                            Send Alert
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {!users.length && (
                                <tr><td colSpan={5} className="py-10 text-center text-gray-400">No users found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Alert modal */}
            {alertTarget && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-navy-950 mb-1">Send Alert to {alertTarget.name}</h3>
                        <p className="text-sm text-gray-500 mb-4">{alertTarget.email} · {alertTarget.role}</p>
                        <div className="space-y-3">
                            <input value={alertMsg.title} onChange={e=>setAlertMsg(v=>({...v,title:e.target.value}))}
                                placeholder="Alert title…"
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal" />
                            <textarea value={alertMsg.message} onChange={e=>setAlertMsg(v=>({...v,message:e.target.value}))}
                                placeholder="Message…" rows={3}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal resize-none" />
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button onClick={()=>setAlertTarget(null)}
                                className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                            <button onClick={handleSendAlert}
                                disabled={!alertMsg.title||!alertMsg.message}
                                className="flex-1 py-2 text-sm bg-royal hover:bg-royal-dark text-white font-semibold rounded-lg disabled:opacity-50">
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── main dashboard ───────────────────────────────────────────────────────────
const AdminDashboard = () => {
    const [pendingTutors, setPendingTutors]   = useState([]);
    const [allTutors, setAllTutors]           = useState([]);
    const [loadingPending, setLoadingPending] = useState(true);
    const [loadingAll, setLoadingAll]         = useState(false);
    const [activeTab, setActiveTab]           = useState('approvals');
    const [filterStatus, setFilterStatus]     = useState('all');
    const [rejectTarget, setRejectTarget]     = useState(null);
    const { showSuccess, showError } = useToast();

    const showMsg = useCallback((type, text) => {
        type === 'success' ? showSuccess(text) : showError(text);
    }, [showSuccess, showError]);

    const fetchPending = useCallback(async () => {
        setLoadingPending(true);
        try { const { data } = await api.get('/admin/tutors/pending'); setPendingTutors(data); }
        catch { showMsg('error','Failed to fetch pending tutors'); }
        finally { setLoadingPending(false); }
    }, [showMsg]);

    const fetchAll = useCallback(async () => {
        setLoadingAll(true);
        try {
            const params = filterStatus !== 'all' ? `?status=${filterStatus}` : '';
            const { data } = await api.get(`/admin/tutors${params}`);
            setAllTutors(data);
        } catch { showMsg('error','Failed to fetch tutors'); }
        finally { setLoadingAll(false); }
    }, [filterStatus, showMsg]);

    useEffect(() => { fetchPending(); }, [fetchPending]);
    useEffect(() => { if (activeTab === 'tutors') fetchAll(); }, [activeTab, fetchAll]);

    const handleApprove = async (tutorId) => {
        try { await api.patch(`/admin/tutors/${tutorId}/approve`); showMsg('success','Tutor approved'); fetchPending(); fetchAll(); }
        catch { showMsg('error','Failed to approve'); }
    };
    const handleRejectConfirm = async (reason) => {
        try { await api.patch(`/admin/tutors/${rejectTarget}/reject`, { reason }); showMsg('success','Tutor rejected'); setRejectTarget(null); fetchPending(); fetchAll(); }
        catch { showMsg('error','Failed to reject'); }
    };

    const TABS = [
        { id: 'approvals',  label: 'Pending Approvals', count: pendingTutors.length },
        { id: 'tutors',     label: 'All Tutors' },
        { id: 'attendance', label: 'Attendance Cross-Check' },
        { id: 'analytics',  label: 'Analytics' },
        { id: 'patterns',    label: 'Risk & Alerts' },
        { id: 'escalations', label: 'Escalations' },
        { id: 'users',       label: 'Users' }
    ];

    return (
        <div className="h-full bg-gray-50 font-sans flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
                <h1 className="text-xl font-bold text-navy-950">Admin Console</h1>
                <p className="text-sm text-gray-500 mt-0.5">Manage tutors, attendance, analytics, and platform health</p>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside className="w-52 bg-white border-r border-gray-200 py-4 flex-shrink-0 overflow-y-auto">
                    <nav className="space-y-0.5 px-2">
                        {TABS.map(t => (
                            <button key={t.id} onClick={() => setActiveTab(t.id)}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                    activeTab === t.id ? 'bg-royal/5 text-royal-dark' : 'text-gray-600 hover:bg-gray-50 hover:text-navy-950'
                                }`}>
                                <span>{t.label}</span>
                                {t.count !== undefined && (
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${t.count>0?'bg-lime/30 text-navy-950':'bg-gray-100 text-gray-500'}`}>
                                        {t.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Content */}
                <main className="flex-1 p-6 overflow-y-auto">

                    {/* PENDING APPROVALS */}
                    {activeTab === 'approvals' && (
                        <div>
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-lg font-bold text-navy-950">
                                    Pending Approvals
                                    {pendingTutors.length > 0 && <span className="ml-2 text-sm font-normal text-navy-950">({pendingTutors.length} waiting)</span>}
                                </h2>
                                <button onClick={fetchPending} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Refresh</button>
                            </div>
                            {loadingPending ? <div className="text-center py-12 text-gray-400">Loading…</div>
                            : pendingTutors.length === 0 ? (
                                <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                                    <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    <p className="text-gray-500 font-medium">All caught up</p>
                                    <p className="text-sm text-gray-400 mt-1">No tutors awaiting approval.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {pendingTutors.map(t=>(
                                        <TutorCard key={t._id} tutor={t} onApprove={handleApprove} onReject={id=>setRejectTarget(id)}/>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ALL TUTORS */}
                    {activeTab === 'tutors' && (
                        <div>
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-lg font-bold text-navy-950">All Tutors</h2>
                                <div className="flex items-center gap-3">
                                    <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
                                        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-royal">
                                        <option value="all">All statuses</option>
                                        <option value="approved">Approved</option>
                                        <option value="pending">Pending</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                    <button onClick={fetchAll} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Refresh</button>
                                </div>
                            </div>
                            {loadingAll ? <div className="text-center py-12 text-gray-400">Loading…</div>
                            : allTutors.length === 0 ? <div className="text-center py-16 bg-white rounded-xl border border-gray-200"><p className="text-gray-500">No tutors found.</p></div>
                            : <div className="space-y-3">{allTutors.map(t=><TutorCard key={t._id} tutor={t} onApprove={handleApprove} onReject={id=>setRejectTarget(id)}/>)}</div>}
                        </div>
                    )}

                    {/* ATTENDANCE CROSS-CHECK */}
                    {activeTab === 'attendance' && (
                        <div>
                            <div className="mb-5">
                                <h2 className="text-lg font-bold text-navy-950">Attendance Cross-Check</h2>
                                <p className="text-sm text-gray-500 mt-0.5">Review disputed and unverified attendance records across the platform.</p>
                            </div>
                            <AttendanceCrossCheck />
                        </div>
                    )}

                    {/* ANALYTICS */}
                    {activeTab === 'analytics' && (
                        <div>
                            <div className="mb-5">
                                <h2 className="text-lg font-bold text-navy-950">Platform Analytics</h2>
                                <p className="text-sm text-gray-500 mt-0.5">Live overview of users, sessions, revenue, and platform health.</p>
                            </div>
                            <PlatformAnalyticsPanel />
                        </div>
                    )}

                    {/* PATTERNS & ALERTS */}
                    {activeTab === 'patterns' && (
                        <div>
                            <div className="mb-5">
                                <h2 className="text-lg font-bold text-navy-950">Risk Detection & Alerts</h2>
                                <p className="text-sm text-gray-500 mt-0.5">Students and tutors flagged by attendance patterns. Send targeted alerts.</p>
                            </div>
                            <PatternsAlerts />
                        </div>
                    )}

                    {/* ESCALATIONS */}
                    {activeTab === 'escalations' && (
                        <div>
                            <div className="mb-5">
                                <h2 className="text-lg font-bold text-navy-950">Safety Reports & Escalations</h2>
                                <p className="text-sm text-gray-500 mt-0.5">Review and respond to reports submitted by tutors and students.</p>
                            </div>
                            <EscalationsPanel />
                        </div>
                    )}

                    {/* USERS */}
                    {activeTab === 'users' && (
                        <div>
                            <div className="mb-5">
                                <h2 className="text-lg font-bold text-navy-950">User Management</h2>
                                <p className="text-sm text-gray-500 mt-0.5">Search users by name, email, or role. Send individual alerts.</p>
                            </div>
                            <UsersPanel />
                        </div>
                    )}
                </main>
            </div>

            {/* Reject modal */}
            {rejectTarget && <RejectModal onClose={()=>setRejectTarget(null)} onConfirm={handleRejectConfirm}/>}
        </div>
    );
};

export default AdminDashboard;
