const Booking = require('../models/Booking');
const CurrentTutor = require('../models/CurrentTutor');
const Review = require('../models/Review');
const TutorProfile = require('../models/TutorProfile');

/**
 * Recompute denormalized fields that can drift after partial failures or legacy writes.
 * Runs on a weekly schedule from jobs/index.js.
 */
async function reconcileDenormalizedCounters() {
    let profilesUpdated = 0;
    let relationshipsUpdated = 0;

    const reviewAgg = await Review.aggregate([
        {
            $group: {
                _id: '$tutorId',
                avgRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 }
            }
        }
    ]);

    for (const row of reviewAgg) {
        const avg = row.avgRating != null ? Math.round(row.avgRating * 10) / 10 : 0;
        const res = await TutorProfile.updateOne(
            { userId: row._id },
            { $set: { averageRating: avg, totalReviews: row.totalReviews } }
        );
        if (res.modifiedCount) profilesUpdated += 1;
    }

    const completedByRel = await Booking.aggregate([
        {
            $match: {
                status: 'completed',
                currentTutorId: { $exists: true, $ne: null }
            }
        },
        {
            $group: {
                _id: '$currentTutorId',
                completed: { $sum: 1 }
            }
        }
    ]);

    for (const row of completedByRel) {
        const res = await CurrentTutor.updateOne(
            { _id: row._id },
            { $set: { sessionsCompleted: row.completed } }
        );
        if (res.modifiedCount) relationshipsUpdated += 1;
    }

    if (profilesUpdated + relationshipsUpdated > 0) {
        console.log(`[reconcile] TutorProfile rows touched: ${profilesUpdated}, CurrentTutor rows: ${relationshipsUpdated}`);
    }

    return { profilesUpdated, relationshipsUpdated };
}

module.exports = { reconcileDenormalizedCounters };
