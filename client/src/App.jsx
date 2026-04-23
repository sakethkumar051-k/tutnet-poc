import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useNotificationStore } from './stores/notificationStore';
import { syncSocketWithAuth } from './socketClient';
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTop from './components/ScrollToTop';
import ToastContainer from './components/shared/ToastContainer';
import AuthModal from './components/AuthModal';
import TestModeBanner from './components/TestModeBanner';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Lazy-loaded pages — code-split per route
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const OAuthSuccess = lazy(() => import('./pages/OAuthSuccess'));
const CompleteProfile = lazy(() => import('./pages/CompleteProfile'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Courses = lazy(() => import('./pages/Courses'));
const Terms = lazy(() => import('./pages/Terms'));
const TutorAgreement = lazy(() => import('./pages/TutorAgreement'));
const Pricing = lazy(() => import('./pages/Pricing'));
const HowItWorks = lazy(() => import('./pages/HowItWorks'));
const StudentOnboarding = lazy(() => import('./pages/StudentOnboarding'));
const FindTutors = lazy(() => import('./pages/FindTutors'));
const TutorProfilePage = lazy(() => import('./pages/TutorProfilePage'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const TutorDashboard = lazy(() => import('./pages/TutorDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminRevenue = lazy(() => import('./pages/AdminRevenue'));
const SessionRoom = lazy(() => import('./pages/SessionRoom'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const NotificationsSettingsPage = lazy(() => import('./pages/NotificationsSettingsPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

const PageLoader = () => (
    <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-[3px] border-gray-200 border-t-gray-800 rounded-full animate-spin" />
            <p className="text-sm text-gray-400 font-medium">Loading...</p>
        </div>
    </div>
);

function App() {
    const initialize = useAuthStore((s) => s.initialize);
    const user = useAuthStore((s) => s.user);

    useEffect(() => {
        initialize();
    }, [initialize]);

    useEffect(() => {
        syncSocketWithAuth(user);
    }, [user]);

    // Unread-count safety poll — socket is the primary channel, this is the fallback
    // when the websocket is disconnected (reconnecting, network hiccup, tab wake).
    // Socket push keeps the badge accurate in real time; 5-minute poll is a safety net.
    useEffect(() => {
        if (!user) return undefined;
        const tick = () => useNotificationStore.getState().fetchUnreadCount();
        tick();
        const id = setInterval(tick, 5 * 60_000);
        return () => clearInterval(id);
    }, [user]);

    return (
        <ErrorBoundary>
            <Router>
                <ScrollToTop />
                <TestModeBanner />
                <Suspense fallback={<PageLoader />}>
                    <Routes>
                        {/* Public pages with navbar + footer */}
                        <Route element={<AppLayout />}>
                            <Route path="/" element={<Home />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/oauth-success" element={<OAuthSuccess />} />
                            <Route path="/complete-profile" element={<CompleteProfile />} />
                            <Route path="/admin-login" element={<AdminLogin />} />
                            <Route path="/about" element={<About />} />
                            <Route path="/contact" element={<Contact />} />
                            <Route path="/courses" element={<Courses />} />
                            <Route path="/terms" element={<Terms />} />
                            <Route path="/tutor-agreement" element={<TutorAgreement />} />
                            <Route path="/pricing" element={<Pricing />} />
                            <Route path="/how-it-works" element={<HowItWorks />} />
                            <Route path="/onboarding" element={<StudentOnboarding />} />

                            {/* Public: anyone can browse tutors, actions gated by auth modal */}
                            <Route path="/find-tutors" element={<FindTutors />} />
                            <Route path="/tutor/:id" element={<TutorProfilePage />} />
                        </Route>

                        {/* Dashboard pages — no global navbar/footer */}
                        <Route element={<DashboardLayout />}>
                            {/* Canonical dashboard route — picks by role */}
                            <Route element={<ProtectedRoute allowedRoles={['student', 'tutor', 'admin']} />}>
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/notifications" element={<NotificationsPage />} />
                                <Route path="/notifications/settings" element={<NotificationsSettingsPage />} />
                            </Route>
                            {/* Role-specific routes kept for backward compat & deep-linking */}
                            <Route element={<ProtectedRoute allowedRoles={['student']} />}>
                                <Route path="/student-dashboard" element={<StudentDashboard />} />
                            </Route>
                            <Route element={<ProtectedRoute allowedRoles={['tutor']} />}>
                                <Route path="/tutor-dashboard" element={<TutorDashboard />} />
                            </Route>
                            {/* In-app video session — both students and tutors use it */}
                            <Route element={<ProtectedRoute allowedRoles={['student', 'tutor']} />}>
                                <Route path="/session/:bookingId" element={<SessionRoom />} />
                            </Route>
                            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                                <Route path="/admin-dashboard" element={<AdminDashboard />} />
                                <Route path="/admin/revenue" element={<AdminRevenue />} />
                            </Route>
                        </Route>
                    </Routes>
                </Suspense>

                {/* Global overlays */}
                <ToastContainer />
                <AuthModal />
            </Router>
        </ErrorBoundary>
    );
}

export default App;
