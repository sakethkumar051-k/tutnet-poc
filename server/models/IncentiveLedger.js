const mongoose = require('mongoose');

/**
 * IncentiveLedger — every bonus earned or credit issued is a row here.
 * Append-only (no updates). Used to prevent double-payment and provide
 * a clean audit trail for both tutor incentives and parent credits.
 *
 * Incentives map directly to REVENUE_MODEL.md §5.
 */
const incentiveLedgerSchema = new mongoose.Schema({
    // Who receives the incentive
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    userRole: {
        type: String,
        enum: ['tutor', 'student'],
        required: true
    },

    // What kind of incentive (matches REVENUE_MODEL.md §5.1 and §5.2 keys)
    kind: {
        type: String,
        required: true,
        enum: [
            // Tutor incentives (§5.1)
            'demo_conversion',
            'first_session',
            'ten_sessions',
            'retention_3mo',
            'retention_6mo',
            'volume_bonus',
            'perfect_month',
            'tier_upgrade',
            'tutor_referral',

            // Parent incentives (§5.2)
            'trial_conversion',
            'committed_plan',
            'parent_referral',
            'sibling_discount',
            'long_loyalty',
            'off_platform_report',

            // Paid top-up (wallet purchase)
            'credit_topup'
        ]
    },

    // Cash amount in ₹ (positive = credit/bonus)
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },

    // Settlement form
    settlementType: {
        type: String,
        enum: ['bonus_payout', 'platform_credit', 'invoice_discount'],
        required: true
    },
    status: {
        type: String,
        enum: ['accrued', 'paid', 'applied', 'clawed_back', 'void'],
        default: 'accrued',
        index: true
    },
    accruedAt: { type: Date, default: Date.now },
    paidAt: Date,
    appliedAt: Date,
    clawedBackAt: Date,

    // What triggered this incentive
    trigger: {
        bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
        sessionCount: Number,
        consecutiveMonths: Number,
        activeStudents: Number,
        avgRating: Number,
        referralTargetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: String
    },

    // Idempotency / dedupe key: e.g. `volume_bonus:2026-04:<tutorId>` — prevents double-pay
    idempotencyKey: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // Link to payout ledger when paid out (for tutor bonuses)
    payoutLedgerId: { type: mongoose.Schema.Types.ObjectId, ref: 'PayoutLedger' },

    notes: String
}, { timestamps: true });

// Queries: find a user's pending/unpaid incentives fast
incentiveLedgerSchema.index({ userId: 1, status: 1, kind: 1 });
incentiveLedgerSchema.index({ userId: 1, accruedAt: -1 });

module.exports = mongoose.model('IncentiveLedger', incentiveLedgerSchema);
