import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const ProgressAnalytics = () => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const { showError } = useToast();

    const tutorId = searchParams.get('tutorId');
    const studentId = searchParams.get('studentId');

    useEffect(() => {
        if (tutorId || studentId) {
            fetchRelationshipDetails();
        }
    }, [tutorId, studentId, user]);

    const fetchRelationshipDetails = async () => {
        try {
            let currentTutorId = null;
            
            if (user?.role === 'student' && tutorId) {
                // Get current tutor relationship
                const { data: tutors } = await api.get('/current-tutors/student/my-tutors');
                const relationship = tutors.find(t => t.tutorId._id === tutorId);
                if (relationship) {
                    currentTutorId = relationship._id;
                }
            } else if (user?.role === 'tutor' && studentId) {
                const { data: students } = await api.get('/current-tutors/tutor/my-students');
                const relationship = students.find(s => s.studentId._id === studentId);
                if (relationship) {
                    currentTutorId = relationship._id;
                }
            }

            if (currentTutorId) {
                const { data } = await api.get(`/current-tutors/analytics/${currentTutorId}`);
                setAnalytics(data);
            }
        } catch (err) {
            showError('Failed to fetch analytics');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="text-center py-8">Loading analytics...</div>;
    }

    if (!analytics) {
        return (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <p className="text-gray-500">No analytics data available</p>
            </div>
        );
    }

    const { relationship, sessions, attendance, learning, performance, engagement, summaries } = analytics;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Progress & Analytics
                </h2>
                <p className="text-gray-600">
                    {user?.role === 'student' 
                        ? `With ${relationship.tutorId.name} - ${relationship.subject}`
                        : `With ${relationship.studentId.name} - ${relationship.subject}`}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                    Started: {new Date(relationship.relationshipStartDate).toLocaleDateString()}
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Sessions Completed</h3>
                    <p className="text-3xl font-bold text-indigo-600">{sessions.completed}</p>
                    <p className="text-xs text-gray-400 mt-1">out of {sessions.total} total</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Attendance Rate</h3>
                    <p className="text-3xl font-bold text-green-600">{attendance.percentage}%</p>
                    <p className="text-xs text-gray-400 mt-1">
                        {attendance.present} present, {attendance.absent} absent
                    </p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Current Streak</h3>
                    <p className="text-3xl font-bold text-yellow-600">{attendance.streak}</p>
                    <p className="text-xs text-gray-400 mt-1">consecutive sessions</p>
                </div>
            </div>

            {/* Text Summaries */}
            <div className="bg-indigo-50 rounded-lg p-6 border border-indigo-200">
                <h3 className="font-semibold text-gray-900 mb-3">Quick Summary</h3>
                <ul className="space-y-2">
                    {summaries.map((summary, index) => (
                        <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-indigo-600 mt-1">•</span>
                            <span>{summary}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Learning Progress */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Progress</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <p className="text-sm text-gray-500 mb-2">Progress Level</p>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-3">
                                <div
                                    className={`h-3 rounded-full ${
                                        learning.progressLevel === 'Advanced' ? 'bg-green-600' :
                                        learning.progressLevel === 'Intermediate' ? 'bg-yellow-600' :
                                        'bg-blue-600'
                                    }`}
                                    style={{
                                        width: learning.progressLevel === 'Advanced' ? '100%' :
                                               learning.progressLevel === 'Intermediate' ? '66%' : '33%'
                                    }}
                                />
                            </div>
                            <span className="font-semibold text-gray-900">{learning.progressLevel}</span>
                        </div>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 mb-2">Topics Covered</p>
                        <p className="text-lg font-bold text-gray-900">{learning.topicsCovered.length}</p>
                        {learning.topicsCovered.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {learning.topicsCovered.slice(0, 5).map((topic, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                        {topic}
                                    </span>
                                ))}
                                {learning.topicsCovered.length > 5 && (
                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                        +{learning.topicsCovered.length - 5} more
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Performance Trends */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <p className="text-sm text-gray-500 mb-2">Average Understanding Score</p>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 bg-gray-200 rounded-full h-4">
                                <div
                                    className="bg-indigo-600 h-4 rounded-full"
                                    style={{ width: `${(performance.averageUnderstanding / 5) * 100}%` }}
                                />
                            </div>
                            <span className="text-2xl font-bold text-indigo-600">
                                {performance.averageUnderstanding}/5
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                            Based on {performance.understandingScores.length} session{performance.understandingScores.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 mb-2">Average Session Rating</p>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 bg-gray-200 rounded-full h-4">
                                <div
                                    className="bg-yellow-600 h-4 rounded-full"
                                    style={{ width: `${(performance.averageRating / 5) * 100}%` }}
                                />
                            </div>
                            <span className="text-2xl font-bold text-yellow-600">
                                {performance.averageRating}/5 ⭐
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                            Based on {performance.studentRatings.length} rating{performance.studentRatings.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
            </div>

            {/* Engagement */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement</h3>
                <div className="space-y-4">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-gray-500">Homework Completion</p>
                            <p className="text-sm font-semibold text-gray-900">
                                {engagement.homeworkCompleted}/{engagement.homeworkTotal}
                            </p>
                        </div>
                        <div className="bg-gray-200 rounded-full h-3">
                            <div
                                className="bg-green-600 h-3 rounded-full"
                                style={{ width: `${engagement.completionRate}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                            {engagement.completionRate}% completion rate
                        </p>
                    </div>
                    {engagement.homeworkTotal === 0 && (
                        <p className="text-sm text-gray-500 italic">No homework assigned yet</p>
                    )}
                </div>
            </div>

            {/* Attendance Breakdown */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{attendance.present}</p>
                        <p className="text-sm text-gray-600">Present</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">{attendance.absent}</p>
                        <p className="text-sm text-gray-600">Absent</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{attendance.total}</p>
                        <p className="text-sm text-gray-600">Total</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <p className="text-2xl font-bold text-yellow-600">{attendance.streak}</p>
                        <p className="text-sm text-gray-600">Streak</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProgressAnalytics;

