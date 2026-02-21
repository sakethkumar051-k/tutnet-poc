const Booking = require('../models/Booking');
const Review = require('../models/Review');
const SessionFeedback = require('../models/SessionFeedback');

// Tier thresholds
const TIERS = [
    { name: 'Bronze', minSessions: 0,  minRating: 0,   color: '#cd7f32', badge: '🥉' },
    { name: 'Silver', minSessions: 10, minRating: 4.0, color: '#C0C0C0', badge: '🥈' },
    { name: 'Gold',   minSessions: 25, minRating: 4.5, color: '#FFD700', badge: '🥇' },
    { name: 'Elite',  minSessions: 50, minRating: 4.8, color: '#8B5CF6', badge: '💎' }
];

const MILESTONES = [
    { id: 'first_session',    label: 'First Session Completed', sessions: 1,  bonus: 100,  desc: 'Completed your first paid session' },
    { id: 'ten_sessions',     label: '10 Sessions Club',        sessions: 10, bonus: 250,  desc: 'Completed 10 paid sessions' },
    { id: 'twenty_sessions',  label: '20 Sessions Strong',      sessions: 20, bonus: 300,  desc: 'Dedicated educator — 20 sessions done' },
    { id: 'fifty_sessions',   label: 'Elite Educator',          sessions: 50, bonus: 500,  desc: '50 sessions — you are truly elite' },
    { id: 'perfect_rating',   label: 'Perfect Rating',          sessions: 0,  bonus: 200,  desc: 'Maintained a 5.0 rating' },
    { id: 'top_rated',        label: 'Top Rated',               sessions: 0,  bonus: 150,  desc: 'Achieved 4.8+ average rating' },
    { id: 'consistent_30d',   label: '30-Day Streak',           sessions: 0,  bonus: 175,  desc: 'Taught sessions in 4+ consecutive weeks' }
];

// @desc  Get tutor's incentive/bonus summary
// @route GET /api/incentives/summary
// @access Private (tutor)
const getTutorIncentives = async (req, res) => {
    try {
        const tutorId = req.user.id;

        // Completed sessions
        const completedBookings = await Booking.find({ tutorId, status: 'completed' }).sort({ updatedAt: 1 });
        const sessionCount = completedBookings.length;

        // Average rating from reviews
        const reviews = await Review.find({ tutorId });
        const avgRating = reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;

        // Determine tier
        let currentTier = TIERS[0];
        for (const tier of TIERS) {
            if (sessionCount >= tier.minSessions && avgRating >= tier.minRating) {
                currentTier = tier;
            }
        }

        // Calculate next tier
        const currentTierIdx = TIERS.indexOf(currentTier);
        const nextTier = currentTierIdx < TIERS.length - 1 ? TIERS[currentTierIdx + 1] : null;

        // Check 30-day streak (any 4 distinct weeks in last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentBookings = completedBookings.filter(b => new Date(b.updatedAt) >= thirtyDaysAgo);
        const weekNumbers = new Set(recentBookings.map(b => {
            const d = new Date(b.updatedAt);
            return `${d.getFullYear()}-W${Math.ceil(d.getDate() / 7)}`;
        }));
        const hasStreak = weekNumbers.size >= 4;

        // Evaluate milestones
        const earnedMilestones = MILESTONES.map(m => {
            let earned = false;
            if (m.id === 'first_session')   earned = sessionCount >= 1;
            if (m.id === 'ten_sessions')    earned = sessionCount >= 10;
            if (m.id === 'twenty_sessions') earned = sessionCount >= 20;
            if (m.id === 'fifty_sessions')  earned = sessionCount >= 50;
            if (m.id === 'perfect_rating')  earned = avgRating === 5.0 && reviews.length >= 3;
            if (m.id === 'top_rated')       earned = avgRating >= 4.8 && reviews.length >= 5;
            if (m.id === 'consistent_30d')  earned = hasStreak;

            return { ...m, earned };
        });

        const totalBonusEarned = earnedMilestones
            .filter(m => m.earned)
            .reduce((sum, m) => sum + m.bonus, 0);

        // Progress to next tier
        const progressToNext = nextTier ? {
            tier: nextTier.name,
            badge: nextTier.badge,
            sessionsNeeded: Math.max(0, nextTier.minSessions - sessionCount),
            ratingNeeded: Math.max(0, nextTier.minRating - avgRating).toFixed(1)
        } : null;

        res.json({
            sessionCount,
            avgRating: parseFloat(avgRating.toFixed(2)),
            reviewCount: reviews.length,
            currentTier,
            nextTier: progressToNext,
            milestones: earnedMilestones,
            totalBonusEarned
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { getTutorIncentives };
