const mongoose = require('mongoose');

const tutorProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    subjects: [{ type: String, trim: true }],
    classes: [{ type: String, trim: true }],
    hourlyRate: { type: Number, required: true },
    experienceYears: { type: Number, default: 0 },
    mode: { type: String, enum: ['online', 'home', 'both'], default: 'home' },
    languages: [{ type: String, trim: true }],
    bio: { type: String, trim: true },
    availableSlots: { type: [String], default: [] },
    availabilityMode: { type: String, enum: ['fixed', 'flexible'], default: 'flexible' },
    weeklyAvailability: [{
        day: { type: String, enum: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] },
        slots: [{ start: String, end: String }]
    }],
    travelRadius: { type: Number, min: 0, max: 100 },
    noticePeriodHours: { type: Number, min: 0, max: 168 },
    maxSessionsPerDay: { type: Number, min: 1, max: 12 },
    education: {
        degree: { type: String, trim: true },
        institution: { type: String, trim: true },
        year: { type: String, trim: true }
    },
    qualifications: [{ type: String, trim: true }],
    strengthTags: [{ type: String, trim: true }],
    profileStatus: {
        type: String,
        enum: ['draft', 'pending', 'approved', 'rejected'],
        default: 'draft'
    },
    verificationLevel: {
        type: String,
        enum: ['none', 'phone', 'id', 'full'],
        default: 'none'
    },
    profileCompletionScore: { type: Number, min: 0, max: 100, default: 0 },
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    rejectionReason: { type: String, trim: true },
    tutorCode: { type: String, unique: true, sparse: true },
    approvalHistory: [{
        action: {
            type: String,
            enum: ['submitted', 'approved', 'rejected', 'resubmitted'],
            required: true
        },
        adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        adminName: { type: String },
        note: { type: String, trim: true },
        timestamp: { type: Date, default: Date.now }
    }],
    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    /** Search listing analytics — total impressions + weekly bucket */
    searchAppearancesTotal: { type: Number, default: 0 },
    searchAppearancesThisWeek: { type: Number, default: 0 },
    searchAppearancesWeekId: { type: String, default: '', trim: true },

    // ═══════════════════════════════════════════════════════════════════════
    // REVENUE MODEL FIELDS (see REVENUE_MODEL.md §4)
    // ═══════════════════════════════════════════════════════════════════════

    /** Current tutor tier. Drives commission rate. See commissionTier.service.js */
    tier: {
        type: String,
        enum: ['starter', 'silver', 'gold', 'platinum'],
        default: 'starter'
    },
    /** Lifetime completed & paid session count — authoritative for tier promotion */
    totalSessions: { type: Number, default: 0 },
    /** Current commission rate (%) for this tutor. Snapshotted onto each booking. */
    currentCommissionRate: { type: Number, default: 25 },
    /** Timestamp of last tier transition (for audit / dashboard) */
    tierUpdatedAt: { type: Date, default: Date.now },
    /** Tier progression history for the tutor dashboard UI */
    tierHistory: [{
        tier: { type: String, enum: ['starter', 'silver', 'gold', 'platinum'] },
        commissionRate: Number,
        reachedAt: { type: Date, default: Date.now },
        reason: { type: String } // e.g. "Completed 21st session", "Dropped due to rating < 4.0"
    }],

    /** Refundable security deposit (₹). Forfeited on TSA §3 or §6 breach. */
    securityDeposit: {
        amountHeld: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ['none', 'pending', 'held', 'refunded', 'forfeited'],
            default: 'none'
        },
        heldAt: Date,
        releasedAt: Date,
        forfeitedAt: Date,
        forfeitReason: String
    },

    /** Silent risk score for anti-bypass (0-100, higher = riskier). */
    riskScore: { type: Number, default: 0, min: 0, max: 100 },
    /** Flagged events counter (chat filter hits, parent reports, decoy failures) */
    flaggedEventsCount: { type: Number, default: 0 },

    /** Aggregate lifetime earnings tracking for dashboards */
    lifetimeGrossEarnings: { type: Number, default: 0 },
    lifetimeCommissionPaid: { type: Number, default: 0 },
    lifetimeIncentivesPaid: { type: Number, default: 0 },

    /** Vacation / leave mode — tutor is temporarily unavailable and hidden from search.
     * Existing bookings remain; new trial/session requests are disabled while active. */
    vacation: {
        active: { type: Boolean, default: false },
        from: { type: Date },
        to: { type: Date },
        message: { type: String, trim: true, maxlength: 300, default: '' }
    },

    /** Uploaded qualification documents — degree scans, certificates, govt. id. */
    qualificationDocs: [{
        title: { type: String, trim: true, maxlength: 200 },
        url: { type: String, required: true, trim: true },
        mimeType: { type: String, trim: true },
        uploadedAt: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

tutorProfileSchema.index({ approvalStatus: 1, profileStatus: 1 });
tutorProfileSchema.index({ subjects: 1 });
tutorProfileSchema.index({ classes: 1 });
tutorProfileSchema.index({ mode: 1 });

module.exports = mongoose.model('TutorProfile', tutorProfileSchema);
