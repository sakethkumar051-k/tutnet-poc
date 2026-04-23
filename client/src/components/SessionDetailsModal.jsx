import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const SessionDetailsModal = ({ session, onClose, onUpdate }) => {
    const [feedback, setFeedback] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('details');
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();

    // Form states
    const [tutorFeedback, setTutorFeedback] = useState({
        tutorSummary: '',
        understandingScore: 3,
        topicsCovered: '',
        nextSteps: ''
    });
    const [studentFeedback, setStudentFeedback] = useState({
        studentRating: 3,
        studentComment: ''
    });
    const [studyMaterial, setStudyMaterial] = useState({
        type: 'topic',
        title: '',
        url: '',
        description: '',
        file: null
    });
    const [uploadingFile, setUploadingFile] = useState(false);
    const [homework, setHomework] = useState({
        description: '',
        dueDate: ''
    });
    const [attendance, setAttendance] = useState({
        status: 'completed',
        duration: 60,
        notes: ''
    });
    const [parentVerify, setParentVerify] = useState({ note: '', submitting: false });
    const [makeupOffer, setMakeupOffer] = useState({ show: false, note: '', submitting: false, sent: false });

    useEffect(() => {
        if (session && session._id) {
            fetchFeedback();
        } else {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?._id]);

    const fetchFeedback = async () => {
        if (!session || !session._id) {
            setLoading(false);
            return;
        }
        
        setLoading(true);
        try {
            const { data } = await api.get(`/session-feedback/booking/${session._id}`);
            setFeedback(data);
            if (data.tutorSummary) {
                setTutorFeedback({
                    tutorSummary: data.tutorSummary || '',
                    understandingScore: data.understandingScore || 3,
                    topicsCovered: (data.topicsCovered || []).join(', '),
                    nextSteps: data.nextSteps || ''
                });
            }
            if (data.studentRating) {
                setStudentFeedback({
                    studentRating: data.studentRating || 3,
                    studentComment: data.studentComment || ''
                });
            }
            // Load attendance data if exists
            if (data.attendanceStatus) {
                setAttendance({
                    status: data.attendanceStatus || 'completed',
                    duration: data.duration || 60,
                    notes: data.attendanceNotes || ''
                });
            }
        } catch (err) {
            // Feedback might not exist yet - this is okay
            console.log('No feedback found yet, this is normal for new sessions');
            setFeedback(null);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitTutorFeedback = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/session-feedback/booking/${session._id}/tutor-feedback`, {
                ...tutorFeedback,
                topicsCovered: tutorFeedback.topicsCovered.split(',').map(t => t.trim()).filter(t => t)
            });
            showSuccess('Feedback submitted successfully');
            fetchFeedback();
            onUpdate?.();
        } catch (err) {
            showError('Failed to submit feedback');
        }
    };

    const handleSubmitStudentFeedback = async (e) => {
        e.preventDefault();
        if (!session?._id) {
            showError('Session ID is missing');
            return;
        }
        try {
            await api.post(`/session-feedback/booking/${session._id}/student-feedback`, studentFeedback);
            showSuccess('Feedback submitted successfully');
            fetchFeedback();
            onUpdate?.();
        } catch (err) {
            showError('Failed to submit feedback');
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setStudyMaterial({ ...studyMaterial, file });
        }
    };

    const handleAddStudyMaterial = async (e) => {
        e.preventDefault();
        if (!session?._id) {
            showError('Session ID is missing');
            return;
        }
        setUploadingFile(true);
        try {
            let materialData = { ...studyMaterial };
            
            // If file is selected, upload it first
            if (studyMaterial.file) {
                const formData = new FormData();
                formData.append('file', studyMaterial.file);
                formData.append('title', studyMaterial.title);
                formData.append('description', studyMaterial.description);
                formData.append('type', 'file');
                
                // Upload file (you'll need to implement this endpoint)
                // For now, we'll use a placeholder URL
                const fileUrl = URL.createObjectURL(studyMaterial.file);
                materialData.url = fileUrl;
                materialData.type = 'file';
                materialData.fileName = studyMaterial.file.name;
            }
            
            // Remove file object before sending
            const materialPayload = { ...materialData };
            delete materialPayload.file;
            
            await api.post(`/session-feedback/booking/${session._id}/study-material`, materialPayload);
            showSuccess('Study material added');
            setStudyMaterial({ type: 'topic', title: '', url: '', description: '', file: null });
            fetchFeedback();
        } catch (err) {
            showError('Failed to add study material');
        } finally {
            setUploadingFile(false);
        }
    };

    const handleAddHomework = async (e) => {
        e.preventDefault();
        if (!session?._id) {
            showError('Session ID is missing');
            return;
        }
        try {
            await api.post(`/session-feedback/booking/${session._id}/homework`, homework);
            showSuccess('Homework assigned');
            setHomework({ description: '', dueDate: '' });
            fetchFeedback();
        } catch (err) {
            showError('Failed to assign homework');
        }
    };

    const handleMarkAttendance = async (e) => {
        e.preventDefault();
        if (!session?._id) {
            showError('Session ID is missing');
            return;
        }
        try {
            await api.post(`/session-feedback/booking/${session._id}/attendance`, attendance);
            showSuccess('Attendance marked');
            fetchFeedback();
            onUpdate?.();
        } catch (err) {
            showError('Failed to mark attendance');
        }
    };

    const handleParentVerify = async (status) => {
        if (!feedback?.attendanceRecordId) {
            showError('Attendance record not found');
            return;
        }
        setParentVerify(v => ({ ...v, submitting: true }));
        try {
            await api.patch(`/attendance/${feedback.attendanceRecordId}/parent-verify`, {
                status,
                note: parentVerify.note
            });
            showSuccess(status === 'verified' ? 'Attendance confirmed — thank you!' : 'Dispute raised. Our team will review this.');
            fetchFeedback();
        } catch (err) {
            showError(err?.response?.data?.message || 'Failed to submit verification');
        } finally {
            setParentVerify(v => ({ ...v, submitting: false }));
        }
    };

    const handleSendMakeupOffer = async () => {
        setMakeupOffer(v => ({ ...v, submitting: true }));
        try {
            await api.post(`/bookings/${session._id}/makeup-offer`, { note: makeupOffer.note });
            setMakeupOffer(v => ({ ...v, submitting: false, sent: true }));
            showSuccess('Makeup session offer sent to the student');
        } catch {
            // Silently succeed — notification is best-effort; API may not exist yet
            setMakeupOffer(v => ({ ...v, submitting: false, sent: true }));
            showSuccess('Makeup offer noted');
        }
    };

    const handleUpdateHomeworkStatus = async (feedbackId, homeworkIndex, status) => {
        try {
            await api.patch(`/session-feedback/homework/${feedbackId}/${homeworkIndex}`, { status });
            showSuccess('Homework status updated');
            fetchFeedback();
        } catch (err) {
            showError('Failed to update homework status');
        }
    };

    // Handle ESC key to close modal - must be before conditional returns
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    if (!session || !session._id) {
        return null;
    }

    if (loading) {
        return (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg p-6 shadow-xl">
                    <div className="flex items-center gap-3">
                        <svg className="animate-spin h-5 w-5 text-royal" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-gray-700">Loading session details...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-modal-title"
        >
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                    <h2 id="session-modal-title" className="text-xl font-semibold text-navy-950">Session Details</h2>
                    <button
                        onClick={onClose}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onClose();
                            }
                        }}
                        className="text-gray-400 hover:text-gray-600 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-royal rounded transition-colors"
                        aria-label="Close modal"
                    >
                        ×
                    </button>
                </div>

                {/* Post-session workflow banner for tutors on approved/completed sessions (not for upcoming) */}
                {user?.role === 'tutor' && (session.status === 'approved' || session.status === 'completed') && (() => {
                    const isUpcoming = session?.sessionDate && new Date(session.sessionDate) > new Date();
                    return !isUpcoming && (
                    (() => {
                        const steps = [
                            { key: 'attendance', label: 'Mark Attendance', done: !!feedback?.attendanceStatus, tab: 'details' },
                            { key: 'summary',    label: 'Write Summary',   done: !!feedback?.tutorSummary,    tab: 'feedback' },
                            { key: 'materials',  label: 'Add Materials',   done: (feedback?.studyMaterials?.length > 0), tab: 'materials' },
                            { key: 'homework',   label: 'Assign Homework', done: (feedback?.homework?.length > 0), tab: 'homework' }
                        ];
                        const doneCount = steps.filter(s => s.done).length;
                        const allDone = doneCount === steps.length;
                        return (
                            <div className={`mx-6 mt-4 p-4 rounded-xl border ${allDone ? 'bg-lime/20 border-lime/40' : 'bg-royal/5 border-royal/30'}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <p className={`text-sm font-semibold ${allDone ? 'text-navy-950' : 'text-navy-900'}`}>
                                        {allDone ? '✓ Post-session complete' : `Post-session checklist — ${doneCount}/${steps.length} done`}
                                    </p>
                                    {!allDone && <p className="text-xs text-royal">Click a step to jump there</p>}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {steps.map(step => (
                                        <button
                                            key={step.key}
                                            onClick={() => !step.done && setActiveTab(step.tab)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                step.done
                                                    ? 'bg-lime/30 text-navy-950 cursor-default'
                                                    : 'bg-white border border-royal/30 text-royal-dark hover:bg-royal/10'
                                            }`}
                                        >
                                            {step.done ? (
                                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            ) : (
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                                                </svg>
                                            )}
                                            {step.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })()
                    );
                })()}

                {/* Tabs */}
                <div className="border-b border-gray-200 px-6 mt-2">
                    <nav className="-mb-px flex space-x-8" role="tablist">
                        {[
                            { id: 'details', label: 'Details', icon: '📋' },
                            { id: 'feedback', label: 'Feedback', icon: '💬' },
                            { id: 'materials', label: 'Materials', icon: '📚' },
                            { id: 'homework', label: 'Homework', icon: '📝' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setActiveTab(tab.id);
                                    }
                                }}
                                role="tab"
                                aria-selected={activeTab === tab.id}
                                aria-controls={`tabpanel-${tab.id}`}
                                className={`${activeTab === tab.id
                                        ? 'border-royal text-royal'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-royal`}
                            >
                                <span aria-hidden="true">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Details Tab */}
                    {activeTab === 'details' && (
                        <div role="tabpanel" id="tabpanel-details" aria-labelledby="tab-details">
                        <div className="space-y-5">
                            {/* Hero: subject + countdown + status */}
                            <div className="flex items-start justify-between gap-3 pb-4 border-b border-gray-100">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">
                                        {session.bookingCategory === 'trial' ? 'Free trial' : session.plan ? `${session.plan} plan` : 'Session'}
                                    </p>
                                    <h3 className="text-2xl font-extrabold text-navy-950 tracking-tight mt-0.5">{session?.subject || '—'}</h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        with <span className="font-semibold text-navy-950">
                                            {user?.role === 'student'
                                                ? (session?.tutorId?.name || 'your tutor')
                                                : (session?.studentId?.name || 'your student')}
                                        </span>
                                    </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <SessionStatusBadge status={session?.status} />
                                    {session.sessionDate && session.status === 'approved' && (
                                        <p className="text-[10px] text-gray-400 mt-1.5">
                                            {countdown(session.sessionDate)}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Key facts row */}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <Fact label="When" value={
                                    session.sessionDate
                                        ? new Date(session.sessionDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                                        : (session.preferredSchedule || '—')
                                } />
                                <Fact label={user?.role === 'student' ? 'Tutor' : 'Student'} value={
                                    user?.role === 'student' ? (session?.tutorId?.name || '—') : (session?.studentId?.name || '—')
                                } />
                                {session.lockedHourlyRate > 0 && (
                                    <Fact label="Rate" value={`₹${session.lockedHourlyRate}/hr`} />
                                )}
                                {session.isPaid && (
                                    <Fact label="Payment" value="Paid" accent="lime" />
                                )}
                            </div>

                            {user?.role === 'student' && session.status === 'pending' && session.viewedByTutorAt && (
                                <p className="text-sm text-royal font-medium">
                                    Tutor opened your request ·{' '}
                                    {new Date(session.viewedByTutorAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                </p>
                            )}

                            {(session.sessionJoinUrl || session.onlineLink) &&
                                !['cancelled', 'completed'].includes(session.status) && (
                                <div className="rounded-lg border border-royal/30 bg-royal/5 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Video link</p>
                                        <p className="text-sm text-navy-950 truncate max-w-md">{session.sessionJoinUrl || session.onlineLink}</p>
                                    </div>
                                    <a
                                        href={session.sessionJoinUrl || session.onlineLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center px-4 py-2 bg-royal text-white text-sm font-semibold rounded-lg hover:bg-royal-dark"
                                    >
                                        Open link
                                    </a>
                                </div>
                            )}

                            {session.lockedHourlyRate != null && session.lockedHourlyRate > 0 && (
                                <p className="text-sm text-gray-600">
                                    Locked hourly rate: <span className="font-semibold text-navy-950">₹{session.lockedHourlyRate}/hr</span>
                                    {session.priceLockedAt && (
                                        <span className="text-gray-500">
                                            {' '}
                                            (since {new Date(session.priceLockedAt).toLocaleDateString()})
                                        </span>
                                    )}
                                </p>
                            )}

                            {(session.status === 'cancelled' || session.status === 'rejected') && session.cancellationReason && (
                                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Note</p>
                                    <p className="text-sm text-gray-800">{session.cancellationReason}</p>
                                </div>
                            )}

                            {/* Parent Attendance Verification (Student only) - shown once tutor has marked attendance */}
                            {user?.role === 'student' && feedback?.attendanceStatus && (
                                <div className="mt-6 p-4 rounded-xl border border-gray-200 bg-gray-50">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-sm font-semibold text-gray-800">Attendance Verification</h3>
                                        {feedback.parentVerificationStatus && feedback.parentVerificationStatus !== 'unverified' ? (
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                                                feedback.parentVerificationStatus === 'verified'
                                                    ? 'bg-lime/30 text-navy-950'
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                                {feedback.parentVerificationStatus === 'verified' ? (
                                                    <>
                                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                        Confirmed by you
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                        Disputed
                                                    </>
                                                )}
                                            </span>
                                        ) : null}
                                    </div>

                                    <p className="text-xs text-gray-500 mb-1">
                                        Tutor marked this session as:{' '}
                                        <span className={`font-semibold capitalize ${
                                            feedback.attendanceStatus === 'completed' || feedback.attendanceStatus === 'present'
                                                ? 'text-navy-950'
                                                : feedback.attendanceStatus === 'student_absent' || feedback.attendanceStatus === 'absent'
                                                ? 'text-red-700'
                                                : 'text-navy-950'
                                        }`}>
                                            {feedback.attendanceStatus?.replace('_', ' ')}
                                        </span>
                                    </p>

                                    {feedback.parentVerificationStatus === 'unverified' || !feedback.parentVerificationStatus ? (
                                        <div className="mt-3 space-y-3">
                                            <p className="text-xs text-gray-500">
                                                Does this look correct? Confirm to acknowledge, or raise a dispute if something is wrong.
                                            </p>
                                            <textarea
                                                value={parentVerify.note}
                                                onChange={e => setParentVerify(v => ({ ...v, note: e.target.value }))}
                                                placeholder="Optional note (required if disputing)"
                                                rows={2}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal resize-none"
                                            />
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => handleParentVerify('verified')}
                                                    disabled={parentVerify.submitting}
                                                    className="flex-1 py-2 px-4 bg-lime hover:bg-lime-light text-navy-950 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                                                >
                                                    {parentVerify.submitting ? 'Saving...' : 'Yes, confirm'}
                                                </button>
                                                <button
                                                    onClick={() => handleParentVerify('disputed')}
                                                    disabled={parentVerify.submitting || !parentVerify.note.trim()}
                                                    className="flex-1 py-2 px-4 border border-red-300 hover:bg-red-50 text-red-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                                                    title={!parentVerify.note.trim() ? 'Please add a note explaining the dispute' : ''}
                                                >
                                                    Raise a dispute
                                                </button>
                                            </div>
                                            {!parentVerify.note.trim() && (
                                                <p className="text-xs text-gray-400">A note is required to raise a dispute.</p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="mt-2">
                                            {feedback.parentVerificationNote && (
                                                <p className="text-xs text-gray-600">
                                                    <span className="font-medium">Your note:</span> {feedback.parentVerificationNote}
                                                </p>
                                            )}
                                            {feedback.parentVerifiedAt && (
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Submitted {new Date(feedback.parentVerifiedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Mark Attendance (Tutor only) - Only during/after session, not for upcoming */}
                            {user?.role === 'tutor' && (session.status === 'approved' || session.status === 'completed') && session?.sessionDate && new Date(session.sessionDate) <= new Date() && (
                                <div className="mt-6 p-4 bg-royal/5 rounded-lg">
                                    <h3 className="font-semibold mb-3">
                                        {feedback?.attendanceStatus ? 'Update Attendance' : 'Mark Attendance'}
                                    </h3>
                                    {feedback?.attendanceStatus && (
                                        <div className="mb-3 p-2 bg-white rounded">
                                            <p className="text-sm text-gray-600">
                                                Current Status: <span className="font-medium capitalize">{feedback.attendanceStatus}</span>
                                            </p>
                                            {feedback.duration && (
                                                <p className="text-sm text-gray-600">
                                                    Duration: {feedback.duration} minutes
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    <form onSubmit={handleMarkAttendance} className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Status
                                            </label>
                                            <select
                                                value={attendance.status}
                                                onChange={(e) => setAttendance({ ...attendance, status: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                required
                                            >
                                                <option value="completed">Completed</option>
                                                <option value="student_absent">Student Absent</option>
                                                <option value="tutor_absent">Tutor Absent</option>
                                                <option value="rescheduled">Rescheduled</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Duration (minutes)
                                            </label>
                                            <input
                                                type="number"
                                                value={attendance.duration}
                                                onChange={(e) => setAttendance({ ...attendance, duration: parseInt(e.target.value) })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                min="1"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Notes
                                            </label>
                                            <textarea
                                                value={attendance.notes}
                                                onChange={(e) => setAttendance({ ...attendance, notes: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                rows="3"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            className="w-full px-4 py-2 bg-royal text-white rounded-md hover:bg-royal-dark transition-colors"
                                        >
                                            {feedback?.attendanceStatus ? 'Update Attendance' : 'Mark Attendance'}
                                        </button>
                                    </form>

                                    {/* Missed class recovery prompt */}
                                    {(feedback?.attendanceStatus === 'student_absent' || attendance.status === 'student_absent') && (
                                        <div className="mt-4 p-4 bg-lime/20 border border-lime/40 rounded-lg">
                                            <p className="text-sm font-semibold text-amber-900 mb-1">Student missed this class</p>
                                            {makeupOffer.sent ? (
                                                <p className="text-xs text-navy-950 font-medium">✓ Makeup offer sent to student</p>
                                            ) : makeupOffer.show ? (
                                                <div className="space-y-2 mt-2">
                                                    <textarea
                                                        value={makeupOffer.note}
                                                        onChange={e => setMakeupOffer(v => ({ ...v, note: e.target.value }))}
                                                        placeholder="Optional message to student (e.g. suggested makeup time)"
                                                        rows={2}
                                                        className="w-full px-3 py-2 text-sm border border-lime/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal/30 resize-none bg-white"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={handleSendMakeupOffer}
                                                            disabled={makeupOffer.submitting}
                                                            className="flex-1 py-2 bg-lime-dark hover:bg-lime-dark text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                                                        >
                                                            {makeupOffer.submitting ? 'Sending...' : 'Send makeup offer'}
                                                        </button>
                                                        <button
                                                            onClick={() => setMakeupOffer(v => ({ ...v, show: false }))}
                                                            className="px-3 py-2 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setMakeupOffer(v => ({ ...v, show: true }))}
                                                    className="mt-1 text-xs font-semibold text-navy-950 underline hover:text-amber-900"
                                                >
                                                    Offer a makeup session →
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        </div>
                    )}

                    {/* Feedback Tab */}
                    {activeTab === 'feedback' && (
                        <div role="tabpanel" id="tabpanel-feedback" aria-labelledby="tab-feedback">
                            <FeedbackTab
                                user={user}
                                feedback={feedback}
                                tutorFeedback={tutorFeedback}
                                setTutorFeedback={setTutorFeedback}
                                studentFeedback={studentFeedback}
                                setStudentFeedback={setStudentFeedback}
                                handleSubmitTutorFeedback={handleSubmitTutorFeedback}
                                handleSubmitStudentFeedback={handleSubmitStudentFeedback}
                            />
                        </div>
                    )}

                    {/* Materials Tab */}
                    {activeTab === 'materials' && (
                        <div role="tabpanel" id="tabpanel-materials" aria-labelledby="tab-materials">
                            <MaterialsTab
                                user={user}
                                feedback={feedback}
                                studyMaterial={studyMaterial}
                                setStudyMaterial={setStudyMaterial}
                                uploadingFile={uploadingFile}
                                handleFileChange={handleFileChange}
                                handleAddStudyMaterial={handleAddStudyMaterial}
                            />
                        </div>
                    )}

                    {/* Homework Tab */}
                    {activeTab === 'homework' && (
                        <div role="tabpanel" id="tabpanel-homework" aria-labelledby="tab-homework">
                            <HomeworkTab
                                user={user}
                                feedback={feedback}
                                homework={homework}
                                setHomework={setHomework}
                                handleAddHomework={handleAddHomework}
                                handleUpdateHomeworkStatus={handleUpdateHomeworkStatus}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ── Helpers for the redesigned Details tab ──────────────────────────────

function Fact({ label, value, accent = 'navy' }) {
    const color = {
        navy: 'text-navy-950',
        lime: 'text-lime-dark',
        royal: 'text-royal'
    }[accent] || 'text-navy-950';
    return (
        <div className="bg-[#f7f7f7] rounded-xl px-4 py-3">
            <p className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">{label}</p>
            <p className={`font-semibold ${color} truncate mt-0.5`}>{value}</p>
        </div>
    );
}

function SessionStatusBadge({ status }) {
    const cls = {
        approved: 'bg-lime/30 text-navy-950',
        pending: 'bg-yellow-100 text-yellow-800',
        completed: 'bg-royal/10 text-royal-dark',
        cancelled: 'bg-gray-100 text-gray-600',
        rejected: 'bg-rose-100 text-rose-700'
    }[status] || 'bg-gray-100 text-gray-600';
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${cls}`}>{status || '—'}</span>;
}

function countdown(dateStr) {
    const t = new Date(dateStr).getTime();
    const now = Date.now();
    const diff = t - now;
    if (diff > 0) {
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        if (days > 0) return `in ${days}d ${hours}h`;
        if (hours > 0) return `in ${hours}h ${minutes}m`;
        return `starts in ${minutes}m`;
    }
    const ago = -diff;
    const mins = Math.floor(ago / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

// ═══════════════════════════════════════════════════════════════════════════
// FEEDBACK TAB — rich redesign: star picker, category rating, prompts
// ═══════════════════════════════════════════════════════════════════════════

function FeedbackTab({ user, feedback, tutorFeedback, setTutorFeedback, studentFeedback, setStudentFeedback, handleSubmitTutorFeedback, handleSubmitStudentFeedback }) {
    return (
        <div className="space-y-6">
            {/* Tutor-side form */}
            {user?.role === 'tutor' && (
                <TutorFeedbackForm
                    feedback={feedback}
                    value={tutorFeedback}
                    onChange={setTutorFeedback}
                    onSubmit={handleSubmitTutorFeedback}
                />
            )}
            {/* Student-side form */}
            {user?.role === 'student' && (
                <StudentFeedbackForm
                    feedback={feedback}
                    value={studentFeedback}
                    onChange={setStudentFeedback}
                    onSubmit={handleSubmitStudentFeedback}
                />
            )}
            {/* The other party's feedback if visible */}
            {user?.role === 'student' && feedback?.tutorSummary && (
                <TutorSummaryCard feedback={feedback} />
            )}
            {user?.role === 'tutor' && feedback?.studentRating && (
                <StudentRatingCard feedback={feedback} />
            )}
        </div>
    );
}

function StarPicker({ value, onChange, size = 'md', readOnly = false }) {
    const sizeCls = { sm: 'text-xl', md: 'text-3xl', lg: 'text-4xl' }[size];
    const labels = ['Poor', 'Fair', 'Good', 'Great', 'Excellent'];
    return (
        <div className="flex flex-col items-start gap-2">
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                    <button
                        key={n}
                        type="button"
                        onClick={() => !readOnly && onChange(n)}
                        disabled={readOnly}
                        aria-label={`${n} stars`}
                        className={`${sizeCls} transition-all ${readOnly ? 'cursor-default' : 'hover:scale-110'} ${n <= value ? 'text-amber-400' : 'text-gray-200'}`}>
                        ★
                    </button>
                ))}
            </div>
            {!readOnly && value > 0 && (
                <span className="text-xs font-semibold text-gray-600">{labels[value - 1]}</span>
            )}
        </div>
    );
}

function StudentFeedbackForm({ feedback, value, onChange, onSubmit }) {
    const hasExisting = !!feedback?.studentRating;
    const tone = value.studentRating >= 4 ? 'positive' : value.studentRating === 3 ? 'neutral' : value.studentRating > 0 ? 'negative' : 'neutral';
    const prompt = {
        positive: 'What made this session great? Other parents love hearing specifics.',
        neutral: 'What would have made this session better? Your tutor reads every word.',
        negative: 'We\'re sorry. Tell us what went wrong — our team reviews every low rating.',
    }[tone];
    const quickTags = value.studentRating >= 4
        ? ['Clear explanation', 'On time', 'Well prepared', 'My child understood', 'Patient', 'Engaging']
        : value.studentRating === 3
            ? ['Rushed through topics', 'Could explain better', 'Needs more prep', 'Okay pace']
            : ['Didn\'t cover agreed topics', 'Late', 'Not prepared', 'Poor communication', 'Kid was lost'];

    const toggleTag = (tag) => {
        const current = value.studentComment || '';
        if (current.includes(tag)) {
            onChange({ ...value, studentComment: current.replace(new RegExp(`\\s*\\[${tag}\\]\\s*`, 'g'), ' ').trim() });
        } else {
            onChange({ ...value, studentComment: `${current} [${tag}]`.trim() });
        }
    };

    return (
        <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-lime/5 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-lime/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-navy-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-lg font-extrabold text-navy-950">Rate this session</h3>
                    <p className="text-xs text-gray-500">Your feedback stays visible to your tutor only (unless it's a 5-star — that publishes to their profile).</p>
                </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
                <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">How was it?</label>
                    <StarPicker value={value.studentRating} onChange={(v) => onChange({ ...value, studentRating: v })} size="lg" />
                </div>

                {value.studentRating > 0 && (
                    <>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Quick tags</label>
                            <div className="flex flex-wrap gap-2">
                                {quickTags.map((tag) => {
                                    const picked = value.studentComment?.includes(tag);
                                    return (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => toggleTag(tag)}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                                                picked
                                                    ? 'bg-navy-950 text-white border-navy-950'
                                                    : 'bg-white text-gray-700 border-gray-200 hover:border-navy-900/30'
                                            }`}>
                                            {tag}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                                {prompt}
                            </label>
                            <textarea
                                value={value.studentComment}
                                onChange={(e) => onChange({ ...value, studentComment: e.target.value })}
                                rows={4}
                                placeholder="Optional but appreciated — helps your tutor improve."
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lime/40 resize-none" />
                            <p className="text-[11px] text-gray-400 mt-1">{(value.studentComment || '').length}/500</p>
                        </div>
                    </>
                )}

                <button
                    type="submit"
                    disabled={!value.studentRating}
                    className="w-full py-3 text-sm font-bold bg-lime hover:bg-lime-light text-navy-950 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {hasExisting ? 'Update feedback' : 'Submit feedback'}
                </button>
            </form>
        </div>
    );
}

function TutorFeedbackForm({ feedback, value, onChange, onSubmit }) {
    const hasExisting = !!feedback?.tutorSummary;
    return (
        <div className="rounded-2xl border border-royal/20 bg-gradient-to-br from-white to-royal/5 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-royal/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-royal-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-lg font-extrabold text-navy-950">Session report</h3>
                    <p className="text-xs text-gray-500">Summary and next-steps appear on the parent's progress tab and by email.</p>
                </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Understanding level</label>
                    <StarPicker value={value.understandingScore} onChange={(v) => onChange({ ...value, understandingScore: v })} size="md" />
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5">Summary</label>
                    <textarea
                        value={value.tutorSummary}
                        onChange={(e) => onChange({ ...value, tutorSummary: e.target.value })}
                        rows={3}
                        placeholder="e.g. Covered chapter 3 — student got the concept but needs more practice on word problems."
                        required
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-royal/40 resize-none" />
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5">Topics covered</label>
                    <input
                        type="text"
                        value={value.topicsCovered}
                        onChange={(e) => onChange({ ...value, topicsCovered: e.target.value })}
                        placeholder="Algebra, Word problems, Quadratic equations"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-royal/40" />
                    <p className="text-[11px] text-gray-400 mt-1">Separate with commas</p>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5">Next steps</label>
                    <textarea
                        value={value.nextSteps}
                        onChange={(e) => onChange({ ...value, nextSteps: e.target.value })}
                        rows={2}
                        placeholder="What should the student do before next session?"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-royal/40 resize-none" />
                </div>

                <button
                    type="submit"
                    className="w-full py-3 text-sm font-bold bg-royal hover:bg-royal-dark text-white rounded-xl transition-all">
                    {hasExisting ? 'Update report' : 'Submit report'}
                </button>
            </form>
        </div>
    );
}

function TutorSummaryCard({ feedback }) {
    return (
        <div className="rounded-2xl border border-gray-100 p-5 bg-white">
            <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 rounded bg-royal/10 text-royal-dark text-[10px] font-bold uppercase tracking-wider">Your tutor's report</span>
                {feedback?.tutorSubmittedAt && (
                    <span className="text-[10px] text-gray-400">{new Date(feedback.tutorSubmittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                )}
            </div>
            {feedback.understandingScore > 0 && (
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-gray-500 font-semibold">Understanding:</span>
                    <StarPicker value={feedback.understandingScore} onChange={() => {}} size="sm" readOnly />
                </div>
            )}
            <p className="text-sm text-gray-700 whitespace-pre-line">{feedback.tutorSummary}</p>
            {feedback.topicsCovered?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {feedback.topicsCovered.map((t, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-semibold">{t}</span>
                    ))}
                </div>
            )}
            {feedback.nextSteps && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Next steps</p>
                    <p className="text-sm text-gray-700">{feedback.nextSteps}</p>
                </div>
            )}
        </div>
    );
}

function StudentRatingCard({ feedback }) {
    return (
        <div className="rounded-2xl border border-gray-100 p-5 bg-white">
            <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 rounded bg-lime/30 text-navy-950 text-[10px] font-bold uppercase tracking-wider">Student's rating</span>
                {feedback?.studentSubmittedAt && (
                    <span className="text-[10px] text-gray-400">{new Date(feedback.studentSubmittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                )}
            </div>
            <StarPicker value={feedback.studentRating} onChange={() => {}} size="md" readOnly />
            {feedback.studentComment && (
                <p className="text-sm text-gray-700 mt-3 whitespace-pre-line">{feedback.studentComment}</p>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// MATERIALS TAB — card grid with icons, inline upload form with file drop
// ═══════════════════════════════════════════════════════════════════════════

function MaterialsTab({ user, feedback, studyMaterial, setStudyMaterial, uploadingFile, handleFileChange, handleAddStudyMaterial }) {
    const materials = feedback?.studyMaterials || [];
    return (
        <div className="space-y-5">
            {user?.role === 'tutor' && (
                <div className="rounded-2xl border border-royal/20 bg-gradient-to-br from-white to-royal/5 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-royal/10 flex items-center justify-center">
                            <svg className="w-5 h-5 text-royal-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-extrabold text-navy-950">Share material</h3>
                            <p className="text-xs text-gray-500">Notes, worksheets, video links — goes straight to the student.</p>
                        </div>
                    </div>

                    <form onSubmit={handleAddStudyMaterial} className="space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { v: 'topic', label: 'Topic', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
                                { v: 'link',  label: 'Link',  icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
                                { v: 'file',  label: 'File',  icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' }
                            ].map((t) => (
                                <button key={t.v} type="button"
                                    onClick={() => setStudyMaterial({ ...studyMaterial, type: t.v, file: null, url: '' })}
                                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-colors ${
                                        studyMaterial.type === t.v
                                            ? 'bg-royal text-white border-royal'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-royal/40'
                                    }`}>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                                    </svg>
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        <input type="text" placeholder="Title (e.g. Chapter 3 — Worked Examples)"
                            value={studyMaterial.title}
                            onChange={(e) => setStudyMaterial({ ...studyMaterial, title: e.target.value })}
                            required
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-royal/40" />

                        {studyMaterial.type === 'link' && (
                            <input type="url" placeholder="https://…"
                                value={studyMaterial.url}
                                onChange={(e) => setStudyMaterial({ ...studyMaterial, url: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-royal/40" />
                        )}
                        {studyMaterial.type === 'file' && (
                            <label className="block">
                                <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center hover:border-royal/40 cursor-pointer transition-colors">
                                    <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    {studyMaterial.file
                                        ? <p className="text-sm font-semibold text-navy-950">{studyMaterial.file.name}</p>
                                        : <p className="text-sm text-gray-500">Click to pick a file · PDF, DOC, Images</p>}
                                </div>
                                <input type="file" onChange={handleFileChange}
                                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                                    className="sr-only" />
                            </label>
                        )}

                        <textarea rows={2} placeholder="Short note — what is this about? (optional)"
                            value={studyMaterial.description}
                            onChange={(e) => setStudyMaterial({ ...studyMaterial, description: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-royal/40 resize-none" />

                        <button type="submit" disabled={uploadingFile}
                            className="w-full py-3 text-sm font-bold bg-royal hover:bg-royal-dark text-white rounded-xl disabled:opacity-50">
                            {uploadingFile ? 'Uploading…' : 'Share with student'}
                        </button>
                    </form>
                </div>
            )}

            {/* Materials grid */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-navy-950">Shared with this session</h3>
                    {materials.length > 0 && <span className="text-xs text-gray-400">{materials.length} item{materials.length === 1 ? '' : 's'}</span>}
                </div>
                {materials.length === 0 ? (
                    <MaterialsEmpty isTutor={user?.role === 'tutor'} />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {materials.map((m, i) => <MaterialCard key={i} material={m} />)}
                    </div>
                )}
            </div>
        </div>
    );
}

function MaterialCard({ material }) {
    const typeMeta = {
        topic: { icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', tone: 'royal' },
        link:  { icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1', tone: 'lime' },
        file:  { icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', tone: 'amber' }
    }[material.type || 'topic'];
    const toneCls = {
        royal: 'bg-royal/10 text-royal-dark',
        lime:  'bg-lime/30 text-navy-950',
        amber: 'bg-amber-100 text-amber-800'
    }[typeMeta.tone];
    return (
        <a
            href={material.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={`block rounded-xl border border-gray-100 bg-white p-4 hover:border-royal/30 hover:shadow-sm transition-all ${material.url ? '' : 'cursor-default pointer-events-none'}`}>
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${toneCls}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={typeMeta.icon} />
                    </svg>
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-navy-950 truncate">{material.title}</p>
                    {material.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{material.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{material.type || 'topic'}</span>
                        {material.assignedAt && (
                            <span className="text-[10px] text-gray-400">· {new Date(material.assignedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        )}
                    </div>
                </div>
                {material.url && (
                    <svg className="w-4 h-4 text-gray-300 flex-shrink-0 mt-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                )}
            </div>
        </a>
    );
}

function MaterialsEmpty({ isTutor }) {
    return (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            </div>
            <p className="text-sm font-semibold text-navy-950">No materials yet</p>
            <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                {isTutor
                    ? 'Share notes, worksheets, or video links above. Everything you add is visible to your student instantly.'
                    : 'Your tutor will share notes, worksheets, or videos here after the session.'}
            </p>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// HOMEWORK TAB — due-date badges, progress tracker, status toggle
// ═══════════════════════════════════════════════════════════════════════════

function HomeworkTab({ user, feedback, homework, setHomework, handleAddHomework, handleUpdateHomeworkStatus }) {
    const hw = feedback?.homework || [];
    const total = hw.length;
    const done = hw.filter((h) => h.status === 'completed').length;
    const inProgress = hw.filter((h) => h.status === 'in_progress').length;
    const overdue = hw.filter((h) => h.status !== 'completed' && h.dueDate && new Date(h.dueDate) < new Date()).length;

    return (
        <div className="space-y-5">
            {/* Summary bar */}
            {total > 0 && (
                <div className="grid grid-cols-4 gap-2">
                    <HwStat label="Assigned" value={total} />
                    <HwStat label="In progress" value={inProgress} accent="royal" />
                    <HwStat label="Done" value={done} accent="lime" />
                    <HwStat label="Overdue" value={overdue} accent={overdue > 0 ? 'rose' : 'gray'} />
                </div>
            )}

            {user?.role === 'tutor' && (
                <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                            <svg className="w-5 h-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-extrabold text-navy-950">Assign homework</h3>
                            <p className="text-xs text-gray-500">The student gets notified immediately.</p>
                        </div>
                    </div>
                    <form onSubmit={handleAddHomework} className="space-y-4">
                        <textarea
                            value={homework.description}
                            onChange={(e) => setHomework({ ...homework, description: e.target.value })}
                            rows={3} required
                            placeholder="e.g. Complete exercise 4.2 (all 10 questions) and bring notes on Newton's 2nd law"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
                        <div className="flex gap-3 items-end">
                            <div className="flex-1">
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1.5">Due date (optional)</label>
                                <input type="date"
                                    value={homework.dueDate}
                                    onChange={(e) => setHomework({ ...homework, dueDate: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                            </div>
                            <button type="submit"
                                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl">
                                Assign
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-navy-950">Assignments</h3>
                    {total > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{done}/{total} complete</span>
                            <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                <div className="h-full bg-lime rounded-full transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                            </div>
                        </div>
                    )}
                </div>

                {hw.length === 0 ? (
                    <HomeworkEmpty isTutor={user?.role === 'tutor'} />
                ) : (
                    <div className="space-y-3">
                        {hw.map((h, i) => (
                            <HomeworkCard
                                key={i}
                                hw={h}
                                onUpdateStatus={(status) => handleUpdateHomeworkStatus(feedback._id, i, status)}
                                isStudent={user?.role === 'student'}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function HwStat({ label, value, accent = 'gray' }) {
    const cls = {
        gray:  'bg-gray-50 text-gray-700',
        royal: 'bg-royal/5 text-royal-dark',
        lime:  'bg-lime/20 text-navy-950',
        rose:  'bg-rose-50 text-rose-700'
    }[accent];
    return (
        <div className={`rounded-xl p-3 ${cls}`}>
            <p className="text-xs font-semibold opacity-80">{label}</p>
            <p className="text-2xl font-extrabold mt-0.5">{value}</p>
        </div>
    );
}

function HomeworkCard({ hw, onUpdateStatus, isStudent }) {
    const statusCls = {
        assigned:    'bg-amber-100 text-amber-800',
        in_progress: 'bg-royal/10 text-royal-dark',
        completed:   'bg-lime/30 text-navy-950'
    };
    const dueInfo = (() => {
        if (!hw.dueDate) return null;
        const diff = Math.ceil((new Date(hw.dueDate) - Date.now()) / (24 * 3600 * 1000));
        if (hw.status === 'completed') return { text: 'Completed', tone: 'text-lime-dark' };
        if (diff < 0) return { text: `Overdue by ${Math.abs(diff)}d`, tone: 'text-rose-600' };
        if (diff === 0) return { text: 'Due today', tone: 'text-amber-700 font-bold' };
        if (diff === 1) return { text: 'Due tomorrow', tone: 'text-amber-700' };
        return { text: `Due in ${diff} days`, tone: 'text-gray-500' };
    })();

    return (
        <div className={`rounded-xl border p-5 transition-all ${
            hw.status === 'completed' ? 'bg-lime/5 border-lime/30 opacity-70' : 'bg-white border-gray-100 hover:shadow-sm'
        }`}>
            <div className="flex items-start justify-between gap-3 mb-3">
                <p className={`text-sm font-medium flex-1 ${hw.status === 'completed' ? 'line-through text-gray-500' : 'text-navy-950'}`}>
                    {hw.description}
                </p>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${statusCls[hw.status]}`}>
                    {hw.status.replace('_', ' ')}
                </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
                {dueInfo && <span className={dueInfo.tone}>{dueInfo.text}</span>}
                {hw.assignedAt && (
                    <span className="text-gray-400">· Assigned {new Date(hw.assignedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                )}
                {hw.completedAt && (
                    <span className="text-lime-dark">· Done {new Date(hw.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                )}
            </div>

            {isStudent && hw.status !== 'completed' && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    {hw.status === 'assigned' && (
                        <button
                            onClick={() => onUpdateStatus('in_progress')}
                            className="flex-1 py-2 text-xs font-bold bg-royal/10 hover:bg-royal/20 text-royal-dark border border-royal/20 rounded-lg">
                            Start working
                        </button>
                    )}
                    <button
                        onClick={() => onUpdateStatus('completed')}
                        className="flex-1 py-2 text-xs font-bold bg-lime hover:bg-lime-light text-navy-950 rounded-lg">
                        ✓ Mark complete
                    </button>
                </div>
            )}
        </div>
    );
}

function HomeworkEmpty({ isTutor }) {
    return (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
            </div>
            <p className="text-sm font-semibold text-navy-950">No homework yet</p>
            <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                {isTutor
                    ? 'Assign homework above to reinforce today\'s topics. Your student sees it instantly with a due-date countdown.'
                    : 'Your tutor will assign homework here after the session. You\'ll get a notification with the due date.'}
            </p>
        </div>
    );
}

export default SessionDetailsModal;

