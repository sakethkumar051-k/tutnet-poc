import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import useBodyScrollLock from '../hooks/useBodyScrollLock';

const getInitials = (name) =>
    name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'T';

const RequestDemoModal = ({ tutor, onClose, onSuccess }) => {
    useBodyScrollLock();
    const { showSuccess, showError } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [demoInfo, setDemoInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        preferredDate: '',
        preferredTime: '',
        mode: tutor.mode === 'both' ? 'online' : tutor.mode,
        studentNotes: '',
        subject: tutor.subjects?.[0] || ''
    });

    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get('/demos/my-demos');
                setDemoInfo({ demosUsed: data.demosUsed, demosRemaining: data.demosRemaining });
            } catch {
                setDemoInfo({ demosUsed: 0, demosRemaining: 3 });
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const { data } = await api.post('/bookings', {
                tutorId: tutor.userId._id,
                subject: formData.subject,
                preferredSchedule: `${formData.preferredDate} ${formData.preferredTime}`,
                bookingCategory: 'trial',
                sessionDate: formData.preferredDate,
                mode: formData.mode,
                studentNotes: formData.studentNotes
            });
            showSuccess(data.message ? `Trial booked! ${data.message}` : 'Trial booked!');
            onSuccess?.();
            onClose();
        } catch (err) {
            const code = err.response?.data?.code;
            const msg = err.response?.data?.message;
            if (code === 'MAX_TRIALS_EXCEEDED') showError(msg || 'You\'ve reached your active trial limit.');
            else if (code === 'TRIAL_EXISTS') showError(msg || 'You already have a trial with this tutor.');
            else showError(msg || 'Failed to request trial. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);

    const name = tutor.userId?.name || 'Tutor';
    const loc = tutor.userId?.location;
    const locationStr = [loc?.area, loc?.city].filter(Boolean).join(', ');
    const avgRating = tutor.averageRating || 0;
    const totalReviews = tutor.totalReviews || 0;
    const noDemosLeft = !loading && demoInfo && demoInfo.demosRemaining <= 0;

    const inputClass = 'w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-navy-950 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal/40 transition-all';
    const labelClass = 'block text-[11px] font-bold tracking-wider uppercase text-gray-400 mb-2';

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-[880px] bg-white rounded-3xl shadow-2xl animate-scale-in overflow-hidden max-h-[92vh]">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/90 hover:bg-gray-100 text-gray-500 hover:text-navy-950 transition-colors z-20 flex items-center justify-center shadow-sm"
                    aria-label="Close"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] w-full max-h-[92vh]">
                    {/* ── Left — tutor card ── */}
                    <div className="bg-navy-950 relative overflow-hidden p-7 text-white hidden md:flex flex-col min-w-0">
                        <div className="absolute -top-20 -left-10 w-60 h-60 bg-royal/30 rounded-full blur-[80px] pointer-events-none" />
                        <div className="absolute -bottom-20 -right-10 w-60 h-60 bg-lime/10 rounded-full blur-[80px] pointer-events-none" />

                        <div className="relative z-10 flex flex-col h-full">
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime/20 text-lime text-[10px] font-bold tracking-wide mb-5 uppercase w-fit">
                                <span className="w-1.5 h-1.5 rounded-full bg-lime" />
                                Free Trial
                            </span>

                            {tutor.userId?.profilePicture ? (
                                <img src={tutor.userId.profilePicture} alt={name}
                                    className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white/20 mb-4" />
                            ) : (
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-royal to-navy-900 flex items-center justify-center text-white font-extrabold text-2xl ring-4 ring-white/20 mb-4">
                                    {getInitials(name)}
                                </div>
                            )}

                            <h3 className="text-xl font-extrabold leading-tight">{name}</h3>
                            {locationStr && <p className="text-xs text-gray-400 mt-1">{locationStr}</p>}

                            {/* Stats */}
                            <div className="mt-5 pt-5 border-t border-white/10 grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xl font-extrabold">₹{tutor.hourlyRate || '—'}</p>
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

                            {tutor.subjects?.length > 0 && (
                                <div className="mt-5">
                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-2">Teaches</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {tutor.subjects.slice(0, 4).map((s, i) => (
                                            <span key={i} className="px-2.5 py-1 text-[11px] font-semibold text-lime bg-lime/10 rounded-full">{s}</span>
                                        ))}
                                        {tutor.subjects.length > 4 && (
                                            <span className="px-2 py-1 text-[11px] text-gray-500">+{tutor.subjects.length - 4}</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="mt-auto pt-6">
                                <div className="flex items-start gap-2 p-3 bg-white/5 rounded-xl border border-white/10">
                                    <svg className="w-4 h-4 text-lime flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <p className="text-[11px] text-gray-300 leading-relaxed">
                                        30-min free session. No payment needed. Cancel anytime.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mobile tutor summary (only on small screens) */}
                    <div className="md:hidden flex items-center gap-3 px-5 pt-5 pb-4 border-b border-gray-100">
                        {tutor.userId?.profilePicture ? (
                            <img src={tutor.userId.profilePicture} alt={name}
                                className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                        ) : (
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-navy-950 to-royal flex items-center justify-center text-white font-extrabold flex-shrink-0">
                                {getInitials(name)}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-navy-950 truncate">{name}</p>
                            <p className="text-xs text-gray-500 truncate">Free trial · ₹0</p>
                        </div>
                    </div>

                    {/* ── Right — form ── */}
                    <div className="overflow-y-auto min-w-0">
                        <div className="px-7 pt-7 pb-6 pr-14">
                            <h2 className="text-2xl font-extrabold text-navy-950 leading-tight tracking-tight">
                                Book your trial class
                            </h2>
                            <p className="text-sm text-gray-500 mt-1.5">Pick a time that works — we'll confirm instantly.</p>
                        </div>

                        {loading ? (
                            <div className="px-7 py-10 text-center">
                                <div className="w-6 h-6 border-[3px] border-gray-200 border-t-navy-950 rounded-full animate-spin mx-auto" />
                            </div>
                        ) : noDemosLeft ? (
                            <div className="px-7 pb-7">
                                <div className="bg-[#f7f7f7] rounded-2xl p-6 text-center">
                                    <div className="w-12 h-12 mx-auto rounded-2xl bg-royal/10 flex items-center justify-center mb-3">
                                        <svg className="w-5 h-5 text-royal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h4 className="text-base font-extrabold text-navy-950 mb-1">Trial limit reached</h4>
                                    <p className="text-sm text-gray-500 mb-5 max-w-xs mx-auto">
                                        You've used all your free trials. Book a regular session to continue with {name}.
                                    </p>
                                    <button
                                        onClick={onClose}
                                        className="px-6 py-2.5 bg-navy-950 hover:bg-navy-900 text-white text-sm font-bold rounded-full transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="px-7 pb-7 space-y-4">
                                {/* Credits banner */}
                                {demoInfo && (
                                    <div className="flex items-center gap-2.5 px-4 py-2.5 bg-lime/20 border border-lime/40 rounded-xl">
                                        <svg className="w-4 h-4 text-navy-950 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                        </svg>
                                        <p className="text-xs text-navy-950 font-semibold">
                                            {demoInfo.demosRemaining} free trial{demoInfo.demosRemaining !== 1 ? 's' : ''} remaining
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <label className={labelClass}>Subject</label>
                                    <select
                                        name="subject"
                                        value={formData.subject}
                                        onChange={handleChange}
                                        className={`${inputClass} appearance-none cursor-pointer`}
                                        required
                                    >
                                        {tutor.subjects?.map((sub, idx) => (
                                            <option key={idx} value={sub}>{sub}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelClass}>Date</label>
                                        <input
                                            type="date"
                                            name="preferredDate"
                                            required
                                            min={new Date().toISOString().split('T')[0]}
                                            max={maxDate.toISOString().split('T')[0]}
                                            value={formData.preferredDate}
                                            onChange={handleChange}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Time</label>
                                        <input
                                            type="time"
                                            name="preferredTime"
                                            required
                                            value={formData.preferredTime}
                                            onChange={handleChange}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>

                                {tutor.mode === 'both' && (
                                    <div>
                                        <label className={labelClass}>Mode</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { value: 'online', label: 'Online' },
                                                { value: 'home', label: 'At home' },
                                            ].map((m) => (
                                                <button
                                                    type="button"
                                                    key={m.value}
                                                    onClick={() => setFormData((d) => ({ ...d, mode: m.value }))}
                                                    className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                                                        formData.mode === m.value
                                                            ? 'border-navy-950 bg-navy-950 text-white'
                                                            : 'border-gray-200 bg-white text-navy-950 hover:border-navy-950/40'
                                                    }`}
                                                >
                                                    {m.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className={labelClass}>
                                        Notes <span className="text-gray-300 normal-case tracking-normal font-normal">(optional)</span>
                                    </label>
                                    <textarea
                                        name="studentNotes"
                                        rows={2}
                                        value={formData.studentNotes}
                                        onChange={handleChange}
                                        placeholder="Any topics you'd like to focus on?"
                                        className={`${inputClass} resize-none`}
                                    />
                                </div>

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
                                        disabled={submitting}
                                        className="flex-1 py-3 rounded-full bg-lime hover:bg-lime-light text-navy-950 text-sm font-bold transition-colors disabled:opacity-50 shadow-sm flex items-center justify-center gap-2"
                                    >
                                        {submitting ? (
                                            <>
                                                <span className="w-4 h-4 border-2 border-navy-950/30 border-t-navy-950 rounded-full animate-spin" />
                                                Booking...
                                            </>
                                        ) : (
                                            'Confirm trial'
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default RequestDemoModal;
