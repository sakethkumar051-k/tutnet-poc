import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const AdminLogin = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        adminSecret: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // First, attempt to login
            const { data } = await api.post('/auth/login', {
                email: formData.email,
                password: formData.password
            });

            // Verify it's an admin account
            if (data.role !== 'admin') {
                setError('Access denied. This is not an admin account.');
                setLoading(false);
                return;
            }

            // Store token temporarily for the verify-admin call
            localStorage.setItem('token', data.token);

            // Verify admin secret (token is now in localStorage, so interceptor will add it)
            console.log('Calling verify-admin with token:', data.token ? 'Token present' : 'No token');
            console.log('API base URL:', import.meta.env.VITE_API_URL);
            
            const secretResponse = await api.post('/auth/verify-admin', {
                adminSecret: formData.adminSecret
            });
            
            console.log('Verify-admin response:', secretResponse.data);

            if (!secretResponse.data.verified) {
                // Remove token if verification fails
                localStorage.removeItem('token');
                setError('Invalid admin secret key');
                setLoading(false);
                return;
            }

            // Store user data and redirect
            localStorage.setItem('user', JSON.stringify(data));
            navigate('/admin-dashboard');
        } catch (err) {
            console.error('Admin login error:', err);
            console.error('Error response:', err.response);
            
            // More detailed error messages
            if (err.response?.status === 404) {
                setError('API endpoint not found. Please check backend configuration.');
            } else if (err.response?.status === 401) {
                setError(err.response?.data?.message || 'Invalid credentials or admin secret');
            } else if (err.response?.status === 403) {
                setError(err.response?.data?.message || 'Access denied');
            } else if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else if (err.message) {
                setError(`Network error: ${err.message}`);
            } else {
                setError('Admin login failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-2xl">
                <div>
                    <div className="flex justify-center">
                        <div className="bg-indigo-600 text-white p-3 rounded-full">
                            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Admin Access
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Secure admin portal login
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="rounded-md shadow-sm space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Email Address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                placeholder="admin@tutnet.com"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <label htmlFor="adminSecret" className="block text-sm font-medium text-gray-700 mb-1">
                                Admin Secret Key
                            </label>
                            <input
                                id="adminSecret"
                                name="adminSecret"
                                type="password"
                                required
                                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                placeholder="Enter secret key"
                                value={formData.adminSecret}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
                        >
                            {loading ? 'Verifying...' : 'Access Admin Panel'}
                        </button>
                    </div>

                    <div className="text-sm text-center text-gray-600">
                        <p>⚠️ Authorized access only</p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
