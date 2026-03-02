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

            // Don't check profile if user is already on complete-profile page
            if (location.pathname === '/complete-profile') {
                setProfileComplete(false); // Allow access to complete-profile
                setProfileCheckLoading(false);
                return;
            }

            // For tutors, check if profile is complete
            if (user.role === 'tutor') {
                try {
                    const result = await checkTutorProfileComplete();
                    // If result indicates user is not a tutor yet, allow access (they're in onboarding)
                    if (result.message && result.message.includes('not a tutor')) {
                        setProfileComplete(false); // Allow them to complete profile
                    } else {
                        setProfileComplete(result.isComplete || false);
                    }
                } catch (error) {
                    // If error, assume profile is not complete and allow access to complete-profile
                    console.error('Error checking profile:', error);
                    setProfileComplete(false);
                }
            } else {
                // For students, check basic profile completeness
                setProfileComplete(isUserProfileComplete(user));
            }
            
            setProfileCheckLoading(false);
        };

        checkProfile();
    }, [user, loading, location.pathname]);

    if (loading || profileCheckLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    // 1. If not logged in, send to login
    if (!user) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    // 2. If profile is not complete, redirect to complete-profile
    if (!profileComplete && location.pathname !== '/complete-profile') {
        return <Navigate to="/complete-profile" replace />;
    }

    // 3. Role-based protection
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        // Redirect to their appropriate dashboard if they try to access a wrong role page
        if (user.role === 'tutor') return <Navigate to="/tutor-dashboard" replace />;
        if (user.role === 'admin') return <Navigate to="/admin-dashboard" replace />;
        return <Navigate to="/student-dashboard" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
