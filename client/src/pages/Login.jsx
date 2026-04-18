import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthModalStore } from '../stores/authModalStore';
import { useToastStore } from '../stores/toastStore';

/**
 * /login is now a passthrough — we've consolidated the student login/register
 * flow into the global <AuthModal />. Hitting this route opens the modal and
 * sends the user back to the home page.
 *
 * Kept around so existing links (e.g. from the OAuth handler, emails) continue
 * to work instead of 404-ing.
 */
const Login = () => {
    const [searchParams] = useSearchParams();
    const openLogin = useAuthModalStore((s) => s.openLogin);
    const showError = useToastStore((s) => s.showError);
    const navigate = useNavigate();

    useEffect(() => {
        const errorParam = searchParams.get('error');
        if (errorParam) {
            const msg = {
                oauth_failed: 'Google sign-in failed. Please try again.',
                token_generation_failed: 'Could not verify your Google account.',
                access_denied: 'Access denied. Please sign in.',
            }[errorParam] || 'Please sign in to continue.';
            showError(msg);
        }
        openLogin();
        navigate('/', { replace: true });
    }, [searchParams, openLogin, showError, navigate]);

    return null;
};

export default Login;
