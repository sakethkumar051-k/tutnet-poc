import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getBaseURL } from '../utils/api';
import { setAccessToken } from '../authToken';

const OAuthSuccess = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [error, setError] = useState('');
    const exchangedRef = useRef(false);

    useEffect(() => {
        const exchangeCodeForToken = async () => {
            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');

            if (!code) {
                setError('No authentication code received. Please try signing in again.');
                setTimeout(() => navigate('/login'), 3000);
                return;
            }

            if (exchangedRef.current) return;
            exchangedRef.current = true;

            window.history.replaceState({}, '', window.location.pathname);

            try {
                const baseURL = getBaseURL();
                const response = await fetch(`${baseURL}/auth/oauth-token/${code}`, {
                    credentials: 'include'
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.message || 'Invalid or expired OAuth code');
                }

                const { token } = await response.json();
                setAccessToken(token);
                await login(token);
                navigate('/dashboard');

            } catch (err) {
                console.error('OAuth code exchange failed:', err);
                setError(err.message || 'Authentication failed. Please try again.');
                setTimeout(() => navigate('/login'), 3000);
            }
        };

        exchangeCodeForToken();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full">
                {error ? (
                    <>
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">✕</span>
                        </div>
                        <h2 className="text-xl font-bold text-navy-950 mb-2">Sign In Failed</h2>
                        <p className="text-gray-600">{error}</p>
                        <p className="text-sm text-gray-500 mt-4">Redirecting back to login...</p>
                    </>
                ) : (
                    <>
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royal mx-auto mb-4"></div>
                        <h2 className="text-xl font-bold text-navy-950 mb-2">Signing you in...</h2>
                        <p className="text-gray-600">Please wait while we verify your Google account.</p>
                    </>
                )}
            </div>
        </div>
    );
};

export default OAuthSuccess;
