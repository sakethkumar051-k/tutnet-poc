const TutorProfile = require('../models/TutorProfile');

/** ISO week id e.g. 2026-W16 for weekly search-appearance buckets */
function getUtcWeekId(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Increment search-appearance counters when tutors appear in a listing (find tutors, recommendations, etc.).
 * @param {Array<{ _id: import('mongoose').Types.ObjectId }>} tutorProfileDocs
 */
async function recordTutorSearchAppearances(tutorProfileDocs) {
    if (!tutorProfileDocs?.length) return;
    const weekId = getUtcWeekId();
    const ids = [...new Set(tutorProfileDocs.map((t) => t._id).filter(Boolean))];
    if (!ids.length) return;

    const profiles = await TutorProfile.find({ _id: { $in: ids } })
        .select('searchAppearancesWeekId')
        .lean();

    const bulkOps = profiles.map((p) => ({
        updateOne: {
            filter: { _id: p._id },
            update:
                p.searchAppearancesWeekId === weekId
                    ? { $inc: { searchAppearancesTotal: 1, searchAppearancesThisWeek: 1 } }
                    : {
                        $inc: { searchAppearancesTotal: 1 },
                        $set: { searchAppearancesThisWeek: 1, searchAppearancesWeekId: weekId }
                    }
        }
    }));

    if (bulkOps.length) {
        await TutorProfile.bulkWrite(bulkOps);
    }
}

module.exports = { recordTutorSearchAppearances, getUtcWeekId };
