import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';

const RegularBookingModal = ({ tutor, onClose, onSuccess }) => {
    const { showSuccess, showError } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        subject: tutor.subjects?.[0] || '',
        preferredDate: '',
        preferredTime: '10:00',
        mode: 'online',
        notes: ''
    });

    // Get today's date for min date
    const today = new Date().toISOString().split('T')[0];

    // Max 30 days from today
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    const maxDateStr = maxDate.toISOString().split('T')[0];

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            await api.post('/bookings', {
                tutorId: tutor.userId?._id || tutor._id,
                subject: formData.subject,
                preferredSchedule: `${formData.preferredDate} ${formData.preferredTime}`,
                sessionDate: formData.preferredDate,
                bookingCategory: 'session', // REGULAR SESSION
                notes: formData.notes
            });

            showSuccess('✅ Regular session booked! The tutor will confirm your booking soon.');
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Regular booking error:', err);
            showError(err.response?.data?.message || 'Failed to book session');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-t-2xl">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-1">
                                Book Regular Session
                            </h2>
                            <p className="text-indigo-100">
                                with {tutor.name || tutor.userId?.name}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Pricing Info */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 m-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-blue-800">Session Fee</p>
                            <p className="text-2xl font-bold text-blue-900">
                                ₹{tutor.hourlyRate || 500}/hour
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                💰 Pay after session
                            </span>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Subject */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Subject *
                        </label>
                        <select
                            name="subject"
                            value={formData.subject}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            {tutor.subjects?.map(subject => (
                                <option key={subject} value={subject}>{subject}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date and Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Preferred Date *
                            </label>
                            <input
                                type="date"
                                name="preferredDate"
                                value={formData.preferredDate}
                                onChange={handleChange}
                                min={today}
                                max={maxDateStr}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Time *
                            </label>
                            <select
                                name="preferredTime"
                                value={formData.preferredTime}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'].map(time => (
                                    <option key={time} value={time}>{time}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Mode */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Session Mode *
                        </label>
                        <div className="flex gap-4">
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="mode"
                                    value="online"
                                    checked={formData.mode === 'online'}
                                    onChange={handleChange}
                                    className="mr-2"
                                />
                                <span className="text-sm">🌐 Online</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="mode"
                                    value="offline"
                                    checked={formData.mode === 'offline'}
                                    onChange={handleChange}
                                    className="mr-2"
                                />
                                <span className="text-sm">🏠 In-Person</span>
                            </label>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Additional Notes (Optional)
                        </label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows="2"
                            placeholder="Any specific topics or requirements..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>

                    {/* Info Banner */}
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
                        <p className="text-sm text-yellow-800">
                            💡 <strong>Note:</strong> Tutor will review and confirm your booking. You'll be notified once approved.
                        </p>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition shadow-lg hover:shadow-xl"
                        >
                            {submitting ? 'Booking...' : '✨ Book Session'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegularBookingModal;
