import { useCallback, useEffect, useState } from 'react';
import api from '../utils/api';

/**
 * ReviewList — renders reviews with optional tutor reply inline.
 * Pass `canReply` (usually on the tutor's own dashboard) to enable the reply form.
 */
const ReviewList = ({ tutorId, studentId, canReply = false }) => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchReviews = useCallback(async () => {
        if (!tutorId && !studentId) { setLoading(false); return; }
        try {
            const endpoint = tutorId ? `/reviews/tutor/${tutorId}` : `/reviews/student/${studentId}`;
            const { data } = await api.get(endpoint);
            setReviews(data);
        } catch (err) {
            console.error('Error fetching reviews:', err);
            setError('Failed to load reviews');
        } finally { setLoading(false); }
    }, [tutorId, studentId]);

    useEffect(() => { fetchReviews(); }, [fetchReviews]);

    const onReplySaved = (id, newReview) => {
        setReviews((rs) => rs.map((r) => r._id === id ? newReview : r));
    };

    const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    if (loading) return <div className="flex justify-center py-8 text-gray-500">Loading reviews...</div>;
    if (error) return <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>;

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
            <h3 className="text-base font-bold text-navy-950 mb-5 pb-3 border-b border-gray-200">
                Reviews ({reviews.length})
            </h3>

            {reviews.map((review) => (
                <ReviewCard
                    key={review._id}
                    review={review}
                    studentSide={!!studentId}
                    canReply={canReply}
                    onReplySaved={onReplySaved}
                    formatDate={formatDate}
                />
            ))}
        </div>
    );
};

function ReviewCard({ review, studentSide, canReply, onReplySaved, formatDate }) {
    const [replying, setReplying] = useState(false);
    const [replyText, setReplyText] = useState(review.tutorReply?.text || '');
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');

    const saveReply = async () => {
        if (!replyText.trim()) return;
        setSaving(true);
        setErr('');
        try {
            const { data } = await api.patch(`/reviews/${review._id}/reply`, { text: replyText.trim() });
            onReplySaved(review._id, data.review);
            setReplying(false);
        } catch (e) {
            setErr(e?.response?.data?.message || 'Could not save reply');
        } finally { setSaving(false); }
    };

    const hasReply = review.tutorReply?.text && review.tutorReply.text.trim();

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:border-gray-300 transition-colors">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <span key={star} className={`text-xl ${star <= review.rating ? 'text-lime-dark' : 'text-gray-300'}`}>★</span>
                            ))}
                        </div>
                        <span className="text-base font-semibold text-navy-950">{review.rating}.0</span>
                    </div>

                    <p className="font-semibold text-navy-950 mb-2 text-base">
                        {review.studentId?.name || 'Anonymous'}
                    </p>

                    {review.comment && (
                        <p className="text-gray-700 mt-2 text-sm leading-relaxed">"{review.comment}"</p>
                    )}

                    <p className="text-sm text-gray-600 mt-4">{formatDate(review.createdAt)}</p>

                    {/* Tutor reply */}
                    {hasReply && !replying && (
                        <div className="mt-4 pl-4 border-l-2 border-royal/40 bg-royal/[0.03] rounded-r py-2 pr-3">
                            <p className="text-[11px] font-bold text-royal-dark uppercase tracking-wider mb-1">
                                Tutor response
                                {review.tutorReply?.repliedAt && (
                                    <span className="ml-2 text-[10px] text-gray-400 font-normal normal-case tracking-normal">
                                        · {formatDate(review.tutorReply.repliedAt)}
                                    </span>
                                )}
                            </p>
                            <p className="text-sm text-gray-700 whitespace-pre-line">{review.tutorReply.text}</p>
                            {canReply && (
                                <button onClick={() => setReplying(true)} className="text-[11px] text-royal hover:text-royal-dark font-semibold mt-1">
                                    Edit reply
                                </button>
                            )}
                        </div>
                    )}

                    {/* Reply editor */}
                    {canReply && (replying || !hasReply) && (
                        <div className="mt-4">
                            {!replying && !hasReply ? (
                                <button onClick={() => setReplying(true)} className="text-xs font-semibold text-royal hover:text-royal-dark">
                                    + Add a response
                                </button>
                            ) : (
                                <div>
                                    <textarea
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        rows={3}
                                        maxLength={1000}
                                        placeholder="Thank the student, clarify something, or add context. Visible on your public profile."
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-royal/40 resize-none" />
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-[10px] text-gray-400">{replyText.length}/1000</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setReplying(false); setReplyText(review.tutorReply?.text || ''); setErr(''); }}
                                                className="px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                                                Cancel
                                            </button>
                                            <button onClick={saveReply} disabled={!replyText.trim() || saving}
                                                className="px-3 py-1.5 text-xs font-semibold bg-royal hover:bg-royal-dark text-white rounded-lg disabled:opacity-50">
                                                {saving ? 'Saving…' : (hasReply ? 'Update' : 'Post reply')}
                                            </button>
                                        </div>
                                    </div>
                                    {err && <p className="text-xs text-rose-600 mt-1">{err}</p>}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {studentSide && review.tutorId && (
                    <div className="ml-6 text-right">
                        <p className="text-xs text-gray-600 mb-1 font-medium">Tutor:</p>
                        <p className="font-semibold text-royal text-base">{review.tutorId.name}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ReviewList;
