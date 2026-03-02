import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DURATION_OPTIONS = [
    { value: 1, label: '1 month', sendMonths: 1 },
    { value: 3, label: '3 months', sendMonths: 3 },
    { value: 6, label: '6 months', sendMonths: 6 },
    { value: 'ongoing', label: 'Ongoing', sendDuration: 'Ongoing' }
];

const DedicatedTutorModal = ({ tutor, onClose, onSuccess }) => {
    const { showSuccess, showError } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const tutorName = tutor?.userId?.name || tutor?.name || 'this tutor';
    const [formData, setFormData] = useState({
        subject: tutor?.subjects?.[0] || '',
        preferredStartDate: '',
        weeklySchedule: [{ day: '', time: '' }],
        durationOption: 3,
        learningGoals: '',
        termsAccepted: false
    });

    const today = new Date().toISOString().split('T')[0];

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const setDurationOption = (val) => {
        setFormData(prev => ({ ...prev, durationOption: val }));
    };

    const updateScheduleRow = (index, field, value) => {
        setFormData(prev => {
            const next = [...(prev.weeklySchedule || [])];
            if (!next[index]) next[index] = { day: '', time: '' };
            next[index] = { ...next[index], [field]: value };
            return { ...prev, weeklySchedule: next };
        });
    };

    const addScheduleRow = () => {
        setFormData(prev => ({
            ...prev,
            weeklySchedule: [...(prev.weeklySchedule || []), { day: '', time: '' }]
        }));
    };

    const removeScheduleRow = (index) => {
        setFormData(prev => ({
            ...prev,
            weeklySchedule: prev.weeklySchedule.filter((_, i) => i !== index)
        }));
    };

    const getDurationPayload = () => {
        const opt = DURATION_OPTIONS.find(o => o.value === formData.durationOption);
        if (!opt) return { monthsCommitted: 3 };
        if (opt.sendDuration) return { durationCommitment: opt.sendDuration };
        return { monthsCommitted: opt.sendMonths };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.termsAccepted) {
            showError('Please confirm the terms to continue.');
            return;
        }
        const schedule = (formData.weeklySchedule || []).filter(s => s && (s.day || s.time));
        if (schedule.length === 0) {
            showError('Please add at least one day and time for your weekly schedule.');
            return;
        }
        setSubmitting(true);

        try {
            const duration = getDurationPayload();
            const scheduleStr = schedule.map(s => `${s.day} ${s.time}`).join('; ');
            await api.post('/bookings', {
                tutorId: tutor?.userId?._id || tutor?._id,
                subject: formData.subject,
                preferredSchedule: `From ${formData.preferredStartDate}: ${scheduleStr}`,
                sessionDate: null,
                bookingCategory: 'dedicated',
                preferredStartDate: formData.preferredStartDate,
                weeklySchedule: schedule,
                learningGoals: formData.learningGoals.trim() || undefined,
                termsAccepted: true,
                sessionsPerWeek: schedule.length,
                ...duration
            });

            showSuccess('Your dedicated tutor request has been sent. The tutor will review and finalize the schedule with you.');
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Dedicated booking error:', err);
            const code = err.response?.data?.code;
            const msg = err.response?.data?.message;
            if (code === 'INVALID_START_DATE') showError('Please choose a start date in the future.');
            else if (code === 'TERMS_NOT_ACCEPTED') showError('Please accept the terms to continue.');
            else if (code === 'OUTSIDE_AVAILABILITY') showError(msg || 'One or more selected times are not in the tutor’s fixed availability. Try different slots or ask the tutor to switch to flexible availability.');
            else if (code === 'SLOT_OVERLAP') showError(msg || 'One or more slots are already taken. Please choose different times.');
            else if (code === 'MISSING_PREFERRED_START_DATE' || code === 'MISSING_MONTHS_COMMITTED') showError(msg || 'Please fill in all required fields.');
            else showError(msg || 'We couldn’t send your request. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const schedule = formData.weeklySchedule || [{ day: '', time: '' }];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="dedicated-tutor-title">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-t-2xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 id="dedicated-tutor-title" className="text-xl font-bold text-white mb-1">
                                Request Dedicated Tutor
                            </h2>
                            <p className="text-indigo-100 text-sm">
                                with {tutorName}
                            </p>
                        </div>
                        <button type="button" onClick={onClose} className="text-white/80 hover:text-white p-1 rounded focus:outline-none focus:ring-2 focus:ring-white/50" aria-label="Close">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                        <select name="subject" value={formData.subject} onChange={handleChange} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                            {(tutor?.subjects || []).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Start Date *</label>
                        <input type="date" name="preferredStartDate" value={formData.preferredStartDate} onChange={handleChange} min={today} required className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                        <p className="text-xs text-gray-500 mt-1">Pick a date in the future</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Weekly Schedule *</label>
                        <p className="text-xs text-gray-500 mb-2">Add the days and times you’d like classes each week.</p>
                        {schedule.map((row, index) => (
                            <div key={index} className="flex gap-2 items-center mb-2">
                                <select value={row.day} onChange={e => updateScheduleRow(index, 'day', e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                                    <option value="">Day</option>
                                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <input type="time" value={row.time} onChange={e => updateScheduleRow(index, 'time', e.target.value)} className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                                {schedule.length > 1 ? (
                                    <button type="button" onClick={() => removeScheduleRow(index)} className="p-2 text-gray-400 hover:text-red-600 rounded" aria-label="Remove row">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                ) : null}
                            </div>
                        ))}
                        <button type="button" onClick={addScheduleRow} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                            + Add another slot
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Duration Commitment *</label>
                        <div className="space-y-2">
                            {DURATION_OPTIONS.map(opt => (
                                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="durationOption" checked={formData.durationOption === opt.value} onChange={() => setDurationOption(opt.value)} className="text-indigo-600 focus:ring-indigo-500" />
                                    <span className="text-sm text-gray-800">{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Learning Goals</label>
                        <textarea name="learningGoals" value={formData.learningGoals} onChange={handleChange} rows={3} placeholder="Exam preparation, fundamentals, homework support..." className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 placeholder-gray-400" />
                    </div>

                    <div>
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input type="checkbox" name="termsAccepted" checked={formData.termsAccepted} onChange={handleChange} className="mt-1 text-indigo-600 focus:ring-indigo-500 rounded" />
                            <span className="text-sm text-gray-700">I understand this is a dedicated learning plan and I can request changes anytime.</span>
                        </label>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <p className="text-sm font-semibold text-gray-800 mb-2">What happens next?</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                            <li className="flex items-center gap-2"><span className="text-indigo-500 font-bold">1.</span> Tutor reviews your request</li>
                            <li className="flex items-center gap-2"><span className="text-indigo-500 font-bold">2.</span> Schedule is finalized</li>
                            <li className="flex items-center gap-2"><span className="text-indigo-500 font-bold">3.</span> Classes begin on your selected date</li>
                            <li className="flex items-center gap-2"><span className="text-indigo-500 font-bold">4.</span> Manage via dashboard</li>
                        </ul>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition">
                            Cancel
                        </button>
                        <button type="submit" disabled={submitting || !formData.termsAccepted} className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg hover:shadow-xl ring-2 ring-indigo-400 ring-offset-2">
                            {submitting ? 'Sending…' : 'Request Dedicated Tutor'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DedicatedTutorModal;
