import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const BookingForm = ({ tutorId, tutorName, onClose, onSuccess }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        subject: '',
        preferredSchedule: '',
    });
    const [loading, setLoading] = useState(false);
    const { showSuccess, showError } = useToast();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Check authentication
        if (!user) {
            showError('Please sign in to book a tutor');
            navigate('/login?redirect=/');
            onClose();
            return;
        }

        if (user.role !== 'student') {
            showError('Only students can book tutors');
            onClose();
            return;
        }

        // Validation
        if (!formData.subject.trim()) {
            showError('Please enter a subject');
            return;
        }
        if (!formData.preferredSchedule.trim()) {
            showError('Please enter preferred schedule');
            return;
        }

        setLoading(true);

        try {
            await api.post('/bookings', {
                tutorId,
                bookingCategory: 'session', // Regular session, not a trial
                ...formData
            });
            showSuccess('Booking request sent successfully!');
            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            const errorMessage = err.response?.data?.message || 'Failed to create booking';
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50 p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-modal-title"
        >
            <div className="relative p-6 border w-full max-w-md shadow-xl rounded-lg bg-white">
                <div className="flex items-center justify-between mb-4">
                    <h3 id="booking-modal-title" className="text-xl font-semibold text-navy-950">Book {tutorName}</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-royal rounded"
                        aria-label="Close modal"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="subject">
                            Subject <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="subject"
                            id="subject"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-royal focus:border-royal transition-colors"
                            value={formData.subject}
                            onChange={handleChange}
                            placeholder="e.g., Mathematics, Physics"
                            aria-required="true"
                        />
                        <p className="mt-1 text-xs text-gray-500">Enter the subject you need help with</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="preferredSchedule">
                            Preferred Schedule <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="preferredSchedule"
                            id="preferredSchedule"
                            required
                            placeholder="e.g., Monday 10:00 AM, Wednesday 3:00 PM"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-royal focus:border-royal transition-colors"
                            value={formData.preferredSchedule}
                            onChange={handleChange}
                            aria-required="true"
                        />
                        <p className="mt-1 text-xs text-gray-500">Specify your preferred days and times</p>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-royal transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-royal rounded-md hover:bg-royal-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-royal disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Booking...
                                </span>
                            ) : (
                                'Confirm Booking'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BookingForm;

