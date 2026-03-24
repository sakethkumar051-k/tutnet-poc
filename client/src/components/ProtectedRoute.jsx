import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { checkTutorProfileComplete, isUserProfileComplete } from '../utils/profileUtils';

const ProtectedRoute = ({ allowedRoles = [] }) => {
    const { user, loading } = useAuth();
    const location = useLocation();
    const [profileCheckLoading, setProfileCheckLoading] = useState(true);
    const [profileComplete, setProfileComplete] = useState(true);

    useEffect(() => {
        const checkProfile = async () => {
            if (!user || loading) {
                setProfileCheckLoading(false);
                return;
            }

            if (location.pathname === '/complete-profile') {
                setProfileComplete(false);
                setProfileCheckLoading(false);
                return;
            }

            if (user.role === 'admin') {
                setProfileComplete(true);
                setProfileCheckLoading(false);
                return;
            }

            if (user.role === 'tutor') {
                try {
                    const result = await checkTutorProfileComplete();
                    if (result.message && result.message.includes('not a tutor')) {
                        setProfileComplete(false);
                    } else {
                        setProfileComplete(result.isComplete || false);
                    }
                } catch (error) {
                    console.error('Error checking profile:', error);
                    setProfileComplete(false);
                }
            } else {
                setProfileComplete(isUserProfileComplete(user));
            }

            setProfileCheckLoading(false);
        };

        checkProfile();
    }, [user, loading, location.pathname]);

    if (loading || profileCheckLoading || user?._tokenOnly) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (!profileComplete && location.pathname !== '/complete-profile') {
        return <Navigate to="/complete-profile" replace />;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        if (user.role === 'tutor') return <Navigate to="/tutor-dashboard" replace />;
        if (user.role === 'admin') return <Navigate to="/admin-dashboard" replace />;
        return <Navigate to="/student-dashboard" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
