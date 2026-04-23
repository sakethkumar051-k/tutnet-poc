const Review = require('../models/Review');
const Booking = require('../models/Booking');
const TutorProfile = require('../models/TutorProfile');
const { createNotification } = require('../utils/notificationHelper');
const { evaluateAndPersistTier } = require('../services/commissionTier.service');
const { onTierUpgrade } = require('../services/incentiveEngine.service');

// @desc    Create a review
// @route   POST /api/reviews
// @access  Private (Student)
const createReview = async (req, res) => {
    try {
        const { bookingId, tutorId, rating, comment } = req.body;

        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Ensure user owns the booking
        if (booking.studentId.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // Ensure booking is completed
        if (booking.status !== 'completed') {
            return res.status(400).json({ message: 'Can only review completed bookings' });
        }

        // Check if review already exists
        const reviewExists = await Review.findOne({ bookingId });
        if (reviewExists) {
            return res.status(400).json({ message: 'Review already exists for this booking' });
        }

        const review = await Review.create({
            bookingId,
            studentId: req.user.id,
            tutorId: tutorId || booking.tutorId,
            rating,
            comment
        });

        // Mark booking as reviewed
        booking.hasReview = true;
        await booking.save();

        // Update tutor average rating + re-evaluate commission tier
        const resolvedTutorId = tutorId || booking.tutorId;
        const tutorProfile = await TutorProfile.findOne({ userId: resolvedTutorId });
        if (tutorProfile) {
            const reviews = await Review.find({ tutorId: resolvedTutorId });
            tutorProfile.totalReviews = reviews.length;
            tutorProfile.averageRating =
                reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length;
            await tutorProfile.save();

            // Rating change may promote (or demote) tier
            try {
                const previousTier = tutorProfile.tier;
                const result = await evaluateAndPersistTier(tutorProfile);
                if (result?.transitioned && result.isPromotion) {
                    await onTierUpgrade({
                        tutorId: resolvedTutorId,
                        newTier: result.to,
                        oldTier: result.from
                    }).catch(() => {});
                    await createNotification({
                        userId: resolvedTutorId,
                        type: 'tier_upgraded',
                        title: `You're now a ${result.to.charAt(0).toUpperCase() + result.to.slice(1)} tutor`,
                        message: `Your rating + session count pushed you up a tier. Commission drops to ${tutorProfile.currentCommissionRate}%.`,
                        link: '/tutor-dashboard?tab=earnings'
                    }).catch(() => {});
                }
            } catch (hookErr) {
                console.error('[createReview] tier hook error:', hookErr.message);
            }
        }

        await createNotification({
            userId: tutorId || booking.tutorId,
            type: 'new_review',
            title: 'New Review Received',
            message: `You received a ${rating}-star review!`,
            link: '/tutor-dashboard?tab=analytics',
            metadata: { reviewId: review._id }
        });

        res.status(201).json(review);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get reviews for a tutor
// @route   GET /api/reviews/tutor/:tutorId
// @access  Public
const getTutorReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ tutorId: req.params.tutorId })
            .populate('studentId', 'name')
            .populate('tutorId', 'name')
            .sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get reviews by a student
// @route   GET /api/reviews/student/:studentId
// @access  Private
const getStudentReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ studentId: req.params.studentId })
            .populate('tutorId', 'name')
            .populate('studentId', 'name')
            .sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Tutor replies to a review on their profile
// @route   PATCH /api/reviews/:id/reply
// @access  Private/Tutor
const replyToReview = async (req, res) => {
    try {
        const Review = require('../models/Review');
        const { text } = req.body;
        if (!text || !text.trim()) {
            return res.status(400).json({ message: 'Reply text is required' });
        }
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ message: 'Review not found' });
        if (String(review.tutorId) !== String(req.user._id)) {
            return res.status(403).json({ message: 'Only the reviewed tutor can reply' });
        }
        review.tutorReply = { text: text.trim().slice(0, 1000), repliedAt: new Date() };
        await review.save();
        res.json({ ok: true, review });
    } catch (err) {
        console.error('[replyToReview]', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    createReview,
    getTutorReviews,
    getStudentReviews,
    replyToReview
};
