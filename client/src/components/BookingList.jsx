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
    const { showSuccess, showError } = useToast();

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
        setConfirmModal({
            open: true,
            action: async () => {
                try {
                    const { data: updatedBooking } = await api.patch(`/bookings/${id}/complete`);
                    await fetchBookings();
                    showSuccess('Booking marked as completed!');
                    // Open session details modal after marking complete with updated booking
                    setSelectedBooking({ ...booking, ...updatedBooking, status: 'completed' });
                    setSessionDetailsModalOpen(true);
                } catch (err) {
                    console.error(err);
                    showError('Failed to complete booking');
                }
            },
            bookingId: id,
            title: 'Mark as Completed',
            message: 'Mark this booking as completed? You can then add attendance, feedback, and assign homework.',
            confirmText: 'Mark Complete',
            confirmColor: 'blue',
            openSessionModal: true
        });
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

                            return (
                                <div
                                    key={booking._id}
                                    className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-200"
                                >
                                    {/* Header with Subject and Status */}
                                    <div className="flex items-start justify-between mb-4">
                                        {/* Subject - Title */}
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {booking.subject}
                                        </h3>
                                        {/* Status Badge - Top Right */}
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ml-4
                                            ${isApproved || isCompleted ? 'bg-green-100 text-green-800' :
                                                isPending ? 'bg-amber-100 text-amber-800' :
                                                    booking.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                        booking.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                                                            'bg-gray-100 text-gray-800'}`}>
                                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                        </span>
                                    </div>

                                    {/* Content Section */}
                                    <div className="space-y-3 mb-4">
                                        {/* Tutor/Student Name */}
                                        <p className="text-sm text-gray-700">
                                            {role === 'tutor' ? (
                                                <>Student: <span className="font-medium text-gray-900">{booking.studentId?.name || 'Unknown'}</span></>
                                            ) : (
                                                <>Tutor: <span className="font-medium text-gray-900">{booking.tutorId?.name || 'Unknown'}</span></>
                                            )}
                                        </p>

                                        {/* Date & Time - Grouped */}
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span>{dateTime.date}</span>
                                            {dateTime.time && (
                                                <>
                                                    <span className="text-gray-400">•</span>
                                                    <span>{dateTime.time}</span>
                                                </>
                                            )}
                                        </div>

                                        {/* Created Date - Subtle */}
                                        <p className="text-xs text-gray-400">
                                            Created {new Date(booking.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                    </div>

                                    {/* Divider */}
                                    <div className="border-t border-gray-200 my-4"></div>

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
                                                {/* Reschedule: only when session approved, not completed, and no pending request (or declined) */}
                                                {isApproved && !isCompleted && (!booking.rescheduleRequest?.status || booking.rescheduleRequest?.status === 'declined') && (
                                                    <button
                                                        onClick={() => setRescheduleModal(booking)}
                                                        className="px-4 py-2 bg-white text-indigo-700 text-sm font-medium rounded-md border border-indigo-200 hover:bg-indigo-50 transition-colors"
                                                    >
                                                        Reschedule
                                                    </button>
                                                )}
                                                {isApproved && !isCompleted && booking.rescheduleRequest?.status === 'pending' && (
                                                    <span className="px-3 py-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md">
                                                        Reschedule pending…
                                                    </span>
                                                )}
                                                {/* Tutor's change request → student responds (only when request exists + approved + not completed) */}
                                                {isApproved && !isCompleted && booking.tutorChangeRequest?.status === 'pending' && (
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
                                                        {/* Reschedule request response: only when request exists */}
                                                        {booking.rescheduleRequest?.status === 'pending' && (
                                                            <div className="w-full mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                                                <p className="text-xs font-semibold text-amber-800 mb-1">Student requested a reschedule</p>
                                                                <p className="text-xs text-amber-700 mb-2">"{booking.rescheduleRequest.proposedSchedule || 'See details'}"</p>
                                                                <div className="flex gap-2">
                                                                    <button onClick={() => handleRescheduleRespond(booking._id, 'approve')} className="px-3 py-1 text-xs font-semibold bg-green-600 text-white rounded-md hover:bg-green-700">Approve</button>
                                                                    <button onClick={() => handleRescheduleRespond(booking._id, 'decline')} className="px-3 py-1 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50">Decline</button>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {/* Tutor change request: show button only when no pending request */}
                                                        {(!booking.tutorChangeRequest || booking.tutorChangeRequest.status !== 'pending') && (
                                                            <button
                                                                onClick={() => setTutorChangeModal(booking)}
                                                                className="px-4 py-2 bg-white text-amber-700 text-sm font-medium rounded-md border border-amber-300 hover:bg-amber-50 transition-colors"
                                                            >
                                                                Request Change
                                                            </button>
                                                        )}
                                                        {booking.tutorChangeRequest?.status === 'pending' && (
                                                            <span className="px-3 py-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md">
                                                                Change pending approval…
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

