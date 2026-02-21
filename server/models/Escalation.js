const mongoose = require('mongoose');

const escalationSchema = new mongoose.Schema({
    raisedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    raisedByRole: {
        type: String,
        enum: ['tutor', 'student', 'parent'],
        required: true
    },
    againstUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking'
    },
    type: {
        type: String,
        enum: ['misconduct', 'payment_dispute', 'no_show', 'harassment', 'safety_concern', 'other'],
        required: true
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['open', 'under_review', 'resolved', 'dismissed'],
        default: 'open'
    },
    adminNotes: {
        type: String
    },
    resolvedAt: {
        type: Date
    }
}, { timestamps: true });

module.exports = mongoose.model('Escalation', escalationSchema);
