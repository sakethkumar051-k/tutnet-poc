import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getBaseURL } from '../utils/api';

// FIX: Rewrote OAuthSuccess to use the new one-time code exchange pattern (Fix #5).
//
// WHAT CHANGED ON THE BACKEND:
//   Previously the backend redirected to: /oauth-success?token=JWT_HERE
//   JWTs in URLs are dangerous — they appear in browser history, server logs,
//   and Referer headers sent to third-party scripts.
//
//   The backend now redirects to: /oauth-success?code=SHORT_LIVED_CODE
//   The code expires in 60 seconds and can only be used once.
//
// WHAT THIS PAGE NOW DOES:
//   1. Reads the `code` param from the URL (not `token`)
//   2. Calls GET /api/auth/oauth-token/:code to exchange it for a JWT
//   3. Immediately removes the code from the URL bar (history.replaceState)
//   4. Stores the JWT and logs in as normal
//
// WHY: The JWT never appears in any URL, log, or browser history entry.

const OAuthSuccess = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [error, setError] = useState('');

    useEffect(() => {
        const exchangeCodeForToken = async () => {
            console.log('OAuthSuccess mounted, URL:', window.location.href);

            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');

            if (!code) {
                console.error('No OAuth code found in URL params');
                setError('No authentication code received. Please try signing in again.');
                setTimeout(() => navigate('/login'), 3000);
                return;
            }

            try {
                // Exchange the short-lived code for a JWT via the backend
                const baseURL = getBaseURL();
                const response = await fetch(`${baseURL}/auth/oauth-token/${code}`);

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.message || 'Invalid or expired OAuth code');
                }

                const { token } = await response.json();

                // Immediately scrub the code from the URL bar so it doesn't
                // sit in browser history or get leaked via Referer headers
                window.history.replaceState({}, '', window.location.pathname);

                // Store token and fetch user data via AuthContext
                localStorage.setItem('token', token);
                const userData = await login(token);

                const userRole = userData?.role || 'student';
                console.log('OAuth login successful, role:', userRole);

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
                console.error('OAuth code exchange failed:', err);
                setError(err.message || 'Authentication failed. Please try again.');
                setTimeout(() => navigate('/login'), 3000);
            }
        };

        exchangeCodeForToken();
    }, [navigate, login]);

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
