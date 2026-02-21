import { useState } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';

export default function TutorChangeRequestModal({ booking, onClose, onSuccess }) {
    const { showSuccess, showError } = useToast();
    const [form, setForm] = useState({
        type: 'reschedule',
        proposedDate: '',
        proposedSchedule: '',
        proposedSubject: booking?.subject || '',
        reason: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.reason.trim()) { showError('Please provide a reason'); return; }
        setSubmitting(true);
        try {
            await api.patch(`/bookings/${booking._id}/tutor-change-request`, {
                type: form.type,
                proposedDate: form.proposedDate || undefined,
                proposedSchedule: form.proposedSchedule || undefined,
                proposedSubject: form.type === 'subject' || form.type === 'both' ? form.proposedSubject : undefined,
                reason: form.reason
            });
            showSuccess('Change request sent to student/parent for approval');
            onSuccess?.();
            onClose();
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to send change request');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <div className="flex items-start justify-between mb-5">
                    <div>
                        <h3 className="text-base font-bold text-gray-900">Request a Change</h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {booking?.subject} · {booking?.studentId?.name}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-3">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Change type */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-2">What do you want to change?</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { value: 'reschedule', label: 'Schedule' },
                                { value: 'subject', label: 'Subject' },
                                { value: 'both', label: 'Both' }
                            ].map(t => (
                                <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => setForm(v => ({ ...v, type: t.value }))}
                                    className={`py-2 text-xs font-medium rounded-lg border transition-colors ${form.type === t.value ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Current schedule info */}
                    {booking?.preferredSchedule && (
                        <div className="bg-gray-50 rounded-lg px-4 py-2.5">
                            <p className="text-xs text-gray-400">Current schedule</p>
                            <p className="text-sm font-medium text-gray-700 mt-0.5">{booking.preferredSchedule}</p>
                        </div>
                    )}

                    {/* Schedule fields */}
                    {(form.type === 'reschedule' || form.type === 'both') && (
                        <>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Proposed Date</label>
                                <input
                                    type="date"
                                    value={form.proposedDate}
                                    onChange={e => setForm(v => ({ ...v, proposedDate: e.target.value }))}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Proposed Schedule</label>
                                <input
                                    type="text"
                                    value={form.proposedSchedule}
                                    onChange={e => setForm(v => ({ ...v, proposedSchedule: e.target.value }))}
                                    placeholder="e.g. Tuesday 5:00 PM – 6:00 PM"
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                            </div>
                        </>
                    )}

                    {/* Subject field */}
                    {(form.type === 'subject' || form.type === 'both') && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">New Subject</label>
                            <input
                                type="text"
                                value={form.proposedSubject}
                                onChange={e => setForm(v => ({ ...v, proposedSubject: e.target.value }))}
                                placeholder="e.g. Advanced Mathematics"
                                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                        </div>
                    )}

                    {/* Reason */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Reason for change *</label>
                        <textarea
                            value={form.reason}
                            onChange={e => setForm(v => ({ ...v, reason: e.target.value }))}
                            rows={2}
                            placeholder="Explain why you need this change…"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                            required
                        />
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        <p className="text-xs text-amber-700">
                            The student/parent will receive a notification and must approve before any changes take effect.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" disabled={submitting}
                            className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
                            {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                            Send Request
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
