import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { checkTutorProfileComplete } from '../utils/profileUtils';

// Components
import Sidebar from '../components/Sidebar';
import SessionsPage from './SessionsPage';
import DashboardStats from '../components/DashboardStats';
import MyCurrentStudents from '../components/MyCurrentStudents';
import StudyMaterials from '../components/StudyMaterials';
import ReviewList from '../components/ReviewList';
import AttendanceTracker from '../components/AttendanceTracker';
import ProgressAnalytics from '../components/ProgressAnalytics';
import ProgressReports from '../components/ProgressReports';
import TutorProfileForm from '../components/TutorProfileForm';
import TutorProgressDashboard from '../components/TutorProgressDashboard';
import TutorCredibilityPanel from '../components/TutorCredibilityPanel';
import WeeklySchedulePlanner from '../components/WeeklySchedulePlanner';
import ClassHistoryTracker from '../components/ClassHistoryTracker';
import EarningsDashboard from '../components/EarningsDashboard';
import MessagingPanel from '../components/MessagingPanel';
import WeeklyProgressReport from '../components/WeeklyProgressReport';
import SafetyPanel from '../components/SafetyPanel';
import IncentiveDashboard from '../components/IncentiveDashboard';
import LearningGoals from '../components/LearningGoals';
import AvailabilityManager from '../components/AvailabilityManager';
import RequestsHub from '../components/RequestsHub';
import LoadingSkeleton from '../components/LoadingSkeleton';
import LoadingSpinner from '../components/LoadingSpinner';
import AnalyticsChart from '../components/AnalyticsChart';

