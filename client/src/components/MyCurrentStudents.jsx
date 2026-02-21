import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import LoadingSkeleton from './LoadingSkeleton';
import EmptyState from './EmptyState';

// Handover modal for ending the tutor–student relationship
const HandoverModal = ({ student, onClose, onConfirm }) => {
    const [notes, setNotes]   = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setLoading(true);
        await onConfirm({ notes, reason });
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">End Engagement</h3>
                <p className="text-sm text-gray-500 mb-4">
                    You are ending the tutoring relationship with <strong>{student?.studentId?.name}</strong> for <strong>{student?.subject}</strong>.
                    Session history and notes will be preserved.
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason (shown to student)</label>
                        <select
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">Select a reason…</option>
                            <option value="Curriculum complete">Curriculum complete</option>
                            <option value="Student achieved target">Student achieved target</option>
                            <option value="Scheduling conflicts">Scheduling conflicts</option>
                            <option value="Student transferred">Student transferred</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Handover notes (private)</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Topics covered, student strengths/weaknesses, recommended next steps…"
                            rows={4}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-5">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 py-2 text-sm bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Ending…' : 'End Engagement'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const MyCurrentStudents = () => {
    const [currentStudents, setCurrentStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [handoverTarget, setHandoverTarget] = useState(null);
    const { showError, showSuccess } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        fetchCurrentStudents();
    }, []);

    const fetchCurrentStudents = async () => {
        try {
            const { data } = await api.get('/current-tutors/tutor/my-students');
            setCurrentStudents(data);
        } catch (err) {
            showError('Failed to fetch current students');
        } finally {
            setLoading(false);
        }
    };

    const handleEndEngagement = async ({ notes, reason }) => {
        if (!handoverTarget) return;
        try {
            await api.post(`/current-tutors/tutor/end/${handoverTarget._id}`, { notes, reason });
            showSuccess('Engagement ended. Student has been notified.');
            setHandoverTarget(null);
            fetchCurrentStudents();
        } catch {
            showError('Failed to end engagement');
        }
    };

    const calculateAttendancePercentage = (student) => {
        const total = student.totalSessionsBooked;
        const attended = student.sessionsCompleted;
        return total > 0 ? ((attended / total) * 100).toFixed(1) : 0;
    };

    if (loading) {
        return <LoadingSkeleton type="card" count={3} />;
    }

    return (
        <>
        <div className="space-y-6">
            {currentStudents.length === 0 ? (
                <EmptyState
                    icon="👨‍🎓"
                    title="No current students"
                    description="Students will appear here after you approve their booking requests."
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {currentStudents.map((student) => {
                        const relationship = student;
                        const studentInfo = student.studentId;
                        const attendancePercentage = calculateAttendancePercentage(relationship);

                        return (
                            <div
                                key={relationship._id}
                                className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:border-gray-300 transition-colors"
                            >
                                <div className="mb-4">
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                                        {studentInfo.name}
                                    </h3>
                                    <p className="text-sm text-gray-600 mb-1 font-medium">
                                        {relationship.subject}
                                        {relationship.classGrade && ` • Class ${relationship.classGrade}`}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {studentInfo.location?.area}, {studentInfo.location?.city}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Started: {new Date(relationship.relationshipStartDate).toLocaleDateString()}
                                    </p>
                                </div>

                                {/* Statistics */}
                                <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <div>
                                        <p className="text-xs text-gray-600 mb-1 font-medium">Total Sessions</p>
                                        <p className="text-2xl font-bold text-gray-900">{relationship.totalSessionsBooked}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600 mb-1 font-medium">Completed</p>
                                        <p className="text-2xl font-bold text-green-600">{relationship.sessionsCompleted}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600 mb-1 font-medium">Missed</p>
                                        <p className="text-2xl font-bold text-red-600">{relationship.sessionsMissed}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600 mb-1 font-medium">Attendance</p>
                                        <p className="text-2xl font-bold text-indigo-600">{attendancePercentage}%</p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => navigate(`/tutor-dashboard?tab=progress&studentId=${relationship.studentId._id}`)}
                                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-semibold"
                                        aria-label="View student progress"
                                    >
                                        View Analytics
                                    </button>
                                    <button
                                        onClick={() => navigate(`/tutor-dashboard?tab=sessions&studentId=${relationship.studentId._id}&currentTutorId=${relationship._id}`)}
                                        className="flex-1 px-4 py-2 bg-white text-gray-700 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors text-sm font-semibold"
                                        aria-label="Manage sessions with student"
                                    >
                                        Manage Sessions
                                    </button>
                                    <button
                                        onClick={() => setHandoverTarget(relationship)}
                                        className="w-full px-4 py-2 text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors text-xs font-semibold"
                                        aria-label="End this engagement"
                                    >
                                        End Engagement
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

        {/* Handover modal */}
        {handoverTarget && (
            <HandoverModal
                student={handoverTarget}
                onClose={() => setHandoverTarget(null)}
                onConfirm={handleEndEngagement}
            />
        )}
        </>
    );
};

export default MyCurrentStudents;

