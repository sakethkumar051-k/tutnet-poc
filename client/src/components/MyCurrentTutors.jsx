import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import LoadingSkeleton from './LoadingSkeleton';
import EmptyState from './EmptyState';

const MyCurrentTutors = () => {
    const [currentTutors, setCurrentTutors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTutor, setSelectedTutor] = useState(null);
    const [showEndModal, setShowEndModal] = useState(false);
    const { showSuccess, showError } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        fetchCurrentTutors();
    }, []);

    const fetchCurrentTutors = async () => {
        try {
            const { data } = await api.get('/current-tutors/student/my-tutors');
            setCurrentTutors(data);
        } catch (err) {
            showError('Failed to fetch current tutors');
        } finally {
            setLoading(false);
        }
    };

    const handleEndRelationship = async () => {
        try {
            await api.post(`/current-tutors/student/end/${selectedTutor._id}`);
            showSuccess('Relationship ended successfully');
            setShowEndModal(false);
            setSelectedTutor(null);
            fetchCurrentTutors();
        } catch (err) {
            showError('Failed to end relationship');
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            new: { bg: 'bg-royal/10', text: 'text-royal-dark', label: 'New' },
            active: { bg: 'bg-lime/30', text: 'text-navy-950', label: 'Active' },
            near_completion: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Near Completion' },
            completed: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Completed' },
            cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' }
        };
        const badge = badges[status] || badges.active;
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                {badge.label}
            </span>
        );
    };

    const calculateAttendancePercentage = (tutor) => {
        const total = tutor.totalSessionsBooked;
        const attended = tutor.sessionsCompleted;
        return total > 0 ? ((attended / total) * 100).toFixed(1) : 0;
    };

    if (loading) {
        return <LoadingSkeleton type="card" count={3} />;
    }

    return (
        <div className="space-y-6">
            {currentTutors.length === 0 ? (
                <EmptyState
                    icon="👨‍🏫"
                    title="No current tutors"
                    description="Book a tutor and get your first session approved to start a relationship!"
                    actionLabel="Find Tutors"
                    onAction={() => navigate('/find-tutors')}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {currentTutors.map((tutor) => {
                        const relationship = tutor;
                        const tutorInfo = tutor.tutorId;
                        const attendancePercentage = calculateAttendancePercentage(relationship);

                        return (
                            <div
                                key={relationship._id}
                                className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:border-gray-300 transition-colors"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-bold text-navy-950">
                                                {tutorInfo.name}
                                            </h3>
                                            {getStatusBadge(relationship.status)}
                                        </div>
                                        <p className="text-sm text-gray-600 mb-1 font-medium">
                                            {relationship.subject}
                                            {relationship.classGrade && ` • Class ${relationship.classGrade}`}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {tutorInfo.location?.area}, {tutorInfo.location?.city}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Started: {new Date(relationship.relationshipStartDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>

                                {/* Statistics */}
                                <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <div>
                                        <p className="text-xs text-gray-600 mb-1 font-medium">Total Sessions</p>
                                        <p className="text-2xl font-bold text-navy-950">{relationship.totalSessionsBooked}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600 mb-1 font-medium">Completed</p>
                                        <p className="text-2xl font-bold text-lime-dark">{relationship.sessionsCompleted}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600 mb-1 font-medium">Cancelled</p>
                                        <p className="text-2xl font-bold text-red-600">{relationship.sessionsCancelled}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600 mb-1 font-medium">Attendance</p>
                                        <p className="text-2xl font-bold text-royal">{attendancePercentage}%</p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => navigate(`/student-dashboard?tab=progress&tutorId=${relationship.tutorId._id}`)}
                                        className="flex-1 px-4 py-2 bg-royal text-white rounded-md hover:bg-royal-dark transition-colors text-sm font-semibold"
                                    >
                                        View Analytics
                                    </button>
                                    <button
                                        onClick={() => navigate(`/student-dashboard?tab=sessions&tutorId=${relationship.tutorId._id}&currentTutorId=${relationship._id}`)}
                                        className="flex-1 px-4 py-2 bg-white text-gray-700 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors text-sm font-semibold"
                                    >
                                        Manage Sessions
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedTutor(relationship);
                                            setShowEndModal(true);
                                        }}
                                        className="px-4 py-2 bg-white text-red-600 rounded-md border border-red-200 hover:bg-red-50 transition-colors text-sm font-semibold"
                                    >
                                        End Relationship
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* End Relationship Modal */}
            {showEndModal && selectedTutor && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h2 className="text-xl font-bold mb-4">End Relationship</h2>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to end your relationship with <strong>{selectedTutor.tutorId.name}</strong>?
                            This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowEndModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEndRelationship}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                            >
                                End Relationship
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyCurrentTutors;

