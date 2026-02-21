const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
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
    subject: {
        type: String,
        required: true
    },
    preferredSchedule: {
        type: String,
        required: true
    },
    sessionDate: {
        type: Date
    },
    // UNIFIED MODEL: Category determines if this is a trial, regular session, or permanent engagement
    bookingCategory: {
        type: String,
        enum: ['trial', 'session', 'permanent'],
        required: true,
        default: 'session'
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
        default: 'pending'
    },
    attendanceStatus: {
        type: String,
        enum: ['pending', 'present', 'absent'],
        default: 'pending'
    },

    // TRIAL-SPECIFIC FIELDS (only used when bookingCategory === 'trial')
    trialOutcome: {
        type: String,
        enum: ['pending', 'converted', 'not_interested', 'no_show'],
        default: 'pending'
    },
    trialExpiresAt: {
        type: Date
        // Set to createdAt + 48 hours for auto-expiry
    },

    // SESSION-SPECIFIC FIELDS
    isPaid: {
        type: Boolean,
        default: false
    },

    // Legacy field (deprecated, will be removed after migration)
    bookingType: {
        type: String,
        enum: ['demo', 'regular']
    },

    currentTutorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Reschedule request (student → tutor direction)
    rescheduleRequest: {
        requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        proposedDate: { type: Date },
        proposedSchedule: { type: String },
        reason: { type: String },
        status: { type: String, enum: ['pending', 'approved', 'declined'], default: 'pending' },
        requestedAt: { type: Date }
    },

    // Reminder tracking (set by the reminders job)
    reminders: {
        sent24h: { type: Boolean, default: false },
        sent1h:  { type: Boolean, default: false }
    },

    // Tutor-initiated change request (tutor proposes change → student/parent approves)
    tutorChangeRequest: {
        type: { type: String, enum: ['reschedule', 'subject', 'both'] },
        proposedDate: { type: Date },
        proposedSchedule: { type: String },
        proposedSubject: { type: String },
        reason: { type: String },
        status: { type: String, enum: ['pending', 'approved', 'declined'], default: 'pending' },
        requestedAt: { type: Date }
    },

    // Permanent engagement fields (only when bookingCategory === 'permanent')
    preferredStartDate: { type: Date },
    subjects: [{ type: String, trim: true }],
    frequency: { type: String, enum: ['weekly', 'biweekly', 'monthly'], default: 'weekly' },
    durationCommitment: { type: String, trim: true }, // e.g. "3 months", "6 months"
    learningGoals: { type: String, trim: true },
    studyGoals: { type: String, trim: true },
    currentLevel: { type: String, trim: true },
    focusAreas: { type: String, trim: true },
    additionalNotes: { type: String, trim: true },
    termsAccepted: { type: Boolean, default: false },
    parentBookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' } // For recurring sessions created from permanent
}, {
    timestamps: true
});

// Indexes for performance
bookingSchema.index({ studentId: 1, status: 1 });
bookingSchema.index({ tutorId: 1, status: 1 });
bookingSchema.index({ bookingCategory: 1, status: 1 });
bookingSchema.index({ trialExpiresAt: 1 }); // For auto-expiry queries

// Virtual to check if trial is expired
bookingSchema.virtual('isExpired').get(function () {
    if (this.bookingCategory === 'trial' && this.trialExpiresAt) {
        return new Date() > this.trialExpiresAt && this.status === 'pending';
    }
    return false;
});

// Helper method to check if student can request trial with this tutor
bookingSchema.statics.canRequestTrial = async function (studentId, tutorId) {
    // Check how many trials student already has with this tutor (max 2)
    const existingTrialsCount = await this.countDocuments({
        studentId,
        tutorId,
        bookingCategory: 'trial'
    });

    // Allow max 2 trials per tutor-student pair
    return existingTrialsCount < 2;
};

// Helper method to count active trials for a student  
bookingSchema.statics.countActiveTrials = async function (studentId) {
    return await this.countDocuments({
        studentId,
        bookingCategory: 'trial',
        status: { $in: ['pending', 'approved'] }
    });
};

module.exports = mongoose.model('Booking', bookingSchema);
