/**
 * Incentive Engine — Awards bonuses & credits per REVENUE_MODEL.md §5.
 *
 * Every award is idempotent (uses IncentiveLedger.idempotencyKey).
 * Safe to call from jobs (monthly) or event-driven hooks (session completed, tier upgraded).
 */

const IncentiveLedger = require('../models/IncentiveLedger');
const TutorProfile = require('../models/TutorProfile');
const Booking = require('../models/Booking');
const User = require('../models/User');

const { TIERS } = require('./commissionTier.service');

// ── Amounts (₹) — source of truth for incentive schedule ──────────────────
const AMOUNTS = Object.freeze({
    // Tutor
    DEMO_CONVERSION: 150,
    FIRST_SESSION: 100,
    TEN_SESSIONS: 200,
    RETENTION_3MO: 1000,
    RETENTION_6MO: 2500,
    VOLUME_BONUS_MONTHLY: 1500,
    PERFECT_MONTH: 300,
    TIER_UPGRADE: 500,
    TUTOR_REFERRAL: 500,

    // Parent
    TRIAL_CONVERSION: 200,
    COMMITTED_PLAN_PCT: 5,           // 5% off
    PARENT_REFERRAL: 300,
    SIBLING_DISCOUNT_PCT: 10,        // 10% off 2nd child
    LONG_LOYALTY: 500,
    OFF_PLATFORM_REPORT: 500
});

// ── Helper: record an incentive (idempotent) ──────────────────────────────
async function recordIncentive({
    userId,
    userRole,
    kind,
    amount,
    settlementType,
    idempotencyKey,
    trigger = {},
    notes
}) {
    try {
        return await IncentiveLedger.create({
            userId,
            userRole,
            kind,
            amount,
            settlementType,
            idempotencyKey,
            trigger,
            notes,
            status: 'accrued',
            accruedAt: new Date()
        });
    } catch (err) {
        // Duplicate key → already awarded; return the existing row
        if (err.code === 11000) {
            return await IncentiveLedger.findOne({ idempotencyKey });
        }
        throw err;
    }
}

// ── Tutor incentive triggers ──────────────────────────────────────────────

async function onDemoConverted({ tutorId, bookingId }) {
    return recordIncentive({
        userId: tutorId,
        userRole: 'tutor',
        kind: 'demo_conversion',
        amount: AMOUNTS.DEMO_CONVERSION,
        settlementType: 'bonus_payout',
        idempotencyKey: `demo_conversion:${bookingId}`,
        trigger: { bookingId, reason: 'Trial converted to paid within 48h' }
    });
}

async function onSessionCompleted({ tutorId, bookingId, newTotalSessions }) {
    // First-session + 10-session milestones
    if (newTotalSessions === 1) {
        await recordIncentive({
            userId: tutorId,
            userRole: 'tutor',
            kind: 'first_session',
            amount: AMOUNTS.FIRST_SESSION,
            settlementType: 'bonus_payout',
            idempotencyKey: `first_session:${tutorId}`,
            trigger: { bookingId, sessionCount: 1 }
        });
    }
    if (newTotalSessions === 10) {
        await recordIncentive({
            userId: tutorId,
            userRole: 'tutor',
            kind: 'ten_sessions',
            amount: AMOUNTS.TEN_SESSIONS,
            settlementType: 'bonus_payout',
            idempotencyKey: `ten_sessions:${tutorId}`,
            trigger: { bookingId, sessionCount: 10 }
        });
    }
}

async function onTierUpgrade({ tutorId, newTier, oldTier }) {
    if (!newTier || newTier === oldTier) return null;
    // Only reward promotions (not demotions or lateral moves)
    const order = ['starter', 'silver', 'gold', 'platinum'];
    if (order.indexOf(newTier) <= order.indexOf(oldTier || 'starter')) return null;
    return recordIncentive({
        userId: tutorId,
        userRole: 'tutor',
        kind: 'tier_upgrade',
        amount: AMOUNTS.TIER_UPGRADE,
        settlementType: 'bonus_payout',
        idempotencyKey: `tier_upgrade:${tutorId}:${newTier}`,
        trigger: { reason: `Promoted from ${oldTier} to ${newTier}` }
    });
}

/**
 * Award retention cliffs per tutor-student pair.
 * Called by monthly job. Looks at each active relationship's age.
 */
async function evaluateRetentionCliffs({ tutorId, studentId, consecutiveMonths, bookingId }) {
    const awards = [];
    if (consecutiveMonths >= 3) {
        const a = await recordIncentive({
            userId: tutorId, userRole: 'tutor',
            kind: 'retention_3mo',
            amount: AMOUNTS.RETENTION_3MO,
            settlementType: 'bonus_payout',
            idempotencyKey: `retention_3mo:${tutorId}:${studentId}`,
            trigger: { bookingId, consecutiveMonths, referralTargetUserId: studentId }
        });
        if (a) awards.push(a);
    }
    if (consecutiveMonths >= 6) {
        const a = await recordIncentive({
            userId: tutorId, userRole: 'tutor',
            kind: 'retention_6mo',
            amount: AMOUNTS.RETENTION_6MO,
            settlementType: 'bonus_payout',
            idempotencyKey: `retention_6mo:${tutorId}:${studentId}`,
            trigger: { bookingId, consecutiveMonths, referralTargetUserId: studentId }
        });
        if (a) awards.push(a);
    }
    return awards;
}

/**
 * Monthly volume bonus — awarded if tutor had 5+ active on-platform students in the month.
 * Called at month end.
 */
