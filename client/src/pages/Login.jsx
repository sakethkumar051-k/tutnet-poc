import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import GoogleSignInButton from '../components/GoogleSignInButton';
import FormField from '../components/shared/FormField';
import AlertBanner from '../components/shared/AlertBanner';

const Login = () => {
    const [searchParams] = useSearchParams();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const login = useAuthStore((s) => s.login);
    const navigate = useNavigate();

    useEffect(() => {
        const redirect = searchParams.get('redirect');
        const errorParam = searchParams.get('error');

        if (redirect) sessionStorage.setItem('redirectAfterLogin', redirect);
        if (errorParam) {
            const errorMap = {
                oauth_failed: 'Google Sign-In failed. Please try again.',
                token_generation_failed: 'Could not verify your Google account.',
                access_denied: 'Access denied. Please log in first.',
            };
            setError(errorMap[errorParam] || 'An error occurred. Please try again.');
        }
    }, [searchParams]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const userData = await login(formData);
            const redirect = sessionStorage.getItem('redirectAfterLogin');
            if (redirect) {
                sessionStorage.removeItem('redirectAfterLogin');
                navigate(redirect);
            } else {
                const role = userData.role || 'student';
                navigate(role === 'tutor' ? '/tutor-dashboard' : role === 'admin' ? '/admin-dashboard' : '/student-dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
            <div className="max-w-[420px] w-full">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome back</h1>
                    <p className="mt-2 text-gray-500">Sign in to continue to TutNet</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 pb-0 space-y-4">
                        <GoogleSignInButton text="Sign in with Google" />

                        <div className="relative flex items-center">
                            <div className="flex-1 border-t border-gray-200" />
                            <span className="px-3 text-xs text-gray-400 font-medium uppercase tracking-wider">or</span>
                            <div className="flex-1 border-t border-gray-200" />
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-4">
                        {error && (
                            <AlertBanner variant="error">
                                {error}
                            </AlertBanner>
                        )}

                        <FormField
                            label="Email address"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="you@example.com"
                        />

                        <FormField
                            label="Password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter your password"
                        />

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Signing in...
                                </span>
                            ) : (
                                'Sign in'
                            )}
                        </button>
                    </form>

                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-center">
                        <p className="text-sm text-gray-500">
                            Don't have an account?{' '}
                            <Link to="/register" className="font-semibold text-gray-900 hover:underline">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
