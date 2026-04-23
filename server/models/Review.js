const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true,
        unique: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tutorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        trim: true
    },
    /** Tutor's public reply to the review. Appears below the review on their profile. */
    tutorReply: {
        text: { type: String, trim: true, maxlength: 1000, default: '' },
        repliedAt: { type: Date }
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Review', reviewSchema);
