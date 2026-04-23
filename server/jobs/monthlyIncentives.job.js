/**
 * Monthly Incentives Job
 * ----------------------
 * Runs on the 1st of each month @ 02:00 IST. Evaluates and awards:
 *  - Volume bonus (₹1,500/month per tutor with 5+ active students)
 *  - Perfect month bonus (₹300 per tutor with 0 missed + rating ≥ 4.8)
 *  - Long loyalty credit (₹500 to parents at 6-month milestone per tutor)
 *
 * Idempotent — each incentive row has a month-specific key.
 */

const Booking = require('../models/Booking');
const TutorProfile = require('../models/TutorProfile');
const Review = require('../models/Review');
const {
    awardVolumeBonus,
    awardPerfectMonth,
    evaluateRetentionCliffs,
    onLongLoyalty
} = require('../services/incentiveEngine.service');

function monthBounds(reference = new Date()) {
    // Rollup covers the PREVIOUS calendar month
    const d = new Date(reference);
    d.setMonth(d.getMonth() - 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const label = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
    return { start, end, label };
}

async function runMonthlyIncentives(referenceDate = new Date()) {
    const { start, end, label } = monthBounds(referenceDate);
    const results = {
        month: label,
        volumeBonuses: 0,
        perfectMonths: 0,
        retentionCliffsAwarded: 0,
        longLoyaltyIssued: 0,
        errors: []
    };

    // 1. Tutors with active paid sessions in the month
    const activeTutorBookings = await Booking.aggregate([
        { $match: {
            isPaid: true,
            planPeriodStart: { $lte: end },
            $or: [
                { planPeriodEnd: { $gte: start } },
                { sessionDate: { $gte: start, $lte: end } }
            ]
        }},
        { $group: {
            _id: '$tutorId',
            students: { $addToSet: '$studentId' },
            sessions: { $sum: 1 }
        }}
    ]);

    for (const row of activeTutorBookings) {
        const tutorId = row._id;
        const activeStudents = (row.students || []).length;

        try {
            // 1a. Volume bonus
            const vb = await awardVolumeBonus({ tutorId, monthLabel: label, activeStudents });
            if (vb && vb.status === 'accrued') results.volumeBonuses++;

            // 1b. Perfect month — compute from missed sessions + rating
            const missed = await Booking.countDocuments({
                tutorId,
                planPeriodStart: { $lte: end },
                planPeriodEnd: { $gte: start },
                status: 'cancelled',
                cancelledBy: 'tutor'
            });
            const reviews = await Review.aggregate([
                { $match: { tutorId, createdAt: { $gte: start, $lte: end } } },
                { $group: { _id: null, avg: { $avg: '$rating' } } }
            ]).catch(() => []);
            const avgRating = reviews?.[0]?.avg || 0;
            const pm = await awardPerfectMonth({ tutorId, monthLabel: label, missedCount: missed, avgRating });
            if (pm && pm.status === 'accrued') results.perfectMonths++;

            // 1c. Retention cliffs per student
            for (const studentId of row.students) {
                const monthsTogether = await Booking.countDocuments({
                    tutorId,
                    studentId,
                    isPaid: true,
                    planPeriodEnd: { $lte: end }
                });
                const cliffs = await evaluateRetentionCliffs({
                    tutorId, studentId,
                    consecutiveMonths: monthsTogether,
                    bookingId: null
                });
                results.retentionCliffsAwarded += cliffs.length;

                // Long-loyalty parent credit at 6 months
                if (monthsTogether === 6) {
                    await onLongLoyalty({ studentId, tutorId });
                    results.longLoyaltyIssued++;
                }
            }
        } catch (err) {
            results.errors.push({ tutorId: String(tutorId), message: err.message });
        }
    }

    return results;
}

module.exports = { runMonthlyIncentives, monthBounds };
