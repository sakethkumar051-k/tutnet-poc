const mongoose = require('mongoose');

/**
 * PayoutLedger — every money-movement out of the platform to a tutor is a row here.
 * Covers weekly session payouts, incentive bonus payouts, and deposit refunds.
 *
 * In MOCK/TEST mode this ledger IS the payout (no bank API called).
 * In live mode the `externalPayoutId` links to RazorpayX or equivalent.
 */
const payoutLedgerSchema = new mongoose.Schema({
    tutorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Billing period this payout covers (monthly rollup)
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    periodLabel: { type: String, required: true }, // e.g. "2026-04-W3"

    // Money breakdown (all in ₹)
    grossEarnings: { type: Number, required: true, min: 0 },
    commissionRate: { type: Number, required: true, min: 0, max: 100 },
    commissionAmount: { type: Number, required: true, min: 0 },
    incentiveBonuses: { type: Number, default: 0, min: 0 },
    deductions: { type: Number, default: 0, min: 0 },
    reserveHeld: { type: Number, default: 0, min: 0 }, // chargeback reserve (15-20% of final week)
    netPayable: { type: Number, required: true, min: 0 },

    // Session references that make up this payout
    sessionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
    incentiveLedgerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'IncentiveLedger' }],

    // Execution
    status: {
        type: String,
        enum: ['scheduled', 'processing', 'paid', 'failed', 'reversed', 'held'],
        default: 'scheduled',
        index: true
    },
    scheduledAt: Date,
    processedAt: Date,
    paidAt: Date,

    mode: {
        type: String,
        enum: ['mock', 'razorpayx', 'manual_upi', 'manual_bank'],
        default: 'mock'
    },
    externalPayoutId: String,  // set in live mode
    failureReason: String,
    adminReviewRequired: { type: Boolean, default: false },

    // Bank details snapshot at the time of payout (for audit)
    bankSnapshot: {
        accountName: String,
        accountNumberLast4: String,
        ifsc: String,
        upi: String
    },

    idempotencyKey: {
        type: String,
        required: true,
        unique: true
    }
}, { timestamps: true });

payoutLedgerSchema.index({ tutorId: 1, periodStart: -1 });
payoutLedgerSchema.index({ status: 1, scheduledAt: 1 });

module.exports = mongoose.model('PayoutLedger', payoutLedgerSchema);
