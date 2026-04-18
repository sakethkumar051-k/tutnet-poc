import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import StudentDashboard from './StudentDashboard';
import TutorDashboard from './TutorDashboard';
import AdminDashboard from './AdminDashboard';
import LoadingSpinner from '../components/LoadingSpinner';

/**
 * Unified /dashboard entry point. Picks the right dashboard based on the
 * authenticated user's role. Keeps role-specific routes
 * (/student-dashboard, /tutor-dashboard, /admin-dashboard) working, but the
 * canonical URL everything else links to is just /dashboard.
 */
const Dashboard = () => {
    const user = useAuthStore((s) => s.user);
    const loading = useAuthStore((s) => s.loading);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (!user) return <Navigate to="/" replace />;

    if (user.role === 'admin') return <AdminDashboard />;
    if (user.role === 'tutor') return <TutorDashboard />;
    return <StudentDashboard />;
};

export default Dashboard;
