import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

// Components
import Sidebar from '../components/Sidebar';
import SessionsPage from './SessionsPage';
import DashboardStats from '../components/DashboardStats';
import MyCurrentTutors from '../components/MyCurrentTutors';
import FavoriteTutors from '../components/FavoriteTutors';
import StudyMaterials from '../components/StudyMaterials';
import ReviewList from '../components/ReviewList';
import AttendanceTracker from '../components/AttendanceTracker';
import ProgressAnalytics from '../components/ProgressAnalytics';
import ProgressReports from '../components/ProgressReports';
import StudentProgressDashboard from '../components/StudentProgressDashboard';
import MessagingPanel from '../components/MessagingPanel';
import WeeklyProgressReport from '../components/WeeklyProgressReport';
import FeeTransparency from '../components/FeeTransparency';
import ParentFeedbackPanel from '../components/ParentFeedbackPanel';
import StudentProfileForm from '../components/StudentProfileForm';
import SafetyPanel from '../components/SafetyPanel';
import RecommendedTutors from '../components/RecommendedTutors';
import LearningGoals from '../components/LearningGoals';
import RequestsHub from '../components/RequestsHub';
import LoadingSkeleton from '../components/LoadingSkeleton';
import LoadingSpinner from '../components/LoadingSpinner';

