import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const AttendanceTracker = () => {
    const [attendance, setAttendance] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const { showError } = useToast();

    const fetchAttendance = useCallback(async () => {
        try {
            const { data } = await api.get('/attendance');
            setAttendance(data);
        } catch (err) {
            showError('Failed to fetch attendance');
        } finally {
            setLoading(false);
        }
    }, [showError]);

    const fetchStats = useCallback(async () => {
        try {
            const { data } = await api.get('/attendance/stats');
            setStats(data);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    }, []);

    useEffect(() => {
        fetchAttendance();
        fetchStats();
    }, [fetchAttendance, fetchStats]);

    const getStatusColor = (status) => {
        const colors = {
            present: 'bg-green-100 text-green-800',
            absent: 'bg-red-100 text-red-800',
            late: 'bg-yellow-100 text-yellow-800',
            excused: 'bg-blue-100 text-blue-800'
        };
        return colors[status] || colors.present;
    };

    if (loading) {
        return <div className="text-center py-8">Loading attendance...</div>;
    }

    // Calculate weekly and monthly trends
    const getWeeklyTrend = () => {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisWeek = attendance.filter(a => new Date(a.sessionDate) >= weekAgo);
        const lastWeek = attendance.filter(a => {
            const date = new Date(a.sessionDate);
            return date >= new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000) && date < weekAgo;
        });

        const thisWeekPresent = thisWeek.filter(a => a.status === 'present').length;
        const thisWeekTotal = thisWeek.length;
        const lastWeekPresent = lastWeek.filter(a => a.status === 'present').length;
        const lastWeekTotal = lastWeek.length;

        const thisWeekRate = thisWeekTotal > 0 ? (thisWeekPresent / thisWeekTotal * 100).toFixed(1) : 0;
        const lastWeekRate = lastWeekTotal > 0 ? (lastWeekPresent / lastWeekTotal * 100).toFixed(1) : 0;

        return {
            thisWeek: parseFloat(thisWeekRate),
            lastWeek: parseFloat(lastWeekRate),
            trend: parseFloat(thisWeekRate) - parseFloat(lastWeekRate)
        };
    };

    const weeklyTrend = getWeeklyTrend();

    // Group by month for monthly view
    const getMonthlyData = () => {
        const monthly = {};
        attendance.forEach(record => {
            const date = new Date(record.sessionDate);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthly[monthKey]) {
                monthly[monthKey] = { total: 0, present: 0, absent: 0, late: 0 };
            }
            monthly[monthKey].total++;
            if (record.status === 'present') monthly[monthKey].present++;
            else if (record.status === 'absent') monthly[monthKey].absent++;
            else if (record.status === 'late') monthly[monthKey].late++;
        });
        return monthly;
    };

    const monthlyData = getMonthlyData();

    return (
        <div className="space-y-6">
            {/* Statistics Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-white rounded-lg border border-gray-200 p-6 text-center shadow-sm">
                        <p className="text-4xl font-bold text-gray-900 mb-2">{stats.total}</p>
                        <p className="text-sm text-gray-600 font-medium">Total Sessions</p>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-6 text-center shadow-sm">
                        <p className="text-4xl font-bold text-gray-900 mb-2">{stats.present}</p>
                        <p className="text-sm text-gray-600 font-medium mb-1">Present</p>
                        {stats.total > 0 && (
                            <p className="text-sm font-semibold text-green-600">
                                {((stats.present / stats.total) * 100).toFixed(1)}%
                            </p>
                        )}
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-6 text-center shadow-sm">
                        <p className="text-4xl font-bold text-gray-900 mb-2">{stats.absent}</p>
                        <p className="text-sm text-gray-600 font-medium mb-1">Absent</p>
                        {stats.total > 0 && (
                            <p className="text-sm font-semibold text-red-600">
                                {((stats.absent / stats.total) * 100).toFixed(1)}%
                            </p>
                        )}
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-6 text-center shadow-sm">
                        <p className="text-4xl font-bold text-gray-900 mb-2">{stats.late}</p>
                        <p className="text-sm text-gray-600 font-medium mb-1">Late</p>
                        {stats.total > 0 && (
                            <p className="text-sm font-semibold text-yellow-600">
                                {((stats.late / stats.total) * 100).toFixed(1)}%
                            </p>
                        )}
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-6 text-center shadow-sm">
                        <p className="text-4xl font-bold text-indigo-600 mb-2">{stats.attendancePercentage}%</p>
                        <p className="text-sm text-gray-600 font-medium mb-1">Attendance Rate</p>
                        {weeklyTrend.trend !== 0 && (
                            <div className="flex items-center justify-center gap-1 mt-1">
                                <span className={`text-sm font-semibold ${
                                    weeklyTrend.trend > 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {weeklyTrend.trend > 0 ? '↑' : '↓'} {Math.abs(weeklyTrend.trend).toFixed(1)}%
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Weekly Trend */}
            {stats && attendance.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                    <h3 className="text-base font-bold text-gray-900 mb-5 pb-3 border-b border-gray-200">Weekly Trend</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-5 bg-indigo-50 rounded-lg border border-indigo-100">
                            <p className="text-sm text-gray-600 mb-2 font-medium">This Week</p>
                            <p className="text-3xl font-bold text-indigo-600 mb-1">{weeklyTrend.thisWeek}%</p>
                            <p className="text-xs text-gray-600">
                                {attendance.filter(a => {
                                    const date = new Date(a.sessionDate);
                                    return date >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                                }).filter(a => a.status === 'present').length} present
                            </p>
                        </div>
                        <div className="p-5 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-sm text-gray-600 mb-2 font-medium">Last Week</p>
                            <p className="text-3xl font-bold text-gray-700 mb-1">{weeklyTrend.lastWeek}%</p>
                            <p className="text-xs text-gray-600">Previous period</p>
                        </div>
                        <div className={`p-5 rounded-lg border ${
                            weeklyTrend.trend > 0 ? 'bg-green-50 border-green-100' : weeklyTrend.trend < 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-200'
                        }`}>
                            <p className="text-sm text-gray-600 mb-2 font-medium">Change</p>
                            <p className={`text-3xl font-bold mb-1 ${
                                weeklyTrend.trend > 0 ? 'text-green-600' : weeklyTrend.trend < 0 ? 'text-red-600' : 'text-gray-700'
                            }`}>
                                {weeklyTrend.trend > 0 ? '+' : ''}{weeklyTrend.trend.toFixed(1)}%
                            </p>
                            <p className="text-xs text-gray-600">
                                {weeklyTrend.trend > 0 ? 'Improving' : weeklyTrend.trend < 0 ? 'Declining' : 'Stable'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Monthly Breakdown */}
            {Object.keys(monthlyData).length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                    <h3 className="text-base font-bold text-gray-900 mb-5 pb-3 border-b border-gray-200">Monthly Breakdown</h3>
                    <div className="space-y-4">
                        {Object.entries(monthlyData)
                            .sort((a, b) => b[0].localeCompare(a[0]))
                            .slice(0, 6)
                            .map(([month, data]) => {
                                const rate = data.total > 0 ? (data.present / data.total * 100).toFixed(1) : 0;
                                const date = new Date(month + '-01');
                                return (
                                    <div key={month} className="border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors">
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="font-semibold text-gray-900">
                                                {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                            </p>
                                            <p className="text-xl font-bold text-indigo-600">{rate}%</p>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                                            <span className="font-medium">Total: {data.total}</span>
                                            <span className="text-green-600 font-medium">Present: {data.present}</span>
                                            <span className="text-red-600 font-medium">Absent: {data.absent}</span>
                                            {data.late > 0 && <span className="text-yellow-600 font-medium">Late: {data.late}</span>}
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div
                                                className="bg-indigo-600 h-2.5 rounded-full transition-all"
                                                style={{ width: `${rate}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}

            {/* Attendance List */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-base font-bold text-gray-900">Attendance Records</h3>
                    <p className="text-sm text-gray-600 mt-1">Complete history of all attendance records</p>
                </div>
                <div className="divide-y divide-gray-200">
                    {attendance.length === 0 ? (
                        <div className="px-6 py-12 text-center text-gray-500">
                            <p className="text-lg mb-2">No attendance records found</p>
                            <p className="text-sm">Attendance will appear here once sessions are marked</p>
                        </div>
                    ) : (
                        attendance.map((record) => (
                            <div key={record._id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                                                {record.status}
                                            </span>
                                            <p className="text-sm font-semibold text-gray-900">
                                                {user?.role === 'student' 
                                                    ? record.tutorId?.name 
                                                    : record.studentId?.name}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-gray-600">
                                            <span className="flex items-center gap-1">
                                                📅 {new Date(record.sessionDate).toLocaleDateString('en-US', { 
                                                    weekday: 'short', 
                                                    year: 'numeric', 
                                                    month: 'short', 
                                                    day: 'numeric' 
                                                })}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                ⏱️ {record.duration} minutes
                                            </span>
                                        </div>
                                        {record.notes && (
                                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                                                <span className="font-medium">Notes: </span>{record.notes}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AttendanceTracker;

