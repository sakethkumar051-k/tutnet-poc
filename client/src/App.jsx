import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer from './components/shared/ToastContainer';
import AuthModal from './components/AuthModal';
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
const FindTutors = lazy(() => import('./pages/FindTutors'));
const TutorProfilePage = lazy(() => import('./pages/TutorProfilePage'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const TutorDashboard = lazy(() => import('./pages/TutorDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

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

    useEffect(() => {
        initialize();
    }, [initialize]);

    return (
        <ErrorBoundary>
            <Router>
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

                            {/* Public: anyone can browse tutors, actions gated by auth modal */}
                            <Route path="/find-tutors" element={<FindTutors />} />
                            <Route path="/tutor/:id" element={<TutorProfilePage />} />
                        </Route>

                        {/* Dashboard pages — no global navbar/footer */}
                        <Route element={<DashboardLayout />}>
                            <Route element={<ProtectedRoute allowedRoles={['student']} />}>
                                <Route path="/student-dashboard" element={<StudentDashboard />} />
                            </Route>
                            <Route element={<ProtectedRoute allowedRoles={['tutor']} />}>
                                <Route path="/tutor-dashboard" element={<TutorDashboard />} />
                            </Route>
                            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                                <Route path="/admin-dashboard" element={<AdminDashboard />} />
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
