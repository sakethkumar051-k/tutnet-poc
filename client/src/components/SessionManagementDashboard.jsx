import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useMyBookings } from '../context/MyBookingsContext';
import SessionCalendar from './SessionCalendar';
import SessionDetailsModal from './SessionDetailsModal';
import TodaysSessions from './TodaysSessions';

const SessionManagementDashboard = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [relationship, setRelationship] = useState(null);
    const [allRelationships, setAllRelationships] = useState([]);
    const [todaysSessions, setTodaysSessions] = useState([]);
    const [todaysNotes, setTodaysNotes] = useState([]);
    const [todaysFeedback, setTodaysFeedback] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState(null);
    const { user } = useAuth();
    const { showError } = useToast();
    const { bookings: allBookingsFromCtx, refreshBookings } = useMyBookings();

    const tutorId = searchParams.get('tutorId');
    const studentId = searchParams.get('studentId');
    const currentTutorId = searchParams.get('currentTutorId');

    useEffect(() => {
        fetchRelationshipData();
    }, [tutorId, studentId, currentTutorId]);

    useEffect(() => {
        fetchTodaysData();
    }, [tutorId, studentId, currentTutorId, relationship, user?.role, allBookingsFromCtx]);

    const fetchRelationshipData = async () => {
        try {
            let relationshipData = null;
            
            // First, fetch all relationships for the selector
            const { data: allRelationshipsData } = user?.role === 'student' 
                ? await api.get('/current-tutors/student/my-tutors')
                : await api.get('/current-tutors/tutor/my-students');
            
            setAllRelationships(allRelationshipsData || []);
            
            if (currentTutorId) {
                // If we have currentTutorId, use it directly
                try {
                    const { data: analytics } = await api.get(`/current-tutors/analytics/${currentTutorId}`);
                    relationshipData = analytics.relationship;
                } catch (err) {
                    // Fallback: try to get relationship directly
                    relationshipData = allRelationshipsData.find(t => t._id === currentTutorId);
                }
            } else if (user?.role === 'student' && tutorId) {
                const rel = allRelationshipsData.find(t => t.tutorId._id === tutorId || t.tutorId?._id === tutorId);
                if (rel) {
                    relationshipData = rel;
                }
            } else if (user?.role === 'tutor' && studentId) {
                const rel = allRelationshipsData.find(s => s.studentId._id === studentId || s.studentId?._id === studentId);
                if (rel) {
                    relationshipData = rel;
                }
            } else {
                // If no parameters provided, auto-select the first current tutor/student
                if (allRelationshipsData && allRelationshipsData.length > 0) {
                    relationshipData = allRelationshipsData[0];
                    // Update URL to include the relationship ID for consistency
                    const newParams = new URLSearchParams(searchParams);
                    newParams.set('tab', 'sessions');
                    if (user?.role === 'student') {
                        newParams.set('tutorId', relationshipData.tutorId._id);
                        newParams.set('currentTutorId', relationshipData._id);
                    } else {
                        newParams.set('studentId', relationshipData.studentId._id);
                        newParams.set('currentTutorId', relationshipData._id);
                    }
                    navigate(`?${newParams.toString()}`, { replace: true });
                }
            }

            if (relationshipData) {
                setRelationship(relationshipData);
            }
        } catch (err) {
            console.error('Failed to fetch relationship data:', err);
            showError('Failed to fetch relationship data');
        } finally {
            setLoading(false);
        }
    };

    const handleRelationshipChange = (selectedRelationship) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('tab', 'sessions');
        
        if (user?.role === 'student') {
            newParams.set('tutorId', selectedRelationship.tutorId._id);
            newParams.set('currentTutorId', selectedRelationship._id);
        } else {
            newParams.set('studentId', selectedRelationship.studentId._id);
            newParams.set('currentTutorId', selectedRelationship._id);
        }
        
        navigate(`?${newParams.toString()}`, { replace: true });
    };

    const fetchTodaysData = async () => {
        try {
            const allBookings = allBookingsFromCtx || [];

            // Filter bookings for this relationship
            const relationshipBookings = allBookings.filter(b => {
                if (user?.role === 'student') {
                    return b.tutorId?._id === (relationship?.tutorId?._id || tutorId);
                } else {
                    return b.studentId?._id === (relationship?.studentId?._id || studentId);
                }
            });

            // Get today's date
            const today = new Date().toISOString().split('T')[0];
            const todays = relationshipBookings.filter(s => {
                if (s.sessionDate) {
                    return s.sessionDate.split('T')[0] === today;
                }
                return s.preferredSchedule.includes(today);
            });
            setTodaysSessions(todays);

            // Fetch notes and feedback for today's sessions
            const notes = [];
            const feedbacks = [];

            for (const session of todays) {
                try {
                    const { data: feedback } = await api.get(`/session-feedback/booking/${session._id}`);
                    if (feedback) {
                        if (feedback.tutorSummary) {
                            notes.push({
                                session,
                                summary: feedback.tutorSummary,
                                topics: feedback.topicsCovered || [],
                                understanding: feedback.understandingScore
                            });
                        }
                        if (feedback.studentRating || feedback.tutorSummary) {
                            feedbacks.push({
                                session,
                                tutorFeedback: feedback.tutorSummary,
                                studentRating: feedback.studentRating,
                                studentComment: feedback.studentComment,
                                understandingScore: feedback.understandingScore
                            });
                        }
                    }
                } catch (err) {
                    // Feedback might not exist yet
                }
            }

            setTodaysNotes(notes);
            setTodaysFeedback(feedbacks);
        } catch (err) {
            console.error('Failed to fetch today\'s data:', err);
        }
    };

    const handleBookingCreated = () => {
        refreshBookings();
        fetchRelationshipData();
    };

    if (loading) {
        return <div className="text-center py-8">Loading dashboard...</div>;
    }

    if (!relationship) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-12">
                <div className="max-w-md mx-auto text-center">
                    <div className="mb-6">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-navy-950 mb-2">No sessions yet</h3>
                    <p className="text-sm text-gray-600 mb-8 leading-relaxed">
                        You don't have any active students or scheduled sessions.
                        <br />
                        <span className="text-gray-500">Once a student books a demo or class, it will appear here.</span>
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        {user?.role === 'tutor' && (
                            <>
                                <button
                                    onClick={() => navigate('/tutor-dashboard?tab=profile')}
                                    className="px-4 py-2 bg-navy-950 text-white text-sm font-medium rounded-md hover:bg-navy-900 transition-colors"
                                >
                                    Set Availability
                                </button>
                                <button
                                    onClick={() => navigate('/tutor-dashboard?tab=profile')}
                                    className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
                                >
                                    View Profile
                                </button>
                            </>
                        )}
                        {user?.role === 'student' && (
                            <button
                                onClick={() => navigate('/find-tutors')}
                                className="px-4 py-2 bg-navy-950 text-white text-sm font-medium rounded-md hover:bg-navy-900 transition-colors"
                            >
                                Find Tutors
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const otherUser = user?.role === 'student' 
        ? relationship.tutorId 
        : relationship.studentId;

    return (
        <div className="space-y-6">
            {/* Header with Selector */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-navy-950 mb-2">
                            Session Management
                        </h2>
                        <p className="text-sm text-gray-600">
                            {user?.role === 'student' 
                                ? `With ${relationship.tutorId?.name || otherUser?.name} - ${relationship.subject}`
                                : `With ${relationship.studentId?.name || otherUser?.name} - ${relationship.subject}`}
                        </p>
                    </div>
                    
                    {/* Tutor/Student Selector */}
                    {allRelationships.length > 1 && (
                        <div className="flex-shrink-0">
                            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                {user?.role === 'student' ? 'Select Tutor' : 'Select Student'}
                            </label>
                            <select
                                value={relationship?._id || ''}
                                onChange={(e) => {
                                    const selected = allRelationships.find(r => r._id === e.target.value);
                                    if (selected) {
                                        handleRelationshipChange(selected);
                                    }
                                }}
                                className="w-full sm:w-64 px-4 py-2.5 border border-gray-300 rounded-md text-sm font-medium text-navy-950 bg-white hover:border-royal/50 focus:outline-none focus:ring-2 focus:ring-royal focus:border-royal transition-colors"
                            >
                                {allRelationships.map((rel) => {
                                    const name = user?.role === 'student' 
                                        ? rel.tutorId?.name 
                                        : rel.studentId?.name;
                                    const subject = rel.subject;
                                    return (
                                        <option key={rel._id} value={rel._id}>
                                            {name} - {subject}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Calendar & Today's Sessions */}
                <div className="space-y-6">
                    {/* Calendar */}
                    <SessionCalendar
                        currentTutorId={relationship._id}
                        tutorId={relationship.tutorId?._id || tutorId}
                        studentId={relationship.studentId?._id || studentId}
                        subject={relationship.subject}
                        tutorName={user?.role === 'student' ? relationship.tutorId?.name : undefined}
                        studentName={user?.role === 'tutor' ? relationship.studentId?.name : undefined}
                        onBookingCreated={handleBookingCreated}
                    />

                    {/* Today's Sessions */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                        <h3 className="text-base font-bold text-navy-950 mb-4 pb-3 border-b border-gray-200">Today's Sessions</h3>
                        {todaysSessions.length === 0 ? (
                            <p className="text-gray-500 text-sm">No sessions scheduled for today</p>
                        ) : (
                            <div className="space-y-3">
                                {todaysSessions.map(session => (
                                    <div
                                        key={session._id}
                                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                                        onClick={() => setSelectedSession(session)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className="font-medium text-navy-950">
                                                    {session.sessionDate 
                                                        ? new Date(session.sessionDate).toLocaleTimeString('en-US', { 
                                                            hour: '2-digit', 
                                                            minute: '2-digit' 
                                                        })
                                                        : session.preferredSchedule}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {session.subject}
                                                </p>
                                                {session.duration && (
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        Duration: {session.duration} min
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    session.attendanceStatus === 'completed' ? 'bg-lime/30 text-navy-950' :
                                                    session.status === 'approved' ? 'bg-royal/10 text-royal-dark' :
                                                    session.status === 'completed' ? 'bg-royal/10 text-navy-900' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {session.attendanceStatus || session.status}
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedSession(session);
                                                    }}
                                                    className="text-xs text-royal hover:text-navy-900"
                                                >
                                                    View Details →
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Today's Notes & Feedback */}
                <div className="space-y-6">
                    {/* Today's Discussion Notes */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                        <h3 className="text-base font-bold text-navy-950 mb-4 pb-3 border-b border-gray-200">Today's Discussion Notes</h3>
                        {todaysNotes.length === 0 ? (
                            <p className="text-gray-500 text-sm">No notes for today's sessions yet</p>
                        ) : (
                            <div className="space-y-4">
                                {todaysNotes.map((note, index) => (
                                    <div key={index} className="border-l-4 border-royal pl-4 py-2">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-medium text-gray-700">
                                                {note.session.preferredSchedule}
                                            </p>
                                            {note.understanding && (
                                                <span className="text-xs text-gray-500">
                                                    Understanding: {note.understanding}/5
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 mb-2">{note.summary}</p>
                                        {note.topics.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {note.topics.map((topic, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="px-2 py-1 bg-royal/5 text-royal-dark rounded text-xs"
                                                    >
                                                        {topic}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Today's Feedback */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                        <h3 className="text-base font-bold text-navy-950 mb-4 pb-3 border-b border-gray-200">Today's Feedback</h3>
                        {todaysFeedback.length === 0 ? (
                            <p className="text-gray-500 text-sm">No feedback for today's sessions yet</p>
                        ) : (
                            <div className="space-y-4">
                                {todaysFeedback.map((feedback, index) => (
                                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                                        <p className="text-sm font-medium text-gray-700 mb-2">
                                            {feedback.session.preferredSchedule}
                                        </p>
                                        {feedback.tutorFeedback && (
                                            <div className="mb-3">
                                                <p className="text-xs text-gray-500 mb-1">Tutor Summary:</p>
                                                <p className="text-sm text-gray-700">{feedback.tutorFeedback}</p>
                                                {feedback.understandingScore && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Understanding Score: {feedback.understandingScore}/5
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        {feedback.studentRating && (
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Student Rating:</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">⭐</span>
                                                    <span className="text-sm font-medium">{feedback.studentRating}/5</span>
                                                </div>
                                                {feedback.studentComment && (
                                                    <p className="text-sm text-gray-600 mt-1">{feedback.studentComment}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Session Details Modal */}
            {selectedSession && (
                <SessionDetailsModal
                    session={selectedSession}
                    onClose={() => setSelectedSession(null)}
                    onUpdate={() => {
                        fetchTodaysData();
                        fetchRelationshipData();
                    }}
                />
            )}
        </div>
    );
};

export default SessionManagementDashboard;

