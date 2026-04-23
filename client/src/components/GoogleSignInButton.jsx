import React from 'react';
import { getBaseURL } from '../utils/api';

/**
 * @param {'student' | 'tutor'} signupRole — sent as ?role= so new Google accounts get the right role (existing accounts keep their role).
 */
const GoogleSignInButton = ({ text = 'Continue with Google', signupRole = 'student' }) => {
    const handleGoogleSignIn = () => {
        const apiUrl = getBaseURL();
        const role = signupRole === 'tutor' ? 'tutor' : 'student';
        try {
            sessionStorage.setItem('tutnet_oauth_signup_role', role);
        } catch {
            /* ignore */
        }
        const qs = new URLSearchParams({ role });
        window.location.href = `${apiUrl}/auth/google?${qs.toString()}`;
    };

    return (
        <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors bg-white text-gray-700 font-medium shadow-sm"
        >
            <img
                src="https://www.google.com/favicon.ico"
                alt="Google"
                className="w-5 h-5"
            />
            <span>{text}</span>
        </button>
    );
};

export default GoogleSignInButton;