const TutorDashboard = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'dashboard');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentStudents, setCurrentStudents] = useState([]);
    const [pendingBookings, setPendingBookings] = useState([]);
    const [upcomingBookings, setUpcomingBookings] = useState([]);
    const user = useAuthStore((s) => s.user);
    const unreadCount = useNotificationStore((s) => s.unreadCount);
    const setNotificationsOpen = useNotificationStore((s) => s.setIsOpen);

    // Sync activeTab with URL search params
    useEffect(() => {
        const tabFromUrl = searchParams.get('tab') || 'dashboard';
        if (tabFromUrl !== activeTab) {
            setActiveTab(tabFromUrl);
        }
    }, [searchParams]);

    useEffect(() => {
        const checkProfile = async () => {
            try {
                const result = await checkTutorProfileComplete();
                if (!result.isComplete) {
                    // If tutor is on the profile tab, let them stay to complete the 5-step form
                    const tabFromUrl = searchParams.get('tab');
                    if (tabFromUrl === 'profile') return;
                    navigate('/complete-profile', { replace: true });
                    return;
                }
            } catch (error) {
                console.error('Error checking profile:', error);
                const tabFromUrl = searchParams.get('tab');
                if (tabFromUrl === 'profile') return;
                navigate('/complete-profile', { replace: true });
                return;
            }
        };

        if (window.location.pathname === '/tutor-dashboard') {
            checkProfile();
        }

        if (activeTab === 'dashboard') {
            fetchData();
        }
    }, [activeTab, navigate]);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set('tab', tabId);

        // Clean up unneeded params
        if (!['students', 'resources', 'sessions'].includes(tabId)) {
            newSearchParams.delete('studentId');
            newSearchParams.delete('currentTutorId');
        }

        navigate(`/tutor-dashboard?${newSearchParams.toString()}`, { replace: true });
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch all data in parallel
            const [bookingsRes, profileRes, reviewsRes, studentsRes] = await Promise.all([
                api.get('/bookings/mine'),
                api.get('/tutors/my-profile'),
                api.get(`/reviews/tutor/${user._id}`),
                api.get('/current-tutors/tutor/my-students').catch(() => ({ data: [] })) // Don't fail if no students
            ]);

            const bookings = bookingsRes.data;
            const profile = profileRes.data;
            const reviews = reviewsRes.data;
            const students = studentsRes.data;

            setCurrentStudents(students);

            // Filter bookings
            const pending = bookings.filter(b => b.status === 'pending');
            const approved = bookings.filter(b => b.status === 'approved');
            const upcoming = approved.filter(b => {
                if (!b.sessionDate) return false;
                const sessionDate = new Date(b.sessionDate);
                return sessionDate >= new Date();
            });

            setPendingBookings(pending);
            setUpcomingBookings(upcoming);

            // Calculate statistics
            const totalBookings = bookings.length;
            const completedBookings = bookings.filter(b => b.status === 'completed').length;

            // Calculate average rating
            const averageRating = reviews.length > 0
                ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
                : 0;

            setStats({
                total: totalBookings,
                pending: pending.length,
                approved: approved.length,
                completed: completedBookings,
                rating: averageRating,
                reviewCount: reviews.length,
                approvalStatus: profile?.approvalStatus || 'pending',
                studentsCount: students.length
            });
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const dashboardStats = stats ? [
        {
            label: 'Upcoming Sessions',
            value: stats.approved,
            icon: '📅',
            bgColor: 'bg-royal/5',
            iconColor: 'text-royal'
        },
        {
            label: 'Pending Requests',
            value: stats.pending,
            icon: '⏳',
            bgColor: 'bg-lime/20',
            iconColor: 'text-lime-dark'
        },
        {
            label: 'Rating',
            value: stats.rating > 0 ? `${stats.rating}` : 'N/A',
            icon: '⭐',
            bgColor: 'bg-yellow-50',
            iconColor: 'text-yellow-600',
            footer: `${stats.reviewCount} review${stats.reviewCount !== 1 ? 's' : ''}`
        },
        {
            label: 'Completed',
            value: stats.completed,
            icon: '✅',
            bgColor: 'bg-lime/20',
            iconColor: 'text-lime-dark'
        }
    ] : [];

    const getApprovalBadge = () => {
        if (!stats) return null;

        const statusConfig = {
            approved: {
                bg: 'bg-lime/30',
                text: 'text-navy-950',
                label: '✓ Approved'
            },
            pending: {
                bg: 'bg-yellow-100',
                text: 'text-yellow-800',
                label: '⏳ Pending Approval'
            },
            rejected: {
                bg: 'bg-red-100',
                text: 'text-red-800',
                label: '✕ Rejected'
            }
        };

        const config = statusConfig[stats.approvalStatus] || statusConfig.pending;

        return (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
                {config.label}
            </span>
        );
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'sessions':
                return <SessionsPage />;

            case 'students':
                return (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                            <h2 className="text-xl font-bold text-navy-950 mb-6 pb-4 border-b border-gray-200">My Students</h2>
                            <MyCurrentStudents />
                        </div>
                    </div>
                );

            case 'resources':
                return (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                            <h2 className="text-xl font-bold text-navy-950 mb-6 pb-4 border-b border-gray-200">My Materials</h2>
                            <StudyMaterials />
                        </div>
                    </div>
                );

            case 'progress': {
                const studentId = searchParams.get('studentId');
                if (studentId) {
                    return (
                        <div className="space-y-6">
                            <ProgressAnalytics />
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <h2 className="text-lg font-bold text-navy-950 mb-1">Session Progress Log</h2>
                                <p className="text-sm text-gray-500 mb-5">All session summaries, topics, and homework for this student</p>
                                <WeeklyProgressReport preselectedStudentId={studentId} />
                            </div>
                        </div>
                    );
                }
                return (
                    <div className="space-y-6">
                        <TutorProgressDashboard />
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <LearningGoals role="tutor" />
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h2 className="text-lg font-bold text-navy-950 mb-1">Session Progress Log</h2>
                            <p className="text-sm text-gray-500 mb-5">Session-by-session summaries and student progress across all students</p>
                            <WeeklyProgressReport />
                        </div>
                    </div>
                );
            }

            case 'schedule':
                return (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                            <h2 className="text-xl font-bold text-navy-950 mb-1">Weekly Schedule</h2>
                            <p className="text-sm text-gray-500 mb-6">Set your available teaching slots so students can see when you're free.</p>
                            <WeeklySchedulePlanner />
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <AvailabilityManager />
                        </div>
                    </div>
                );

            case 'history':
                return (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                            <h2 className="text-xl font-bold text-navy-950 mb-1">Class History & Earnings</h2>
                            <p className="text-sm text-gray-500 mb-6">Track your sessions and estimated income over time.</p>
                            <ClassHistoryTracker />
                        </div>
                    </div>
                );

            case 'earnings':
                return (
                    <div className="space-y-8">
                        <EarningsDashboard />
                        <IncentiveDashboard />
                    </div>
                );

            case 'messages':
                return (
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-lg font-bold text-navy-950">Messages</h2>
                            <p className="text-sm text-gray-500 mt-0.5">Chat with your students</p>
                        </div>
                        <MessagingPanel />
                    </div>
                );

            case 'safety':
                return <SafetyPanel role="tutor" />;

            case 'profile':
                return (
                    <div className="space-y-6">
                        <TutorCredibilityPanel />
                        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                            <h2 className="text-xl font-bold text-navy-950 mb-6 pb-4 border-b border-gray-200">Edit Profile</h2>
                            <TutorProfileForm />
                        </div>
                        <TutorProgressDashboard />
                    </div>
                );

            case 'dashboard':
            default:
                return (
                    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
                        {/* Welcome Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-gray-200 animate-fade-in-up">
                            <div>
                                <h1 className="text-4xl font-bold text-navy-950 tracking-tight mb-2">
                                    Welcome back, {user?.name?.split(' ')[0]}
                                </h1>
                                <p className="text-gray-600 text-base">
                                    {stats?.approved > 0 
                                        ? `You have ${stats.approved} upcoming session${stats.approved !== 1 ? 's' : ''} scheduled.`
                                        : stats?.studentsCount > 0
                                        ? `You have ${stats.studentsCount} student${stats.studentsCount !== 1 ? 's' : ''} matched with you.`
                                        : 'Get started by connecting with students.'}
                                </p>
                            </div>
                            {getApprovalBadge()}
                        </div>

                        {/* Notifications bar - visible in main content */}
                        {unreadCount > 0 && (
                            <div className="flex items-center justify-between gap-4 py-3 px-4 bg-royal/5 border border-royal/20 rounded-lg">
                                <p className="text-sm font-medium text-navy-950">
                                    You have {unreadCount} new notification{unreadCount !== 1 ? 's' : ''}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setNotificationsOpen(true)}
                                    className="text-sm font-semibold text-royal hover:text-navy-900"
                                >
                                    View →
                                </button>
                            </div>
                        )}

                        {/* Status Alert */}
                        {stats && stats.approvalStatus === 'pending' && (
                            <div className="bg-lime/20 border-l-4 border-amber-500 p-5 rounded-r-lg">
                                <p className="text-sm font-semibold text-navy-950 mb-1">Your Profile is Being Reviewed</p>
                                <p className="text-sm text-gray-700">
                                    An admin is reviewing your profile. You'll be able to teach students once it's approved.
                                </p>
                            </div>
                        )}

                        {/* Requests Hub */}
                        <RequestsHub onNavigateToSessions={() => handleTabChange('sessions')} />

                        {/* Quick Action Cards - Business Focused */}
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="bg-white p-6 rounded-lg border border-gray-200 animate-pulse">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="h-12 w-12 bg-gray-200 rounded-md"></div>
                                            <div className="h-4 w-16 bg-gray-200 rounded"></div>
                                        </div>
                                        <div className="h-10 w-20 bg-gray-200 rounded mb-2"></div>
                                        <div className="h-4 w-32 bg-gray-200 rounded"></div>
                                    </div>
                                ))}
                            </div>
                        ) : stats && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                                {dashboardStats.map((stat, index) => (
                                    <div 
                                        key={index} 
                                        className="bg-white p-6 rounded-lg border border-gray-200 hover:border-royal/40 hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-[1.02] animate-fade-in-up"
                                        style={{ animationDelay: `${index * 100}ms` }}
                                        onClick={() => {
                                            if (stat.label === 'Pending Requests' && stats.pending > 0) {
                                                document.getElementById('booking-requests')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                            }
                                        }}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`p-3 rounded-md ${stat.bgColor} transition-transform duration-300 hover:scale-110`}>
                                                <span className={`text-xl ${stat.iconColor}`}>{stat.icon}</span>
                                            </div>
                                            {stat.footer && <span className="text-xs text-gray-500 font-medium">{stat.footer}</span>}
                                        </div>
                                        <div>
                                            <p className="text-4xl font-bold text-navy-950 mb-2 leading-none transition-all duration-300">{stat.value}</p>
                                            <p className="text-sm font-medium text-gray-700">{stat.label}</p>
                                            {stat.label === 'Pending Requests' && stats.pending > 0 && (
                                                <p className="text-xs text-royal mt-3 font-medium">Review below ↓</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Book a Session - Calendar Access */}
                        {currentStudents.length > 0 && (
                            <div className="bg-white border-l-4 border-royal rounded-lg p-6 shadow-sm animate-fade-in-up">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-navy-950 mb-1">Book a Session</h3>
                                        <p className="text-sm text-gray-600">Schedule a new session with your students using the calendar</p>
                                    </div>
                                    <button
                                        onClick={() => handleTabChange('sessions')}
                                        className="px-6 py-3 bg-royal text-white rounded-md text-sm font-semibold hover:bg-royal-dark transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
                                    >
                                        Open Calendar →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Matched Students - Book First Session */}
                        {currentStudents.length > 0 && (
                            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm animate-fade-in-up">
                                <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-200">
                                    <div>
                                        <h3 className="text-lg font-bold text-navy-950 mb-1">Your Matched Students</h3>
                                        <p className="text-sm text-gray-600">You have {currentStudents.length} student{currentStudents.length !== 1 ? 's' : ''} ready to learn with you</p>
                                    </div>
                                    <button
                                        onClick={() => handleTabChange('students')}
                                        className="px-4 py-2 bg-white text-gray-700 rounded-md text-sm font-semibold border border-gray-300 hover:bg-gray-50 transition-all duration-200 transform hover:scale-105 active:scale-95"
                                    >
                                        View All →
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    {currentStudents.slice(0, 2).map((student) => {
                                        const hasNoSessions = student.totalSessionsBooked === 0;
                                        return (
                                            <div key={student._id} className="bg-white rounded-lg p-4 border border-royal/30">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <p className="font-bold text-navy-950 text-lg">{student.studentId?.name}</p>
                                                        <p className="text-sm text-gray-600 mt-1">📚 {student.subject}</p>
                                                        {student.classGrade && (
                                                            <p className="text-xs text-gray-500 mt-1">Class: {student.classGrade}</p>
                                                        )}
                                                    </div>
                                                    {hasNoSessions && (
                                                        <span className="text-xs bg-lime/30 text-navy-950 px-2 py-1 rounded-full font-medium">New Match!</span>
                                                    )}
                                                </div>
                                                {hasNoSessions ? (
                                                    <div className="bg-lime/20 border border-lime/40 rounded-lg p-3">
                                                        <p className="text-sm font-semibold text-green-900 mb-2">🎉 Ready to Start!</p>
                                                        <p className="text-xs text-navy-950 mb-3">Book your first session with {student.studentId?.name?.split(' ')[0]} to begin teaching.</p>
                                                        <button
                                                            onClick={() => handleTabChange('sessions')}
                                                            className="w-full px-3 py-2 bg-lime text-navy-950 rounded-md text-sm font-semibold hover:bg-lime-light transition-colors"
                                                        >
                                                            📅 Book First Session
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-gray-600">Sessions: {student.totalSessionsBooked}</span>
                                                        <button
                                                            onClick={() => handleTabChange('sessions')}
                                                            className="text-royal hover:text-royal-dark font-semibold"
                                                        >
                                                            Manage →
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                {currentStudents.length > 2 && (
                                    <p className="text-sm text-gray-600 text-center">
                                        + {currentStudents.length - 2} more student{currentStudents.length - 2 !== 1 ? 's' : ''}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* No Students Yet - Helpful Guide */}
                        {!loading && currentStudents.length === 0 && stats?.approvalStatus === 'approved' && (
                            <div className="bg-gradient-to-br from-royal/5 to-royal/10 border-2 border-royal/20 rounded-xl p-8 text-center">
                                <div className="max-w-md mx-auto">
                                    <div className="text-6xl mb-4">🎓</div>
                                    <h3 className="text-xl font-bold text-navy-950 mb-2">Ready to Teach?</h3>
                                    <p className="text-gray-600 mb-6">
                                        Students are looking for great tutors like you! Make sure your profile is complete and engaging to attract students.
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                        <button
                                            onClick={() => handleTabChange('profile')}
                                            className="px-6 py-3 bg-royal text-white rounded-lg font-semibold hover:bg-royal-dark transition-colors shadow-md"
                                        >
                                            ✏️ Complete Your Profile
                                        </button>
                                        <button
                                            onClick={() => navigate('/find-tutors')}
                                            className="px-6 py-3 bg-white text-royal border-2 border-royal rounded-lg font-semibold hover:bg-royal/5 transition-colors"
                                        >
                                            🔍 See How It Works
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Upcoming Sessions - Quick View */}
                        {upcomingBookings.length > 0 && (
                            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-200">
                                    <h3 className="text-base font-bold text-navy-950">
                                        Your Next Sessions
                                    </h3>
                                    <button
                                        onClick={() => handleTabChange('sessions')}
                                        className="text-sm text-gray-600 hover:text-navy-950 font-medium"
                                    >
                                        View All →
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {upcomingBookings.slice(0, 3).map((booking) => (
                                        <div key={booking._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-royal/10 rounded-lg">
                                                    <span className="text-royal font-bold">
                                                        {booking.sessionDate ? new Date(booking.sessionDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'TBD'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-navy-950">{booking.studentId?.name || 'Student'}</p>
                                                    <p className="text-sm text-gray-600">{booking.subject} • {booking.preferredSchedule}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleTabChange('sessions')}
                                                className="text-sm text-royal hover:text-royal-dark font-semibold"
                                            >
                                                View Details →
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Helpful Tips for Young Students */}
                        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                            <h3 className="text-base font-bold text-navy-950 mb-5 pb-4 border-b border-gray-200">
                                Quick Tips for Success
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-royal/5 rounded-lg border border-royal/20">
                                    <div className="text-2xl mb-2">✅</div>
                                    <p className="font-semibold text-navy-950 text-sm mb-1">Respond Quickly</p>
                                    <p className="text-xs text-gray-600">When students request sessions, approve or respond within 24 hours. This helps you get more students!</p>
                                </div>
                                <div className="p-4 bg-lime/20 rounded-lg border border-green-100">
                                    <div className="text-2xl mb-2">⭐</div>
                                    <p className="font-semibold text-navy-950 text-sm mb-1">Get Great Reviews</p>
                                    <p className="text-xs text-gray-600">After each session, ask students for feedback. Good reviews help more students find you!</p>
                                </div>
                                <div className="p-4 bg-royal/10 rounded-lg border border-purple-100">
                                    <div className="text-2xl mb-2">📚</div>
                                    <p className="font-semibold text-navy-950 text-sm mb-1">Share Materials</p>
                                    <p className="text-xs text-gray-600">Upload study materials and homework. This helps students learn better and makes you stand out!</p>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Sections */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Recent Student Progress */}
                            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                                    <h3 className="text-base font-bold text-navy-950">
                                        Student Progress
                                    </h3>
                                    <button
                                        onClick={() => handleTabChange('students')}
                                        className="text-sm text-gray-600 hover:text-navy-950 font-medium"
                                    >
                                        View All →
                                    </button>
                                </div>
                                <div className="min-h-[200px]">
                                    {currentStudents.length > 0 ? (
                                        <ProgressReports />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                                            <span className="text-4xl mb-2">📈</span>
                                            <p className="text-sm">Progress reports will appear here</p>
                                            <p className="text-xs mt-1">Start teaching to see student progress!</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm animate-fade-in-up">
                                <h3 className="text-base font-bold text-navy-950 mb-6 pb-4 border-b border-gray-200">
                                    Quick Actions
                                </h3>
                                <div className="space-y-3">
                                    <button
                                        onClick={() => handleTabChange('sessions')}
                                        className="w-full p-4 bg-royal/5 hover:bg-royal/10 rounded-lg border border-royal/30 text-left transition-all duration-200 transform hover:scale-[1.02] hover:shadow-sm"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-navy-950">Book a Session</p>
                                                <p className="text-xs text-gray-600 mt-1">Use calendar to schedule sessions with students</p>
                                            </div>
                                            <span className="text-royal transition-transform duration-200 group-hover:translate-x-1">→</span>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => handleTabChange('sessions')}
                                        className="w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 text-left transition-all duration-200 transform hover:scale-[1.02] hover:shadow-sm"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-navy-950">Manage Sessions</p>
                                                <p className="text-xs text-gray-600 mt-1">View and manage all your sessions</p>
                                            </div>
                                            <span className="text-gray-600 transition-transform duration-200 group-hover:translate-x-1">→</span>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => handleTabChange('students')}
                                        className="w-full p-4 bg-lime/20 hover:bg-lime/30 rounded-lg border border-lime/40 text-left transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-navy-950">👨‍🎓 My Students</p>
                                                <p className="text-xs text-gray-600 mt-1">See all your students and their progress</p>
                                            </div>
                                            <span className="text-lime-dark">→</span>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => handleTabChange('resources')}
                                        className="w-full p-4 bg-royal/10 hover:bg-purple-100 rounded-lg border border-royal/20 text-left transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-navy-950">📚 Study Materials</p>
                                                <p className="text-xs text-gray-600 mt-1">Share materials with your students</p>
                                            </div>
                                            <span className="text-navy-900">→</span>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => handleTabChange('schedule')}
                                        className="w-full p-4 bg-royal/5 hover:bg-royal/10 rounded-lg border border-royal/20 text-left transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-navy-950">🗓️ Weekly Schedule</p>
                                                <p className="text-xs text-gray-600 mt-1">Set your available teaching slots</p>
                                            </div>
                                            <span className="text-royal">→</span>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => handleTabChange('history')}
                                        className="w-full p-4 bg-lime/20 hover:bg-lime/30 rounded-lg border border-lime/40 text-left transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-navy-950">💰 Class History & Earnings</p>
                                                <p className="text-xs text-gray-600 mt-1">Track sessions and estimated income</p>
                                            </div>
                                            <span className="text-lime-dark">→</span>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => handleTabChange('profile')}
                                        className="w-full p-4 bg-lime/20 hover:bg-lime/30 rounded-lg border border-lime/40 text-left transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-navy-950">✏️ Profile & Credibility</p>
                                                <p className="text-xs text-gray-600 mt-1">Update profile and track your credibility score</p>
                                            </div>
                                            <span className="text-lime-dark">→</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="h-full bg-gray-50 flex overflow-hidden font-sans">
            <Sidebar
                user={user}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto">
                <main className="px-4 sm:px-6 lg:px-8 py-6 min-h-full">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default TutorDashboard;

