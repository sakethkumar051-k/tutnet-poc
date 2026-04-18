import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

// Components
import Sidebar from '../components/Sidebar';
import SessionsPage from './SessionsPage';
import TutorList from '../components/TutorList';
import MyCurrentTutors from '../components/MyCurrentTutors';
import FavoriteTutors from '../components/FavoriteTutors';
import StudyMaterials from '../components/StudyMaterials';
import ProgressAnalytics from '../components/ProgressAnalytics';
import StudentProgressDashboard from '../components/StudentProgressDashboard';
import MessagingPanel from '../components/MessagingPanel';
import WeeklyProgressReport from '../components/WeeklyProgressReport';
import StudentProfileForm from '../components/StudentProfileForm';
import SafetyPanel from '../components/SafetyPanel';
import LearningGoals from '../components/LearningGoals';

const StatCard = ({ label, value, hint, accent = 'royal' }) => {
    const accents = {
        royal: 'bg-royal/10 text-royal',
        lime: 'bg-lime/30 text-navy-950',
        navy: 'bg-navy-950 text-white',
    };
    return (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 hover:shadow-[0_8px_30px_-12px_rgba(30,58,138,0.15)] transition-shadow">
            <div className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${accents[accent]}`}>
                {label}
            </div>
            <p className="mt-4 text-4xl font-extrabold text-navy-950 leading-none">{value}</p>
            {hint && <p className="mt-2 text-xs text-gray-400">{hint}</p>}
        </div>
    );
};

const StudentDashboard = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'dashboard');
    const [loading, setLoading] = useState(true);
    const [currentTutors, setCurrentTutors] = useState([]);
    const [upcomingBookings, setUpcomingBookings] = useState([]);
    const [pendingBookings, setPendingBookings] = useState([]);
    const [completedCount, setCompletedCount] = useState(0);
    const user = useAuthStore((s) => s.user);

    useEffect(() => {
        const tabFromUrl = searchParams.get('tab') || 'dashboard';
        if (tabFromUrl !== activeTab) setActiveTab(tabFromUrl);
    }, [searchParams, activeTab]);

    useEffect(() => {
        if (activeTab === 'dashboard') fetchOverview();
    }, [activeTab]);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set('tab', tabId);
        if (!['tutors', 'resources'].includes(tabId)) {
            newSearchParams.delete('tutorId');
            newSearchParams.delete('currentTutorId');
        }
        navigate(`/student-dashboard?${newSearchParams.toString()}`, { replace: true });
    };

    const fetchOverview = async () => {
        try {
            setLoading(true);
            const [bookingsRes, tutorsRes] = await Promise.all([
                api.get('/bookings/mine'),
                api.get('/current-tutors/student/my-tutors').catch(() => ({ data: [] })),
            ]);
            const bookings = bookingsRes.data || [];
            setCurrentTutors(tutorsRes.data || []);
            setPendingBookings(bookings.filter((b) => b.status === 'pending'));
            setCompletedCount(bookings.filter((b) => b.status === 'completed').length);
            setUpcomingBookings(
                bookings
                    .filter((b) => b.status === 'approved' && b.sessionDate && new Date(b.sessionDate) >= new Date())
                    .sort((a, b) => new Date(a.sessionDate) - new Date(b.sessionDate))
            );
        } catch (error) {
            console.error('Error fetching overview:', error);
        } finally {
            setLoading(false);
        }
    };

    const nextClass = useMemo(() => upcomingBookings[0], [upcomingBookings]);

    const renderContent = () => {
        switch (activeTab) {
            case 'sessions':
                return <SessionsPage />;

            case 'find-tutors':
                return (
                    <div className="space-y-5">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-navy-950 tracking-tight">Find tutors</h1>
                            <p className="mt-1 text-sm text-gray-500">Browse verified tutors near you. Book a free trial or request a dedicated tutor.</p>
                        </div>
                        <TutorList />
                    </div>
                );

            case 'tutors':
                return (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-3xl border border-gray-100">
                            <h2 className="text-xl font-extrabold text-navy-950 mb-4">My Tutors</h2>
                            <MyCurrentTutors />
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-gray-100">
                            <h2 className="text-xl font-extrabold text-navy-950 mb-4">Favourites</h2>
                            <FavoriteTutors />
                        </div>
                    </div>
                );

            case 'messages':
                return (
                    <div className="space-y-4">
                        <h2 className="text-xl font-extrabold text-navy-950">Messages</h2>
                        <MessagingPanel />
                    </div>
                );

            case 'resources':
                return (
                    <div className="bg-white p-6 rounded-3xl border border-gray-100">
                        <h2 className="text-xl font-extrabold text-navy-950 mb-4">Study Materials</h2>
                        <StudyMaterials />
                    </div>
                );

            case 'progress': {
                if (searchParams.get('tutorId')) return <ProgressAnalytics />;
                return (
                    <div className="space-y-6">
                        <StudentProgressDashboard />
                        <div className="bg-white p-6 rounded-3xl border border-gray-100">
                            <LearningGoals role="student" />
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-gray-100">
                            <h2 className="text-lg font-extrabold text-navy-950 mb-4">Session Log</h2>
                            <WeeklyProgressReport />
                        </div>
                    </div>
                );
            }

            case 'profile':
                return (
                    <div className="bg-white p-6 rounded-3xl border border-gray-100">
                        <h2 className="text-xl font-extrabold text-navy-950 mb-1">My Profile</h2>
                        <p className="text-sm text-gray-500 mb-6">Update your personal information and learning details</p>
                        <StudentProfileForm />
                    </div>
                );

            case 'safety':
                return <SafetyPanel role="student" />;

            case 'dashboard':
            default: {
                const firstName = user?.name?.split(' ')[0] || 'there';
                return (
                    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
                        {/* Welcome */}
                        <div>
                            <p className="text-xs font-bold tracking-[0.2em] uppercase text-gray-400 mb-2">Dashboard</p>
                            <h1 className="text-3xl sm:text-4xl font-extrabold text-navy-950 leading-tight tracking-tight">
                                Hey {firstName} 👋
                            </h1>
                            <p className="mt-2 text-gray-500">
                                {upcomingBookings.length > 0
                                    ? `You have ${upcomingBookings.length} upcoming ${upcomingBookings.length === 1 ? 'class' : 'classes'}.`
                                    : currentTutors.length > 0
                                    ? `Learning with ${currentTutors.length} ${currentTutors.length === 1 ? 'tutor' : 'tutors'}.`
                                    : 'Let\'s find your first tutor.'}
                            </p>
                        </div>

                        {/* Next class — hero card */}
                        {nextClass ? (
                            <div className="relative overflow-hidden bg-navy-950 rounded-3xl p-8 sm:p-10 text-white">
                                <div className="absolute -top-20 -right-20 w-72 h-72 bg-royal/30 rounded-full blur-[80px] pointer-events-none" />
                                <div className="absolute -bottom-20 -left-10 w-56 h-56 bg-lime/10 rounded-full blur-[80px] pointer-events-none" />
                                <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
                                    <div>
                                        <p className="text-xs font-bold tracking-[0.2em] uppercase text-lime mb-3">Next class</p>
                                        <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                                            {nextClass.subject} with {nextClass.tutorId?.name || 'your tutor'}
                                        </h2>
                                        <p className="mt-2 text-gray-300 text-sm">
                                            {nextClass.sessionDate
                                                ? new Date(nextClass.sessionDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
                                                : 'Date TBD'}
                                            {nextClass.preferredSchedule ? ` · ${nextClass.preferredSchedule}` : ''}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleTabChange('sessions')}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-lime hover:bg-lime-light text-navy-950 text-sm font-bold rounded-full transition-colors shadow-sm"
                                    >
                                        View session
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-3xl border border-gray-100 p-8 sm:p-10 text-center">
                                <div className="w-14 h-14 mx-auto rounded-2xl bg-royal/10 flex items-center justify-center mb-4">
                                    <svg className="w-6 h-6 text-royal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-extrabold text-navy-950">No classes scheduled</h2>
                                <p className="mt-2 text-gray-500 text-sm max-w-sm mx-auto">
                                    Browse verified tutors near you and book a free trial to get started.
                                </p>
                                <button
                                    onClick={() => navigate('/find-tutors')}
                                    className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-lime hover:bg-lime-light text-navy-950 text-sm font-bold rounded-full transition-colors shadow-sm"
                                >
                                    Find a tutor
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </button>
                            </div>
                        )}

                        {/* Stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <StatCard
                                label="Upcoming"
                                value={loading ? '—' : upcomingBookings.length}
                                hint="Scheduled classes"
                                accent="royal"
                            />
                            <StatCard
                                label="Completed"
                                value={loading ? '—' : completedCount}
                                hint="Sessions done"
                                accent="lime"
                            />
                            <StatCard
                                label="Pending"
                                value={loading ? '—' : pendingBookings.length}
                                hint="Awaiting tutor"
                                accent="royal"
                            />
                            <StatCard
                                label="Tutors"
                                value={loading ? '—' : currentTutors.length}
                                hint="Active"
                                accent="royal"
                            />
                        </div>

                        {/* Action required */}
                        {pendingBookings.length > 0 && (
                            <div className="bg-lime/20 border border-lime/40 rounded-3xl p-5 flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-bold text-navy-950">
                                        {pendingBookings.length} request{pendingBookings.length !== 1 ? 's' : ''} waiting on tutor approval
                                    </p>
                                    <p className="text-xs text-navy-950/70 mt-0.5">We'll notify you as soon as they respond.</p>
                                </div>
                                <button
                                    onClick={() => handleTabChange('sessions')}
                                    className="flex-shrink-0 px-4 py-2 bg-navy-950 text-white text-xs font-bold rounded-full hover:bg-navy-900 transition-colors"
                                >
                                    View
                                </button>
                            </div>
                        )}

                        {/* My tutors — compact */}
                        <div className="bg-white rounded-3xl border border-gray-100 p-6">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-lg font-extrabold text-navy-950">My tutors</h3>
                                <button
                                    onClick={() => handleTabChange('tutors')}
                                    className="text-xs font-bold text-royal hover:text-navy-950 transition-colors"
                                >
                                    Manage →
                                </button>
                            </div>
                            {currentTutors.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {currentTutors.slice(0, 4).map((t) => {
                                        const name = t.tutorId?.name || t.tutorName || 'Tutor';
                                        const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
                                        return (
                                            <div key={t._id} className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-navy-950 to-royal flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                                    {initials}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-navy-950 truncate">{name}</p>
                                                    <p className="text-xs text-gray-500 truncate">{t.subject || 'Multiple subjects'}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400 text-center py-6">You don't have any active tutors yet.</p>
                            )}
                        </div>
                    </div>
                );
            }
        }
    };

    return (
        <div className="h-full bg-[#f7f7f7] flex overflow-hidden font-sans">
            <Sidebar
                user={user}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />

            <div className="flex-1 overflow-y-auto">
                <main className="px-4 sm:px-6 lg:px-10 py-8 min-h-full">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default StudentDashboard;
