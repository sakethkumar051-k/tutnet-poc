import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// Components
import SessionTile from '../components/SessionTile';
import NextSessionCard from '../components/NextSessionCard';
import BookingList from '../components/BookingList';
import SessionDetailsModal from '../components/SessionDetailsModal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import SessionManagementDashboard from '../components/SessionManagementDashboard';

const SessionsPage = () => {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();

    // Data State
    const [allSessions, setAllSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [activeTab, setActiveTab] = useState('calendar'); // Default to calendar if that's what users prefer
    const [selectedSession, setSelectedSession] = useState(null);
    const [nextSession, setNextSession] = useState(null);
    const [stats, setStats] = useState({ today: 0, upcoming: 0, completed: 0, requests: 0 });

    useEffect(() => {
        fetchSessions();
        const interval = setInterval(fetchSessions, 5 * 60 * 1000); // 5 min refresh
        return () => clearInterval(interval);
    }, []);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/bookings/mine');
            processSessions(data);
        } catch (err) {
            console.error(err);
            showError('Failed to load sessions');
        } finally {
            setLoading(false);
        }
    };

    const processSessions = (data) => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // 1. Sort by Date
        const sorted = [...data].sort((a, b) => {
            const dateA = a.sessionDate ? new Date(a.sessionDate) : new Date(a.createdAt);
            const dateB = b.sessionDate ? new Date(b.sessionDate) : new Date(b.createdAt);
            return dateA - dateB; // Ascending for upcoming logic
        });

        setAllSessions(sorted);

        // 2. Find Next Session (First approved upcoming or currently happening)
        const upcomingApproved = sorted.filter(s =>
            s.status === 'approved' &&
            s.sessionDate &&
            new Date(s.sessionDate) > new Date(now.getTime() - 60 * 60 * 1000) // Not older than 1 hour ago
        );

        // Find the closest one
        const next = upcomingApproved.find(s => new Date(s.sessionDate) > new Date()) || upcomingApproved[0];
        setNextSession(next || null);

        // 3. Calc Stats for tabs
        const todayCount = sorted.filter(s =>
            s.sessionDate?.startsWith(todayStr) && s.status === 'approved'
        ).length;

        const upcomingCount = sorted.filter(s =>
            s.status === 'approved' &&
            s.sessionDate &&
            new Date(s.sessionDate) > now &&
            !s.sessionDate.startsWith(todayStr)
        ).length;

        const completedCount = sorted.filter(s => s.status === 'completed').length;
        const requestsCount = sorted.filter(s => s.status === 'pending').length;

        setStats({ today: todayCount, upcoming: upcomingCount, completed: completedCount, requests: requestsCount });
    };

    const handleAction = async (session, type) => {
        if (type === 'view') {
            setSelectedSession(session);
        } else if (type === 'join') {
            // Auto-mark attendance logic
            try {
                // Only mark if not already marked/completed
                if (session.status === 'approved' && !session.attendanceStatus) {
                    await api.post(`/session-feedback/attendance/${session._id}`, { status: 'present' });
                    showSuccess('Attendance marked automatically! Have a great session.');
                    // Refresh data silently
                    fetchSessions();
                }
            } catch (err) {
                // Ignore error if already marked or network issue, shouldn't block joining
                console.log('Attendance auto-mark skipped or failed', err);
            }
        }
    };

    // Filter sessions for the current tab
    const getFilteredSessions = () => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        switch (activeTab) {
            case 'today':
                return allSessions.filter(s =>
                    s.sessionDate?.startsWith(todayStr) &&
                    ['approved', 'completed'].includes(s.status)
                );
            case 'upcoming':
                return allSessions.filter(s =>
                    s.status === 'approved' &&
                    s.sessionDate &&
                    new Date(s.sessionDate) > now &&
                    !s.sessionDate.startsWith(todayStr)
                );
            case 'completed':
                // Show completed (descending order for history)
                return allSessions
                    .filter(s => s.status === 'completed')
                    .sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate));
            default: // requests handled by BookingList component
                return [];
        }
    };

    const currentList = getFilteredSessions();

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12">
            {/* Header Area */}
            <div className="pb-6 border-b border-gray-200">
                <h1 className="text-4xl font-bold text-navy-950 tracking-tight mb-2">Sessions</h1>
                <p className="text-gray-600 text-base">Manage your classes, schedule, and teaching history</p>
            </div>

            {/* Next Session - Only show if valid */}
            {nextSession && activeTab !== 'calendar' && (
                <div className="animate-fade-in-up">
                    <NextSessionCard
                        session={nextSession}
                        onJoin={(s) => handleAction(s, 'join')}
                    />
                </div>
            )}

            {/* Tabs */}
            <div className="flex items-center space-x-1 border-b border-gray-200 overflow-x-auto no-scrollbar">
                {[
                    { id: 'calendar', label: 'Calendar', count: 0 },
                    { id: 'today', label: 'Today', count: stats.today },
                    { id: 'upcoming', label: 'Upcoming', count: stats.upcoming },
                    { id: 'requests', label: 'Requests', count: stats.requests },
                    { id: 'completed', label: 'History', count: stats.completed },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2
                            ${activeTab === tab.id
                                ? 'border-gray-900 text-navy-950'
                                : 'border-transparent text-gray-500 hover:text-gray-700'}
                        `}
                    >
                        {tab.label}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            activeTab === tab.id 
                                ? 'bg-navy-950 text-white' 
                                : 'bg-gray-100 text-gray-600'
                        }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {loading ? (
                    <LoadingSkeleton type="list" count={4} />
                ) : activeTab === 'calendar' ? (
                    <div className="animate-fade-in">
                        <SessionManagementDashboard />
                    </div>
                ) : activeTab === 'requests' ? (
                    <div className="animate-fade-in">
                        <BookingList role={user?.role} />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {currentList.length === 0 ? (
                            <EmptyState
                                title={activeTab === 'completed' ? 'No completed sessions' : activeTab === 'today' ? 'No sessions today' : 'No upcoming sessions'}
                                description={activeTab === 'completed' 
                                    ? 'Your completed sessions will appear here once you finish teaching classes.'
                                    : activeTab === 'today'
                                    ? 'You don\'t have any sessions scheduled for today.'
                                    : 'You don\'t have any upcoming sessions scheduled.'}
                            />
                        ) : (
                            currentList.map(session => (
                                <SessionTile
                                    key={session._id}
                                    session={session}
                                    onAction={handleAction}
                                    onRefresh={fetchSessions}
                                    actionLabel={activeTab === 'completed' ? 'View Report' : 'Details'}
                                />
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Modal */}
            {selectedSession && (
                <SessionDetailsModal
                    session={selectedSession}
                    onClose={() => setSelectedSession(null)}
                    onUpdate={fetchSessions}
                />
            )}
        </div>
    );
};

export default SessionsPage;
