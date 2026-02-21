import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';

const AdminAnalytics = () => {
    const [analytics, setAnalytics] = useState(null);
    const [reports, setReports] = useState(null);
    const [activity, setActivity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('analytics');
    const [reportType, setReportType] = useState('users');
    const { showError } = useToast();

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const { data } = await api.get('/admin/analytics');
            setAnalytics(data);
        } catch (err) {
            showError('Failed to fetch analytics');
        } finally {
            setLoading(false);
        }
    };

    const fetchReport = async () => {
        try {
            const { data } = await api.get(`/admin/reports?type=${reportType}`);
            setReports(data);
        } catch (err) {
            showError('Failed to generate report');
        }
    };

    const fetchActivity = async () => {
        try {
            const { data } = await api.get('/admin/activity');
            setActivity(data);
        } catch (err) {
            showError('Failed to fetch activity');
        }
    };

    useEffect(() => {
        if (activeTab === 'reports') {
            fetchReport();
        } else if (activeTab === 'activity') {
            fetchActivity();
        }
    }, [activeTab, reportType]);

    if (loading && !analytics) {
        return <div className="text-center py-8">Loading analytics...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {[
                        { id: 'analytics', label: 'Analytics', icon: '📊' },
                        { id: 'reports', label: 'Reports', icon: '📄' },
                        { id: 'activity', label: 'Activity', icon: '🔍' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`${activeTab === tab.id
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                        >
                            <span>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Analytics Tab */}
            {activeTab === 'analytics' && analytics && (
                <div className="space-y-6">
                    {/* Users Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Users</h3>
                            <p className="text-3xl font-bold text-gray-900">{analytics.users.total}</p>
                            <p className="text-xs text-gray-400 mt-2">+{analytics.users.recent} new (30 days)</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 className="text-sm font-medium text-gray-500 mb-2">Students</h3>
                            <p className="text-3xl font-bold text-blue-600">{analytics.users.students}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 className="text-sm font-medium text-gray-500 mb-2">Tutors</h3>
                            <p className="text-3xl font-bold text-indigo-600">{analytics.users.tutors}</p>
                            <p className="text-xs text-gray-400 mt-2">
                                {analytics.users.approvedTutors} approved, {analytics.users.pendingTutors} pending
                            </p>
                        </div>
                    </div>

                    {/* Bookings Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Bookings</h3>
                            <p className="text-3xl font-bold text-gray-900">{analytics.bookings.total}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 className="text-sm font-medium text-gray-500 mb-2">Completed</h3>
                            <p className="text-3xl font-bold text-green-600">{analytics.bookings.completed}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 className="text-sm font-medium text-gray-500 mb-2">Pending</h3>
                            <p className="text-3xl font-bold text-yellow-600">{analytics.bookings.pending}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 className="text-sm font-medium text-gray-500 mb-2">Recent (30d)</h3>
                            <p className="text-3xl font-bold text-blue-600">{analytics.bookings.recent}</p>
                        </div>
                    </div>

                    {/* Reviews & Attendance */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 className="text-sm font-medium text-gray-500 mb-2">Reviews</h3>
                            <p className="text-3xl font-bold text-gray-900">{analytics.reviews.total}</p>
                            <p className="text-sm text-gray-600 mt-2">
                                Average Rating: <span className="font-semibold">{analytics.reviews.averageRating} ⭐</span>
                            </p>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 className="text-sm font-medium text-gray-500 mb-2">Attendance</h3>
                            <p className="text-3xl font-bold text-gray-900">{analytics.attendance.total}</p>
                            <p className="text-sm text-gray-600 mt-2">
                                Rate: <span className="font-semibold">{analytics.attendance.rate}%</span>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                        <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                            className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md"
                        >
                            <option value="users">Users Report</option>
                            <option value="bookings">Bookings Report</option>
                            <option value="tutors">Tutors Report</option>
                        </select>
                        <button
                            onClick={fetchReport}
                            className="mt-2 md:mt-0 md:ml-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                            Generate Report
                        </button>
                    </div>
                    {reports && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold mb-4">Report Generated</h3>
                            <pre className="bg-gray-50 p-4 rounded overflow-auto text-xs">
                                {JSON.stringify(reports, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            )}

            {/* Activity Tab */}
            {activeTab === 'activity' && activity && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <h3 className="font-semibold mb-2">Recent Bookings</h3>
                            <p className="text-2xl font-bold">{activity.bookings.length}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <h3 className="font-semibold mb-2">Recent Reviews</h3>
                            <p className="text-2xl font-bold">{activity.reviews.length}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <h3 className="font-semibold mb-2">Recent Users</h3>
                            <p className="text-2xl font-bold">{activity.users.length}</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <h3 className="font-semibold mb-4">Activity Feed</h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {[...activity.bookings.slice(0, 5), ...activity.reviews.slice(0, 5), ...activity.users.slice(0, 5)]
                                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                .map((item, idx) => (
                                    <div key={idx} className="p-2 bg-gray-50 rounded text-sm">
                                        {item.studentId && `Booking: ${item.studentId.name} → ${item.tutorId?.name}`}
                                        {item.rating && `Review: ${item.rating}⭐ for ${item.tutorId?.name}`}
                                        {item.role && `New ${item.role}: ${item.name}`}
                                        <span className="text-gray-400 ml-2">
                                            {new Date(item.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAnalytics;

