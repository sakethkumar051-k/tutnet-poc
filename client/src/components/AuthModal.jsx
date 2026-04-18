import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthModalStore } from '../stores/authModalStore';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import GoogleSignInButton from './GoogleSignInButton';

const AuthModal = () => {
    const { isOpen, mode, message, switchMode, close } = useAuthModalStore();
    const login = useAuthStore((s) => s.login);
    const register = useAuthStore((s) => s.register);
    const showSuccess = useToastStore((s) => s.showSuccess);
    const navigate = useNavigate();
    const backdropRef = useRef(null);

    const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', phone: '', area: '' });
    const [role, setRole] = useState('student');
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
            const userData = await login({ email: form.email, password: form.password });
            showSuccess('Signed in successfully');
            close();
            // If they were trying to do something, stay on page. Otherwise redirect to dashboard.
            if (!message) {
                const role = userData.role || 'student';
                navigate(role === 'tutor' ? '/tutor-dashboard' : role === 'admin' ? '/admin-dashboard' : '/student-dashboard');
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
            const userData = await register({
                name: form.name, email: form.email, phone: form.phone, password: form.password, role,
                location: { area: form.area, city: 'Hyderabad' },
            });
            showSuccess('Account created!');
            close();
            const redirect = role === 'tutor' ? '/complete-profile'
                : (!userData?.phone || !userData?.location?.area) ? '/complete-profile' : '/student-dashboard';
            navigate(redirect, { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = 'w-full px-3.5 py-2.5 bg-gray-50/80 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 focus:bg-white transition-all';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                ref={backdropRef}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
                onClick={close}
            />

            {/* Modal */}
            <div className="relative w-full max-w-[400px] bg-white rounded-2xl shadow-2xl animate-scale-in overflow-hidden max-h-[90vh] overflow-y-auto">
                {/* Close button */}
                <button onClick={close} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors z-10" aria-label="Close">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Header */}
                <div className="px-6 pt-6 pb-0">
                    {message && (
                        <div className="mb-4 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                            <p className="text-xs text-blue-700 font-medium">{message}</p>
                        </div>
                    )}
                    <h2 className="text-xl font-bold text-gray-900">
                        {mode === 'login' ? 'Welcome back' : 'Create account'}
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {mode === 'login' ? 'Sign in to continue' : 'Join TutNet to get started'}
                    </p>
                </div>

                {/* Google OAuth */}
                <div className="px-6 pt-4">
                    <GoogleSignInButton text={mode === 'login' ? 'Continue with Google' : 'Sign up with Google'} />
                    <div className="relative flex items-center my-4">
                        <div className="flex-1 border-t border-gray-200" />
                        <span className="px-3 text-[10px] text-gray-400 font-medium uppercase tracking-wider">or</span>
                        <div className="flex-1 border-t border-gray-200" />
                    </div>
                </div>

                {/* Login Form */}
                {mode === 'login' && (
                    <form onSubmit={handleLogin} className="px-6 pb-4 space-y-3">
                        {error && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
                                <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <p className="text-xs text-red-700 font-medium">{error}</p>
                            </div>
                        )}
                        <input name="email" type="email" required value={form.email} onChange={handleChange} placeholder="Email address" className={inputClass} />
                        <input name="password" type="password" required value={form.password} onChange={handleChange} placeholder="Password" className={inputClass} />
                        <button type="submit" disabled={loading} className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </form>
                )}

                {/* Register Form */}
                {mode === 'register' && (
                    <form onSubmit={handleRegister} className="px-6 pb-4 space-y-3">
                        {error && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
                                <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <p className="text-xs text-red-700 font-medium">{error}</p>
                            </div>
                        )}

                        {/* Role toggle */}
                        <div className="relative bg-gray-100 rounded-lg p-0.5">
                            <div className="grid grid-cols-2 gap-0.5 relative z-10">
                                {['student', 'tutor'].map((r) => (
                                    <button key={r} type="button" onClick={() => setRole(r)}
                                        className={`py-2 text-xs font-medium rounded-md transition-colors ${role === r ? 'text-gray-900' : 'text-gray-500'}`}>
                                        I'm a {r.charAt(0).toUpperCase() + r.slice(1)}
                                    </button>
                                ))}
                            </div>
                            <div className="absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] bg-white rounded-md shadow-sm transition-transform duration-200"
                                style={{ transform: role === 'tutor' ? 'translateX(calc(100% + 4px))' : 'translateX(0)' }} />
                        </div>

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
                        <button type="submit" disabled={loading} className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
                            {loading ? 'Creating account...' : `Create ${role} account`}
                        </button>
                    </form>
                )}

                {/* Footer toggle */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-center">
                    <p className="text-sm text-gray-500">
                        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                        <button
                            onClick={() => { setError(''); switchMode(mode === 'login' ? 'register' : 'login'); }}
                            className="font-semibold text-gray-900 hover:underline"
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
