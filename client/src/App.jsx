import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import TutorDashboard from './pages/TutorDashboard';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import FindTutors from './pages/FindTutors';
import TutorProfilePage from './pages/TutorProfilePage';
import OAuthSuccess from './pages/OAuthSuccess';
import CompleteProfile from './pages/CompleteProfile';
import About from './pages/About';
import Contact from './pages/Contact';
import AppLayout from './layouts/AppLayout';
import DashboardLayout from './layouts/DashboardLayout';
import { NotificationProvider } from './context/NotificationContext';

function App() {
    return (
        <Router>
            <AuthProvider>
                <ToastProvider>
                    <NotificationProvider>
                        <Routes>
                            {/* App shell routes (navbar + footer) */}
                            <Route element={<AppLayout />}>
                                <Route path="/" element={<Home />} />
                                <Route path="/login" element={<Login />} />
                                <Route path="/register" element={<Register />} />
                                <Route path="/oauth-success" element={<OAuthSuccess />} />
                                <Route path="/complete-profile" element={<CompleteProfile />} />
                                <Route path="/admin-login" element={<AdminLogin />} />
                                <Route path="/about" element={<About />} />
                                <Route path="/contact" element={<Contact />} />

                                {/* Protected routes inside app shell */}
                                <Route element={<ProtectedRoute allowedRoles={['student']} />}>
                                    <Route path="/find-tutors" element={<FindTutors />} />
                                    <Route path="/tutor/:id" element={<TutorProfilePage />} />
                                </Route>
                            </Route>

                            {/* Dashboard shell routes (no global navbar/footer) */}
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
                    </NotificationProvider>
                </ToastProvider>
            </AuthProvider>
        </Router>
    );
}

export default App;
