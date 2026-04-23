const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Optional: tie message to a specific booking/session context
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        default: null
    },
    text: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    read: {
        type: Boolean,
        default: false
    },
    /** When the recipient first marked this message as read (read receipts) */
    readAt: {
        type: Date,
        default: null
    },

    /** Original text before moderation redaction (admin-only visibility). */
    originalText: { type: String, select: false, maxlength: 2000 },

    /** Anti-bypass moderation verdict (set by messageModerator.service) */
    moderation: {
        flagged: { type: Boolean, default: false },
        reasons: [String],
        riskWeight: Number,
        matches: [String]
    }
}, {
    timestamps: true
});

// Index for fast conversation lookup
messageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });
messageSchema.index({ recipientId: 1, read: 1 });

module.exports = mongoose.model('Message', messageSchema);
