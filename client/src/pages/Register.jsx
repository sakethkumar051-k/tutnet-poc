import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import GoogleSignInButton from '../components/GoogleSignInButton';
import FormField from '../components/shared/FormField';
import AlertBanner from '../components/shared/AlertBanner';

const Register = () => {
    const [role, setRole] = useState('student');
    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', password: '', confirmPassword: '',
        location: { area: '', city: 'Hyderabad' },
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const register = useAuthStore((s) => s.register);
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

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            const registrationData = { ...formData };
            delete registrationData.confirmPassword;
            const userData = await register({ ...registrationData, role });
            setSuccess(true);
            setLoading(false);
            const redirectPath = role === 'tutor'
                ? '/complete-profile'
                : (!userData?.phone || !userData?.location?.area) ? '/complete-profile' : '/student-dashboard';
            setTimeout(() => navigate(redirectPath, { replace: true }), 1200);
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
                <div className="max-w-md w-full text-center bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">Account created</h2>
                    <p className="mt-1 text-sm text-gray-500">Redirecting you...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
            <div className="max-w-[420px] w-full">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Create account</h1>
                    <p className="mt-2 text-gray-500">Join TutNet and start your journey</p>
                </div>

                {/* Role toggle */}
                <div className="mb-6">
                    <div className="relative bg-gray-100 rounded-xl p-1">
                        <div className="grid grid-cols-2 gap-1 relative z-10">
                            {['student', 'tutor'].map((r) => (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => setRole(r)}
                                    className={`py-2.5 text-sm font-medium rounded-lg transition-colors ${
                                        role === r ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    I'm a {r.charAt(0).toUpperCase() + r.slice(1)}
                                </button>
                            ))}
                        </div>
                        <div
                            className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-transform duration-200"
                            style={{ transform: role === 'tutor' ? 'translateX(calc(100% + 8px))' : 'translateX(0)' }}
                        />
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 pb-0 space-y-4">
                        <GoogleSignInButton text="Sign up with Google" />
                        <div className="relative flex items-center">
                            <div className="flex-1 border-t border-gray-200" />
                            <span className="px-3 text-xs text-gray-400 font-medium uppercase tracking-wider">or</span>
                            <div className="flex-1 border-t border-gray-200" />
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-4">
                        {error && <AlertBanner variant="error">{error}</AlertBanner>}

                        <FormField label="Full name" name="name" required value={formData.name} onChange={handleChange} placeholder="John Doe" />
                        <FormField label="Email" name="email" type="email" required value={formData.email} onChange={handleChange} placeholder="you@example.com" />
                        <FormField label="Phone" name="phone" type="tel" required value={formData.phone} onChange={handleChange} placeholder="+91 98765 43210" />
                        <FormField label="Area" name="area" required value={formData.location.area} onChange={handleChange} placeholder="Miyapur, Hyderabad" />

                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Password" name="password" type="password" required value={formData.password} onChange={handleChange} placeholder="Min 6 chars" />
                            <FormField label="Confirm" name="confirmPassword" type="password" required value={formData.confirmPassword} onChange={handleChange} placeholder="Re-enter" />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating account...
                                </span>
                            ) : (
                                `Create ${role} account`
                            )}
                        </button>
                    </form>

                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-center">
                        <p className="text-sm text-gray-500">
                            Already have an account?{' '}
                            <Link to="/login" className="font-semibold text-gray-900 hover:underline">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
