import { useState, useEffect } from 'react';
import api from '../utils/api';

const ReviewList = ({ tutorId, studentId }) => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchReviews();
    }, [tutorId, studentId]);

    const fetchReviews = async () => {
        // Don't fetch if neither tutorId nor studentId is provided
        if (!tutorId && !studentId) {
            setLoading(false);
            return;
        }
        try {
            let endpoint;
            if (tutorId) {
                endpoint = `/reviews/tutor/${tutorId}`;
            } else {
                endpoint = `/reviews/student/${studentId}`;
            }

            const { data } = await api.get(endpoint);
            setReviews(data);
        } catch (err) {
            console.error('Error fetching reviews:', err);
            setError('Failed to load reviews');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <div className="text-gray-500">Loading reviews...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
            </div>
        );
    }

    if (reviews.length === 0) {
        return (
            <div className="bg-gray-50 border border-gray-200 text-gray-600 px-6 py-8 rounded-lg text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <p className="mt-2">No reviews yet</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-base font-bold text-gray-900 mb-5 pb-3 border-b border-gray-200">
                Reviews ({reviews.length})
            </h3>

            {reviews.map((review) => (
                <div key={review._id} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:border-gray-300 transition-colors">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            {/* Rating */}
                            <div className="flex items-center gap-3 mb-3">
                                <div className="flex">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <span
                                            key={star}
                                            className={`text-xl ${star <= review.rating
                                                    ? 'text-yellow-400'
                                                    : 'text-gray-300'
                                                }`}
                                        >
                                            ★
                                        </span>
                                    ))}
                                </div>
                                <span className="text-base font-semibold text-gray-900">
                                    {review.rating}.0
                                </span>
                            </div>

                            {/* Student Name */}
                            <p className="font-semibold text-gray-900 mb-2 text-base">
                                {review.studentId?.name || 'Anonymous'}
                            </p>

                            {/* Comment */}
                            {review.comment && (
                                <p className="text-gray-700 mt-2 text-sm leading-relaxed">
                                    "{review.comment}"
                                </p>
                            )}

                            {/* Date */}
                            <p className="text-sm text-gray-600 mt-4">
                                {formatDate(review.createdAt)}
                            </p>
                        </div>

                        {/* Tutor Name (for student view) */}
                        {studentId && review.tutorId && (
                            <div className="ml-6 text-right">
                                <p className="text-xs text-gray-600 mb-1 font-medium">Tutor:</p>
                                <p className="font-semibold text-indigo-600 text-base">
                                    {review.tutorId.name}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ReviewList;
