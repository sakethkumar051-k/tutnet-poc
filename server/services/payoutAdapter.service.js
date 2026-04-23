/**
 * Payout Adapter
 * --------------
 * Single boundary between the platform and actual money-movement rails.
 *
 *   - MOCK mode:  writes a row to PayoutLedger, marks it paid_mock. No external API.
 *   - LIVE mode:  will call RazorpayX Payouts API (implement when current account ready).
 *
 * All callers (monthly payout job, incentive payouts) go through this.
 * Swapping to live is a single-file change.
 */

const PayoutLedger = require('../models/PayoutLedger');
const TutorProfile = require('../models/TutorProfile');

const PAYOUT_MODE = process.env.PAYOUT_MODE || 'mock';

/**
 * Execute a scheduled payout.
 * @param {Object} params
 * @param {string} params.tutorId
 * @param {Date} params.periodStart
 * @param {Date} params.periodEnd
 * @param {string} params.periodLabel e.g. "2026-04-W3"
 * @param {number} params.grossEarnings
 * @param {number} params.commissionRate
 * @param {number} params.commissionAmount
 * @param {number} params.incentiveBonuses
 * @param {number} params.deductions
 * @param {number} params.reserveHeld
 * @param {string[]} params.sessionIds
 * @param {string[]} params.incentiveLedgerIds
 * @param {string} params.idempotencyKey unique key prevents double-pay
 * @returns {Promise<PayoutLedgerDocument>}
 */
async function executePayout(params) {
    const {
        tutorId,
        periodStart,
        periodEnd,
        periodLabel,
        grossEarnings,
        commissionRate,
        commissionAmount,
        incentiveBonuses = 0,
        deductions = 0,
        reserveHeld = 0,
        sessionIds = [],
        incentiveLedgerIds = [],
        idempotencyKey
    } = params;

    if (!tutorId || !idempotencyKey) {
        throw new Error('payoutAdapter.executePayout: tutorId and idempotencyKey required');
    }

    // Idempotency guard — if this payout already exists, return it (don't double-pay)
    const existing = await PayoutLedger.findOne({ idempotencyKey });
    if (existing) {
        console.log(`[payoutAdapter] idempotent short-circuit: ${idempotencyKey} already ${existing.status}`);
        return existing;
    }

    const netPayable = Math.max(0, grossEarnings - commissionAmount + incentiveBonuses - deductions - reserveHeld);

    const tutorProfile = await TutorProfile.findOne({ userId: tutorId }).select('userId');

    const payout = await PayoutLedger.create({
        tutorId,
        periodStart,
        periodEnd,
        periodLabel,
        grossEarnings,
        commissionRate,
        commissionAmount,
        incentiveBonuses,
        deductions,
        reserveHeld,
        netPayable,
        sessionIds,
        incentiveLedgerIds,
        status: 'scheduled',
        scheduledAt: new Date(),
        mode: PAYOUT_MODE === 'mock' ? 'mock' : 'razorpayx',
        idempotencyKey
    });

    try {
        if (PAYOUT_MODE === 'mock') {
            // MOCK: simulate successful payout with a 0ms "bank transfer"
            payout.status = 'paid';
            payout.processedAt = new Date();
            payout.paidAt = new Date();
            payout.externalPayoutId = `mock_payout_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            await payout.save();
            console.log(`[payoutAdapter] MOCK paid ₹${netPayable} to tutor ${tutorId} (${periodLabel})`);

            // Update tutor lifetime aggregates
            if (tutorProfile) {
                await TutorProfile.updateOne(
                    { userId: tutorId },
                    {
                        $inc: {
                            lifetimeGrossEarnings: grossEarnings,
                            lifetimeCommissionPaid: commissionAmount,
                            lifetimeIncentivesPaid: incentiveBonuses
                        }
                    }
                );
            }
            return payout;
        }

        // LIVE: RazorpayX Payouts API call would go here. Requires current account + KYC.
        // When switching on: call razorpay.payouts.create({...}), store the payout.id as externalPayoutId,
        // set status to 'processing', and rely on webhook to mark 'paid'.
        console.error('[payoutAdapter] LIVE mode called but not implemented yet');
        payout.status = 'held';
        payout.adminReviewRequired = true;
        payout.failureReason = 'LIVE payouts not yet enabled — requires RazorpayX + current account';
        await payout.save();
        return payout;
    } catch (err) {
        payout.status = 'failed';
        payout.failureReason = err.message || 'unknown';
        await payout.save();
        console.error(`[payoutAdapter] payout failed for tutor ${tutorId}:`, err);
        throw err;
    }
}

/**
 * Schedule (but do not yet execute) a payout. Used when payout is computed
 * but we want admin review or hold against disputes.
 */
async function schedulePayout(params) {
    const { idempotencyKey } = params;
    const existing = await PayoutLedger.findOne({ idempotencyKey });
    if (existing) return existing;

    const netPayable = Math.max(
        0,
        (params.grossEarnings || 0) - (params.commissionAmount || 0)
        + (params.incentiveBonuses || 0) - (params.deductions || 0) - (params.reserveHeld || 0)
    );

    return PayoutLedger.create({
        ...params,
        netPayable,
        status: 'scheduled',
        scheduledAt: new Date(),
        mode: PAYOUT_MODE === 'mock' ? 'mock' : 'razorpayx'
    });
}

/**
 * Release a previously-held reserve (e.g., chargeback window closed with no dispute).
 */
async function releaseReserve(payoutId) {
    const payout = await PayoutLedger.findById(payoutId);
    if (!payout) throw new Error('Payout not found');
    if (payout.reserveHeld <= 0) return payout;

    const previousReserve = payout.reserveHeld;
    payout.netPayable += previousReserve;
    payout.reserveHeld = 0;
    await payout.save();

    console.log(`[payoutAdapter] released reserve ₹${previousReserve} on payout ${payoutId}`);
    return payout;
}

module.exports = {
    executePayout,
    schedulePayout,
    releaseReserve,
    PAYOUT_MODE
};
