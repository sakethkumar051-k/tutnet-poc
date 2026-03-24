import { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import ReviewForm from './ReviewForm';
import LoadingSkeleton from './LoadingSkeleton';
import EmptyState from './EmptyState';
import ConfirmationModal from './ConfirmationModal';
import SessionDetailsModal from './SessionDetailsModal';
import RescheduleModal from './RescheduleModal';
import TutorChangeRequestModal from './TutorChangeRequestModal';

// Only show "Student requested a reschedule" when there is a real pending request (explicit status === 'pending')
const hasStudentRescheduleRequest = (booking) =>
    booking?.rescheduleRequest && booking.rescheduleRequest.status === 'pending';

const hasTutorChangeRequest = (booking) =>
    booking?.tutorChangeRequest && booking.tutorChangeRequest.status === 'pending';

const BookingList = ({ role }) => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [sessionDetailsModalOpen, setSessionDetailsModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ open: false, action: null, bookingId: null, openSessionModal: false });
    const [rescheduleModal, setRescheduleModal] = useState(null);
    const [tutorChangeModal, setTutorChangeModal] = useState(null);
    const [expandedDetails, setExpandedDetails] = useState({});
    const { showSuccess, showError } = useToast();

    const toggleDetails = (id) => setExpandedDetails((prev) => ({ ...prev, [id]: !prev[id] }));

    const fetchBookings = async () => {
        try {
            const { data } = await api.get('/bookings/mine');
            setBookings(data);
        } catch (err) {
            setError('Failed to fetch bookings');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const handleApprove = async (id) => {
        try {
            await api.patch(`/bookings/${id}/approve`);
            fetchBookings();
            showSuccess('Booking approved successfully!');
        } catch (err) {
            console.error(err);
            showError('Failed to approve booking');
        }
    };

    const handleReject = (id) => {
        setConfirmModal({
            open: true,
            action: async () => {
                try {
                    await api.patch(`/bookings/${id}/reject`);
                    fetchBookings();
                    showSuccess('Booking rejected');
                } catch (err) {
                    console.error(err);
                    showError('Failed to reject booking');
                }
            },
            bookingId: id,
            title: 'Reject Booking',
            message: 'Are you sure you want to reject this booking? This action cannot be undone.',
            confirmText: 'Reject',
            confirmColor: 'red'
        });
    };

    const handleComplete = (id) => {
        const booking = bookings.find(b => b._id === id);
        // Direct to session details so tutor can mark attendance first
        // (attendance is required before completing a booking)
        setSelectedBooking(booking);
        setSessionDetailsModalOpen(true);
    };

    const openSessionDetails = (booking) => {
        setSelectedBooking(booking);
        setSessionDetailsModalOpen(true);
    };

    const closeSessionDetails = () => {
        setSessionDetailsModalOpen(false);
        setSelectedBooking(null);
        fetchBookings();
    };

    const handleCancel = (id) => {
        setConfirmModal({
            open: true,
            action: async () => {
                try {
                    await api.patch(`/bookings/${id}/cancel`);
                    fetchBookings();
                    showSuccess('Booking cancelled');
                } catch (err) {
                    console.error(err);
                    showError('Failed to cancel booking');
                }
            },
            bookingId: id,
            title: 'Cancel Booking',
            message: 'Are you sure you want to cancel this booking?',
            confirmText: 'Cancel Booking',
            confirmColor: 'red'
        });
    };

    const openReviewModal = (booking) => {
        setSelectedBooking(booking);
        setReviewModalOpen(true);
    };

    const closeReviewModal = () => {
        setReviewModalOpen(false);
        setSelectedBooking(null);
        fetchBookings();
    };

    const handleRescheduleRespond = async (bookingId, action) => {
        try {
            await api.patch(`/bookings/${bookingId}/reschedule-respond`, { action });
            showSuccess(action === 'approve' ? 'Reschedule approved' : 'Reschedule declined');
            fetchBookings();
        } catch {
            showError('Failed to update reschedule request');
        }
    };

    const handleTutorChangeRespond = async (bookingId, action) => {
        try {
            await api.patch(`/bookings/${bookingId}/tutor-change-respond`, { action });
            showSuccess(action === 'approve' ? 'Change approved' : 'Change declined');
            fetchBookings();
        } catch {
            showError('Failed to respond to change request');
        }
    };

    if (loading) return <LoadingSkeleton type="list" count={5} />;
    if (error) return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
                <span className="text-red-600">⚠️</span>
                <p className="text-red-800">{error}</p>
            </div>
        </div>
    );

    // Format date and time from preferredSchedule or sessionDate
    const formatDateTime = (booking) => {
        if (booking.sessionDate) {
            const date = new Date(booking.sessionDate);
            return {
                date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
                time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            };
        }
        // Fallback to preferredSchedule parsing
        return {
            date: booking.preferredSchedule || 'Date not set',
            time: ''
        };
    };

    return (
        <>
            <div className="p-6">
                {bookings.length === 0 ? (
                    <EmptyState
                        title="No booking requests"
                        description={role === 'student' 
                            ? "You haven't made any bookings yet. Find a tutor and book your first session to get started."
                            : "You don't have any booking requests yet. Once students request sessions, they'll appear here."}
                        actionLabel={role === 'student' ? 'Find Tutors' : undefined}
                        onAction={role === 'student' ? () => window.location.href = '/find-tutors' : undefined}
                    />
                ) : (
                    <div className="space-y-4">
                        {bookings.map((booking) => {
                            const dateTime = formatDateTime(booking);
                            const isPending = booking.status === 'pending';
                            const isApproved = booking.status === 'approved';
                            const isCompleted = booking.status === 'completed';
                            const studentReschedule = hasStudentRescheduleRequest(booking);
                            const tutorChange = hasTutorChangeRequest(booking);
                            const bookingTypeLabel = booking.bookingCategory === 'trial' ? 'Demo' : booking.bookingCategory === 'dedicated' || booking.bookingCategory === 'permanent' ? 'Dedicated' : 'One-time';
                            const hasRequestDetails = booking.learningGoals || booking.studyGoals || booking.currentLevel || booking.focusAreas || booking.additionalNotes ||
                                (Array.isArray(booking.weeklySchedule) && booking.weeklySchedule.length > 0) || booking.sessionsPerWeek || booking.durationCommitment;
                            const detailsOpen = expandedDetails[booking._id];

                            return (
                                <div
                                    key={booking._id}
                                    className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200"
                                >
                                    {/* Header: Subject, type, status */}
                                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {booking.subject}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{bookingTypeLabel}</span>
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold
                                                    ${isApproved || isCompleted ? 'bg-green-100 text-green-800' :
                                                        isPending ? 'bg-amber-100 text-amber-800' :
                                                            booking.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                                booking.status === 'cancelled' ? 'bg-gray-100 text-gray-800' : 'bg-gray-100 text-gray-800'}`}>
                                                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Session info: who, when, created */}
                                    <div className="space-y-2 mb-4">
                                        <p className="text-sm text-gray-700">
                                            {role === 'tutor' ? (
                                                <>Student: <span className="font-medium text-gray-900">{booking.studentId?.name || '—'}</span></>
                                            ) : (
                                                <>Tutor: <span className="font-medium text-gray-900">{booking.tutorId?.name || '—'}</span></>
                                            )}
                                        </p>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span>{dateTime.date}</span>
                                            {dateTime.time && (
                                                <>
                                                    <span className="text-gray-400">·</span>
                                                    <span>{dateTime.time}</span>
                                                </>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400">
                                            Created {new Date(booking.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                    </div>

                                    {/* Request details (same style as Request Hub) */}
                                    {hasRequestDetails && (
                                        <div className="mb-4 border-t border-gray-100 pt-4">
                                            <button
                                                type="button"
                                                onClick={() => toggleDetails(booking._id)}
                                                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                                            >
                                                {detailsOpen ? 'Hide request details' : 'Show request details'}
                                            </button>
                                            {detailsOpen && (
                                                <div className="mt-3 space-y-2 text-sm text-gray-700">
                                                    {booking.learningGoals && (
                                                        <div><span className="font-medium text-gray-600">Learning goals:</span> {booking.learningGoals}</div>
                                                    )}
                                                    {booking.studyGoals && (
                                                        <div><span className="font-medium text-gray-600">Study goals:</span> {booking.studyGoals}</div>
                                                    )}
                                                    {booking.currentLevel && (
                                                        <p><span className="font-medium text-gray-600">Level:</span> {booking.currentLevel}</p>
                                                    )}
                                                    {booking.focusAreas && (
                                                        <p><span className="font-medium text-gray-600">Focus:</span> {booking.focusAreas}</p>
                                                    )}
                                                    {Array.isArray(booking.weeklySchedule) && booking.weeklySchedule.length > 0 && (
                                                        <p><span className="font-medium text-gray-600">Weekly schedule:</span> {booking.weeklySchedule.map((s) => `${s.day || ''} ${s.time || ''}`).filter(Boolean).join(', ') || '—'}</p>
                                                    )}
                                                    {(booking.sessionsPerWeek || booking.durationCommitment) && (
                                                        <p>
                                                            {booking.sessionsPerWeek && `${booking.sessionsPerWeek} session(s)/week`}
                                                            {booking.sessionsPerWeek && booking.durationCommitment && ' · '}
                                                            {booking.durationCommitment && `Duration: ${booking.durationCommitment}`}
                                                        </p>
                                                    )}
                                                    {booking.additionalNotes && (
                                                        <div><span className="font-medium text-gray-600">Notes:</span> {booking.additionalNotes}</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="border-t border-gray-200 pt-4">

                                    {/* Actions Section */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        {/* Student Actions */}
                                        {role === 'student' && (
                                            <>
                                                {/* Approved/Completed: Primary CTA */}
                                                {(isApproved || isCompleted) && (
                                                    <button
                                                        onClick={() => openSessionDetails(booking)}
                                                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-md hover:bg-indigo-700 transition-colors shadow-sm hover:shadow-md"
                                                    >
                                                        View Session
                                                    </button>
                                                )}
                                                {/* Student: Request reschedule (only when no pending student or tutor change) */}
                                                {isApproved && !isCompleted && !studentReschedule && !tutorChange && (
                                                    <button
                                                        onClick={() => setRescheduleModal(booking)}
                                                        className="px-4 py-2 bg-white text-indigo-700 text-sm font-medium rounded-md border border-indigo-200 hover:bg-indigo-50 transition-colors"
                                                    >
                                                        Request reschedule
                                                    </button>
                                                )}
                                                {isApproved && !isCompleted && studentReschedule && (
                                                    <span className="px-3 py-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md">
                                                        Your reschedule request is pending
                                                    </span>
                                                )}
                                                {/* Tutor requested a change → student approves/declines */}
                                                {isApproved && !isCompleted && tutorChange && (
                                                    <div className="w-full mt-1 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
                                                        <p className="text-xs font-semibold text-indigo-800 mb-0.5">Your tutor requested a change</p>
                                                        <p className="text-xs text-indigo-700 mb-2">
                                                            {booking.tutorChangeRequest.type === 'reschedule' ? `New schedule: ${booking.tutorChangeRequest.proposedSchedule || 'See details'}` : ''}
                                                            {booking.tutorChangeRequest.type === 'subject' ? `New subject: ${booking.tutorChangeRequest.proposedSubject}` : ''}
                                                            {booking.tutorChangeRequest.type === 'both' ? 'Schedule & subject change' : ''}
                                                        </p>
                                                        <p className="text-xs text-gray-500 mb-2 italic">Reason: {booking.tutorChangeRequest.reason}</p>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => handleTutorChangeRespond(booking._id, 'approve')} className="px-3 py-1 text-xs font-semibold bg-green-600 text-white rounded-md hover:bg-green-700">Approve</button>
                                                            <button onClick={() => handleTutorChangeRespond(booking._id, 'decline')} className="px-3 py-1 text-xs font-medium border border-red-300 text-red-700 rounded-md hover:bg-red-50">Decline</button>
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Pending: Cancel only (secondary) */}
                                                {isPending && (
                                                    <button
                                                        onClick={() => handleCancel(booking._id)}
                                                        className="px-4 py-2 bg-white text-red-700 text-sm font-medium rounded-md border border-red-300 hover:bg-red-50 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                                {/* Completed with no review: Leave Review */}
                                                {isCompleted && !booking.hasReview && (
                                                    <button
                                                        onClick={() => openReviewModal(booking)}
                                                        className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
                                                    >
                                                        Leave Review
                                                    </button>
                                                )}
                                                {/* Completed with review: Reviewed badge */}
                                                {isCompleted && booking.hasReview && (
                                                    <span className="px-4 py-2 bg-green-50 text-green-700 text-sm font-medium rounded-md border border-green-200">
                                                        ✓ Reviewed
                                                    </span>
                                                )}
                                            </>
                                        )}

                                        {/* Tutor Actions */}
                                        {role === 'tutor' && (
                                            <>
                                                {/* Pending: Accept (primary) + Reject (secondary) */}
                                                {isPending && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApprove(booking._id)}
                                                            className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-md hover:bg-green-700 transition-colors shadow-sm hover:shadow-md"
                                                        >
                                                            Accept
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(booking._id)}
                                                            className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                                {/* Approved: View Session (primary) + Mark Complete (secondary) */}
                                                {isApproved && !isCompleted && (
                                                    <>
                                                        <button
                                                            onClick={() => openSessionDetails(booking)}
                                                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-md hover:bg-indigo-700 transition-colors shadow-sm hover:shadow-md"
                                                        >
                                                            View Session
                                                        </button>
                                                        <button
                                                            onClick={() => handleComplete(booking._id)}
                                                            className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
                                                        >
                                                            Mark Complete
                                                        </button>
                                                        {/* Student requested reschedule: show only when there is a real pending request */}
                                                        {studentReschedule && (
                                                            <div className="w-full mt-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                                                                <p className="text-sm font-semibold text-amber-900 mb-1">Student requested a reschedule</p>
                                                                {(booking.rescheduleRequest.proposedSchedule || booking.rescheduleRequest.proposedDate) && (
                                                                    <p className="text-xs text-amber-800 mb-1">
                                                                        Proposed: {booking.rescheduleRequest.proposedSchedule || (booking.rescheduleRequest.proposedDate && new Date(booking.rescheduleRequest.proposedDate).toLocaleDateString()) || '—'}
                                                                    </p>
                                                                )}
                                                                {booking.rescheduleRequest.reason && (
                                                                    <p className="text-xs text-amber-700 mb-2">Reason: {booking.rescheduleRequest.reason}</p>
                                                                )}
                                                                <div className="flex gap-2 mt-2">
                                                                    <button onClick={() => handleRescheduleRespond(booking._id, 'approve')} className="px-3 py-1.5 text-xs font-semibold bg-green-600 text-white rounded-md hover:bg-green-700">Approve</button>
                                                                    <button onClick={() => handleRescheduleRespond(booking._id, 'decline')} className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50">Decline</button>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {/* Tutor: Request reschedule (or subject change) – only when no pending tutor change */}
                                                        {!tutorChange && (
                                                            <button
                                                                onClick={() => setTutorChangeModal(booking)}
                                                                className="px-4 py-2 bg-white text-amber-700 text-sm font-medium rounded-md border border-amber-300 hover:bg-amber-50 transition-colors"
                                                            >
                                                                Request reschedule
                                                            </button>
                                                        )}
                                                        {tutorChange && (
                                                            <span className="px-3 py-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md">
                                                                Your change request is pending approval
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                                {/* Completed: View/Edit Session */}
                                                {isCompleted && (
                                                    <button
                                                        onClick={() => openSessionDetails(booking)}
                                                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-md hover:bg-indigo-700 transition-colors shadow-sm hover:shadow-md"
                                                    >
                                                        View Session
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Review Modal */}
            {reviewModalOpen && selectedBooking && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
                    <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-gray-900">Leave a Review</h2>
                            <button
                                onClick={closeReviewModal}
                                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                            >
                                ×
                            </button>
                        </div>
                        <div className="p-6">
                            <ReviewForm
                                bookingId={selectedBooking._id}
                                tutorId={selectedBooking.tutorId?._id}
                                tutorName={selectedBooking.tutorId?.name}
                                onSuccess={closeReviewModal}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmModal.open && (
                <ConfirmationModal
                    title={confirmModal.title}
                    message={confirmModal.message}
                    confirmText={confirmModal.confirmText}
                    cancelText="Cancel"
                    confirmColor={confirmModal.confirmColor || 'red'}
                    onConfirm={() => {
                        confirmModal.action();
                        setConfirmModal({ open: false, action: null, bookingId: null, openSessionModal: false });
                    }}
                    onCancel={() => setConfirmModal({ open: false, action: null, bookingId: null, openSessionModal: false })}
                />
            )}

            {/* Session Details Modal */}
            {sessionDetailsModalOpen && selectedBooking && selectedBooking._id && (
                <SessionDetailsModal
                    session={selectedBooking}
                    onClose={closeSessionDetails}
                    onUpdate={() => {
                        fetchBookings();
                    }}
                />
            )}

            {/* Reschedule Modal */}
            {rescheduleModal && (
                <RescheduleModal
                    booking={rescheduleModal}
                    onClose={() => setRescheduleModal(null)}
                    onSuccess={fetchBookings}
                />
            )}
            {tutorChangeModal && (
                <TutorChangeRequestModal
                    booking={tutorChangeModal}
                    onClose={() => setTutorChangeModal(null)}
                    onSuccess={fetchBookings}
                />
            )}
        </>
    );
};

export default BookingList;

