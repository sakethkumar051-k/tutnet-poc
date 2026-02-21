import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';

const ReviewForm = ({ bookingId, tutorId, tutorName, onSuccess }) => {
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const { showSuccess, showError } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (rating === 0) {
            showError('Please select a rating');
            return;
        }

        setLoading(true);
        try {
            await api.post('/reviews', {
                bookingId,
                tutorId,
                rating,
                comment: comment.trim()
            });

            showSuccess('Review submitted successfully!');
            setRating(0);
            setComment('');
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Error submitting review:', error);
            showError(error.response?.data?.message || 'Failed to submit review');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Leave a Review for {tutorName}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Star Rating */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rating
                    </label>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoveredRating(star)}
                                onMouseLeave={() => setHoveredRating(0)}
                                className="text-3xl transition-transform hover:scale-110 focus:outline-none"
                            >
                                <span className={
                                    star <= (hoveredRating || rating)
                                        ? 'text-yellow-400'
                                        : 'text-gray-300'
                                }>
                                    ★
                                </span>
                            </button>
                        ))}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                        {rating > 0 ? `${rating} star${rating > 1 ? 's' : ''}` : 'Click to rate'}
                    </p>
                </div>

                {/* Comment */}
                <div>
                    <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                        Your Experience (Optional)
                    </label>
                    <textarea
                        id="comment"
                        rows="4"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Share your experience with this tutor..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                        type="submit"
                        disabled={loading || rating === 0}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Submitting...
                            </>
                        ) : (
                            'Submit Review'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ReviewForm;
