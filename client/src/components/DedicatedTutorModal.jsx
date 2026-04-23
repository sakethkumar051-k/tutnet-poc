import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import useBodyScrollLock from '../hooks/useBodyScrollLock';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DURATION_OPTIONS = [
    { value: 1, label: '1 month', sendMonths: 1 },
    { value: 3, label: '3 months', sendMonths: 3 },
    { value: 6, label: '6 months', sendMonths: 6 },
    { value: 'ongoing', label: 'Ongoing', sendDuration: 'Ongoing' },
];

const getInitials = (name) =>
    name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || 'T';

const DedicatedTutorModal = ({ tutor, onClose, onSuccess }) => {
    useBodyScrollLock();
    const { showSuccess, showError } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const name = tutor?.userId?.name || tutor?.name || 'Tutor';
    const loc = tutor?.userId?.location;
    const locationStr = [loc?.area, loc?.city].filter(Boolean).join(', ');
    const avgRating = tutor?.averageRating || 0;
    const totalReviews = tutor?.totalReviews || 0;

    const [formData, setFormData] = useState({
        subject: tutor?.subjects?.[0] || '',
        preferredStartDate: '',
        weeklySchedule: [{ day: '', time: '' }],
        durationOption: 3,
        learningGoals: '',
        termsAccepted: false,
    });

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const today = new Date().toISOString().split('T')[0];

    const handleChange = (e) => {
        const { name: key, value, type, checked } = e.target;
        setFormData((prev) => ({ ...prev, [key]: type === 'checkbox' ? checked : value }));
    };

    const updateScheduleRow = (index, field, value) => {
        setFormData((prev) => {
            const next = [...(prev.weeklySchedule || [])];
            if (!next[index]) next[index] = { day: '', time: '' };
            next[index] = { ...next[index], [field]: value };
            return { ...prev, weeklySchedule: next };
        });
    };

    const addScheduleRow = () =>
        setFormData((prev) => ({ ...prev, weeklySchedule: [...(prev.weeklySchedule || []), { day: '', time: '' }] }));

    const removeScheduleRow = (index) =>
        setFormData((prev) => ({ ...prev, weeklySchedule: prev.weeklySchedule.filter((_, i) => i !== index) }));

    const getDurationPayload = () => {
        const opt = DURATION_OPTIONS.find((o) => o.value === formData.durationOption);
        if (!opt) return { monthsCommitted: 3 };
        if (opt.sendDuration) return { durationCommitment: opt.sendDuration };
        return { monthsCommitted: opt.sendMonths };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.termsAccepted) { showError('Please confirm the terms to continue.'); return; }
        const schedule = (formData.weeklySchedule || []).filter((s) => s && (s.day || s.time));
        if (schedule.length === 0) {
            showError('Please add at least one day and time for your weekly schedule.');
            return;
        }
        setSubmitting(true);
        try {
            const duration = getDurationPayload();
            const scheduleStr = schedule.map((s) => `${s.day} ${s.time}`).join('; ');
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
                ...duration,
            });
            showSuccess('Request sent — the tutor will review and finalize the schedule with you.');
            onSuccess?.();
            onClose();
        } catch (err) {
            const code = err.response?.data?.code;
            const msg = err.response?.data?.message;
            if (code === 'INVALID_START_DATE') showError('Please choose a start date in the future.');
            else if (code === 'TERMS_NOT_ACCEPTED') showError('Please accept the terms to continue.');
            else if (code === 'OUTSIDE_AVAILABILITY') showError(msg || 'One or more slots are outside the tutor\'s fixed availability.');
            else if (code === 'SLOT_OVERLAP') showError(msg || 'One or more slots are already taken.');
            else showError(msg || 'We couldn\'t send your request. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const schedule = formData.weeklySchedule || [{ day: '', time: '' }];

    const inputClass = 'w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-navy-950 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal/40 transition-all';
    const labelClass = 'block text-[11px] font-bold tracking-wider uppercase text-gray-400 mb-2';

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-[880px] bg-white rounded-3xl shadow-2xl animate-scale-in overflow-hidden max-h-[min(92vh,900px)] flex flex-col">
                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/90 hover:bg-gray-100 text-gray-500 hover:text-navy-950 transition-colors z-20 flex items-center justify-center shadow-sm"
                    aria-label="Close"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] w-full flex-1 min-h-0">
                    {/* ── Left — tutor card ── */}
                    <div className="bg-navy-950 relative overflow-y-auto p-7 text-white hidden md:flex flex-col min-w-0">
                        <div className="absolute -top-20 -left-10 w-60 h-60 bg-royal/30 rounded-full blur-[80px] pointer-events-none" />
                        <div className="absolute -bottom-20 -right-10 w-60 h-60 bg-lime/10 rounded-full blur-[80px] pointer-events-none" />

                        <div className="relative z-10 flex flex-col h-full">
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-royal/30 text-lime text-[10px] font-bold tracking-wide mb-5 uppercase w-fit">
                                <span className="w-1.5 h-1.5 rounded-full bg-lime" />
                                Dedicated Tutor
                            </span>

                            {tutor?.userId?.profilePicture ? (
                                <img src={tutor.userId.profilePicture} alt={name}
                                    className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white/20 mb-4" />
                            ) : (
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-royal to-navy-900 flex items-center justify-center text-white font-extrabold text-2xl ring-4 ring-white/20 mb-4">
                                    {getInitials(name)}
                                </div>
                            )}

                            <h3 className="text-xl font-extrabold leading-tight">{name}</h3>
                            {locationStr && <p className="text-xs text-gray-400 mt-1">{locationStr}</p>}

                            <div className="mt-5 pt-5 border-t border-white/10 grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xl font-extrabold">₹{tutor?.hourlyRate || '—'}</p>
                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mt-0.5">Per hour</p>
                                </div>
                                <div>
                                    <p className="text-xl font-extrabold flex items-baseline gap-0.5">
                                        {avgRating > 0 ? avgRating.toFixed(1) : '—'}
                                        <svg className="w-3 h-3 text-lime" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    </p>
                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mt-0.5">{totalReviews} reviews</p>
                                </div>
                            </div>

                            <div className="mt-auto pt-6 space-y-3">
                                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">What happens next</p>
                                <ol className="space-y-2">
                                    {[
                                        'Tutor reviews your request',
                                        'Schedule is finalised',
                                        'Classes begin on your start date',
                                    ].map((step, i) => (
                                        <li key={step} className="flex items-start gap-2.5 text-xs text-gray-300 leading-relaxed">
                                            <span className="w-5 h-5 rounded-full bg-lime/20 text-lime text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                                {i + 1}
                                            </span>
                                            {step}
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* Mobile tutor summary */}
                    <div className="md:hidden flex items-center gap-3 px-5 pt-5 pb-4 border-b border-gray-100">
                        {tutor?.userId?.profilePicture ? (
                            <img src={tutor.userId.profilePicture} alt={name}
                                className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                        ) : (
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-navy-950 to-royal flex items-center justify-center text-white font-extrabold flex-shrink-0">
                                {getInitials(name)}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-navy-950 truncate">{name}</p>
                            <p className="text-xs text-gray-500">Dedicated tutor · ₹{tutor?.hourlyRate || '—'}/hr</p>
                        </div>
                    </div>

                    {/* ── Right — form ── */}
                    <div className="overflow-y-auto min-w-0">
                        <div className="px-7 pt-7 pb-5 pr-14">
                            <h2 className="text-2xl font-extrabold text-navy-950 leading-tight tracking-tight">
                                Request dedicated tutoring
                            </h2>
                            <p className="text-sm text-gray-500 mt-1.5">
                                Lock in a recurring schedule with {name.split(' ')[0]}. Change anytime.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="px-7 pb-7 space-y-4">
                            <div>
                                <label className={labelClass}>Subject</label>
                                <select
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    required
                                    className={`${inputClass} appearance-none cursor-pointer`}
                                >
                                    {(tutor?.subjects || []).map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className={labelClass}>Preferred start date</label>
                                <input
                                    type="date"
                                    name="preferredStartDate"
                                    value={formData.preferredStartDate}
                                    onChange={handleChange}
                                    min={today}
                                    required
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className={`${labelClass} mb-0`}>Weekly schedule</label>
                                    <button
                                        type="button"
                                        onClick={addScheduleRow}
                                        className="text-[11px] font-bold text-royal hover:text-navy-950 transition-colors"
                                    >
                                        + Add slot
                                    </button>
                                </div>
                                <p className="text-[11px] text-gray-400 mb-3">
                                    Pick the days and times you'd like classes each week.
                                </p>
                                <div className="space-y-2">
                                    {schedule.map((row, index) => (
                                        <div key={index} className="grid grid-cols-[1fr_130px_auto] gap-2 items-stretch">
                                            <select
                                                value={row.day}
                                                onChange={(e) => updateScheduleRow(index, 'day', e.target.value)}
                                                className="min-w-0 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-navy-950 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal/40 appearance-none cursor-pointer"
                                            >
                                                <option value="">Day</option>
                                                {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                            <input
                                                type="time"
                                                value={row.time}
                                                onChange={(e) => updateScheduleRow(index, 'time', e.target.value)}
                                                className="min-w-0 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-navy-950 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal/40"
                                            />
                                            {schedule.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeScheduleRow(index)}
                                                    className="w-11 h-11 flex-shrink-0 rounded-xl border border-gray-200 text-gray-400 hover:text-rose-500 hover:border-rose-200 flex items-center justify-center transition-colors"
                                                    aria-label="Remove slot"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Duration commitment</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {DURATION_OPTIONS.map((opt) => (
                                        <button
                                            type="button"
                                            key={opt.value}
                                            onClick={() => setFormData((prev) => ({ ...prev, durationOption: opt.value }))}
                                            className={`py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                                                formData.durationOption === opt.value
                                                    ? 'border-navy-950 bg-navy-950 text-white'
                                                    : 'border-gray-200 bg-white text-navy-950 hover:border-navy-950/40'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>
                                    Learning goals <span className="text-gray-300 normal-case tracking-normal font-normal">(optional)</span>
                                </label>
                                <textarea
                                    name="learningGoals"
                                    value={formData.learningGoals}
                                    onChange={handleChange}
                                    rows={2}
                                    placeholder="Exam prep, fundamentals, homework support..."
                                    className={`${inputClass} resize-none`}
                                />
                            </div>

                            <label className="flex items-start gap-3 cursor-pointer px-4 py-3 bg-[#f7f7f7] rounded-xl border border-gray-100">
                                <input
                                    type="checkbox"
                                    name="termsAccepted"
                                    checked={formData.termsAccepted}
                                    onChange={handleChange}
                                    className="mt-0.5 w-4 h-4 rounded text-navy-950 focus:ring-royal"
                                />
                                <span className="text-xs text-gray-600 leading-relaxed">
                                    This is a dedicated learning plan with {name.split(' ')[0]}. I can request changes anytime.
                                </span>
                            </label>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-3 rounded-full border border-gray-200 text-navy-950 text-sm font-bold hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || !formData.termsAccepted}
                                    className="flex-1 py-3 rounded-full bg-lime hover:bg-lime-light text-navy-950 text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-navy-950/30 border-t-navy-950 rounded-full animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        'Send request'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default DedicatedTutorModal;