async function awardVolumeBonus({ tutorId, monthLabel, activeStudents }) {
    if (activeStudents < 5) return null;
    const tutor = await TutorProfile.findOne({ userId: tutorId }).select('tier');
    if (!tutor || tutor.tier === 'starter') return null; // Silver+ only per REVENUE_MODEL §5.1
    return recordIncentive({
        userId: tutorId,
        userRole: 'tutor',
        kind: 'volume_bonus',
        amount: AMOUNTS.VOLUME_BONUS_MONTHLY,
        settlementType: 'bonus_payout',
        idempotencyKey: `volume_bonus:${monthLabel}:${tutorId}`,
        trigger: { activeStudents, reason: `5+ active students in ${monthLabel}` }
    });
}

/**
 * Perfect month — 0 missed sessions + avg rating ≥ 4.8 in the month.
 */
async function awardPerfectMonth({ tutorId, monthLabel, missedCount, avgRating }) {
    if (missedCount > 0) return null;
    if ((avgRating || 0) < 4.8) return null;
    const tutor = await TutorProfile.findOne({ userId: tutorId }).select('tier');
    if (!tutor || tutor.tier === 'starter') return null;
    return recordIncentive({
        userId: tutorId,
        userRole: 'tutor',
        kind: 'perfect_month',
        amount: AMOUNTS.PERFECT_MONTH,
        settlementType: 'bonus_payout',
        idempotencyKey: `perfect_month:${monthLabel}:${tutorId}`,
        trigger: { avgRating, reason: `Perfect month ${monthLabel}` }
    });
}

// ── Parent incentive triggers ─────────────────────────────────────────────

async function onTrialConvertedParent({ studentId, tutorId, bookingId }) {
    return recordIncentive({
        userId: studentId,
        userRole: 'student',
        kind: 'trial_conversion',
        amount: AMOUNTS.TRIAL_CONVERSION,
        settlementType: 'invoice_discount',
        idempotencyKey: `trial_conversion:${studentId}:${tutorId}`,
        trigger: { bookingId, reason: 'Booked within 24h of demo' }
    });
}

async function onReferralCompleted({ referrerId, referredId, referrerRole = 'student' }) {
    const kind = referrerRole === 'tutor' ? 'tutor_referral' : 'parent_referral';
    const amount = referrerRole === 'tutor' ? AMOUNTS.TUTOR_REFERRAL : AMOUNTS.PARENT_REFERRAL;
    const settlementType = referrerRole === 'tutor' ? 'bonus_payout' : 'platform_credit';
    // Award referrer
    const refRow = await recordIncentive({
        userId: referrerId,
        userRole: referrerRole,
        kind,
        amount,
        settlementType,
        idempotencyKey: `${kind}:${referrerId}:${referredId}`,
        trigger: { referralTargetUserId: referredId, reason: 'Referral completed milestone' }
    });

    // Also credit the referred parent on their first paid invoice
    if (referrerRole === 'student') {
        await recordIncentive({
            userId: referredId,
            userRole: 'student',
            kind: 'parent_referral',
            amount: AMOUNTS.PARENT_REFERRAL,
            settlementType: 'platform_credit',
            idempotencyKey: `parent_referral_welcome:${referredId}`,
            trigger: { referralTargetUserId: referrerId, reason: 'Welcome credit (referred user)' }
        });
    }
    return refRow;
}

async function onOffPlatformReport({ studentId, tutorId, bookingId }) {
    return recordIncentive({
        userId: studentId,
        userRole: 'student',
        kind: 'off_platform_report',
        amount: AMOUNTS.OFF_PLATFORM_REPORT,
        settlementType: 'platform_credit',
        idempotencyKey: `off_platform_report:${studentId}:${tutorId}:${new Date().toISOString().slice(0, 7)}`,
        trigger: { bookingId, referralTargetUserId: tutorId, reason: 'Verified off-platform request report' }
    });
}

async function onLongLoyalty({ studentId, tutorId }) {
    return recordIncentive({
        userId: studentId,
        userRole: 'student',
        kind: 'long_loyalty',
        amount: AMOUNTS.LONG_LOYALTY,
        settlementType: 'platform_credit',
        idempotencyKey: `long_loyalty:${studentId}:${tutorId}`,
        trigger: { referralTargetUserId: tutorId, reason: '6 months on-platform with same tutor' }
    });
}

// ── Aggregate helpers ─────────────────────────────────────────────────────

/** Sum of accrued-but-unpaid bonus payouts for a tutor (for weekly payout job) */
async function pendingTutorBonuses(tutorId) {
    const rows = await IncentiveLedger.find({
        userId: tutorId,
        userRole: 'tutor',
        settlementType: 'bonus_payout',
        status: 'accrued'
    });
    return {
        total: rows.reduce((s, r) => s + r.amount, 0),
        rows
    };
}

/** Sum of unapplied platform credits for a parent (applied to next invoice) */
async function pendingParentCredits(studentId) {
    const rows = await IncentiveLedger.find({
        userId: studentId,
        userRole: 'student',
        settlementType: 'platform_credit',
        status: 'accrued'
    });
    return {
        total: rows.reduce((s, r) => s + r.amount, 0),
        rows
    };
}

module.exports = {
    AMOUNTS,
    recordIncentive,
    // Tutor triggers
    onDemoConverted,
    onSessionCompleted,
    onTierUpgrade,
    evaluateRetentionCliffs,
    awardVolumeBonus,
    awardPerfectMonth,
    // Parent triggers
    onTrialConvertedParent,
    onReferralCompleted,
    onOffPlatformReport,
    onLongLoyalty,
    // Aggregates
    pendingTutorBonuses,
    pendingParentCredits
};
