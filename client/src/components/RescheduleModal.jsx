import { useState } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';

export default function RescheduleModal({ booking, onClose, onSuccess }) {
    const { showSuccess, showError } = useToast();
    const [form, setForm] = useState({
        proposedDate: '',
        proposedSchedule: '',
        reason: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.proposedSchedule && !form.proposedDate) {
            showError('Please provide a proposed date or schedule.');
            return;
        }
        setSubmitting(true);
        try {
            await api.patch(`/bookings/${booking._id}/reschedule-request`, {
                proposedDate: form.proposedDate || undefined,
                proposedSchedule: form.proposedSchedule || undefined,
                reason: form.reason || undefined
            });
            showSuccess('Reschedule request sent to your tutor');
            onSuccess?.();
            onClose();
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to send reschedule request');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-base font-bold text-navy-950">Request Reschedule</h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {booking.subject} session with{' '}
                            <span className="font-medium text-gray-700">{booking.tutorId?.name}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors ml-3 mt-0.5">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Current schedule */}
                {booking.preferredSchedule && (
                    <div className="bg-gray-50 rounded-lg px-4 py-3 mb-4">
                        <p className="text-xs text-gray-500">Current schedule</p>
                        <p className="text-sm font-medium text-gray-700 mt-0.5">{booking.preferredSchedule}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                            New Preferred Date (optional)
                        </label>
                        <input
                            type="date"
                            value={form.proposedDate}
                            onChange={e => setForm(v => ({ ...v, proposedDate: e.target.value }))}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-royal/40"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                            New Preferred Schedule *
                        </label>
                        <input
                            type="text"
                            value={form.proposedSchedule}
                            onChange={e => setForm(v => ({ ...v, proposedSchedule: e.target.value }))}
                            placeholder="e.g. Saturday 4:00 PM – 5:00 PM"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-royal/40"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                            Reason (optional)
                        </label>
                        <textarea
                            value={form.reason}
                            onChange={e => setForm(v => ({ ...v, reason: e.target.value }))}
                            rows={2}
                            placeholder="e.g. Family event, exam preparation shift…"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-royal/40 resize-none"
                        />
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 px-4 py-2.5 bg-royal text-white rounded-lg text-sm font-semibold hover:bg-royal-dark disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                            Send Request
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
