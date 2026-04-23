import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import LoadingSkeleton from './LoadingSkeleton';

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
            showSuccess('Relationship ended');
            setShowEndModal(false);
            setSelectedTutor(null);
            fetchCurrentTutors();
        } catch (err) {
            showError('Failed to end relationship');
        }
    };

    if (loading) {
        return <LoadingSkeleton type="card" count={3} />;
    }

    if (currentTutors.length === 0) {
        return (
            <div className="bg-white rounded-3xl border border-gray-100 p-10 sm:p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-royal/10 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-royal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                </div>
                <h3 className="text-xl font-extrabold text-navy-950 tracking-tight">No active tutors yet</h3>
                <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto leading-relaxed">
                    Pick a tutor you like, book a free trial, and you'll see them here with stats and session controls.
                </p>
                <button
                    onClick={() => navigate('/find-tutors')}
                    className="mt-6 px-6 py-2.5 bg-lime hover:bg-lime-light text-navy-950 text-sm font-bold rounded-full transition-colors"
                >
                    Find a tutor
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {currentTutors.map((tutor) => (
                    <TutorRelationshipCard
                        key={tutor._id}
                        relationship={tutor}
                        onViewAnalytics={() => navigate(`/student-dashboard?tab=progress&tutorId=${tutor.tutorId._id}`)}
                        onManageSessions={() => navigate(`/student-dashboard?tab=sessions&tutorId=${tutor.tutorId._id}&currentTutorId=${tutor._id}`)}
                        onEndRelationship={() => { setSelectedTutor(tutor); setShowEndModal(true); }}
                    />
                ))}
            </div>

            {showEndModal && selectedTutor && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
                     onClick={(e) => { if (e.target === e.currentTarget) setShowEndModal(false); }}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[420px] overflow-hidden">
                        <div className="p-6">
                            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center mb-3">
                                <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-extrabold text-navy-950 tracking-tight">
                                End relationship with {selectedTutor.tutorId.name}?
                            </h3>
                            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                                Pending or upcoming sessions with this tutor will be cancelled. You'll still be able to book them again later.
                            </p>
                            <div className="flex gap-2 mt-6">
                                <button
                                    onClick={() => setShowEndModal(false)}
                                    className="flex-1 py-2.5 rounded-full border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
                                >
                                    Keep tutor
                                </button>
                                <button
                                    onClick={handleEndRelationship}
                                    className="flex-1 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition-colors"
                                >
                                    End relationship
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

function TutorRelationshipCard({ relationship, onViewAnalytics, onManageSessions, onEndRelationship }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const navigate = useNavigate();
    useEffect(() => {
        if (!menuOpen) return undefined;
        const onClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [menuOpen]);

    const tutorInfo = relationship.tutorId;
    const attendancePct = relationship.totalSessionsBooked > 0
        ? ((relationship.sessionsCompleted / relationship.totalSessionsBooked) * 100).toFixed(0)
        : null;
    const initials = (tutorInfo?.name || '').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();

    // Resolve the TutorProfile._id lazily on click → navigate to public profile.
    const openProfile = async (e) => {
        e.stopPropagation();
        try {
            const { data } = await api.get(`/tutors/profile-by-user/${tutorInfo._id}`);
            const profileId = data?._id || data?.profile?._id;
            if (profileId) navigate(`/tutor/${profileId}`);
        } catch (_) {
            // fallback to find-tutors search
            navigate('/find-tutors');
        }
    };

    return (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 hover:border-royal/30 hover:shadow-sm transition-all">
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                        type="button"
                        onClick={openProfile}
                        aria-label={`View ${tutorInfo?.name} profile`}
                        className="w-11 h-11 rounded-xl bg-gradient-to-br from-navy-950 to-royal flex items-center justify-center text-white font-bold text-sm flex-shrink-0 hover:ring-2 hover:ring-royal/40 transition-all"
                    >
                        {initials}
                    </button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                type="button"
                                onClick={openProfile}
                                className="text-base font-extrabold text-navy-950 truncate hover:text-royal transition-colors"
                            >
                                {tutorInfo?.name}
                            </button>
                            <StatusBadge status={relationship.status} />
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5 truncate">
                            {relationship.subject}{relationship.classGrade ? ` · Class ${relationship.classGrade}` : ''}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {tutorInfo?.location?.area}{tutorInfo?.location?.city ? `, ${tutorInfo.location.city}` : ''} · Started {new Date(relationship.relationshipStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </p>
                    </div>
                </div>
                <div className="relative flex-shrink-0" ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen((v) => !v)}
                        aria-label="More options"
                        className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <circle cx="12" cy="6" r="1" />
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="12" cy="18" r="1" />
                        </svg>
                    </button>
                    {menuOpen && (
                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-10">
                            <button
                                onClick={() => { setMenuOpen(false); onEndRelationship(); }}
                                className="w-full px-4 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                                End relationship
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats — show only when there's actually data */}
            {relationship.totalSessionsBooked > 0 ? (
                <div className="grid grid-cols-4 gap-2 mb-4 p-3 bg-[#f7f7f7] rounded-xl">
                    <Stat value={relationship.totalSessionsBooked} label="Booked" />
                    <Stat value={relationship.sessionsCompleted} label="Done" accent="lime" />
                    <Stat value={relationship.sessionsCancelled} label="Cancelled" dim={relationship.sessionsCancelled === 0} accent="rose" />
                    <Stat value={`${attendancePct}%`} label="Attendance" accent="royal" />
                </div>
            ) : (
                <div className="mb-4 p-3 bg-[#f7f7f7] rounded-xl text-xs text-gray-500 text-center">
                    Book a session — stats will appear here once classes start.
                </div>
            )}

            <div className="flex gap-2">
                <button
                    onClick={onViewAnalytics}
                    className="flex-1 px-4 py-2.5 bg-navy-950 hover:bg-navy-900 text-white rounded-full text-xs font-bold transition-colors"
                >
                    View progress
                </button>
                <button
                    onClick={onManageSessions}
                    className="flex-1 px-4 py-2.5 border border-gray-200 text-navy-950 rounded-full text-xs font-bold hover:bg-gray-50 transition-colors"
                >
                    Sessions
                </button>
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    const map = {
        new: 'bg-royal/10 text-royal-dark',
        active: 'bg-lime/30 text-navy-950',
        near_completion: 'bg-yellow-100 text-yellow-800',
        completed: 'bg-gray-100 text-gray-700',
        cancelled: 'bg-rose-100 text-rose-700'
    };
    const cls = map[status] || 'bg-gray-100 text-gray-700';
    const label = status === 'near_completion' ? 'Near end' : (status?.charAt(0).toUpperCase() + status?.slice(1));
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${cls}`}>{label}</span>;
}

function Stat({ value, label, accent = 'navy', dim = false }) {
    const map = { navy: 'text-navy-950', lime: 'text-lime-dark', rose: 'text-rose-600', royal: 'text-royal' };
    const color = dim ? 'text-gray-300' : (map[accent] || 'text-navy-950');
    return (
        <div className="text-center">
            <p className={`text-lg font-extrabold ${color} tracking-tight leading-none`}>{value}</p>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wide mt-1">{label}</p>
        </div>
    );
}

export default MyCurrentTutors;
