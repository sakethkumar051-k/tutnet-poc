import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { checkTutorProfileComplete } from '../utils/profileUtils';
import { useMyBookings } from '../context/MyBookingsContext';

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
import TutorTierCard from '../components/TutorTierCard';
import LearningGoals from '../components/LearningGoals';
import TutorVacationCard from '../components/TutorVacationCard';
import TutorPayoutsPanel from '../components/TutorPayoutsPanel';
import CalendarExportButton from '../components/CalendarExportButton';
import ReferralCard from '../components/ReferralCard';
import QualificationUploader from '../components/QualificationUploader';
import TutorOverviewHero from '../components/TutorOverviewHero';
import TutorRateBandsCard from '../components/TutorRateBandsCard';
import TutorAnalyticsPanel from '../components/TutorAnalyticsPanel';
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
    const [tutorDashboardMeta, setTutorDashboardMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentStudents, setCurrentStudents] = useState([]);
    const user = useAuthStore((s) => s.user);
    const unreadCount = useNotificationStore((s) => s.unreadCount);
    const setNotificationsOpen = useNotificationStore((s) => s.setIsOpen);
    const { bookings, loading: bookingsLoading } = useMyBookings();

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
            const [profileRes, reviewsRes, studentsRes] = await Promise.all([
                api.get('/tutors/my-profile'),
                api.get(`/reviews/tutor/${user._id}`),
                api.get('/current-tutors/tutor/my-students').catch(() => ({ data: [] }))
            ]);

            const profile = profileRes.data;
            const reviews = reviewsRes.data;
            const students = studentsRes.data;

            setCurrentStudents(students);
            setTutorDashboardMeta({ profile, reviews, studentsCount: students.length });
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab !== 'dashboard' || !tutorDashboardMeta || bookingsLoading || !user?._id) {
            return;
        }
        const list = bookings || [];
        const { profile, reviews, studentsCount } = tutorDashboardMeta;
        const pending = list.filter((b) => b.status === 'pending');
        const approved = list.filter((b) => b.status === 'approved');
        const upcoming = approved.filter((b) => {
            if (!b.sessionDate) return false;
            const sessionDate = new Date(b.sessionDate);
            return sessionDate >= new Date();
        });

        // Pending / upcoming filtered lists are computed inline where needed in the Overview tab.
        void pending; void upcoming;

        const totalBookings = list.length;
        const completedBookings = list.filter((b) => b.status === 'completed').length;
        const averageRating =
            reviews.length > 0
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
            studentsCount: studentsCount ?? 0
        });
    }, [activeTab, tutorDashboardMeta, bookings, bookingsLoading, user?._id]);

    const renderContent = () => {
        switch (activeTab) {
            case 'sessions':
                return (
                    <div className="space-y-3">
                        <div className="flex items-center justify-end">
                            <CalendarExportButton label="Add to Calendar (.ics)" />
                        </div>
                        <SessionsPage />
                    </div>
                );

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
                        <TutorTierCard />
                        <EarningsDashboard />
                        <IncentiveDashboard />
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h2 className="text-lg font-bold text-navy-950 mb-1">Payouts</h2>
                            <p className="text-sm text-gray-500 mb-5">Weekly payout ledger — every period with commission, bonuses, reserve and net payable.</p>
                            <TutorPayoutsPanel />
                        </div>
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
                    <div className="space-y-8 -mx-2 sm:mx-0">
                        <TutorVacationCard />
                        <TutorCredibilityPanel />
                        <TutorProfileForm />
                        <TutorRateBandsCard highlightRate={stats?.hourlyRate} />
                        <QualificationUploader />
                        <ReferralCard />
                        <TutorProgressDashboard />
                        {user?._id && (
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <h2 className="text-lg font-bold text-navy-950 mb-1">Reviews & Responses</h2>
                                <p className="text-sm text-gray-500 mb-5">Respond to your reviews. Your reply shows publicly below each review on your profile.</p>
                                <ReviewList tutorId={user._id} canReply />
                            </div>
                        )}
                    </div>
                );

            case 'dashboard':
            default:
                return (
                    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
                        {/* Tier-branded hero */}
                        <TutorOverviewHero />

                        {/* Pending approval banner — only when actually pending */}
                        {stats && stats.approvalStatus === 'pending' && (
                            <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-xl shadow-sm">
                                <p className="text-sm font-bold text-amber-950 mb-1">Your profile is under review</p>
                                <p className="text-sm text-amber-800">
                                    An admin is reviewing your application. You'll be notified the moment you're approved and can accept students.
                                </p>
                            </div>
                        )}

                        {/* Unread notifications — tight chip */}
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={() => setNotificationsOpen(true)}
                                className="w-full flex items-center justify-between gap-4 py-3 px-4 bg-royal/5 border border-royal/20 rounded-xl hover:bg-royal/10 transition-colors">
                                <p className="text-sm font-semibold text-navy-950">
                                    You have {unreadCount} new notification{unreadCount !== 1 ? 's' : ''}
                                </p>
                                <span className="text-sm font-bold text-royal">View →</span>
                            </button>
                        )}

                        {/* No students yet — lightweight coach card (only the minimum) */}
                        {!loading && currentStudents.length === 0 && stats?.approvalStatus === 'approved' && (
                            <div className="bg-gradient-to-br from-royal/5 to-royal/10 border border-royal/30 rounded-2xl p-6">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-royal-dark mb-1">Waiting for your first student</p>
                                        <h3 className="text-lg font-extrabold text-navy-950">Ready to teach</h3>
                                        <p className="text-sm text-gray-600 mt-1 max-w-lg">
                                            Students find tutors by subject and availability. Keep your profile 100% complete and your weekly schedule up to date — that's how you appear in search.
                                        </p>
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                        <button onClick={() => handleTabChange('profile')}
                                            className="px-4 py-2 bg-royal text-white rounded-lg text-sm font-bold hover:bg-royal-dark shadow-sm">
                                            Complete profile
                                        </button>
                                        <button onClick={() => handleTabChange('schedule')}
                                            className="px-4 py-2 bg-white text-royal border border-royal/30 rounded-lg text-sm font-bold hover:bg-royal/5">
                                            Set availability
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Pending requests (tutor-side) — only renders when there's something to do */}
                        <RequestsHub onNavigateToSessions={() => handleTabChange('sessions')} />

                        {/* Business analytics — the page's biggest signal */}
                        <TutorAnalyticsPanel />

                        {/* Two-column: Tier card + Today's priorities */}
                        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6">
                            <TutorTierCard />

                            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-sm font-bold text-navy-950">Today's priorities</h3>
                                        <p className="text-[11px] text-gray-500 mt-0.5">What to do in the next 24 hours</p>
                                    </div>
                                </div>
                                <TodayPriorities
                                    stats={stats}
                                    bookings={bookings}
                                    currentStudents={currentStudents}
                                    onNav={handleTabChange}
                                />
                            </div>
                        </div>

                        {/* Profile completeness + search visibility — performance signal */}
                        {tutorDashboardMeta?.profile && (
                            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                                    <div>
                                        <h3 className="text-sm font-bold text-navy-950">Profile performance</h3>
                                        <p className="text-[11px] text-gray-500 mt-0.5">
                                            How discoverable you are to students searching for tutors.
                                        </p>
                                    </div>
                                    <button onClick={() => handleTabChange('profile')}
                                        className="text-xs font-bold text-royal hover:text-royal-dark">
                                        Improve →
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <PerformanceStat
                                        label="Profile complete"
                                        value={`${tutorDashboardMeta.profile.profileCompletionScore ?? 0}%`}
                                        subtle="Target ≥ 90%"
                                        tone={(tutorDashboardMeta.profile.profileCompletionScore ?? 0) >= 90 ? 'success' : 'warn'}
                                    />
                                    <PerformanceStat
                                        label="Appeared in search"
                                        value={tutorDashboardMeta.profile.searchAppearancesThisWeek ?? 0}
                                        subtle="This week"
                                    />
                                    <PerformanceStat
                                        label="All-time impressions"
                                        value={tutorDashboardMeta.profile.searchAppearancesTotal ?? 0}
                                        subtle="Search results shown"
                                    />
                                </div>
                            </div>
                        )}

                        {/* My students shelf — only first 3 */}
                        {currentStudents.length > 0 && (
                            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-sm font-bold text-navy-950">Your students</h3>
                                        <p className="text-[11px] text-gray-500 mt-0.5">
                                            {currentStudents.length} active · retention cliffs shown per card
                                        </p>
                                    </div>
                                    <button onClick={() => handleTabChange('students')}
                                        className="text-xs font-bold text-royal hover:text-royal-dark">
                                        See all →
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {currentStudents.slice(0, 3).map((s) => (
                                        <StudentQuickCard
                                            key={s._id}
                                            relationship={s}
                                            onClick={() => handleTabChange('students')}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
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

// ═══════════════════════════════════════════════════════════════════════════
// Overview tab — inline helpers
// ═══════════════════════════════════════════════════════════════════════════

function TodayPriorities({ stats, bookings, currentStudents, onNav }) {
    // Date.now called via useMemo to keep the component render pure
    const [now] = useState(() => Date.now());
    const in24h = now + 24 * 3_600_000;

    const pending = (bookings || []).filter((b) => b.status === 'pending');
    const todaySessions = (bookings || []).filter((b) =>
        b.status === 'approved'
        && b.sessionDate
        && new Date(b.sessionDate).getTime() > now
        && new Date(b.sessionDate).getTime() <= in24h
    );
    const needsProfileWork = stats && stats.profileCompletionScore < 90;
    const newStudentsNeedingFirstSession = (currentStudents || []).filter((s) => (s.totalSessionsBooked || 0) === 0);

    const items = [];
    if (pending.length > 0) {
        items.push({
            tone: 'amber',
            label: `Respond to ${pending.length} booking request${pending.length === 1 ? '' : 's'}`,
            desc: 'Parents expect a reply within 24h — fast replies boost search ranking.',
            action: 'Review',
            onClick: () => onNav('sessions')
        });
    }
    if (todaySessions.length > 0) {
        items.push({
            tone: 'royal',
            label: `${todaySessions.length} session${todaySessions.length === 1 ? '' : 's'} in the next 24 hours`,
            desc: 'Prep notes, warm up the Jitsi room, and confirm with the student.',
            action: 'Open sessions',
            onClick: () => onNav('sessions')
        });
    }
    if (newStudentsNeedingFirstSession.length > 0) {
        items.push({
            tone: 'success',
            label: `Book first session with ${newStudentsNeedingFirstSession.length} new student${newStudentsNeedingFirstSession.length === 1 ? '' : 's'}`,
            desc: 'Retention cliff countdown starts the day your first paid session completes.',
            action: 'Schedule',
            onClick: () => onNav('sessions')
        });
    }
    if (needsProfileWork) {
        items.push({
            tone: 'slate',
            label: `Profile is ${stats.profileCompletionScore}% complete`,
            desc: 'A 90%+ profile appears ~4× more often in search. Add bio, qualifications, photo.',
            action: 'Complete',
            onClick: () => onNav('profile')
        });
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                </div>
                <p className="text-sm font-bold text-navy-950">You're all caught up</p>
                <p className="text-xs text-gray-500 mt-1 max-w-xs">Nothing urgent. Use this time to prep for your next session or check resources.</p>
            </div>
        );
    }

    const toneCls = {
        amber:   'bg-amber-50 border-amber-200 text-amber-900',
        royal:   'bg-royal/5 border-royal/30 text-royal-dark',
        success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
        slate:   'bg-slate-50 border-slate-200 text-slate-800'
    };
    const actionCls = {
        amber:   'bg-amber-500 hover:bg-amber-600 text-white',
        royal:   'bg-royal hover:bg-royal-dark text-white',
        success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        slate:   'bg-slate-700 hover:bg-slate-800 text-white'
    };

    return (
        <ol className="space-y-2.5">
            {items.map((it, i) => (
                <li key={i} className={`rounded-xl border p-3.5 ${toneCls[it.tone]}`}>
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold leading-snug">{it.label}</p>
                            <p className="text-[11px] opacity-80 mt-0.5 leading-relaxed">{it.desc}</p>
                        </div>
                        <button
                            onClick={it.onClick}
                            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg flex-shrink-0 ${actionCls[it.tone]}`}>
                            {it.action}
                        </button>
                    </div>
                </li>
            ))}
        </ol>
    );
}

function PerformanceStat({ label, value, subtle, tone = 'neutral' }) {
    const valueCls = {
        neutral: 'text-navy-950',
        success: 'text-emerald-700',
        warn:    'text-amber-700'
    }[tone];
    return (
        <div className="rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</p>
            <p className={`text-2xl font-extrabold mt-1 ${valueCls}`}>{value}</p>
            {subtle && <p className="text-[10px] text-gray-400 mt-0.5">{subtle}</p>}
        </div>
    );
}

function StudentQuickCard({ relationship, onClick }) {
    const student = relationship.studentId || {};
    const done = relationship.sessionsCompleted || 0;
    const total = relationship.totalSessionsBooked || 0;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const isNew = total === 0;

    const [now] = useState(() => Date.now());
    const startedAt = relationship.relationshipStartDate ? new Date(relationship.relationshipStartDate) : null;
    const months = startedAt ? Math.floor((now - startedAt.getTime()) / (30 * 24 * 3_600_000)) : 0;
    const nextCliff = months < 3 ? { label: '3-month', bonus: 1000, monthsLeft: 3 - months }
                   : months < 6 ? { label: '6-month', bonus: 2500, monthsLeft: 6 - months }
                   : null;

    return (
        <button
            onClick={onClick}
            className="text-left bg-white border border-gray-100 rounded-xl p-4 hover:border-royal/40 hover:shadow-sm transition-all group">
            <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-royal to-navy-900 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {(student.name || '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-navy-950 truncate">{student.name || 'Student'}</p>
                    <p className="text-[11px] text-gray-500 truncate">
                        {relationship.subject}{relationship.classGrade ? ` · Class ${relationship.classGrade}` : ''}
                    </p>
                </div>
                {isNew && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-lime/30 text-navy-950 flex-shrink-0">
                        New
                    </span>
                )}
            </div>

            {isNew ? (
                <p className="text-[11px] text-gray-500">No sessions yet — book the first one to start the retention clock.</p>
            ) : (
                <>
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Progress</span>
                        <span className="text-[11px] font-bold text-navy-950">{done}/{total}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                        <div className="h-full bg-gradient-to-r from-royal to-lime rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    {nextCliff && (
                        <p className="text-[10px] text-amber-700 font-semibold">
                            ₹{nextCliff.bonus.toLocaleString('en-IN')} {nextCliff.label} bonus in {nextCliff.monthsLeft}mo
                        </p>
                    )}
                    {!nextCliff && (
                        <p className="text-[10px] text-emerald-700 font-semibold">
                            ✓ All retention cliffs earned
                        </p>
                    )}
                </>
            )}
        </button>
    );
}

export default TutorDashboard;

