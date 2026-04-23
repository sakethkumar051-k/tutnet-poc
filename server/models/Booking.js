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
    // UNIFIED MODEL: Category determines if this is a trial, one-time session, or dedicated tutor engagement
    bookingCategory: {
        type: String,
        enum: ['trial', 'session', 'permanent', 'dedicated'],
        required: true,
        default: 'session'
    },
    // Canonical lifecycle status:
    // pending -> approved -> completed
    // pending -> rejected
    // approved -> cancelled
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled', 'completed'],
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

    // DEPRECATED LEGACY FIELD:
    // Use bookingCategory as the source of truth.
    // Fallback mapping for legacy docs: demo -> trial, regular -> session.
    // Keep temporarily for backward compatibility/migration only.
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

    // Dedicated tutor engagement fields (bookingCategory === 'dedicated' or legacy 'permanent')
    preferredStartDate: { type: Date },
    weeklySchedule: [{ day: { type: String, trim: true }, time: { type: String, trim: true } }],
    monthsCommitted: { type: Number, min: 1 },
    sessionsPerWeek: { type: Number, min: 1 },
    subjects: [{ type: String, trim: true }],
    frequency: { type: String, enum: ['weekly', 'biweekly', 'monthly'], default: 'weekly' },
    durationCommitment: { type: String, trim: true },
    learningGoals: { type: String, trim: true },
    studyGoals: { type: String, trim: true },
    currentLevel: { type: String, trim: true },
    focusAreas: { type: String, trim: true },
    additionalNotes: { type: String, trim: true },
    termsAccepted: { type: Boolean, default: false },
    parentBookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },

    /** Zoom / Meet / custom URL — how participants join the online session */
    sessionJoinUrl: { type: String, trim: true, default: '' },
    /** First time the online session was joined (proof / duration) */
    joinedSessionAt: { type: Date },
    /** Last time a participant left the online session */
    leftSessionAt: { type: Date },
    cancellationReason: { type: String, trim: true, default: '' },
    cancelledBy: {
        type: String,
        enum: ['', 'student', 'tutor', 'system', 'admin'],
        default: ''
    },
    /** Tutor opened this pending request (student visibility) */
    viewedByTutorAt: { type: Date },
    /** Snapshot of tutor hourly rate when the booking was created */
    lockedHourlyRate: { type: Number, min: 0 },
    priceLockedAt: { type: Date },
    /** Client retry key — duplicate POST with same key returns existing booking */
    idempotencyKey: { type: String, trim: true },

    // ═══════════════════════════════════════════════════════════════════════
    // REVENUE MODEL FIELDS (see REVENUE_MODEL.md)
    // ═══════════════════════════════════════════════════════════════════════

    /** Subscription plan (see REVENUE_MODEL.md §3). Null for legacy/unconverted bookings. */
    plan: {
        type: String,
        enum: ['flex', 'monthly', 'committed', 'intensive', null],
        default: null
    },
    /** Session allowance for subscription plans (flex: unlimited=null; monthly: 20; intensive: 28) */
    sessionAllowance: { type: Number, default: null },
    /** Sessions already consumed against the plan in the current billing period */
    sessionsConsumed: { type: Number, default: 0 },
    /** Plan billing period start/end (for subscriptions) */
    planPeriodStart: { type: Date },
    planPeriodEnd: { type: Date },

    /** Commission rate (%) snapshot at booking creation — immune to tier changes later */
    commissionRate: { type: Number, min: 0, max: 100 },
    /** Commission amount snapshot (₹) */
    commissionAmount: { type: Number, min: 0 },
    /** Tutor tier at booking creation (for analytics) */
    tutorTierAtBooking: {
        type: String,
        enum: ['starter', 'silver', 'gold', 'platinum', null],
        default: null
    },
    /** Parent credits applied to this invoice (cashback, referral, sibling, etc.) */
    appliedCreditsAmount: { type: Number, default: 0 },
    appliedCreditsReasons: [{ type: String, trim: true }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

bookingSchema.virtual('onlineLink').get(function () {
    return this.sessionJoinUrl || '';
});

// Indexes for performance and conflict queries
bookingSchema.index({ studentId: 1, status: 1 });
bookingSchema.index({ tutorId: 1, status: 1 });
bookingSchema.index({ tutorId: 1, status: 1, sessionDate: 1 });
bookingSchema.index({ studentId: 1, status: 1, sessionDate: 1 });
bookingSchema.index({ bookingCategory: 1, status: 1 });
bookingSchema.index({ trialExpiresAt: 1 });
bookingSchema.index({ parentBookingId: 1 });
bookingSchema.index(
    { idempotencyKey: 1 },
    { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);
bookingSchema.index({ plan: 1, planPeriodEnd: 1 });

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
