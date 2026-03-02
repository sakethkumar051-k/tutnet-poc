import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';

const RequestDemoModal = ({ tutor, onClose, onSuccess }) => {
    const { showSuccess, showError } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [demoInfo, setDemoInfo] = useState(null); // Track student's demo usage
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        preferredDate: '',
        preferredTime: '',
        mode: tutor.mode === 'both' ? 'online' : tutor.mode,
        studentNotes: '',
        subject: tutor.subjects?.[0] || ''
    });

    useEffect(() => {
        fetchDemoInfo();
    }, []);

    const fetchDemoInfo = async () => {
        try {
            const { data } = await api.get('/demos/my-demos');
            setDemoInfo({
                demosUsed: data.demosUsed,
                demosRemaining: data.demosRemaining
            });
        } catch (err) {
            console.error('Error fetching demo info:', err);
            // Default if endpoint fails
            setDemoInfo({ demosUsed: 0, demosRemaining: 3 });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            // NEW: Use unified /bookings endpoint with category: 'trial'
            const { data } = await api.post('/bookings', {
                tutorId: tutor.userId._id,
                subject: formData.subject,
                preferredSchedule: `${formData.preferredDate} ${formData.preferredTime}`,
                bookingCategory: 'trial', // Distinguishes from regular bookings
                sessionDate: formData.preferredDate,
                mode: formData.mode,
                studentNotes: formData.studentNotes
            });

            showSuccess(`✅ Trial booked! ${data.message || 'The tutor will be notified.'}`);
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Trial booking error:', err);
            const errorCode = err.response?.data?.code;
            const errorMessage = err.response?.data?.message;

            if (errorCode === 'MAX_TRIALS_EXCEEDED') {
                showError(errorMessage || 'You\'ve reached your active trial limit!');
            } else if (errorCode === 'TRIAL_EXISTS') {
                showError(errorMessage || 'You already have a trial with this tutor. Book a one-time class instead!');
            } else {
                showError(errorMessage || 'Failed to request trial. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Calculate next week for date limit
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                {/* Background overlay */}
                <div
                    className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                    aria-hidden="true"
                    onClick={onClose}
                ></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <span>🎓</span>
                            Book Your Free Demo Class
                        </h3>
                        <p className="text-indigo-100 text-sm mt-1">
                            30-minute trial session with {tutor.userId.name}
                        </p>
                    </div>

                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                        {loading ? (
                            <div className="text-center py-4">
                                <p className="text-gray-500">Loading...</p>
                            </div>
                        ) : demoInfo && demoInfo.demosRemaining <= 0 ? (
                            <div className="text-center py-6">
                                <div className="text-5xl mb-4">🎯</div>
                                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                                    You've Used All Your Free Demos!
                                </h4>
                                <p className="text-gray-600 mb-6">
                                    Ready to commit? Book a regular session to continue learning with {tutor.userId.name}.
                                </p>
                                <button
                                    onClick={onClose}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                                >
                                    Book a One-Time Class
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Demo Credits Display */}
                                {demoInfo && (
                                    <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                                        <div className="flex items-center">
                                            <svg className="h-5 w-5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <p className="text-sm text-blue-700">
                                                <span className="font-bold">{demoInfo.demosRemaining}</span> free demo{demoInfo.demosRemaining !== 1 ? 's' : ''} remaining
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {/* Subject Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                                        <select
                                            name="subject"
                                            value={formData.subject}
                                            onChange={handleChange}
                                            className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg border"
                                            required
                                        >
                                            {tutor.subjects?.map((sub, idx) => (
                                                <option key={idx} value={sub}>{sub}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date *</label>
                                            <input
                                                type="date"
                                                name="preferredDate"
                                                required
                                                min={new Date().toISOString().split('T')[0]}
                                                max={maxDate.toISOString().split('T')[0]}
                                                value={formData.preferredDate}
                                                onChange={handleChange}
                                                className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Next 7 days</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Time *</label>
                                            <input
                                                type="time"
                                                name="preferredTime"
                                                required
                                                value={formData.preferredTime}
                                                onChange={handleChange}
                                                className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Mode Selection if tutor supports both */}
                                    {tutor.mode === 'both' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Mode *</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <label className={`cursor-pointer ${formData.mode === 'online' ? 'ring-2 ring-indigo-500' : ''}`}>
                                                    <input
                                                        type="radio"
                                                        name="mode"
                                                        value="online"
                                                        checked={formData.mode === 'online'}
                                                        onChange={handleChange}
                                                        className="sr-only"
                                                    />
                                                    <div className="border border-gray-300 rounded-lg p-3 text-center hover:border-indigo-400 transition">
                                                        <span className="text-2xl">💻</span>
                                                        <p className="text-sm font-medium text-gray-900 mt-1">Online</p>
                                                    </div>
                                                </label>
                                                <label className={`cursor-pointer ${formData.mode === 'home' ? 'ring-2 ring-indigo-500' : ''}`}>
                                                    <input
                                                        type="radio"
                                                        name="mode"
                                                        value="home"
                                                        checked={formData.mode === 'home'}
                                                        onChange={handleChange}
                                                        className="sr-only"
                                                    />
                                                    <div className="border border-gray-300 rounded-lg p-3 text-center hover:border-indigo-400 transition">
                                                        <span className="text-2xl">🏠</span>
                                                        <p className="text-sm font-medium text-gray-900 mt-1">Home</p>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                                        <textarea
                                            name="studentNotes"
                                            rows={2}
                                            value={formData.studentNotes}
                                            onChange={handleChange}
                                            placeholder="Any specific topics you want to focus on?"
                                            className="block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        />
                                    </div>

                                    <div className="mt-6 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="flex-1 inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2.5 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="flex-1 inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2.5 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {submitting ? (
                                                <>
                                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Confirming...
                                                </>
                                            ) : (
                                                '✨ Confirm Demo (Free)'
                                            )}
                                        </button>
                                    </div>
                                </form>

                                <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                                    <p className="text-xs text-green-800 flex items-start gap-2">
                                        <svg className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span><strong>Instant Confirmation!</strong> Your demo will be auto-confirmed. The tutor will reach out to you directly.</span>
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RequestDemoModal;

