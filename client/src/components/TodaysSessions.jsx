import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import SessionDetailsModal from './SessionDetailsModal';
import LoadingSkeleton from './LoadingSkeleton';
import EmptyState from './EmptyState';

const TodaysSessions = () => {
    const [sessions, setSessions] = useState([]);
    const [sessionsWithDetails, setSessionsWithDetails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState(null);
    const { user } = useAuth();
    const { showError } = useToast();

    useEffect(() => {
        fetchTodaysSessions();
        // Refresh every 5 minutes
        const interval = setInterval(fetchTodaysSessions, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const fetchTodaysSessions = async () => {
        setLoading(true);
        try {
            // Fetch today's bookings
            const { data: bookings } = await api.get('/bookings/mine');
            const today = new Date().toISOString().split('T')[0];
            
            // Filter for today's sessions (or most recent if no today's session)
            const todaysBookings = bookings.filter(b => {
                if (b.sessionDate) {
                    return b.sessionDate.split('T')[0] === today;
                }
                // Also include completed sessions from today or most recent completed
                return b.status === 'completed' || b.status === 'approved';
            });

            // Sort by date (most recent first)
            todaysBookings.sort((a, b) => {
                const dateA = a.sessionDate ? new Date(a.sessionDate) : new Date(a.createdAt);
                const dateB = b.sessionDate ? new Date(b.sessionDate) : new Date(b.createdAt);
                return dateB - dateA;
            });

            // For each tutor, get the most recent session (today's or most recent completed)
            const tutorSessions = new Map();
            todaysBookings.forEach(booking => {
                const tutorKey = user?.role === 'student' 
                    ? booking.tutorId?._id 
                    : booking.studentId?._id;
                
                if (tutorKey) {
                    if (!tutorSessions.has(tutorKey)) {
                        tutorSessions.set(tutorKey, booking);
                    } else {
                        const existing = tutorSessions.get(tutorKey);
                        const existingDate = existing.sessionDate ? new Date(existing.sessionDate) : new Date(existing.createdAt);
                        const bookingDate = booking.sessionDate ? new Date(booking.sessionDate) : new Date(booking.createdAt);
                        
                        // Prefer today's session, or most recent
                        const isToday = booking.sessionDate?.split('T')[0] === today;
                        const existingIsToday = existing.sessionDate?.split('T')[0] === today;
                        
                        if (isToday && !existingIsToday) {
                            tutorSessions.set(tutorKey, booking);
                        } else if (!isToday && existingIsToday) {
                            // Keep existing
                        } else if (bookingDate > existingDate) {
                            tutorSessions.set(tutorKey, booking);
                        }
                    }
                }
            });

            const uniqueSessions = Array.from(tutorSessions.values());

            // Fetch feedback for each session
            const sessionsWithFeedback = await Promise.all(
                uniqueSessions.map(async (session) => {
                    try {
                        const { data: feedback } = await api.get(`/session-feedback/booking/${session._id}`);
                        return {
                            ...session,
                            feedback: feedback || null,
                            hasFeedback: !!feedback,
                            hasAttendance: !!feedback?.attendanceStatus,
                            hasMaterials: feedback?.studyMaterials?.length > 0,
                            hasHomework: feedback?.homework?.length > 0,
                            homeworkCount: feedback?.homework?.length || 0,
                            completedHomework: feedback?.homework?.filter(h => h.status === 'completed').length || 0
                        };
                    } catch (err) {
                        return {
                            ...session,
                            feedback: null,
                            hasFeedback: false,
                            hasAttendance: false,
                            hasMaterials: false,
                            hasHomework: false,
                            homeworkCount: 0,
                            completedHomework: 0
                        };
                    }
                })
            );

            setSessions(uniqueSessions);
            setSessionsWithDetails(sessionsWithFeedback);
        } catch (err) {
            showError('Failed to fetch today\'s sessions');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            scheduled: 'bg-blue-100 text-blue-800',
            approved: 'bg-green-100 text-green-800',
            completed: 'bg-gray-100 text-gray-800',
            student_absent: 'bg-red-100 text-red-800',
            tutor_absent: 'bg-orange-100 text-orange-800',
            rescheduled: 'bg-yellow-100 text-yellow-800'
        };
        return colors[status] || colors.scheduled;
    };

    if (loading) {
        return <LoadingSkeleton type="list" count={3} />;
    }

    const title = user?.role === 'student' ? "Today's Classes" : "Today's Sessions";

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>
                
                {sessions.length === 0 ? (
                    <EmptyState
                        icon="📅"
                        title="No sessions scheduled for today"
                        description="You don't have any sessions scheduled for today. Book a session to get started!"
                    />
                ) : (
                    <div className="space-y-4">
                        {sessionsWithDetails.map((session) => {
                            const feedback = session.feedback;
                            const isToday = session.sessionDate?.split('T')[0] === new Date().toISOString().split('T')[0];
                            
                            return (
                                <div
                                    key={session._id}
                                    className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow bg-white"
                                >
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-semibold text-gray-900 text-lg">
                                                    {user?.role === 'student' 
                                                        ? session.tutorId?.name 
                                                        : session.studentId?.name}
                                                </h3>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.attendanceStatus || session.status)}`}>
                                                    {session.attendanceStatus || session.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-1">
                                                📚 {session.subject}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                ⏰ {session.sessionDate 
                                                    ? new Date(session.sessionDate).toLocaleString('en-US', {
                                                        weekday: 'short',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })
                                                    : session.preferredSchedule}
                                            </p>
                                            {session.duration && (
                                                <p className="text-xs text-gray-400 mt-1">
                                                    ⏱️ Duration: {session.duration} minutes
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-2 ml-4">
                                            <button
                                                onClick={() => setSelectedSession(session)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        setSelectedSession(session);
                                                    }
                                                }}
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                                aria-label="View session details"
                                            >
                                                View Details
                                            </button>
                                            {session.onlineLink && (
                                                <a
                                                    href={session.onlineLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium text-center focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                                    aria-label="Join online session"
                                                >
                                                    Join Session
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {/* Session Details Summary - Always visible for completed sessions */}
                                    {(session.status === 'completed' || session.status === 'approved' || feedback) && (
                                        <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3 border-l-4 border-indigo-500">
                                            {/* Attendance Status */}
                                            {session.hasAttendance && feedback?.attendanceStatus && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="text-green-600 font-semibold">✅</span>
                                                    <span className="text-gray-700">
                                                        Attendance: <span className="font-medium capitalize">{feedback.attendanceStatus}</span>
                                                    </span>
                                                </div>
                                            )}

                                            {/* Feedback Summary */}
                                            {feedback?.tutorSummary && (
                                                <div className="text-sm">
                                                    <p className="text-gray-500 mb-1 font-medium">📝 Session Summary:</p>
                                                    <p className="text-gray-700 line-clamp-2">{feedback.tutorSummary}</p>
                                                    {feedback.understandingScore && (
                                                        <p className="text-xs text-indigo-600 mt-1">
                                                            Understanding Score: {feedback.understandingScore}/5
                                                        </p>
                                                    )}
                                                    {feedback.topicsCovered && feedback.topicsCovered.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                            {feedback.topicsCovered.slice(0, 3).map((topic, idx) => (
                                                                <span key={idx} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs">
                                                                    {topic}
                                                                </span>
                                                            ))}
                                                            {feedback.topicsCovered.length > 3 && (
                                                                <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs">
                                                                    +{feedback.topicsCovered.length - 3} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Study Materials */}
                                            {session.hasMaterials && feedback?.studyMaterials && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="text-blue-600 font-semibold">📚</span>
                                                    <span className="text-gray-700">
                                                        {feedback.studyMaterials.length} study material(s) available
                                                    </span>
                                                </div>
                                            )}

                                            {/* Homework Status */}
                                            {session.hasHomework && feedback?.homework && (
                                                <div className="text-sm">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-yellow-600 font-semibold">📝</span>
                                                        <span className="text-gray-700 font-medium">
                                                            Homework: {session.completedHomework}/{session.homeworkCount} completed
                                                        </span>
                                                    </div>
                                                    {feedback.homework.slice(0, 2).map((hw, idx) => (
                                                        <div key={idx} className="ml-6 text-xs text-gray-600">
                                                            • {hw.description.substring(0, 50)}
                                                            {hw.description.length > 50 ? '...' : ''}
                                                            <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                                                                hw.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                                hw.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-gray-100 text-gray-700'
                                                            }`}>
                                                                {hw.status}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {feedback.homework.length > 2 && (
                                                        <p className="ml-6 text-xs text-gray-500">
                                                            +{feedback.homework.length - 2} more assignment(s)
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Student Rating */}
                                            {feedback?.studentRating && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="text-yellow-600 font-semibold">⭐</span>
                                                    <span className="text-gray-700">
                                                        Your Rating: {feedback.studentRating}/5
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Session Details Modal */}
            {selectedSession && (
                <SessionDetailsModal
                    session={selectedSession}
                    onClose={() => setSelectedSession(null)}
                    onUpdate={fetchTodaysSessions}
                />
            )}
        </div>
    );
};

export default TodaysSessions;

