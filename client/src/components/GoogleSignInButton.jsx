import React from 'react';
import { getBaseURL } from '../utils/api';

const GoogleSignInButton = ({ text = "Continue with Google" }) => {
    const handleGoogleSignIn = () => {
        // Redirect to backend OAuth endpoint
        // Use centralized helper to ensure correct path (localhost vs production)
        const apiUrl = getBaseURL();
        window.location.href = `${apiUrl}/auth/google`;
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
