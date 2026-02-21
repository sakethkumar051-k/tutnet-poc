import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import SessionDetailsModal from './SessionDetailsModal';
import LoadingSkeleton from './LoadingSkeleton';
import EmptyState from './EmptyState';

const SessionHistory = () => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState(null);
    const { user } = useAuth();
    const { showError } = useToast();

    useEffect(() => {
        fetchSessionHistory();
    }, []);

    const fetchSessionHistory = async () => {
        setLoading(true);
        try {
            // Fetch all bookings
            const { data: bookings } = await api.get('/bookings/mine');
            
            // Fetch feedback for each booking (only for completed/approved)
            const sessionsWithDetails = await Promise.all(
                bookings
                    .filter(b => b.status === 'completed' || b.status === 'approved')
                    .map(async (booking) => {
                        try {
                            const { data: feedback } = await api.get(`/session-feedback/booking/${booking._id}`);
                            return {
                                ...booking,
                                feedback: feedback || null,
                                hasFeedback: !!feedback,
                                hasAttendance: !!feedback?.attendanceStatus,
                                hasMaterials: feedback?.studyMaterials?.length > 0,
                                hasHomework: feedback?.homework?.length > 0
                            };
                        } catch (err) {
                            // No feedback yet - this is normal
                            return {
                                ...booking,
                                feedback: null,
                                hasFeedback: false,
                                hasAttendance: false,
                                hasMaterials: false,
                                hasHomework: false
                            };
                        }
                    })
            );

            // Sort by date (newest first)
            sessionsWithDetails.sort((a, b) => {
                const dateA = a.sessionDate ? new Date(a.sessionDate) : new Date(a.createdAt);
                const dateB = b.sessionDate ? new Date(b.sessionDate) : new Date(b.createdAt);
                return dateB - dateA;
            });

            setSessions(sessionsWithDetails);
        } catch (err) {
            showError('Failed to fetch session history');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (session) => {
        const status = session.attendanceStatus || session.status;
        const colors = {
            completed: 'bg-green-100 text-green-800',
            approved: 'bg-blue-100 text-blue-800',
            scheduled: 'bg-yellow-100 text-yellow-800',
            student_absent: 'bg-red-100 text-red-800',
            tutor_absent: 'bg-orange-100 text-orange-800',
            rescheduled: 'bg-purple-100 text-purple-800'
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.approved}`}>
                {status}
            </span>
        );
    };

    if (loading) {
        return <LoadingSkeleton type="list" count={5} />;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Session History</h2>
                <button
                    onClick={fetchSessionHistory}
                    className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors"
                >
                    🔄 Refresh
                </button>
            </div>

            {sessions.length === 0 ? (
                <EmptyState
                    icon="📅"
                    title="No session history"
                    description="Your completed sessions will appear here with all details."
                />
            ) : (
                <div className="space-y-3">
                    {sessions.map((session) => (
                        <div
                            key={session._id}
                            className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="font-semibold text-gray-900">
                                            {user?.role === 'student' 
                                                ? session.tutorId?.name 
                                                : session.studentId?.name}
                                        </h3>
                                        {getStatusBadge(session)}
                                    </div>
                                    <p className="text-sm text-gray-600 mb-1">
                                        📚 {session.subject}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        📅 {session.sessionDate 
                                            ? new Date(session.sessionDate).toLocaleDateString('en-US', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })
                                            : session.preferredSchedule}
                                    </p>
                                    {session.duration && (
                                        <p className="text-xs text-gray-400 mt-1">
                                            ⏱️ Duration: {session.duration} minutes
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Session Details Summary */}
                            {session.feedback && (
                                <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                                    {/* Attendance */}
                                    {session.hasAttendance && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-green-600">✅</span>
                                            <span className="text-gray-700">
                                                Attendance: <span className="font-medium capitalize">{session.feedback.attendanceStatus}</span>
                                            </span>
                                        </div>
                                    )}

                                    {/* Tutor Feedback Summary */}
                                    {session.feedback.tutorSummary && (
                                        <div className="text-sm">
                                            <span className="text-gray-500">Tutor Summary: </span>
                                            <span className="text-gray-700 line-clamp-2">{session.feedback.tutorSummary}</span>
                                            {session.feedback.understandingScore && (
                                                <span className="ml-2 text-indigo-600">
                                                    (Understanding: {session.feedback.understandingScore}/5)
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Study Materials */}
                                    {session.hasMaterials && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-blue-600">📚</span>
                                            <span className="text-gray-700">
                                                {session.feedback.studyMaterials.length} study material(s)
                                            </span>
                                        </div>
                                    )}

                                    {/* Homework */}
                                    {session.hasHomework && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-yellow-600">📝</span>
                                            <span className="text-gray-700">
                                                {session.feedback.homework.length} homework assignment(s)
                                            </span>
                                        </div>
                                    )}

                                    {/* Student Feedback */}
                                    {session.feedback.studentRating && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-yellow-600">⭐</span>
                                            <span className="text-gray-700">
                                                Your Rating: {session.feedback.studentRating}/5
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="mt-4 flex gap-2">
                                <button
                                    onClick={() => setSelectedSession(session)}
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                >
                                    {session.feedback ? 'View/Edit Details' : 'Add Details'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Session Details Modal */}
            {selectedSession && (
                <SessionDetailsModal
                    session={selectedSession}
                    onClose={() => setSelectedSession(null)}
                    onUpdate={() => {
                        fetchSessionHistory();
                    }}
                />
            )}
        </div>
    );
};

export default SessionHistory;

