import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import { useBookingStore } from '../stores/bookingStore';

const TutorProgressDashboard = () => {
    const [attendanceStats, setAttendanceStats] = useState(null);
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [currentStudents, setCurrentStudents] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [studentProgress, setStudentProgress] = useState([]);
    const [teachingStats, setTeachingStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const { showError } = useToast();
    const navigate = useNavigate();
    useEffect(() => {
        fetchAllData();
    }, [user?._id]);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            await useBookingStore.getState().fetch({ force: false });
            const [statsRes, attendanceRes, studentsRes, reviewsRes] = await Promise.all([
                api.get('/attendance/stats').catch(() => ({ data: null })),
                api.get('/attendance').catch(() => ({ data: [] })),
                api.get('/current-tutors/tutor/my-students').catch(() => ({ data: [] })),
                api.get(`/reviews/tutor/${user?._id}`).catch(() => ({ data: [] }))
            ]);

            setAttendanceStats(statsRes.data);
            setAttendanceRecords(attendanceRes.data || []);
            setCurrentStudents(studentsRes.data || []);
            setReviews(reviewsRes.data || []);

            const bookings = useBookingStore.getState().bookings || [];
            const totalSessions = bookings.length;
            const completedSessions = bookings.filter(b => b.status === 'completed').length;
            const upcomingSessions = bookings.filter(b => {
                if (!b.sessionDate) return false;
                return new Date(b.sessionDate) >= new Date() && b.status === 'approved';
            }).length;
            const pendingSessions = bookings.filter(b => b.status === 'pending').length;

            setTeachingStats({
                totalSessions,
                completedSessions,
                upcomingSessions,
                pendingSessions,
                studentsCount: (studentsRes.data || []).length
            });

            // Fetch progress for each student
            const studentProgressData = await Promise.all(
                (studentsRes.data || []).map(async (student) => {
                    try {
                        // Use the relationship _id (currentTutorId) for analytics
                        const { data: analytics } = await api.get(`/current-tutors/analytics/${student._id}`);
                        return {
                            studentId: student.studentId?._id || student.studentId,
                            studentName: student.studentId?.name || 'Unknown',
                            subject: student.subject,
                            relationshipId: student._id,
                            sessions: analytics?.sessions || { total: 0, completed: 0 },
                            attendance: analytics?.attendance || { percentage: 0, present: 0, absent: 0, total: 0 },
                            performance: analytics?.performance || { averageUnderstanding: 0, averageRating: 0 }
                        };
                    } catch (err) {
                        console.error(`Failed to fetch analytics for student ${student._id}:`, err);
                        return {
                            studentId: student.studentId?._id || student.studentId,
                            studentName: student.studentId?.name || 'Unknown',
                            subject: student.subject,
                            relationshipId: student._id,
                            sessions: { total: 0, completed: 0 },
                            attendance: { percentage: 0, present: 0, absent: 0, total: 0 },
                            performance: { averageUnderstanding: 0, averageRating: 0 }
                        };
                    }
                })
            );

            setStudentProgress(studentProgressData);
        } catch (err) {
            console.error('Failed to fetch progress data:', err);
            showError('Failed to load progress data');
        } finally {
            setLoading(false);
        }
    };

    // Calculate weekly trend for student attendance
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
        if (trend > 5) trendLabel = 'Student attendance is improving';
        else if (trend < -5) trendLabel = 'Student attendance needs attention';
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

    // Determine overall teaching status
    const getOverallStatus = () => {
        if (!attendanceStats || attendanceStats.total === 0) {
            return { label: 'Getting Started', color: 'bg-gray-100 text-gray-800' };
        }
        const rate = attendanceStats.attendancePercentage || 0;
        if (rate >= 90) {
            return { label: 'Excellent', color: 'bg-lime/30 text-navy-950' };
        } else if (rate >= 75) {
            return { label: 'Good Progress', color: 'bg-royal/10 text-royal-dark' };
        } else {
            return { label: 'Needs Attention', color: 'bg-lime/30 text-navy-950' };
        }
    };

    const overallStatus = getOverallStatus();

    // Get last session date for a student
    const getLastSessionDate = (studentId) => {
        const studentSessions = attendanceRecords.filter(a => a.studentId?._id === studentId);
        if (studentSessions.length === 0) return null;
        const sorted = studentSessions.sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate));
        return sorted[0].sessionDate;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* SECTION 1: Overall Teaching Health */}
            <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-navy-950 mb-6">Overall Teaching Health</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Primary Metric: Student Attendance */}
                    <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm font-medium text-gray-600 mb-3">Student Attendance Rate</p>
                        <p className="text-6xl font-bold text-navy-950 mb-2">
                            {attendanceStats?.attendancePercentage || 0}%
                        </p>
                        <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${overallStatus.color}`}>
                            {overallStatus.label}
                        </span>
                    </div>

                    {/* Supporting Metrics */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                            <p className="text-3xl font-bold text-navy-950 mb-1">
                                {teachingStats?.totalSessions || 0}
                            </p>
                            <p className="text-xs text-gray-600 font-medium">Total Sessions</p>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                            <p className="text-3xl font-bold text-lime-dark mb-1">
                                {teachingStats?.completedSessions || 0}
                            </p>
                            <p className="text-xs text-gray-600 font-medium">Completed</p>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                            <p className="text-3xl font-bold text-royal mb-1">
                                {teachingStats?.studentsCount || 0}
                            </p>
                            <p className="text-xs text-gray-600 font-medium">Students</p>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
                            <p className="text-3xl font-bold text-lime-dark mb-1">
                                {teachingStats?.upcomingSessions || 0}
                            </p>
                            <p className="text-xs text-gray-600 font-medium">Upcoming</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 2: Consistency & Trends */}
            {attendanceRecords.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-navy-950 mb-4">Consistency & Trends</h3>
                    <div className="flex items-center justify-between p-6 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                            <p className="text-sm text-gray-600 mb-2">This Week vs Last Week</p>
                            <p className="text-2xl font-bold text-navy-950 mb-1">
                                {weeklyTrend.thisWeek}% → {weeklyTrend.lastWeek}%
                            </p>
                            <p className={`text-sm font-medium ${
                                weeklyTrend.trend > 0 ? 'text-lime-dark' : 
                                weeklyTrend.trend < 0 ? 'text-lime-dark' : 'text-gray-600'
                            }`}>
                                {weeklyTrend.trend > 0 ? '↑' : weeklyTrend.trend < 0 ? '↓' : '→'} {Math.abs(weeklyTrend.trend)}% change
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-base font-semibold text-navy-950">
                                {weeklyTrend.trendLabel}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* SECTION 3: Student-wise Progress Breakdown */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-navy-950 mb-6">Progress by Student</h3>
                {currentStudents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">No students yet</p>
                        <p className="text-xs mt-1">Student progress will appear here once you start teaching</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {studentProgress.map((student) => {
                            const lastSession = getLastSessionDate(student.studentId);
                            return (
                                <div
                                    key={student.relationshipId}
                                    className="border border-gray-200 rounded-lg p-6 hover:border-royal/40 hover:shadow-sm transition-all"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h4 className="text-base font-semibold text-navy-950 mb-1">
                                                {student.studentName}
                                            </h4>
                                            <p className="text-sm text-gray-600">{student.subject}</p>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/tutor-dashboard?tab=progress&studentId=${student.studentId}`)}
                                            className="px-4 py-2 bg-royal text-white text-sm font-semibold rounded-md hover:bg-royal-dark transition-colors"
                                        >
                                            View Detailed Report
                                        </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-4 gap-4 mb-4">
                                        <div>
                                            <p className="text-xs text-gray-600 mb-1">Total Sessions</p>
                                            <p className="text-xl font-bold text-navy-950">
                                                {student.sessions?.total || 0}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600 mb-1">Attendance</p>
                                            <p className="text-xl font-bold text-royal">
                                                {student.attendance?.percentage || 0}%
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600 mb-1">Understanding</p>
                                            <p className="text-xl font-bold text-lime-dark">
                                                {student.performance?.averageUnderstanding?.toFixed(1) || '0.0'}/5
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600 mb-1">Last Session</p>
                                            <p className="text-sm font-medium text-navy-950">
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
                )}
            </div>

            {/* SECTION 4: Feedback & Reviews (Context Only) */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-navy-950">Student Reviews</h3>
                    {reviews.length > 3 && (
                        <button
                            onClick={() => navigate('/tutor-dashboard?tab=profile')}
                            className="text-sm text-royal hover:text-navy-900 font-medium"
                        >
                            View All →
                        </button>
                    )}
                </div>
                
                {reviews.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">No reviews yet</p>
                        <p className="text-xs mt-1">Student feedback will appear here</p>
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
                                                    ? 'text-lime-dark'
                                                    : 'text-gray-300'
                                            }`}
                                        >
                                            ★
                                        </span>
                                    ))}
                                </div>
                                <span className="text-lg font-bold text-navy-950">
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
                                                            ? 'text-lime-dark'
                                                            : 'text-gray-300'
                                                    }`}
                                                >
                                                    ★
                                                </span>
                                            ))}
                                        </div>
                                        <span className="text-sm font-semibold text-navy-950">
                                            {review.rating}.0
                                        </span>
                                    </div>
                                    <p className="text-sm font-semibold text-royal">
                                        {review.studentId?.name || 'Student'}
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

export default TutorProgressDashboard;
