import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const STATUS_CONFIG = {
    not_started: { label: 'Not Started', color: 'bg-gray-100 text-gray-600 border-gray-200' },
    in_progress:  { label: 'In Progress', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    achieved:     { label: 'Achieved ✓', color: 'bg-green-50 text-green-700 border-green-200' },
    dropped:      { label: 'Dropped',    color: 'bg-red-50 text-red-600 border-red-200' }
};

function ProgressBar({ pct }) {
    return (
        <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
                className="absolute left-0 top-0 h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}

export default function LearningGoals({ role = 'student' }) {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [expanded, setExpanded] = useState(null);
    const [noteInput, setNoteInput] = useState('');
    const [progressInput, setProgressInput] = useState({});
    const [form, setForm] = useState({ subject: '', title: '', description: '', targetDate: '' });
    const [submitting, setSubmitting] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const endpoint = role === 'tutor' ? '/goals/students' : '/goals/my';
            const res = await api.get(endpoint);
            setGoals(res.data);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [role]);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.subject.trim() || !form.title.trim()) { showError('Subject and title are required'); return; }
        setSubmitting(true);
        try {
            await api.post('/goals', form);
            showSuccess('Goal created!');
            setForm({ subject: '', title: '', description: '', targetDate: '' });
            setShowForm(false);
            load();
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to create goal');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdate = async (goalId, updates) => {
        try {
            await api.patch(`/goals/${goalId}`, updates);
            showSuccess('Goal updated');
            setNoteInput('');
            load();
        } catch {
            showError('Failed to update goal');
        }
    };

    const handleDelete = async (goalId) => {
        if (!window.confirm('Delete this goal?')) return;
        try {
            await api.delete(`/goals/${goalId}`);
            showSuccess('Goal deleted');
            load();
        } catch {
            showError('Failed to delete goal');
        }
    };

    const activeGoals    = goals.filter(g => g.status !== 'dropped');
    const achievedCount  = goals.filter(g => g.status === 'achieved').length;
    const inProgressCount = goals.filter(g => g.status === 'in_progress').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">
                        {role === 'tutor' ? "Students' Learning Goals" : 'My Learning Goals'}
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {role === 'tutor'
                            ? 'Track and update progress for your students\' goals'
                            : 'Set goals and track your learning journey'}
                    </p>
                </div>
                {role === 'student' && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Goal
                    </button>
                )}
            </div>

            {/* Summary pills */}
            {goals.length > 0 && (
                <div className="flex gap-3 flex-wrap">
                    <span className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">{goals.length} Total</span>
                    <span className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100">{inProgressCount} In Progress</span>
                    <span className="px-3 py-1.5 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-100">{achievedCount} Achieved</span>
                </div>
            )}

            {/* Goals list */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : activeGoals.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="text-4xl mb-3">🎯</div>
                    <h3 className="text-sm font-semibold text-gray-700">No Goals Yet</h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                        {role === 'student'
                            ? 'Set a learning goal to track your progress and stay motivated.'
                            : 'Your students haven\'t set learning goals yet.'}
                    </p>
                    {role === 'student' && (
                        <button onClick={() => setShowForm(true)}
                            className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
                            Add My First Goal
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {activeGoals.map(goal => {
                        const isOpen = expanded === goal._id;
                        const cfg = STATUS_CONFIG[goal.status];
                        const pct = goal.percentComplete || 0;
                        const daysLeft = goal.targetDate
                            ? Math.ceil((new Date(goal.targetDate) - Date.now()) / (1000 * 60 * 60 * 24))
                            : null;

                        return (
                            <div key={goal._id} className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-all ${isOpen ? 'border-indigo-200' : 'border-gray-200 hover:border-indigo-100 hover:shadow-md'}`}>
                                {/* Card header */}
                                <div className="p-5">
                                    <div className="flex items-start gap-4">
                                        {/* Circle progress */}
                                        <div className="relative w-12 h-12 flex-shrink-0">
                                            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                                                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="2.5" />
                                                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#6366F1" strokeWidth="2.5"
                                                    strokeDasharray={`${pct} ${100 - pct}`}
                                                    strokeLinecap="round"
                                                    style={{ transition: 'stroke-dasharray 0.5s ease' }}
                                                />
                                            </svg>
                                            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">{pct}%</span>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    {role === 'tutor' && goal.studentId?.name && (
                                                        <p className="text-xs font-medium text-indigo-600 mb-0.5">{goal.studentId.name}</p>
                                                    )}
                                                    <p className="text-sm font-bold text-gray-900 leading-tight">{goal.title}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">{goal.subject}</p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${cfg.color}`}>
                                                        {cfg.label}
                                                    </span>
                                                    <button
                                                        onClick={() => setExpanded(isOpen ? null : goal._id)}
                                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                                    >
                                                        <svg className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="mt-3">
                                                <ProgressBar pct={pct} />
                                            </div>

                                            {daysLeft !== null && (
                                                <p className={`text-xs mt-1.5 font-medium ${daysLeft < 0 ? 'text-red-500' : daysLeft < 7 ? 'text-amber-600' : 'text-gray-400'}`}>
                                                    {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded section */}
                                {isOpen && (
                                    <div className="border-t border-gray-100 p-5 space-y-4 bg-gray-50/50">
                                        {goal.description && (
                                            <p className="text-sm text-gray-600">{goal.description}</p>
                                        )}

                                        {/* Progress update */}
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-2">Update Progress</label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="range"
                                                    min="0" max="100"
                                                    value={progressInput[goal._id] ?? pct}
                                                    onChange={e => setProgressInput(p => ({ ...p, [goal._id]: Number(e.target.value) }))}
                                                    className="flex-1 accent-indigo-600"
                                                />
                                                <span className="text-sm font-bold text-indigo-600 w-10 text-right">
                                                    {progressInput[goal._id] ?? pct}%
                                                </span>
                                            </div>
                                        </div>

                                        {/* Status update */}
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-2">Status</label>
                                            <div className="flex flex-wrap gap-2">
                                                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                                    <button
                                                        key={k}
                                                        onClick={() => handleUpdate(goal._id, { status: k, percentComplete: progressInput[goal._id] ?? pct })}
                                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${goal.status === k ? v.color + ' font-semibold' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'}`}
                                                    >
                                                        {v.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Add progress note */}
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-2">Add Progress Note</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={noteInput}
                                                    onChange={e => setNoteInput(e.target.value)}
                                                    placeholder="e.g. Completed chapter 5, ready for next topic"
                                                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                                />
                                                <button
                                                    onClick={() => handleUpdate(goal._id, { note: noteInput, percentComplete: progressInput[goal._id] ?? pct })}
                                                    disabled={!noteInput.trim()}
                                                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </div>

                                        {/* Progress notes history */}
                                        {goal.progressNotes?.length > 0 && (
                                            <div>
                                                <p className="text-xs font-semibold text-gray-700 mb-2">Progress History</p>
                                                <div className="space-y-2 max-h-36 overflow-y-auto">
                                                    {[...goal.progressNotes].reverse().map((n, i) => (
                                                        <div key={i} className="flex items-start gap-2 bg-white rounded-lg px-3 py-2 border border-gray-100">
                                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5 ${n.addedByRole === 'tutor' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                {n.addedByRole === 'tutor' ? 'T' : 'S'}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs text-gray-700">{n.note}</p>
                                                                <p className="text-xs text-gray-400 mt-0.5">{new Date(n.addedAt).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Delete (student only) */}
                                        {role === 'student' && (
                                            <div className="flex justify-end pt-1">
                                                <button onClick={() => handleDelete(goal._id)}
                                                    className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
                                                    Delete goal
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Goal Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex items-start justify-between mb-5">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Add Learning Goal</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Set a clear target to keep yourself on track</p>
                            </div>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Subject *</label>
                                <input type="text" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                                    placeholder="e.g. Mathematics, Physics"
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    required />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Goal Title *</label>
                                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    placeholder="e.g. Complete Class 10 Algebra syllabus"
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    required />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
                                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    rows={2} placeholder="What exactly do you want to achieve?"
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Target Date</label>
                                <input type="date" value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => setShowForm(false)}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
                                    {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                    Create Goal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
