import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthModalStore } from '../stores/authModalStore';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import GoogleSignInButton from './GoogleSignInButton';
import useBodyScrollLock from '../hooks/useBodyScrollLock';

const AuthModal = () => {
    const { isOpen, mode, message, switchMode, close } = useAuthModalStore();
    useBodyScrollLock(isOpen);
    const login = useAuthStore((s) => s.login);
    const register = useAuthStore((s) => s.register);
    const showSuccess = useToastStore((s) => s.showSuccess);
    const navigate = useNavigate();
    const backdropRef = useRef(null);

    const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', phone: '', area: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Reset form when modal opens/closes or mode changes
    useEffect(() => {
        if (isOpen) {
            setForm({ name: '', email: '', password: '', confirmPassword: '', phone: '', area: '' });
            setError('');
            setLoading(false);
        }
    }, [isOpen, mode]);

    // Close on escape
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') close(); };
        if (isOpen) document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, close]);

    if (!isOpen) return null;

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login({ email: form.email, password: form.password });
            showSuccess('Signed in successfully');
            close();
            if (!message) {
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
        if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
        setLoading(true);
        try {
            await register({
                name: form.name, email: form.email, phone: form.phone, password: form.password, role: 'student',
                location: { area: form.area, city: 'Hyderabad' },
            });
            showSuccess('Welcome to Tutnet!');
            close();
            // Always run students through the onboarding wizard first.
            navigate('/onboarding', { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const goToTutorSignup = () => { close(); navigate('/register'); };

    const inputClass = 'w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-navy-950 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal/40 transition-all';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                ref={backdropRef}
                className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm animate-fade-in"
                onClick={close}
            />

            {/* Modal */}
            <div className="relative w-full max-w-[420px] bg-white rounded-3xl shadow-2xl animate-scale-in overflow-hidden max-h-[92vh] flex flex-col">
                {/* Close button — fixed top-right, always above content */}
                <button
                    onClick={close}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/90 hover:bg-gray-100 text-gray-500 hover:text-navy-950 transition-colors z-20 flex items-center justify-center shadow-sm"
                    aria-label="Close"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="overflow-y-auto flex-1">
                    {/* Header */}
                    <div className="px-7 pt-8 pb-0 pr-14">
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime/20 text-navy-950 text-[10px] font-bold tracking-wide mb-4 uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-lime-dark" />
                            {mode === 'login' ? 'Welcome back' : 'Join Tutnet'}
                        </span>
                        <h2 className="text-2xl font-extrabold text-navy-950 leading-tight tracking-tight">
                            {mode === 'login' ? 'Sign in to Tutnet' : 'Create a student account'}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1.5">
                            {mode === 'login' ? 'Pick up right where you left off.' : 'Start learning with verified tutors near you.'}
                        </p>
                    </div>

                    {/* Context message (why they hit this modal) */}
                    {message && (
                        <div className="mx-7 mt-5 px-4 py-3 bg-royal/5 border border-royal/15 rounded-xl flex items-start gap-2.5">
                            <svg className="w-4 h-4 text-royal flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <p className="text-xs text-royal font-semibold leading-snug">{message}</p>
                        </div>
                    )}

                    {/* Google OAuth */}
                    <div className="px-7 pt-5">
                        <GoogleSignInButton text={mode === 'login' ? 'Continue with Google' : 'Sign up with Google'} />
                        <div className="relative flex items-center my-5">
                            <div className="flex-1 border-t border-gray-100" />
                            <span className="px-3 text-[10px] text-gray-400 font-bold uppercase tracking-[0.15em]">or</span>
                            <div className="flex-1 border-t border-gray-100" />
                        </div>
                    </div>

                    {/* Login Form */}
                    {mode === 'login' && (
                        <form onSubmit={handleLogin} className="px-7 pb-5 space-y-3">
                            {error && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-100 rounded-xl">
                                    <svg className="w-4 h-4 text-rose-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <p className="text-xs text-rose-700 font-semibold">{error}</p>
                                </div>
                            )}
                            <input name="email" type="email" required value={form.email} onChange={handleChange} placeholder="Email address" className={inputClass} />
                            <input name="password" type="password" required value={form.password} onChange={handleChange} placeholder="Password" className={inputClass} />
                            <button type="submit" disabled={loading}
                                className="w-full py-3 bg-navy-950 hover:bg-navy-900 text-white text-sm font-bold rounded-full transition-colors disabled:opacity-50 mt-1">
                                {loading ? 'Signing in...' : 'Sign in'}
                            </button>
                        </form>
                    )}

                    {/* Register Form (student only) */}
                    {mode === 'register' && (
                        <form onSubmit={handleRegister} className="px-7 pb-5 space-y-3">
                            {error && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-100 rounded-xl">
                                    <svg className="w-4 h-4 text-rose-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <p className="text-xs text-rose-700 font-semibold">{error}</p>
                                </div>
                            )}

                            <input name="name" required value={form.name} onChange={handleChange} placeholder="Full name" className={inputClass} />
                            <input name="email" type="email" required value={form.email} onChange={handleChange} placeholder="Email address" className={inputClass} />
                            <div className="grid grid-cols-2 gap-2">
                                <input name="phone" type="tel" required value={form.phone} onChange={handleChange} placeholder="Phone" className={inputClass} />
                                <input name="area" required value={form.area} onChange={handleChange} placeholder="Area" className={inputClass} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <input name="password" type="password" required value={form.password} onChange={handleChange} placeholder="Password" className={inputClass} />
                                <input name="confirmPassword" type="password" required value={form.confirmPassword} onChange={handleChange} placeholder="Confirm" className={inputClass} />
                            </div>
                            <button type="submit" disabled={loading}
                                className="w-full py-3 bg-lime hover:bg-lime-light text-navy-950 text-sm font-bold rounded-full transition-colors disabled:opacity-50 mt-1">
                                {loading ? 'Creating account...' : 'Create student account'}
                            </button>
                            <p className="text-[11px] text-gray-400 text-center pt-1">
                                Are you a tutor?{' '}
                                <button type="button" onClick={goToTutorSignup} className="font-bold text-royal hover:underline">
                                    Apply to teach on Tutnet
                                </button>
                            </p>
                        </form>
                    )}
                </div>

                {/* Footer toggle */}
                <div className="px-7 py-4 bg-[#f7f7f7] border-t border-gray-100 text-center flex-shrink-0">
                    <p className="text-sm text-gray-500">
                        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                        <button
                            onClick={() => { setError(''); switchMode(mode === 'login' ? 'register' : 'login'); }}
                            className="font-bold text-navy-950 hover:text-royal transition-colors"
                        >
                            {mode === 'login' ? 'Sign up' : 'Sign in'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
