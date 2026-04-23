const mongoose = require('mongoose');

/**
 * Public contact form submissions. Admins review these in the admin dashboard.
 * Not tied to a User (may be from anonymous visitors).
 */
const contactMessageSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    phone: { type: String, trim: true, default: '', maxlength: 30 },
    subject: { type: String, trim: true, default: '', maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 4000 },
    sourceUrl: { type: String, trim: true, default: '' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: {
        type: String,
        enum: ['new', 'in_progress', 'resolved', 'spam'],
        default: 'new'
    },
    adminNote: { type: String, trim: true, default: '' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date }
}, { timestamps: true });

contactMessageSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
