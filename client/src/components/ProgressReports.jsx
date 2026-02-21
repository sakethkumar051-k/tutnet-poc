import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import LoadingSkeleton from './LoadingSkeleton';
import EmptyState from './EmptyState';

const ProgressReports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const { showError } = useToast();

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const { data } = await api.get('/progress-reports');
            setReports(data || []);
        } catch (err) {
            console.error('Progress reports fetch error:', err);
            // Don't show error if it's just empty data
            if (err.response?.status !== 404) {
                showError('Failed to fetch progress reports');
            }
            setReports([]);
        } finally {
            setLoading(false);
        }
    };

    const getImprovementColor = (improvement) => {
        const colors = {
            excellent: 'bg-green-100 text-green-800',
            good: 'bg-blue-100 text-blue-800',
            average: 'bg-yellow-100 text-yellow-800',
            needs_improvement: 'bg-red-100 text-red-800'
        };
        return colors[improvement] || colors.average;
    };

    if (loading) {
        return <LoadingSkeleton type="list" count={3} />;
    }

    return (
        <div className="space-y-4">
            {reports.length === 0 ? (
                <EmptyState
                    icon="📊"
                    title="No progress reports available"
                    description={user?.role === 'student' 
                        ? 'Your tutors will create progress reports after sessions. Check back after your first completed session!'
                        : 'Create progress reports for your students after completing sessions.'}
                />
            ) : (
                reports.map((report) => (
                    <div
                        key={report._id}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">{report.subject}</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    {user?.role === 'student' 
                                        ? `Tutor: ${report.tutorId?.name}`
                                        : `Student: ${report.studentId?.name}`}
                                </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getImprovementColor(report.performance?.improvement)}`}>
                                {report.performance?.improvement?.replace('_', ' ').toUpperCase() || 'N/A'}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            {/* Attendance */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Attendance</h4>
                                <div className="space-y-1">
                                    <p className="text-sm text-gray-600">
                                        Total Sessions: <span className="font-semibold">{report.attendance?.totalSessions || 0}</span>
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Attended: <span className="font-semibold">{report.attendance?.attendedSessions || 0}</span>
                                    </p>
                                    <div className="mt-2">
                                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                            <span>Attendance Rate</span>
                                            <span>{report.attendance?.attendancePercentage || 0}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-indigo-600 h-2 rounded-full"
                                                style={{ width: `${report.attendance?.attendancePercentage || 0}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Performance */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Performance</h4>
                                <div className="space-y-1">
                                    <p className="text-sm text-gray-600">
                                        Assignments: <span className="font-semibold">{report.performance?.assignmentsCompleted || 0}</span>
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Average Score: <span className="font-semibold">{report.performance?.averageScore || 0}%</span>
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Improvement: <span className="font-semibold capitalize">
                                            {report.performance?.improvement?.replace('_', ' ') || 'N/A'}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {report.notes && (
                            <div className="mt-4 p-3 bg-indigo-50 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 mb-1">Notes:</p>
                                <p className="text-sm text-gray-600">{report.notes}</p>
                            </div>
                        )}

                        <p className="text-xs text-gray-400 mt-4">
                            Generated: {new Date(report.generatedAt).toLocaleDateString()}
                        </p>
                    </div>
                ))
            )}
        </div>
    );
};

export default ProgressReports;

