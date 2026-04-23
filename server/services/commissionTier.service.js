/**
 * Commission Tier Service
 * -----------------------
 * The single source of truth for tutor commission tiers, per REVENUE_MODEL.md §4.
 *
 * Tiers are evaluated on: lifetime completed+paid session count × avg rating.
 * Tier is stored on TutorProfile.tier; this service keeps it consistent.
 *
 * Promotion rules (one-way):
 *   - starter → silver:   21 sessions + rating ≥ 4.0
 *   - silver  → gold:     76 sessions + rating ≥ 4.4
 *   - gold    → platinum: 201 sessions + rating ≥ 4.7
 *
 * Demotion rules:
 *   - Rating drops 2+ consecutive months below floor → drop one tier
 *   - Verified bypass / TSA breach → reset to starter (handled by enforcement controller)
 */

const TIERS = Object.freeze({
    starter:  { key: 'starter',  label: 'Starter',  commissionRate: 25, minSessions: 0,   minRating: 0   },
    silver:   { key: 'silver',   label: 'Silver',   commissionRate: 22, minSessions: 21,  minRating: 4.0 },
    gold:     { key: 'gold',     label: 'Gold',     commissionRate: 18, minSessions: 76,  minRating: 4.4 },
    platinum: { key: 'platinum', label: 'Platinum', commissionRate: 15, minSessions: 201, minRating: 4.7 }
});

const TIER_ORDER = ['starter', 'silver', 'gold', 'platinum'];

function tierIndex(tierKey) {
    return TIER_ORDER.indexOf(tierKey);
}

/**
 * Given a tutor's totalSessions + averageRating, compute the tier they're entitled to.
 * Always returns the highest tier they qualify for (one-way promotion).
 */
function computeEarnedTier({ totalSessions = 0, averageRating = 0 }) {
    if (totalSessions >= TIERS.platinum.minSessions && averageRating >= TIERS.platinum.minRating) return TIERS.platinum;
    if (totalSessions >= TIERS.gold.minSessions     && averageRating >= TIERS.gold.minRating)     return TIERS.gold;
    if (totalSessions >= TIERS.silver.minSessions   && averageRating >= TIERS.silver.minRating)   return TIERS.silver;
    return TIERS.starter;
}

/** What's the next tier up and what's required to reach it? */
function nextTierProgress({ totalSessions = 0, averageRating = 0 }) {
    const current = computeEarnedTier({ totalSessions, averageRating });
    const currentIdx = tierIndex(current.key);
    if (currentIdx >= TIER_ORDER.length - 1) {
        return { current, next: null, progress: 1.0, sessionsNeeded: 0, ratingNeeded: 0 };
    }
    const next = TIERS[TIER_ORDER[currentIdx + 1]];
    const sessionsNeeded = Math.max(0, next.minSessions - totalSessions);
    const ratingNeeded = Math.max(0, next.minRating - averageRating);

    // Progress is 50% sessions + 50% rating (capped at 1.0)
    const sessionProgress = Math.min(1, totalSessions / next.minSessions);
    const ratingProgress = Math.min(1, averageRating / Math.max(next.minRating, 0.01));
    const progress = (sessionProgress * 0.5) + (ratingProgress * 0.5);

    return { current, next, progress, sessionsNeeded, ratingNeeded };
}

/**
 * Evaluate and persist tier changes for a tutor.
 * Called after every session completion + every rating change.
 * Records tier history for audit.
 */
async function evaluateAndPersistTier(tutorProfileDoc) {
    if (!tutorProfileDoc) return null;
    const earnedTier = computeEarnedTier({
        totalSessions: tutorProfileDoc.totalSessions || 0,
        averageRating: tutorProfileDoc.averageRating || 0
    });

    const currentTier = tutorProfileDoc.tier || 'starter';
    const isPromotion = tierIndex(earnedTier.key) > tierIndex(currentTier);

    if (earnedTier.key !== currentTier) {
        tutorProfileDoc.tier = earnedTier.key;
        tutorProfileDoc.currentCommissionRate = earnedTier.commissionRate;
        tutorProfileDoc.tierUpdatedAt = new Date();
        tutorProfileDoc.tierHistory = tutorProfileDoc.tierHistory || [];
        tutorProfileDoc.tierHistory.push({
            tier: earnedTier.key,
            commissionRate: earnedTier.commissionRate,
            reachedAt: new Date(),
            reason: isPromotion
                ? `Promoted after reaching ${tutorProfileDoc.totalSessions} sessions at ${tutorProfileDoc.averageRating?.toFixed(2) || '0'}-star average`
                : `Adjusted to ${earnedTier.label} (rating/volume change)`
        });
        await tutorProfileDoc.save();
        return { tutorProfile: tutorProfileDoc, transitioned: true, from: currentTier, to: earnedTier.key, isPromotion };
    }
    return { tutorProfile: tutorProfileDoc, transitioned: false, from: currentTier, to: currentTier, isPromotion: false };
}

/**
 * Force-demote a tutor to starter (used on confirmed TSA breach).
 * Logs the reason for audit.
 */
async function enforceTierReset(tutorProfileDoc, reason) {
    if (!tutorProfileDoc) return null;
    const previous = tutorProfileDoc.tier;
    tutorProfileDoc.tier = 'starter';
    tutorProfileDoc.currentCommissionRate = TIERS.starter.commissionRate;
    tutorProfileDoc.tierUpdatedAt = new Date();
    tutorProfileDoc.tierHistory = tutorProfileDoc.tierHistory || [];
    tutorProfileDoc.tierHistory.push({
        tier: 'starter',
        commissionRate: TIERS.starter.commissionRate,
        reachedAt: new Date(),
        reason: `Enforcement reset: ${reason || 'TSA breach'}`
    });
    await tutorProfileDoc.save();
    return { from: previous, to: 'starter' };
}

/**
 * Given a raw gross amount and a tutor, compute the commission split.
 * Used at booking creation to snapshot commissionRate + commissionAmount onto the Booking.
 */
function splitAmount({ grossAmount, tutorTier }) {
    const tier = TIERS[tutorTier] || TIERS.starter;
    const rate = tier.commissionRate;
    const commissionAmount = Math.round((grossAmount * rate) / 100);
    const tutorShare = grossAmount - commissionAmount;
    return { grossAmount, rate, commissionAmount, tutorShare, tier: tier.key };
}

module.exports = {
    TIERS,
    TIER_ORDER,
    computeEarnedTier,
    nextTierProgress,
    evaluateAndPersistTier,
    enforceTierReset,
    splitAmount
};
