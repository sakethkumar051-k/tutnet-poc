import { useState } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';

const FEEDBACK_CATEGORIES = [
    { value: 'teaching_quality', label: 'Teaching Quality' },
    { value: 'punctuality', label: 'Punctuality & Attendance' },
    { value: 'communication', label: 'Communication' },
    { value: 'child_engagement', label: 'Child Engagement' },
    { value: 'progress', label: "Child's Progress" }
];

export default function ParentFeedbackPanel({ currentTutors = [] }) {
    const { showSuccess, showError } = useToast();
    const [form, setForm] = useState({
        tutorId: currentTutors[0]?.tutorId?._id || '',
        category: 'teaching_quality',
        rating: 0,
        comment: '',
        requestTutorChange: false,
        changeReason: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [hover, setHover] = useState(0);

    const selectedTutor = currentTutors.find(t => t.tutorId?._id === form.tutorId);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.rating === 0) { showError('Please select a rating'); return; }
        if (!form.comment.trim()) { showError('Please add a comment'); return; }
        if (form.requestTutorChange && !form.changeReason.trim()) { showError('Please explain why you want to change tutor'); return; }
        setSubmitting(true);
        try {
            // Post as a review with extra metadata
            await api.post('/reviews', {
                tutorId: form.tutorId,
                rating: form.rating,
                comment: form.comment,
                category: form.category
            });
            // If tutor change requested, send a notification/alert to admin
            if (form.requestTutorChange) {
                await api.post('/notifications/send-to-admin', {
                    subject: 'Tutor Change Request',
                    message: `Parent/student requests a tutor change for ${selectedTutor?.subject || 'their subject'}. Reason: ${form.changeReason}`
                }).catch(() => { /* best-effort */ });
            }
            showSuccess(form.requestTutorChange ? 'Feedback submitted and tutor change request sent to admin' : 'Feedback submitted successfully');
            setSubmitted(true);
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to submit feedback');
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) return (
        <div className="bg-white rounded-xl border border-lime/40 p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-lime/30 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-lime-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <h3 className="text-base font-bold text-navy-950 mb-1">Thank you for your feedback</h3>
            <p className="text-sm text-gray-500">Your input helps us improve the quality of tutoring on TutNet.</p>
            <button
                onClick={() => { setSubmitted(false); setForm(f => ({ ...f, comment: '', rating: 0, changeReason: '', requestTutorChange: false })); }}
                className="mt-4 px-4 py-2 text-sm text-royal border border-royal/30 rounded-lg hover:bg-royal/5 transition-colors"
            >
                Submit Another
            </button>
        </div>
    );

    if (currentTutors.length === 0) return (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-500">No active tutor relationships to provide feedback on.</p>
        </div>
    );

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
                <h3 className="text-base font-bold text-navy-950">Share Feedback</h3>
                <p className="text-sm text-gray-500 mt-0.5">Rate your experience and help improve the quality of tutoring</p>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
                {/* Select tutor */}
                {currentTutors.length > 1 && (
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Select Tutor</label>
                        <select
                            value={form.tutorId}
                            onChange={e => setForm(v => ({ ...v, tutorId: e.target.value }))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-royal/40"
                        >
                            {currentTutors.map(t => (
                                <option key={t._id} value={t.tutorId?._id}>{t.tutorId?.name} — {t.subject}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Category */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Feedback Category</label>
                    <div className="flex flex-wrap gap-2">
                        {FEEDBACK_CATEGORIES.map(c => (
                            <button
                                key={c.value}
                                type="button"
                                onClick={() => setForm(v => ({ ...v, category: c.value }))}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${form.category === c.value ? 'bg-royal text-white border-royal' : 'bg-white text-gray-600 border-gray-200 hover:border-royal/40'}`}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Star rating */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Rating *</label>
                    <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setForm(v => ({ ...v, rating: star }))}
                                onMouseEnter={() => setHover(star)}
                                onMouseLeave={() => setHover(0)}
                                className="text-2xl transition-transform hover:scale-110"
                            >
                                <span className={(hover || form.rating) >= star ? 'text-lime-dark' : 'text-gray-200'}>★</span>
                            </button>
                        ))}
                        {form.rating > 0 && (
                            <span className="ml-2 text-xs text-gray-500">
                                {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][form.rating]}
                            </span>
                        )}
                    </div>
                </div>

                {/* Comment */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Your Feedback *</label>
                    <textarea
                        value={form.comment}
                        onChange={e => setForm(v => ({ ...v, comment: e.target.value }))}
                        rows={3}
                        placeholder="Share specific observations about your child's sessions, tutor's teaching style, areas of improvement…"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-royal/40 resize-none"
                        required
                    />
                </div>

                {/* Tutor change request */}
                <div className="border border-gray-200 rounded-xl p-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.requestTutorChange}
                            onChange={e => setForm(v => ({ ...v, requestTutorChange: e.target.checked }))}
                            className="w-4 h-4 rounded text-red-600 border-gray-300"
                        />
                        <div>
                            <p className="text-sm font-medium text-gray-800">Request tutor change</p>
                            <p className="text-xs text-gray-400 mt-0.5">Admin will be notified and will coordinate a replacement</p>
                        </div>
                    </label>
                    {form.requestTutorChange && (
                        <div className="mt-3">
                            <textarea
                                value={form.changeReason}
                                onChange={e => setForm(v => ({ ...v, changeReason: e.target.value }))}
                                rows={2}
                                placeholder="Reason for requesting a tutor change…"
                                className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none bg-red-50"
                            />
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 bg-royal text-white rounded-lg text-sm font-semibold hover:bg-royal-dark disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
                >
                    {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    Submit Feedback
                </button>
            </form>
        </div>
    );
}
