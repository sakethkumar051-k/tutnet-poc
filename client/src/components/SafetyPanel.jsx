import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const ESCALATION_TYPES = [
    { value: 'no_show', label: 'Student No-Show' },
    { value: 'payment_dispute', label: 'Payment Dispute' },
    { value: 'misconduct', label: 'Misconduct / Disrespect' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'safety_concern', label: 'Safety Concern' },
    { value: 'other', label: 'Other' }
];

const STATUS_COLORS = {
    open: 'bg-amber-50 text-amber-700 border-amber-200',
    under_review: 'bg-blue-50 text-blue-700 border-blue-200',
    resolved: 'bg-green-50 text-green-700 border-green-200',
    dismissed: 'bg-gray-100 text-gray-500 border-gray-200'
};

const CONDUCT_RULES = [
    { icon: '🕒', title: 'Punctuality', desc: 'Be on time for every session. Notify the student at least 2 hours before if you need to cancel.' },
    { icon: '📚', title: 'Preparedness', desc: 'Come prepared with session materials, homework review, and clear learning objectives.' },
    { icon: '🤝', title: 'Respectful Communication', desc: 'Maintain professional and respectful language at all times with students and parents.' },
    { icon: '📋', title: 'Session Documentation', desc: 'Log session notes, topics covered, and homework assigned after each class.' },
    { icon: '🔒', title: 'Confidentiality', desc: 'Student information, academic records, and communication remain strictly confidential.' },
    { icon: '🚫', title: 'Zero Tolerance Policy', desc: 'Any form of harassment, misconduct, or inappropriate behavior results in immediate suspension.' },
    { icon: '💰', title: 'Fair Payments', desc: 'All payment disputes must be raised through the platform. Do not negotiate fees outside TutNet.' },
    { icon: '📞', title: 'Emergency Protocol', desc: 'In case of safety concerns, escalate immediately to the TutNet admin team using the report feature.' }
];

export default function SafetyPanel({ role = 'tutor' }) {
    const { showSuccess, showError } = useToast();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [escalations, setEscalations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [activeTab, setActiveTab] = useState('report');
    const [form, setForm] = useState({ type: '', description: '', againstUserId: '', bookingId: '' });
    const [submitting, setSubmitting] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get('/escalations/my');
            setEscalations(res.data);
        } catch {
            // silently fail
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.type || !form.description.trim()) {
            showError('Please select a type and describe the issue');
            return;
        }
        setSubmitting(true);
        try {
            await api.post('/escalations', {
                type: form.type,
                description: form.description,
                againstUserId: form.againstUserId || undefined,
                bookingId: form.bookingId || undefined
            });
            showSuccess('Report submitted. The admin team will review and respond within 24 hours.');
            setForm({ type: '', description: '', againstUserId: '', bookingId: '' });
            setShowForm(false);
            load();
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to submit report');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Safety & Protection</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Your safety is our priority. Use this panel to report concerns and review conduct guidelines.
                    </p>
                </div>
                <button
                    onClick={() => { setShowForm(true); setActiveTab('report'); }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Report Issue
                </button>
            </div>

            {/* Emergency contact (student/parent) */}
            {role === 'student' && user?.emergencyContact && (
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <h3 className="text-base font-bold text-gray-900 mb-3">Emergency contact</h3>
                    <p className="text-sm text-gray-500 mb-3">In case of emergency, this person will be contacted.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</p>
                            <p className="text-sm font-medium text-gray-900">{user.emergencyContact?.name || '—'}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Relationship</p>
                            <p className="text-sm font-medium text-gray-900">{user.emergencyContact?.relationship || '—'}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</p>
                            <p className="text-sm font-medium text-gray-900">{user.emergencyContact?.phone || '—'}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/student-dashboard?tab=profile')}
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                        Edit in Profile →
                    </button>
                </div>
            )}

            {role === 'student' && (!user?.emergencyContact || (!user.emergencyContact?.name && !user.emergencyContact?.phone)) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                    <h3 className="text-base font-bold text-gray-900 mb-2">Emergency contact</h3>
                    <p className="text-sm text-gray-600 mb-3">Add an emergency contact so we can reach someone if needed.</p>
                    <button
                        type="button"
                        onClick={() => navigate('/student-dashboard?tab=profile')}
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                        Add in Profile →
                    </button>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                {[{ id: 'report', label: 'My Reports' }, { id: 'conduct', label: 'Conduct Guidelines' }].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* My Reports Tab */}
            {activeTab === 'report' && (
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : escalations.length === 0 ? (
                        <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="text-4xl mb-3">🛡️</div>
                            <h3 className="text-sm font-semibold text-gray-700">No Reports</h3>
                            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                                You haven't submitted any safety reports. Use the button above if you have a concern.
                            </p>
                        </div>
                    ) : (
                        escalations.map(e => (
                            <div key={e._id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-sm font-semibold text-gray-900 capitalize">
                                                {e.type.replace(/_/g, ' ')}
                                            </span>
                                            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border capitalize ${STATUS_COLORS[e.status]}`}>
                                                {e.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 leading-relaxed">{e.description}</p>
                                        {e.adminNotes && (
                                            <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                                                <p className="text-xs font-semibold text-blue-700 mb-0.5">Admin Response</p>
                                                <p className="text-xs text-blue-600">{e.adminNotes}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs text-gray-400">{new Date(e.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Conduct Guidelines Tab */}
            {activeTab === 'conduct' && (
                <div className="space-y-3">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-4 mb-2">
                        <p className="text-sm font-semibold text-indigo-900 mb-1">TutNet Code of Conduct</p>
                        <p className="text-xs text-indigo-700">
                            All tutors on TutNet are held to high professional standards. Violations of these guidelines may result in account suspension or removal.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        {CONDUCT_RULES.map((rule, i) => (
                            <div key={i} className="bg-white border border-gray-100 rounded-xl px-5 py-4 flex gap-4 shadow-sm">
                                <span className="text-2xl">{rule.icon}</span>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900 mb-0.5">{rule.title}</p>
                                    <p className="text-sm text-gray-500 leading-relaxed">{rule.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4">
                        <p className="text-sm font-semibold text-red-800 mb-1">Need to report a violation?</p>
                        <p className="text-xs text-red-700 mb-3">If you witness or experience any conduct violations, report it immediately. All reports are reviewed within 24 hours.</p>
                        <button
                            onClick={() => { setShowForm(true); setActiveTab('report'); }}
                            className="px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Report a Concern
                        </button>
                    </div>
                </div>
            )}

            {/* Report Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex items-start justify-between mb-5">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Report an Issue</h3>
                                <p className="text-xs text-gray-500 mt-0.5">All reports are reviewed by the admin team within 24 hours</p>
                            </div>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-2">Type of Issue *</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {ESCALATION_TYPES.map(t => (
                                        <button
                                            key={t.value}
                                            type="button"
                                            onClick={() => setForm(v => ({ ...v, type: t.value }))}
                                            className={`py-2 px-3 text-xs font-medium rounded-lg border text-left transition-colors ${form.type === t.value ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'}`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Describe the Issue *</label>
                                <textarea
                                    value={form.description}
                                    onChange={e => setForm(v => ({ ...v, description: e.target.value }))}
                                    rows={4}
                                    placeholder="Please describe what happened in detail. Include dates, times, and any relevant context…"
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                                    required
                                />
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                <p className="text-xs text-amber-700">
                                    Your identity will be known to the admin team but kept confidential from the reported party.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowForm(false)}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-2">
                                    {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                    Submit Report
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
