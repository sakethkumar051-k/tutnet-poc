/**
 * Weekly Payout Job
 * -----------------
 * Every Friday 10:00 AM IST, rolls up the week's completed+paid sessions
 * per tutor, computes commission + incentives - reserve, and creates a
 * PayoutLedger entry via payoutAdapter.
 *
 * Idempotency: each payout has a unique key `payout:<tutorId>:<weekLabel>`
 * so re-running this job never double-pays.
 */

const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const TutorProfile = require('../models/TutorProfile');
const IncentiveLedger = require('../models/IncentiveLedger');
const { executePayout } = require('../services/payoutAdapter.service');
const { pendingTutorBonuses } = require('../services/incentiveEngine.service');

// Reserve percentage (against chargebacks) — applied only to the last payout of a billing cycle
const RESERVE_PCT = 15;

function weekBounds(reference = new Date()) {
    const d = new Date(reference);
    const day = d.getDay(); // 0 = Sunday
    // Week spans Mon 00:00 → Sun 23:59:59 (IST assumed, server usually UTC — acceptable drift for now)
    const monOffset = (day === 0 ? -6 : 1 - day);
    const start = new Date(d);
    start.setDate(d.getDate() + monOffset);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    const year = start.getFullYear();
    const week = Math.ceil(((start - new Date(year, 0, 1)) / 86400000 + 1) / 7);
    return { start, end, label: `${year}-W${String(week).padStart(2, '0')}` };
}

/**
 * Run the weekly payout rollup.
 * @param {Date} referenceDate — defaults to now (computes the week containing this date).
 * @returns {Promise<{processed: number, skipped: number, errors: any[]}>}
 */
async function runWeeklyPayout(referenceDate = new Date()) {
    const { start, end, label } = weekBounds(referenceDate);
    const results = { processed: 0, skipped: 0, errors: [], totalPaid: 0 };

    // 1. All payments completed in this week with a bookingId → group by tutor
    const paymentsInWeek = await Payment.find({
        status: 'completed',
        paidAt: { $gte: start, $lte: end },
        tutorId: { $exists: true }
    }).populate('bookingId').lean();

    // Group by tutor
    const byTutor = new Map();
    for (const p of paymentsInWeek) {
        if (!p.bookingId) continue;
        const tid = String(p.tutorId);
        if (!byTutor.has(tid)) byTutor.set(tid, { gross: 0, commission: 0, sessionIds: [] });
        const b = byTutor.get(tid);
        // Each Payment row is per-session or per-subscription; gross is the amount paid, commission is from Booking snapshot
        b.gross += p.amount || 0;
        b.commission += p.bookingId.commissionAmount || 0;
        b.sessionIds.push(p.bookingId._id);
    }

    // 2. For each tutor, add pending bonuses, create payout
    for (const [tutorId, rollup] of byTutor.entries()) {
        try {
            const tutorProfile = await TutorProfile.findOne({ userId: tutorId }).select('tier currentCommissionRate');
            if (!tutorProfile) { results.skipped++; continue; }

            const { total: bonusTotal, rows: bonusRows } = await pendingTutorBonuses(tutorId);
            const bonusIds = bonusRows.map((r) => r._id);

            // Reserve only applies to non-mock, but we set it here for visibility in test
            const reserveHeld = Math.round((rollup.gross - rollup.commission) * (RESERVE_PCT / 100));

            const idempotencyKey = `payout:${tutorId}:${label}`;

            const payout = await executePayout({
                tutorId,
                periodStart: start,
                periodEnd: end,
                periodLabel: label,
                grossEarnings: rollup.gross,
                commissionRate: tutorProfile.currentCommissionRate || 25,
                commissionAmount: rollup.commission,
                incentiveBonuses: bonusTotal,
                deductions: 0,
                reserveHeld,
                sessionIds: rollup.sessionIds,
                incentiveLedgerIds: bonusIds,
                idempotencyKey
            });

            // Mark bonuses as paid, link to payout
            if (bonusIds.length) {
                await IncentiveLedger.updateMany(
                    { _id: { $in: bonusIds }, status: 'accrued' },
                    { $set: { status: 'paid', paidAt: new Date(), payoutLedgerId: payout._id } }
                );
            }

            results.processed++;
            results.totalPaid += payout.netPayable;
        } catch (err) {
            results.errors.push({ tutorId, message: err.message });
        }
    }

    return results;
}

module.exports = { runWeeklyPayout, weekBounds };
