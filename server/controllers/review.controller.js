const Review = require('../models/Review');
const Booking = require('../models/Booking');
const TutorProfile = require('../models/TutorProfile');
const { createNotification } = require('../utils/notificationHelper');

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

        // Update tutor average rating
        const tutorProfile = await TutorProfile.findOne({ userId: tutorId || booking.tutorId });
        if (tutorProfile) {
            const reviews = await Review.find({ tutorId: tutorId || booking.tutorId });
            tutorProfile.totalReviews = reviews.length;
            tutorProfile.averageRating =
                reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length;
            await tutorProfile.save();
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

module.exports = {
    createReview,
    getTutorReviews,
    getStudentReviews
};