const StudentDashboard = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'dashboard');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentTutors, setCurrentTutors] = useState([]);
    const [upcomingBookings, setUpcomingBookings] = useState([]);
    const [pendingBookings, setPendingBookings] = useState([]);
    const [attendanceSummary, setAttendanceSummary] = useState(null);
    const [unverifiedAttendanceCount, setUnverifiedAttendanceCount] = useState(0);
    const [learningTimeMinutes, setLearningTimeMinutes] = useState(0);
    const [pendingTutorChangeBookings, setPendingTutorChangeBookings] = useState([]);
    const [lastCompletedBooking, setLastCompletedBooking] = useState(null);
    const { user } = useAuth();

    // Sync activeTab with URL search params
    useEffect(() => {
        const tabFromUrl = searchParams.get('tab') || 'dashboard';
        if (tabFromUrl !== activeTab) {
            setActiveTab(tabFromUrl);
        }
    }, [searchParams, activeTab]);

    useEffect(() => {
        if (activeTab === 'dashboard') {
            fetchStats();
        }
    }, [activeTab]);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set('tab', tabId);

        // Clean up unneeded params when switching top-level tabs
        if (!['tutors', 'resources'].includes(tabId)) {
            newSearchParams.delete('tutorId');
            newSearchParams.delete('currentTutorId');
        }

        navigate(`/student-dashboard?${newSearchParams.toString()}`, { replace: true });
    };

    const fetchStats = async () => {
        try {
            setLoading(true);
            const [bookingsRes, tutorsRes, attendanceStatsRes, attendanceListRes] = await Promise.all([
                api.get('/bookings/mine'),
                api.get('/current-tutors/student/my-tutors').catch(() => ({ data: [] })),
                api.get('/attendance/stats').catch(() => ({ data: null })),
                api.get('/attendance').catch(() => ({ data: [] }))
            ]);

            const bookings = bookingsRes.data;
            const tutors = tutorsRes.data;
            const attendanceStats = attendanceStatsRes.data;
            const attendanceList = attendanceListRes.data || [];

            setCurrentTutors(tutors);
            setAttendanceSummary(attendanceStats);

            const unverifiedCount = attendanceList.filter(
                a => !a.parentVerificationStatus || a.parentVerificationStatus === 'unverified'
            ).length;
            const totalMinutes = attendanceList.reduce((sum, a) => sum + (a.duration || 60), 0);
            setUnverifiedAttendanceCount(unverifiedCount);
            setLearningTimeMinutes(totalMinutes);

            const pendingChange = bookings.filter(b => b.tutorChangeRequest?.status === 'pending');
            setPendingTutorChangeBookings(pendingChange);

            const completed = bookings.filter(b => b.status === 'completed');
            const lastCompleted = completed.length
                ? completed.sort((a, b) => new Date(b.sessionDate || 0) - new Date(a.sessionDate || 0))[0]
                : null;
            setLastCompletedBooking(lastCompleted);

            const pending = bookings.filter(b => b.status === 'pending');
            const approved = bookings.filter(b => b.status === 'approved');
            const upcoming = approved.filter(b => {
                if (!b.sessionDate) return false;
                const sessionDate = new Date(b.sessionDate);
                return sessionDate >= new Date();
            });

            setPendingBookings(pending);
            setUpcomingBookings(upcoming);

            const totalBookings = bookings.length;
            const completedBookings = completed.length;
            setStats({
                total: totalBookings,
                pending: pending.length,
                approved: approved.length,
                completed: completedBookings,
                tutorsCount: tutors.length
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'sessions':
                return <SessionsPage />;

            case 'tutors':
                return (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900 mb-6">My Learning Network</h2>
                            <MyCurrentTutors />
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900 mb-1">Fee Transparency</h2>
                            <p className="text-sm text-gray-500 mb-5">Track session costs and payment status across all your tutors</p>
                            <FeeTransparency />
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900 mb-1">Share Feedback</h2>
                            <p className="text-sm text-gray-500 mb-5">Rate your experience and request changes if needed</p>
                            <ParentFeedbackPanel currentTutors={currentTutors} />
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900 mb-6">Favorite Tutors</h2>
                            <FavoriteTutors />
                        </div>
                    </div>
                );

            case 'messages':
                return (
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Messages</h2>
                            <p className="text-sm text-gray-500 mt-0.5">Chat with your tutors</p>
                        </div>
                        <MessagingPanel />
                    </div>
                );

            case 'resources':
                return (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-200">Study Materials</h2>
                            <StudyMaterials />
                        </div>
                    </div>
                );

            case 'progress': {
                const tutorId = searchParams.get('tutorId');
                if (tutorId) {
                    return <ProgressAnalytics />;
                }
                return (
                    <div className="space-y-6">
                        <StudentProgressDashboard />
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <LearningGoals role="student" />
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h2 className="text-lg font-bold text-gray-900 mb-1">Session-by-Session Progress Log</h2>
                            <p className="text-sm text-gray-500 mb-5">Detailed notes, topics covered, and homework from each class</p>
                            <WeeklyProgressReport />
                        </div>
                    </div>
                );
            }

            case 'profile':
                return (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h2 className="text-xl font-bold text-gray-900 mb-1">My Profile</h2>
                            <p className="text-sm text-gray-500 mb-6">Update your personal information and learning details</p>
                            <StudentProfileForm />
                        </div>
                    </div>
                );

            case 'safety':
                return <SafetyPanel role="student" />;

            case 'dashboard':
            default: {
                const sortedUpcoming = [...(upcomingBookings || [])].sort(
                    (a, b) => new Date(a.sessionDate || 0) - new Date(b.sessionDate || 0)
                );
                const nextClass = sortedUpcoming[0];
                const getNextSessionForTutor = (tutorId) => {
                    const match = sortedUpcoming.find(b => b.tutorId?._id === tutorId || b.tutorId === tutorId);
                    return match ? new Date(match.sessionDate) : null;
                };
                const attendancePct = attendanceSummary?.attendancePercentage ?? 0;
                const presentCount = attendanceSummary?.present ?? 0;
                const streakLabel = presentCount >= 3 ? `${Math.min(presentCount, 7)} session${presentCount !== 1 ? 's' : ''} attended` : presentCount > 0 ? 'Getting started' : 'Start your streak';

                return (
                    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
                        {/* ——— 1. HERO: Welcome + Next Class ——— */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            <div className="lg:col-span-5 flex flex-col justify-center">
                                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">Learning command center</p>
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-2">
                                    Welcome back, {user?.name?.split(' ')[0]}
                                </h1>
                                <p className="text-gray-600 text-sm mb-2">
                                    {stats?.approved > 0
                                        ? `${stats.approved} class${stats.approved !== 1 ? 'es' : ''} coming up.`
                                        : currentTutors.length > 0
                                        ? `Learning with ${currentTutors.length} tutor${currentTutors.length !== 1 ? 's' : ''}.`
                                        : 'Find your perfect tutor and start learning.'}
                                </p>
                                {learningTimeMinutes > 0 && (
                                    <p className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md w-fit">
                                        Learning time: {learningTimeMinutes < 60 ? `${learningTimeMinutes} min` : `${(learningTimeMinutes / 60).toFixed(1)} hrs`} total
                                    </p>
                                )}
                            </div>
                            <div className="lg:col-span-7">
                                {nextClass ? (
                                    <div className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-indigo-500 shadow-sm hover:shadow-md transition-shadow duration-200 p-6">
                                        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-3">Next class</p>
                                        <p className="text-xl font-bold text-gray-900 mb-1">{nextClass.tutorId?.name || 'Your tutor'}</p>
                                        <p className="text-gray-600 mb-3">{nextClass.subject}</p>
                                        <p className="text-sm text-gray-500 mb-4">
                                            {nextClass.sessionDate
                                                ? new Date(nextClass.sessionDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                                                : 'Date TBD'}
                                            {nextClass.preferredSchedule ? ` · ${nextClass.preferredSchedule}` : ''}
                                        </p>
                                        <button
                                            onClick={() => handleTabChange('sessions')}
                                            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
                                        >
                                            View / Join
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center">
                                        <p className="text-gray-500 text-sm mb-3">No upcoming class scheduled</p>
                                        {currentTutors.length > 0 ? (
                                            <button
                                                onClick={() => handleTabChange('sessions')}
                                                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
                                            >
                                                Book a session
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => navigate('/find-tutors')}
                                                className="px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors"
                                            >
                                                Find a tutor
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ——— 2. ACTION REQUIRED ——— */}
                        {(pendingBookings.length > 0 || unverifiedAttendanceCount > 0 || pendingTutorChangeBookings.length > 0) && (
                            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-5 shadow-sm hover:shadow transition-shadow">
                                <h3 className="text-base font-bold text-gray-900 mb-3">Action required</h3>
                                <p className="text-sm text-gray-600 mb-4">Items that need your attention</p>
                                <div className="space-y-2">
                                    {pendingBookings.length > 0 && (
                                        <div className="flex items-center justify-between py-2 px-3 bg-white/80 rounded-lg border border-amber-100">
                                            <span className="text-sm text-gray-800">{pendingBookings.length} class request{pendingBookings.length !== 1 ? 's' : ''} pending tutor approval</span>
                                            <button onClick={() => handleTabChange('sessions')} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Check status →</button>
                                        </div>
                                    )}
                                    {unverifiedAttendanceCount > 0 && (
                                        <div className="flex items-center justify-between py-2 px-3 bg-white/80 rounded-lg border border-amber-100">
                                            <span className="text-sm text-gray-800">{unverifiedAttendanceCount} session{unverifiedAttendanceCount !== 1 ? 's' : ''} need your verification</span>
                                            <button onClick={() => handleTabChange('sessions')} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Verify now →</button>
                                        </div>
                                    )}
                                    {pendingTutorChangeBookings.length > 0 && (
                                        <div className="flex items-center justify-between py-2 px-3 bg-white/80 rounded-lg border border-amber-100">
                                            <span className="text-sm text-gray-800">{pendingTutorChangeBookings.length} reschedule/schedule change{pendingTutorChangeBookings.length !== 1 ? 's' : ''} need your approval</span>
                                            <button onClick={() => handleTabChange('sessions')} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">Review →</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ——— 2b. REQUESTS HUB ——— */}
                        <RequestsHub onNavigateToSessions={() => handleTabChange('sessions')} />

                        {/* ——— 3. ATTENDANCE OVERVIEW ——— */}
                        {attendanceSummary && (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-6">
                                <h3 className="text-base font-bold text-gray-900 mb-4">Attendance overview</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <p className="text-4xl font-bold text-gray-900">{attendancePct}%</p>
                                            <p className="text-sm text-gray-500 mt-1">Overall</p>
                                        </div>
                                        <span
                                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                                attendancePct >= 90 ? 'bg-green-100 text-green-800' : attendancePct >= 75 ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                                            }`}
                                        >
                                            {attendancePct >= 90 ? 'On track' : attendancePct >= 75 ? 'Good progress' : 'Keep going'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <p className="text-sm font-medium text-gray-700 mb-1">Current streak</p>
                                        <p className="text-lg font-semibold text-indigo-600">{streakLabel}</p>
                                    </div>
                                    <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4 min-h-[80px] flex items-center justify-center">
                                        <p className="text-xs text-gray-500 text-center">Trend graph placeholder</p>
                                    </div>
                                </div>
                                <p className="mt-4 text-sm text-gray-600 border-t border-gray-100 pt-4">
                                    {attendancePct >= 90
                                        ? 'You’re doing great — keep attending to build a strong learning habit.'
                                        : attendancePct >= 75
                                        ? 'You’re on the right track. A few more sessions will boost your consistency.'
                                        : 'Every class counts. Schedule your next session and keep the momentum going.'}
                                </p>
                                <div className="mt-4 flex flex-wrap gap-4 text-sm">
                                    <span className="text-gray-500">Completed: <strong className="text-green-600">{attendanceSummary.present ?? 0}</strong></span>
                                    <span className="text-gray-500">Missed: <strong className="text-red-600">{attendanceSummary.absent ?? 0}</strong></span>
                                    <span className="text-gray-500">Upcoming: <strong className="text-indigo-600">{upcomingBookings.length}</strong></span>
                                </div>
                            </div>
                        )}

                        {/* ——— 4. YOUR TUTORS (interactive cards) ——— */}
                        {!loading && currentTutors.length === 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center">
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Ready to start learning?</h3>
                                <p className="text-gray-600 text-sm mb-6 max-w-md mx-auto">Find tutors, read reviews, and book your first class.</p>
                                <button
                                    onClick={() => navigate('/find-tutors')}
                                    className="px-6 py-3 bg-gray-900 text-white rounded-lg font-semibold text-sm hover:bg-gray-800 transition-colors"
                                >
                                    Find tutors
                                </button>
                            </div>
                        )}

                        {currentTutors.length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-6">
                                <div className="flex items-center justify-between mb-5">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">Your tutors</h3>
                                        <p className="text-sm text-gray-500 mt-0.5">{currentTutors.length} tutor{currentTutors.length !== 1 ? 's' : ''} in your learning network</p>
                                    </div>
                                    <button
                                        onClick={() => handleTabChange('tutors')}
                                        className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                    >
                                        View all →
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {currentTutors.slice(0, 6).map((tutor) => {
                                        const hasNoSessions = tutor.totalSessionsBooked === 0;
                                        const nextSessionDate = getNextSessionForTutor(tutor.tutorId?._id);
                                        const performancePct = tutor.totalSessionsBooked > 0
                                            ? Math.round((tutor.sessionsCompleted ?? 0) / tutor.totalSessionsBooked * 100)
                                            : null;
                                        return (
                                            <div
                                                key={tutor._id}
                                                className="rounded-xl border border-gray-200 p-4 bg-gray-50/30 hover:bg-gray-50/60 hover:shadow-md hover:border-gray-300 transition-all duration-200"
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <p className="font-bold text-gray-900">{tutor.tutorId?.name}</p>
                                                        <p className="text-sm text-gray-600">{tutor.subject}</p>
                                                        {tutor.classGrade && <p className="text-xs text-gray-500">Grade {tutor.classGrade}</p>}
                                                    </div>
                                                    {performancePct !== null && (
                                                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                                            performancePct >= 80 ? 'bg-green-100 text-green-800' : performancePct >= 50 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
                                                        }`}>
                                                            {performancePct}% sessions
                                                        </span>
                                                    )}
                                                    {hasNoSessions && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">New</span>}
                                                </div>
                                                {nextSessionDate && (
                                                    <p className="text-xs text-gray-600 mb-2">Next: {nextSessionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                                )}
                                                <p className="text-xs text-gray-500 mb-3 line-clamp-2">Last session: {hasNoSessions ? 'No session yet' : 'View progress for summary'}</p>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleTabChange('messages')}
                                                        className="flex-1 py-2 px-3 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                                    >
                                                        Message
                                                    </button>
                                                    <button
                                                        onClick={() => handleTabChange('sessions')}
                                                        className="flex-1 py-2 px-3 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                                                    >
                                                        {hasNoSessions ? 'Book first class' : 'View classes'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {currentTutors.length > 6 && (
                                    <p className="text-sm text-gray-500 text-center mt-4">+ {currentTutors.length - 6} more</p>
                                )}
                            </div>
                        )}

                        {/* ——— 5. YOUR LEARNING INSIGHTS ——— */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-6">
                            <h3 className="text-base font-bold text-gray-900 mb-4">Your learning insights</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 rounded-lg border border-gray-100 bg-gray-50/50">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Assignments pending</p>
                                    <p className="text-lg font-bold text-gray-900">—</p>
                                    <p className="text-xs text-gray-500 mt-1">Coming soon</p>
                                </div>
                                <div className="p-4 rounded-lg border border-gray-100 bg-gray-50/50">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Improvement trends</p>
                                    <p className="text-lg font-bold text-gray-900">—</p>
                                    <p className="text-xs text-gray-500 mt-1">Coming soon</p>
                                </div>
                                <div className="p-4 rounded-lg border border-gray-100 bg-gray-50/50">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Class consistency</p>
                                    <p className="text-lg font-bold text-gray-900">{attendanceSummary ? `${attendanceSummary.attendancePercentage ?? 0}%` : '—'}</p>
                                    <p className="text-xs text-gray-500 mt-1">From attendance</p>
                                </div>
                            </div>
                        </div>

                        {/* ——— 5b. RECENT ACTIVITY ——— */}
                        {(() => {
                            const activities = [];
                            if (nextClass) {
                                activities.push({
                                    key: 'next',
                                    label: 'Upcoming',
                                    text: `Class with ${nextClass.tutorId?.name || 'tutor'} – ${nextClass.sessionDate ? new Date(nextClass.sessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'}`,
                                    cta: () => handleTabChange('sessions')
                                });
                            }
                            if (pendingTutorChangeBookings.length > 0) {
                                activities.push({
                                    key: 'tutor-change',
                                    label: 'Action needed',
                                    text: `${pendingTutorChangeBookings.length} reschedule/schedule change${pendingTutorChangeBookings.length !== 1 ? 's' : ''} need your approval`,
                                    cta: () => handleTabChange('sessions')
                                });
                            }
                            if (unverifiedAttendanceCount > 0) {
                                activities.push({
                                    key: 'verify',
                                    label: 'Verify',
                                    text: `${unverifiedAttendanceCount} session${unverifiedAttendanceCount !== 1 ? 's' : ''} need your confirmation`,
                                    cta: () => handleTabChange('sessions')
                                });
                            }
                            if (pendingBookings.length > 0) {
                                activities.push({
                                    key: 'pending',
                                    label: 'Waiting',
                                    text: `${pendingBookings.length} class request${pendingBookings.length !== 1 ? 's' : ''} with tutor`,
                                    cta: () => handleTabChange('sessions')
                                });
                            }
                            if (lastCompletedBooking) {
                                activities.push({
                                    key: 'last',
                                    label: 'Completed',
                                    text: `Class with ${lastCompletedBooking.tutorId?.name || 'tutor'} – ${lastCompletedBooking.sessionDate ? new Date(lastCompletedBooking.sessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}`,
                                    cta: () => handleTabChange('progress')
                                });
                            }
                            if (activities.length === 0) return null;
                            return (
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-6">
                                    <h3 className="text-base font-bold text-gray-900 mb-4">Recent activity</h3>
                                    <ul className="space-y-2">
                                        {activities.slice(0, 7).map((a) => (
                                            <li key={a.key} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50/80 border border-gray-100">
                                                <div>
                                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{a.label}</span>
                                                    <p className="text-sm text-gray-800 mt-0.5">{a.text}</p>
                                                </div>
                                                <button type="button" onClick={a.cta} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 shrink-0 ml-2">View →</button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })()}

                        {/* ——— 6. QUICK ACTIONS ——— */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-6">
                            <h3 className="text-base font-bold text-gray-900 mb-4">Quick actions</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {currentTutors.length > 0 && (
                                    <button
                                        onClick={() => handleTabChange('sessions')}
                                        className="p-4 rounded-lg border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-50 hover:shadow-sm text-left transition-all duration-200"
                                    >
                                        <p className="font-semibold text-gray-900">Book a session</p>
                                        <p className="text-xs text-gray-600 mt-0.5">Schedule with your tutor</p>
                                    </button>
                                )}
                                <button
                                    onClick={() => navigate('/find-tutors')}
                                    className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:shadow-sm text-left transition-all duration-200"
                                >
                                    <p className="font-semibold text-gray-900">Find a tutor</p>
                                    <p className="text-xs text-gray-600 mt-0.5">Search and book</p>
                                </button>
                                <button
                                    onClick={() => handleTabChange('sessions')}
                                    className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:shadow-sm text-left transition-all duration-200"
                                >
                                    <p className="font-semibold text-gray-900">My classes</p>
                                    <p className="text-xs text-gray-600 mt-0.5">View all sessions</p>
                                </button>
                                <button
                                    onClick={() => handleTabChange('tutors')}
                                    className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:shadow-sm text-left transition-all duration-200"
                                >
                                    <p className="font-semibold text-gray-900">My tutors</p>
                                    <p className="text-xs text-gray-600 mt-0.5">Your learning network</p>
                                </button>
                                <button
                                    onClick={() => handleTabChange('resources')}
                                    className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:shadow-sm text-left transition-all duration-200"
                                >
                                    <p className="font-semibold text-gray-900">Study materials</p>
                                    <p className="text-xs text-gray-600 mt-0.5">From your tutors</p>
                                </button>
                            </div>
                        </div>

                        {/* Progress + Recommended — keep for continuity */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-base font-bold text-gray-900">Your progress</h3>
                                    <button onClick={() => handleTabChange('progress')} className="text-sm font-medium text-gray-600 hover:text-gray-900">View report →</button>
                                </div>
                                <div className="min-h-[180px]">
                                    {currentTutors.length > 0 ? <ProgressReports /> : (
                                        <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                                            <span className="text-3xl mb-2">📈</span>
                                            <p className="text-sm">Start learning to see progress</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="lg:col-span-1">
                                <RecommendedTutors />
                            </div>
                        </div>
                    </div>
                );
            }
        }
    };

    return (
        <div className="h-screen bg-gray-50 flex overflow-hidden font-sans">
            <Sidebar
                user={user}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto">
                <main className="px-4 sm:px-8 py-8 min-h-full">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default StudentDashboard;


