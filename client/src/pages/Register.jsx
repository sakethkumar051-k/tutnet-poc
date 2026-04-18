import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useAuthModalStore } from '../stores/authModalStore';
import { useToastStore } from '../stores/toastStore';
import GoogleSignInButton from '../components/GoogleSignInButton';

const perks = [
    {
        title: 'You keep the relationship',
        desc: 'Students book you directly. Tutnet handles scheduling, attendance, and payments — you focus on teaching.',
        icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-9a4 4 0 11-8 0 4 4 0 018 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z',
    },
    {
        title: 'Get discovered locally',
        desc: 'Parents search by area, subject, and board. A verified profile puts you in front of families nearby.',
        icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
    },
    {
        title: 'Transparent earnings',
        desc: 'Set your own hourly rate. See every session, cancellation, and payout in your dashboard — no surprises.',
        icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
];

const Register = () => {
    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', password: '', confirmPassword: '',
        location: { area: '', city: 'Hyderabad' },
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const register = useAuthStore((s) => s.register);
    const openLogin = useAuthModalStore((s) => s.openLogin);
    const showSuccess = useToastStore((s) => s.showSuccess);
    const navigate = useNavigate();

    const handleChange = (e) => {
        if (e.target.name === 'area') {
            setFormData({ ...formData, location: { ...formData.location, area: e.target.value } });
        } else {
            setFormData({ ...formData, [e.target.name]: e.target.value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }
        if (formData.password.length < 6) { setError('Password must be at least 6 characters'); return; }

        setLoading(true);
        try {
            const payload = { ...formData };
            delete payload.confirmPassword;
            await register({ ...payload, role: 'tutor' });
            showSuccess('Application started — complete your tutor profile next.');
            navigate('/complete-profile', { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = 'w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-navy-950 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal/40 transition-all';

    return (
        <div className="bg-navy-950 font-sans min-h-[calc(100vh-72px)] flex">
            {/* ════════════════ HERO + FORM ════════════════ */}
            <section className="relative overflow-hidden bg-navy-950 flex-1 w-full">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -top-24 -left-24 w-[480px] h-[480px] bg-royal/20 rounded-full blur-[120px]" />
                    <div className="absolute -bottom-24 right-0 w-[420px] h-[420px] bg-lime/10 rounded-full blur-[120px]" />
                </div>

                <div className="max-w-[1300px] mx-auto px-6 lg:px-10 py-16 lg:py-20 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                        {/* Left — pitch */}
                        <div>
                            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-lime/20 text-lime text-xs font-bold tracking-wide mb-6">
                                <span className="w-2 h-2 rounded-full bg-lime" />
                                For Tutors
                            </span>
                            <h1 className="text-[clamp(2.25rem,4.5vw,3.5rem)] font-extrabold text-white leading-[1.08] tracking-tight">
                                Teach on your terms.<br />
                                <span className="text-lime">Get paid</span> on time.
                            </h1>
                            <p className="mt-5 text-[16px] text-gray-400 leading-relaxed max-w-md">
                                Join 500+ verified tutors on Tutnet. Set your rate, pick your schedule, and let parents in West Hyderabad find you.
                            </p>

                            <div className="mt-10 space-y-5">
                                {perks.map((p) => (
                                    <div key={p.title} className="flex items-start gap-4">
                                        <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                                            <svg className="w-5 h-5 text-lime" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d={p.icon} />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-[15px]">{p.title}</p>
                                            <p className="text-gray-400 text-sm mt-1 leading-relaxed">{p.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right — application form card */}
                        <div className="lg:sticky lg:top-24">
                            <div className="bg-white rounded-3xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)] overflow-hidden">
                                <div className="px-7 pt-7 pb-0">
                                    <h2 className="text-xl font-extrabold text-navy-950 tracking-tight">Apply to teach</h2>
                                    <p className="text-sm text-gray-500 mt-1">Takes about 2 minutes. You'll finish your full profile right after.</p>
                                </div>

                                <div className="px-7 pt-5">
                                    <GoogleSignInButton text="Sign up with Google" />
                                    <div className="relative flex items-center my-5">
                                        <div className="flex-1 border-t border-gray-100" />
                                        <span className="px-3 text-[10px] text-gray-400 font-bold uppercase tracking-[0.15em]">or</span>
                                        <div className="flex-1 border-t border-gray-100" />
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="px-7 pb-6 space-y-3">
                                    {error && (
                                        <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-100 rounded-xl">
                                            <svg className="w-4 h-4 text-rose-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                            <p className="text-xs text-rose-700 font-semibold">{error}</p>
                                        </div>
                                    )}
                                    <input name="name" required value={formData.name} onChange={handleChange} placeholder="Full name" className={inputClass} />
                                    <input name="email" type="email" required value={formData.email} onChange={handleChange} placeholder="Email address" className={inputClass} />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input name="phone" type="tel" required value={formData.phone} onChange={handleChange} placeholder="Phone" className={inputClass} />
                                        <input name="area" required value={formData.location.area} onChange={handleChange} placeholder="Area" className={inputClass} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input name="password" type="password" required value={formData.password} onChange={handleChange} placeholder="Password" className={inputClass} />
                                        <input name="confirmPassword" type="password" required value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm" className={inputClass} />
                                    </div>
                                    <button type="submit" disabled={loading}
                                        className="w-full py-3 bg-lime hover:bg-lime-light text-navy-950 text-sm font-bold rounded-full transition-colors disabled:opacity-50 mt-2 shadow-sm">
                                        {loading ? 'Starting application...' : 'Start tutor application'}
                                    </button>
                                </form>

                                <div className="px-7 py-4 bg-[#f7f7f7] border-t border-gray-100 text-center">
                                    <p className="text-sm text-gray-500">
                                        Already teach on Tutnet?{' '}
                                        <button onClick={() => openLogin()} className="font-bold text-navy-950 hover:text-royal transition-colors">
                                            Sign in
                                        </button>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Register;
