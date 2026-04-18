import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const AdminLogin = () => {
    const [formData, setFormData] = useState({ email: '', password: '', adminSecret: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Step 1: Login to get token
            const { data } = await api.post('/auth/login', {
                email: formData.email,
                password: formData.password
            });

            if (data.role !== 'admin') {
                setError('Access denied. This is not an admin account.');
                setLoading(false);
                return;
            }

            // Step 2: Store token so interceptor can attach it
            localStorage.setItem('token', data.token);

            // Step 3: Verify admin secret
            const secretResponse = await api.post('/auth/verify-admin', {
                adminSecret: formData.adminSecret
            });

            if (!secretResponse.data.verified) {
                localStorage.removeItem('token');
                setError('Invalid admin secret key.');
                setLoading(false);
                return;
            }

            // Step 4: CRITICAL — update AuthContext so ProtectedRoute sees role: 'admin'
            // login() with a token string calls /auth/me and sets the full user object
            await login(data.token);

            // Step 5: Navigate — ProtectedRoute will now see role: 'admin' correctly
            navigate('/dashboard', { replace: true });
        } catch (err) {
            localStorage.removeItem('token');
            if (err.response?.status === 404) {
                setError('API endpoint not found. Check backend configuration.');
            } else if (err.response?.status === 401) {
                const msg = err.response?.data?.message || '';
                if (msg.toLowerCase().includes('google')) {
                    setError(msg);
                } else {
                    setError('Invalid email or password.');
                }
            } else if (err.response?.status === 403) {
                setError(err.response?.data?.message || 'Access denied.');
            } else if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError('Admin login failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-950 via-navy-900 to-royal py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-2xl">
                <div>
                    <div className="flex justify-center">
                        <div className="bg-royal text-white p-3 rounded-full">
                            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-navy-950">Admin Access</h2>
                    <p className="mt-2 text-center text-sm text-gray-600">Secure admin portal login</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <input
                                name="email" type="email" required
                                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal"
                                placeholder="admin@example.com"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input
                                name="password" type="password" required
                                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Secret Key</label>
                            <input
                                name="adminSecret" type="password" required
                                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal"
                                placeholder="Enter secret key"
                                value={formData.adminSecret}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <button
                        type="submit" disabled={loading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-royal hover:bg-royal-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {loading ? 'Verifying...' : 'Access Admin Panel'}
                    </button>

                    <p className="text-xs text-center text-gray-400">
                        Default: admin@example.com / password123 · Secret key in server .env (ADMIN_SECRET)
                    </p>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
