import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const OAuthSuccess = () => {
    // const [searchParams] = useSearchParams(); // This will be replaced by direct URLSearchParams
    const navigate = useNavigate();
    const { login } = useAuth();
    const [error, setError] = useState('');

    useEffect(() => {
        // Log the full current URL to debug
        console.log('OAuthSuccess mounted, URL:', window.location.href);

        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        console.log('Token from URL:', token ? 'Found token' : 'No token found');

        if (token) {
            try {
                // Store token and redirect
                localStorage.setItem('token', token);
                login(token);

                // Decode token to get role
                // Basic decoding of JWT payload (2nd part)
                const payload = JSON.parse(atob(token.split('.')[1]));
                const userRole = payload.role || 'student'; // Default fallback

                console.log('Login successful, role:', userRole);

                // Redirect based on decoded role
                setTimeout(() => {
                    if (userRole === 'tutor') {
                        navigate('/tutor-dashboard');
                    } else if (userRole === 'admin') {
                        navigate('/admin-dashboard');
                    } else {
                        navigate('/student-dashboard');
                    }
                }, 1500);
            } catch (err) {
                console.error('Login/Decode failed:', err);
                setError('Authentication failed. Please try again.');
                setTimeout(() => navigate('/login'), 3000);
            }
        } else {
            console.error('No token found in URL params');
            setError('No token received from Google');
            setTimeout(() => navigate('/login'), 3000);
        }
    }, [navigate, login]); // Removed searchParams from dependencies as it's no longer used directly

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full">
                {error ? (
                    <>
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">✕</span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Sign In Failed</h2>
                        <p className="text-gray-600">{error}</p>
                        <p className="text-sm text-gray-500 mt-4">Redirecting back to login...</p>
                    </>
                ) : (
                    <>
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Signing you in...</h2>
                        <p className="text-gray-600">Please wait while we verify your Google account.</p>
                    </>
                )}
            </div>
        </div>
    );
};

export default OAuthSuccess;
