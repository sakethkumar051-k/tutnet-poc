const Booking = require('../models/Booking');
const User = require('../models/User');
const TutorProfile = require('../models/TutorProfile');
const Review = require('../models/Review');
const Payment = require('../models/Payment');

// @desc  Platform-wide analytics for admin
// @route GET /api/analytics/platform
// @access Private (admin)
const getPlatformAnalytics = async (req, res) => {
    try {
        const now = new Date();
        const startOf30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const startOf7Days  = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000);

        // ── User counts ─────────────────────────────────────────────────────────
        const [totalStudents, totalTutors, newStudents30d, newTutors30d] = await Promise.all([
            User.countDocuments({ role: 'student' }),
            User.countDocuments({ role: 'tutor' }),
            User.countDocuments({ role: 'student', createdAt: { $gte: startOf30Days } }),
            User.countDocuments({ role: 'tutor',   createdAt: { $gte: startOf30Days } })
        ]);

        // ── Session counts ────────────────────────────────────────────────────────
        const [totalSessions, completedSessions, sessions30d, sessions7d] = await Promise.all([
            Booking.countDocuments({}),
            Booking.countDocuments({ status: 'completed' }),
            Booking.countDocuments({ createdAt: { $gte: startOf30Days } }),
            Booking.countDocuments({ createdAt: { $gte: startOf7Days } })
        ]);

        // ── Sessions per day for the last 30 days (heatmap data) ──────────────────
        const sessionsPerDay = await Booking.aggregate([
            { $match: { createdAt: { $gte: startOf30Days } } },
            { $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 }
            }},
            { $sort: { _id: 1 } }
        ]);

        // Fill in zero days
        const dayMap = {};
        sessionsPerDay.forEach(d => { dayMap[d._id] = d.count; });
        const dailySeries = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const key = d.toISOString().split('T')[0];
            dailySeries.push({ date: key, count: dayMap[key] || 0 });
        }

        // ── Revenue estimate ──────────────────────────────────────────────────────
        const completedWithRate = await Booking.find({ status: 'completed' })
            .populate({ path: 'tutorId', select: '_id' })
            .lean();
        const tutorRates = await TutorProfile.find().select('userId hourlyRate').lean();
        const rateMap = {};
        tutorRates.forEach(t => { rateMap[t.userId.toString()] = t.hourlyRate || 0; });
        const estimatedRevenue = completedWithRate.reduce((sum, b) => {
            const rate = rateMap[b.tutorId?._id?.toString() || b.tutorId?.toString()] || 0;
            return sum + rate;
        }, 0);

        // ── Top tutors by completed sessions ──────────────────────────────────────
        const topTutorAgg = await Booking.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: '$tutorId', sessions: { $sum: 1 } } },
            { $sort: { sessions: -1 } },
            { $limit: 5 }
        ]);
        const topTutorIds = topTutorAgg.map(t => t._id);
        const topTutorUsers = await User.find({ _id: { $in: topTutorIds } }).select('name').lean();
        const topTutorProfiles = await TutorProfile.find({ userId: { $in: topTutorIds } }).select('userId subjects hourlyRate').lean();
        const topTutors = topTutorAgg.map(t => {
            const u = topTutorUsers.find(u => u._id.toString() === t._id.toString());
            const p = topTutorProfiles.find(p => p.userId.toString() === t._id.toString());
            return { name: u?.name || 'Unknown', sessions: t.sessions, subjects: p?.subjects?.slice(0,2) || [], rate: p?.hourlyRate || 0 };
        });

        // ── Rating distribution ───────────────────────────────────────────────────
        const ratingDist = await Review.aggregate([
            { $group: { _id: '$rating', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        const ratingMap = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        ratingDist.forEach(r => { ratingMap[r._id] = r.count; });

        // ── Tutor approval funnel ─────────────────────────────────────────────────
        const [approvedTutors, pendingTutors, rejectedTutors] = await Promise.all([
            TutorProfile.countDocuments({ approvalStatus: 'approved' }),
            TutorProfile.countDocuments({ approvalStatus: 'pending' }),
            TutorProfile.countDocuments({ approvalStatus: 'rejected' })
        ]);

        res.json({
            users: { totalStudents, totalTutors, newStudents30d, newTutors30d },
            sessions: { totalSessions, completedSessions, sessions30d, sessions7d },
            dailySeries,
            estimatedRevenue,
            topTutors,
            ratingDistribution: ratingMap,
            tutorFunnel: { approved: approvedTutors, pending: pendingTutors, rejected: rejectedTutors }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

module.exports = { getPlatformAnalytics };
