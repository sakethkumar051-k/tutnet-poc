import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const SCORE_LABELS = { 1: 'Struggling', 2: 'Needs work', 3: 'Average', 4: 'Good', 5: 'Excellent' };
const SCORE_COLORS = { 1: 'text-red-600 bg-red-50', 2: 'text-lime-dark bg-lime/20', 3: 'text-yellow-600 bg-yellow-50', 4: 'text-royal bg-royal/5', 5: 'text-lime-dark bg-lime/20' };
const ATTEND_STYLE = {
    completed: 'bg-lime/30 text-navy-950',
    student_absent: 'bg-red-100 text-red-700',
    tutor_absent: 'bg-lime/30 text-navy-950',
    rescheduled: 'bg-royal/10 text-royal-dark',
    scheduled: 'bg-gray-100 text-gray-600'
};
const ATTEND_LABEL = {
    completed: 'Present',
    student_absent: 'Absent',
    tutor_absent: 'Tutor Absent',
    rescheduled: 'Rescheduled',
    scheduled: 'Scheduled'
};

const stars = (n) => Array.from({ length: 5 }, (_, i) => (
    <span key={i} className={i < n ? 'text-lime-dark' : 'text-gray-200'}>★</span>
));

export default function WeeklyProgressReport({ preselectedStudentId = null }) {
    const { user } = useAuth();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(null);
    const [filter, setFilter] = useState('all'); // all | present | absent

    const loadReports = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (preselectedStudentId) params.set('studentId', preselectedStudentId);
            const { data } = await api.get(`/session-feedback/progress-reports?${params}`);
            setReports(data);
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [preselectedStudentId]);

    useEffect(() => { loadReports(); }, [loadReports]);

    const filtered = reports.filter(r => {
        if (filter === 'present') return r.attendanceStatus === 'completed';
        if (filter === 'absent') return r.attendanceStatus === 'student_absent';
        return true;
    });

    const totalPresent = reports.filter(r => r.attendanceStatus === 'completed').length;
    const totalSessions = reports.length;
    const avgScore = reports.filter(r => r.understandingScore).length
        ? (reports.filter(r => r.understandingScore).reduce((s, r) => s + r.understandingScore, 0) / reports.filter(r => r.understandingScore).length).toFixed(1)
        : null;

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
                        <div className="flex gap-4">
                            <div className="w-16 h-16 rounded-lg bg-gray-100" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-100 rounded w-32" />
                                <div className="h-3 bg-gray-100 rounded w-48" />
                                <div className="h-3 bg-gray-100 rounded w-24" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Summary bar */}
            {totalSessions > 0 && (
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                        <p className="text-2xl font-bold text-navy-950">{totalSessions}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Total Sessions</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                        <p className="text-2xl font-bold text-lime-dark">{totalPresent}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Attended ({totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0}%)
                        </p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                        <p className="text-2xl font-bold text-royal">{avgScore ?? '—'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Avg. Understanding</p>
                    </div>
                </div>
            )}

            {/* Filter tabs */}
            <div className="flex items-center gap-2">
                {[
                    { value: 'all', label: `All (${reports.length})` },
                    { value: 'present', label: `Present (${totalPresent})` },
                    { value: 'absent', label: `Absent (${reports.length - totalPresent})` }
                ].map(f => (
                    <button
                        key={f.value}
                        onClick={() => setFilter(f.value)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${filter === f.value ? 'bg-royal text-white border-royal' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Session cards */}
            {filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-700">No progress reports yet</p>
                    <p className="text-xs text-gray-400 mt-1">
                        {user?.role === 'tutor'
                            ? 'Fill in session summaries after each class to build the progress log'
                            : 'Session summaries from your tutor will appear here'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(r => {
                        const isOpen = expanded === r._id;
                        const date = r.sessionDate
                            ? new Date(r.sessionDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
                            : 'Date not set';
                        const subject = r.bookingId?.subject || 'Session';
                        const attendStyle = ATTEND_STYLE[r.attendanceStatus] || 'bg-gray-100 text-gray-600';
                        const attendLabel = ATTEND_LABEL[r.attendanceStatus] || r.attendanceStatus;

                        return (
                            <div key={r._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors">
                                {/* Card header */}
                                <button
                                    onClick={() => setExpanded(isOpen ? null : r._id)}
                                    className="w-full flex items-center gap-4 p-5 text-left"
                                >
                                    {/* Date block */}
                                    <div className="w-14 flex-shrink-0 text-center">
                                        <p className="text-xs text-gray-400">{new Date(r.sessionDate || r.createdAt).toLocaleString('default', { month: 'short' })}</p>
                                        <p className="text-2xl font-bold text-navy-950 leading-none">{new Date(r.sessionDate || r.createdAt).getDate()}</p>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className="text-sm font-semibold text-navy-950">{subject}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${attendStyle}`}>{attendLabel}</span>
                                            {r.understandingScore && (
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SCORE_COLORS[r.understandingScore]}`}>
                                                    {SCORE_LABELS[r.understandingScore]}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400">{date}</p>
                                        {r.tutorSummary && (
                                            <p className="text-xs text-gray-600 mt-1 truncate">{r.tutorSummary}</p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        {r.homework?.length > 0 && (
                                            <span className="text-xs text-royal font-medium">{r.homework.length} HW</span>
                                        )}
                                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </button>

                                {/* Expanded content */}
                                {isOpen && (
                                    <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-4">
                                        {/* Tutor's summary */}
                                        {r.tutorSummary ? (
                                            <div>
                                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Session Summary</p>
                                                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-3">{r.tutorSummary}</p>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-400 italic">No session summary written yet</p>
                                        )}

                                        {/* Understanding score */}
                                        {r.understandingScore && (
                                            <div>
                                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Understanding</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">{stars(r.understandingScore)}</span>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SCORE_COLORS[r.understandingScore]}`}>
                                                        {r.understandingScore}/5 — {SCORE_LABELS[r.understandingScore]}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Topics covered */}
                                        {r.topicsCovered?.length > 0 && (
                                            <div>
                                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Topics Covered</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {r.topicsCovered.map((t, i) => (
                                                        <span key={i} className="px-2.5 py-1 bg-royal/5 text-royal-dark text-xs font-medium rounded-full border border-royal/20">{t}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Next steps */}
                                        {r.nextSteps && (
                                            <div>
                                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Next Steps</p>
                                                <p className="text-sm text-gray-700 bg-royal/5 border border-royal/20 rounded-lg p-3">{r.nextSteps}</p>
                                            </div>
                                        )}

                                        {/* Homework */}
                                        {r.homework?.length > 0 && (
                                            <div>
                                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Homework Assigned</p>
                                                <div className="space-y-2">
                                                    {r.homework.map((hw, i) => (
                                                        <div key={i} className="flex items-start gap-2.5 text-sm">
                                                            <span className={`mt-0.5 w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-xs ${hw.status === 'completed' ? 'bg-lime/30 text-lime-dark' : 'bg-gray-100 text-gray-500'}`}>
                                                                {hw.status === 'completed' ? '✓' : '○'}
                                                            </span>
                                                            <div className="flex-1">
                                                                <p className={`text-sm ${hw.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-700'}`}>{hw.description}</p>
                                                                {hw.dueDate && <p className="text-xs text-gray-400 mt-0.5">Due: {new Date(hw.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>}
                                                            </div>
                                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${hw.status === 'completed' ? 'bg-lime/30 text-navy-950' : 'bg-gray-100 text-gray-500'}`}>
                                                                {hw.status.replace('_', ' ')}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Study materials */}
                                        {r.studyMaterials?.length > 0 && (
                                            <div>
                                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Study Materials</p>
                                                <div className="space-y-1.5">
                                                    {r.studyMaterials.map((m, i) => (
                                                        <div key={i} className="flex items-center gap-2 text-sm">
                                                            <span className="w-5 h-5 rounded bg-royal/5 flex items-center justify-center text-royal/50 text-xs flex-shrink-0">
                                                                {m.type === 'link' ? '🔗' : m.type === 'file' ? '📄' : '📖'}
                                                            </span>
                                                            {m.url ? (
                                                                <a href={m.url} target="_blank" rel="noreferrer" className="text-royal hover:underline">{m.title}</a>
                                                            ) : (
                                                                <span className="text-gray-700">{m.title}</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Student's rating */}
                                        {r.studentRating && (
                                            <div className="pt-2 border-t border-gray-100">
                                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Student Feedback</p>
                                                <div className="flex items-center gap-2">
                                                    <span>{stars(r.studentRating)}</span>
                                                    {r.studentComment && <p className="text-xs text-gray-600 italic">"{r.studentComment}"</p>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
