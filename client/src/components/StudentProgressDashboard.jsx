import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from './LoadingSpinner';

// Small helper: count attendance records that still need parent verification
const countUnverified = (records) =>
    records.filter(r => !r.parentVerificationStatus || r.parentVerificationStatus === 'unverified').length;

const StudentProgressDashboard = () => {
    const [attendanceStats, setAttendanceStats] = useState(null);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [currentTutors, setCurrentTutors] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [tutorProgress, setTutorProgress] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showError } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const [statsRes, attendanceRes, tutorsRes, reviewsRes] = await Promise.all([
                api.get('/attendance/stats').catch(() => ({ data: null })),
                api.get('/attendance').catch(() => ({ data: [] })),
                api.get('/current-tutors/student/my-tutors').catch(() => ({ data: [] })),
                api.get('/reviews').catch(() => ({ data: [] }))
            ]);

            setAttendanceStats(statsRes.data);
            setAttendanceRecords(attendanceRes.data || []);
            setCurrentTutors(tutorsRes.data || []);
            setReviews(reviewsRes.data || []);

            // Fetch progress for each tutor
            const tutorProgressData = await Promise.all(
                (tutorsRes.data || []).map(async (tutor) => {
                    try {
                        // Use the relationship _id (currentTutorId) for analytics
                        const { data: analytics } = await api.get(`/current-tutors/analytics/${tutor._id}`);
                        return {
                            tutorId: tutor.tutorId?._id || tutor.tutorId,
                            tutorName: tutor.tutorId?.name || 'Unknown',
                            subject: tutor.subject,
                            relationshipId: tutor._id,
                            sessions: analytics?.sessions || { total: 0, completed: 0 },
                            attendance: analytics?.attendance || { percentage: 0, present: 0, absent: 0, total: 0 }
                        };
                    } catch (err) {
                        console.error(`Failed to fetch analytics for tutor ${tutor._id}:`, err);
                        return {
                            tutorId: tutor.tutorId?._id || tutor.tutorId,
                            tutorName: tutor.tutorId?.name || 'Unknown',
                            subject: tutor.subject,
                            relationshipId: tutor._id,
                            sessions: { total: 0, completed: 0 },
                            attendance: { percentage: 0, present: 0, absent: 0, total: 0 }
                        };
                    }
                })
            );

            setTutorProgress(tutorProgressData);
        } catch (err) {
            console.error('Failed to fetch progress data:', err);
            showError('Failed to load progress data');
        } finally {
            setLoading(false);
        }
    };

    // Calculate weekly trend
    const getWeeklyTrend = useCallback(() => {
        if (!attendanceRecords || attendanceRecords.length === 0) {
            return { thisWeek: 0, lastWeek: 0, trend: 0, trendLabel: 'No data yet' };
        }

        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisWeek = attendanceRecords.filter(a => new Date(a.sessionDate) >= weekAgo);
        const lastWeek = attendanceRecords.filter(a => {
            const date = new Date(a.sessionDate);
            return date >= new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000) && date < weekAgo;
        });

        const thisWeekPresent = thisWeek.filter(a => a.status === 'present').length;
        const thisWeekTotal = thisWeek.length;
        const lastWeekPresent = lastWeek.filter(a => a.status === 'present').length;
        const lastWeekTotal = lastWeek.length;

        const thisWeekRate = thisWeekTotal > 0 ? (thisWeekPresent / thisWeekTotal * 100) : 0;
        const lastWeekRate = lastWeekTotal > 0 ? (lastWeekPresent / lastWeekTotal * 100) : 0;
        const trend = thisWeekRate - lastWeekRate;

        let trendLabel = 'Stable';
        if (trend > 5) trendLabel = 'Your attendance is improving';
        else if (trend < -5) trendLabel = 'Your attendance needs attention';
        else if (trend > 0) trendLabel = 'Slight improvement';
        else if (trend < 0) trendLabel = 'Slight decline';

        return {
            thisWeek: parseFloat(thisWeekRate.toFixed(1)),
            lastWeek: parseFloat(lastWeekRate.toFixed(1)),
            trend: parseFloat(trend.toFixed(1)),
            trendLabel
        };
    }, [attendanceRecords]);

    const weeklyTrend = getWeeklyTrend();

    // Determine overall status
    const getOverallStatus = () => {
        if (!attendanceStats || attendanceStats.total === 0) {
            return { label: 'Getting Started', color: 'bg-gray-100 text-gray-800' };
        }
        const rate = attendanceStats.attendancePercentage || 0;
        if (rate >= 90) {
            return { label: 'On Track', color: 'bg-green-100 text-green-800' };
        } else if (rate >= 75) {
            return { label: 'Good Progress', color: 'bg-blue-100 text-blue-800' };
        } else {
            return { label: 'Needs Attention', color: 'bg-amber-100 text-amber-800' };
        }
    };

    const overallStatus = getOverallStatus();

    // Get last session date for a tutor
    const getLastSessionDate = (tutorId) => {
        const tutorSessions = attendanceRecords.filter(a => a.tutorId?._id === tutorId);
        if (tutorSessions.length === 0) return null;
        const sorted = tutorSessions.sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate));
        return sorted[0].sessionDate;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    const unverifiedCount = countUnverified(attendanceRecords);

    return (
        <div className="space-y-8">
            {/* Parent Verification Banner */}
            {unverifiedCount > 0 && (
                <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex-shrink-0 mt-0.5">
                        <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-amber-900">
                            {unverifiedCount} session{unverifiedCount !== 1 ? 's' : ''} awaiting your confirmation
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                            Tutors have marked attendance for these sessions. Please review and confirm each one.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/student-dashboard?tab=sessions')}
                        className="flex-shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                        Review Now
                    </button>
                </div>
            )}

            {/* SECTION 1: Overall Learning Health */}
            <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Overall Learning Health</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Primary Metric: Attendance */}
                    <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm font-medium text-gray-600 mb-3">Attendance Rate</p>
                        <p className="text-6xl font-bold text-gray-900 mb-2">
                            {attendanceStats?.attendancePercentage || 0}%
                        </p>
                        <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${overallStatus.color}`}>
                            {overallStatus.label}
                        </span>
                    </div>

                    {/* Supporting Metrics */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                            <p className="text-3xl font-bold text-gray-900 mb-1">
                                {attendanceStats?.total || 0}
                            </p>
                            <p className="text-xs text-gray-600 font-medium">Sessions</p>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                            <p className="text-3xl font-bold text-green-600 mb-1">
                                {attendanceStats?.present || 0}
                            </p>
                            <p className="text-xs text-gray-600 font-medium">Completed</p>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                            <p className="text-3xl font-bold text-red-600 mb-1">
                                {attendanceStats?.absent || 0}
                            </p>
                            <p className="text-xs text-gray-600 font-medium">Missed</p>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                            <p className="text-3xl font-bold text-indigo-600 mb-1">
                                {attendanceRecords.filter(r => r.parentVerificationStatus === 'verified').length}
                            </p>
                            <p className="text-xs text-gray-600 font-medium">Verified by You</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 2: Consistency & Trends */}
            {attendanceRecords.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Consistency & Trends</h3>
                    <div className="flex items-center justify-between p-6 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                            <p className="text-sm text-gray-600 mb-2">This Week vs Last Week</p>
                            <p className="text-2xl font-bold text-gray-900 mb-1">
                                {weeklyTrend.thisWeek}% → {weeklyTrend.lastWeek}%
                            </p>
                            <p className={`text-sm font-medium ${
                                weeklyTrend.trend > 0 ? 'text-green-600' : 
                                weeklyTrend.trend < 0 ? 'text-amber-600' : 'text-gray-600'
                            }`}>
                                {weeklyTrend.trend > 0 ? '↑' : weeklyTrend.trend < 0 ? '↓' : '→'} {Math.abs(weeklyTrend.trend)}% change
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-base font-semibold text-gray-900">
                                {weeklyTrend.trendLabel}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* SECTION 3: Tutor-wise Progress Breakdown */}
            {currentTutors.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Progress by Tutor</h3>
                    <div className="space-y-4">
                        {tutorProgress.map((tutor) => {
                            const lastSession = getLastSessionDate(tutor.tutorId);
                            return (
                                <div
                                    key={tutor.relationshipId}
                                    className="border border-gray-200 rounded-lg p-6 hover:border-indigo-300 hover:shadow-sm transition-all"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h4 className="text-base font-semibold text-gray-900 mb-1">
                                                {tutor.tutorName}
                                            </h4>
                                            <p className="text-sm text-gray-600">{tutor.subject}</p>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/student-dashboard?tab=progress&tutorId=${tutor.tutorId}`)}
                                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-md hover:bg-indigo-700 transition-colors"
                                        >
                                            View Detailed Report
                                        </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        <div>
                                            <p className="text-xs text-gray-600 mb-1">Total Sessions</p>
                                            <p className="text-xl font-bold text-gray-900">
                                                {tutor.sessions?.total || 0}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600 mb-1">Attendance</p>
                                            <p className="text-xl font-bold text-indigo-600">
                                                {tutor.attendance?.percentage || 0}%
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600 mb-1">Last Session</p>
                                            <p className="text-sm font-medium text-gray-900">
                                                {lastSession 
                                                    ? new Date(lastSession).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                                    : 'No sessions yet'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* SECTION 4: Feedback & Reviews (Context Only) */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Recent Feedback</h3>
                    {reviews.length > 3 && (
                        <button
                            onClick={() => navigate('/student-dashboard?tab=profile')}
                            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                            View All →
                        </button>
                    )}
                </div>
                
                {reviews.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">No reviews yet</p>
                        <p className="text-xs mt-1">Your tutor feedback will appear here</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Average Rating */}
                        <div className="mb-4 pb-4 border-b border-gray-200">
                            <p className="text-sm text-gray-600 mb-1">Average Rating</p>
                            <div className="flex items-center gap-2">
                                <div className="flex">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <span
                                            key={star}
                                            className={`text-xl ${
                                                star <= Math.round(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length)
                                                    ? 'text-yellow-400'
                                                    : 'text-gray-300'
                                            }`}
                                        >
                                            ★
                                        </span>
                                    ))}
                                </div>
                                <span className="text-lg font-bold text-gray-900">
                                    {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)}
                                </span>
                                <span className="text-sm text-gray-600">
                                    ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
                                </span>
                            </div>
                        </div>

                        {/* Most Recent 2-3 Reviews */}
                        {reviews.slice(0, 3).map((review) => (
                            <div key={review._id} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="flex">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <span
                                                    key={star}
                                                    className={`text-sm ${
                                                        star <= review.rating
                                                            ? 'text-yellow-400'
                                                            : 'text-gray-300'
                                                    }`}
                                                >
                                                    ★
                                                </span>
                                            ))}
                                        </div>
                                        <span className="text-sm font-semibold text-gray-900">
                                            {review.rating}.0
                                        </span>
                                    </div>
                                    <p className="text-sm font-semibold text-indigo-600">
                                        {review.tutorId?.name || 'Tutor'}
                                    </p>
                                </div>
                                {review.comment && (
                                    <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                                        "{review.comment}"
                                    </p>
                                )}
                                <p className="text-xs text-gray-500 mt-2">
                                    {new Date(review.createdAt).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric', 
                                        year: 'numeric' 
                                    })}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentProgressDashboard;
