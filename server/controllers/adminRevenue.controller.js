/**
 * Admin Revenue Controller
 * ------------------------
 * Real-time visibility into platform money flow. Built specifically to:
 *  - Show test-mode transactions as they happen
 *  - Show revenue per tier
 *  - Show outstanding incentives
 *  - Show payout status + reserve held
 *  - Show tutor risk scores + flagged events
 *
 * This is the "investor demo" view.
 */

const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const PayoutLedger = require('../models/PayoutLedger');
const IncentiveLedger = require('../models/IncentiveLedger');
const TutorProfile = require('../models/TutorProfile');
const User = require('../models/User');
const { safe500 } = require('../utils/responseHelpers');

// ── Headline stats (top of the admin revenue dashboard) ─────────────────

const getHeadline = async (req, res) => {
    try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const [
            totalPayments,
            paymentsThisMonth,
            paymentsThisWeek,
            activeSubscriptions,
            pendingIncentives,
            scheduledPayouts,
            paidPayouts,
            reserveHeld
        ] = await Promise.all([
            Payment.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
            ]),
            Payment.aggregate([
                { $match: { status: 'completed', paidAt: { $gte: monthStart } } },
                { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
            ]),
            Payment.aggregate([
                { $match: { status: 'completed', paidAt: { $gte: weekStart } } },
                { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
            ]),
            Booking.countDocuments({
                plan: { $in: ['monthly', 'committed', 'intensive'] },
                isPaid: true,
                planPeriodEnd: { $gte: now }
            }),
            IncentiveLedger.aggregate([
                { $match: { status: 'accrued' } },
                { $group: { _id: '$settlementType', total: { $sum: '$amount' }, count: { $sum: 1 } } }
            ]),
            PayoutLedger.aggregate([
                { $match: { status: 'scheduled' } },
                { $group: { _id: null, total: { $sum: '$netPayable' }, count: { $sum: 1 } } }
            ]),
            PayoutLedger.aggregate([
                { $match: { status: 'paid', paidAt: { $gte: monthStart } } },
                { $group: { _id: null, total: { $sum: '$netPayable' }, count: { $sum: 1 } } }
            ]),
            PayoutLedger.aggregate([
                { $match: { reserveHeld: { $gt: 0 }, status: { $in: ['scheduled', 'paid'] } } },
                { $group: { _id: null, total: { $sum: '$reserveHeld' } } }
            ])
        ]);

        // Compute gross commission captured
        const commissionThisMonth = await Booking.aggregate([
            { $match: { isPaid: true, updatedAt: { $gte: monthStart }, commissionAmount: { $gt: 0 } } },
            { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
        ]);

        const pickTotal = (arr, field = 'total') => arr?.[0]?.[field] || 0;
        const pickCount = (arr) => arr?.[0]?.count || 0;

        res.json({
            mode: process.env.PAYMENT_MODE || 'test',
            currency: 'INR',
            headline: {
                gmvAllTime: pickTotal(totalPayments),
                gmvMonthToDate: pickTotal(paymentsThisMonth),
                gmvWeekToDate: pickTotal(paymentsThisWeek),
                transactionsAllTime: pickCount(totalPayments),
                transactionsMonthToDate: pickCount(paymentsThisMonth),
                commissionMonthToDate: pickTotal(commissionThisMonth),
                activeSubscriptions: activeSubscriptions || 0,
                reserveHeld: pickTotal(reserveHeld),
                pendingIncentivesTotal: pendingIncentives.reduce((s, r) => s + r.total, 0),
                pendingIncentivesBreakdown: pendingIncentives,
                scheduledPayoutsTotal: pickTotal(scheduledPayouts),
                scheduledPayoutsCount: pickCount(scheduledPayouts),
                paidPayoutsMTD: pickTotal(paidPayouts),
                paidPayoutsCountMTD: pickCount(paidPayouts)
            }
        });
    } catch (err) {
        return safe500(res, err, '[adminRevenueHeadline]');
    }
};

// ── Live transaction feed (most recent 50) ──────────────────────────────

const getLiveFeed = async (_req, res) => {
    try {
        const [payments, payouts, incentives] = await Promise.all([
            Payment.find({})
                .sort({ createdAt: -1 })
                .limit(25)
                .populate('studentId', 'name email')
                .populate('tutorId', 'name email')
                .populate('bookingId', 'subject plan')
                .lean(),
            PayoutLedger.find({})
                .sort({ createdAt: -1 })
                .limit(15)
                .populate('tutorId', 'name')
                .lean(),
            IncentiveLedger.find({})
                .sort({ createdAt: -1 })
                .limit(25)
                .populate('userId', 'name role')
                .lean()
        ]);

        // Normalize into unified "event" shape for the live feed
        const events = [
            ...payments.map((p) => ({
                type: 'payment',
                id: p._id,
                at: p.paidAt || p.createdAt,
                amount: p.amount,
                status: p.status,
                from: p.studentId?.name || 'unknown',
                to: p.tutorId?.name || 'unknown',
                detail: `${p.bookingId?.plan || 'session'} · ${p.bookingId?.subject || ''}`,
                razorpayOrderId: p.razorpayOrderId
            })),
            ...payouts.map((p) => ({
                type: 'payout',
                id: p._id,
                at: p.paidAt || p.processedAt || p.createdAt,
                amount: p.netPayable,
                status: p.status,
                to: p.tutorId?.name || 'tutor',
                detail: `${p.periodLabel} · gross ₹${p.grossEarnings} - commission ₹${p.commissionAmount}${p.reserveHeld ? ` - reserve ₹${p.reserveHeld}` : ''}`,
                mode: p.mode,
                externalId: p.externalPayoutId
            })),
            ...incentives.map((i) => ({
                type: 'incentive',
                id: i._id,
                at: i.accruedAt || i.createdAt,
                amount: i.amount,
                status: i.status,
                to: i.userId?.name || 'user',
                role: i.userId?.role,
                detail: `${i.kind} · ${i.settlementType}`
            }))
        ];

        // Sort by time desc
        events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

        res.json({ events: events.slice(0, 50) });
    } catch (err) {
        return safe500(res, err, '[adminRevenueLiveFeed]');
    }
};

// ── Tier distribution + top earners ─────────────────────────────────────

const getTierDistribution = async (_req, res) => {
    try {
        const tiers = await TutorProfile.aggregate([
            { $group: {
                _id: '$tier',
                count: { $sum: 1 },
                avgRating: { $avg: '$averageRating' },
                totalSessions: { $sum: '$totalSessions' },
                totalEarnings: { $sum: '$lifetimeGrossEarnings' }
            }}
        ]);

        const topEarners = await TutorProfile.find({ lifetimeGrossEarnings: { $gt: 0 } })
            .sort({ lifetimeGrossEarnings: -1 })
            .limit(10)
            .populate('userId', 'name')
            .select('userId tier totalSessions lifetimeGrossEarnings lifetimeCommissionPaid lifetimeIncentivesPaid averageRating')
            .lean();

        res.json({ tiers, topEarners });
    } catch (err) {
        return safe500(res, err, '[adminTierDistribution]');
    }
};

// ── Risk watchlist (tutors with high risk score or flagged events) ──────

const getRiskWatchlist = async (_req, res) => {
    try {
        const watchlist = await TutorProfile.find({
            $or: [{ riskScore: { $gte: 25 } }, { flaggedEventsCount: { $gte: 3 } }]
        })
            .sort({ riskScore: -1, flaggedEventsCount: -1 })
            .limit(50)
            .populate('userId', 'name email')
            .select('userId tier totalSessions averageRating riskScore flaggedEventsCount')
            .lean();
        res.json({ watchlist });
    } catch (err) {
        return safe500(res, err, '[adminRiskWatchlist]');
    }
};

module.exports = {
    getHeadline,
    getLiveFeed,
    getTierDistribution,
    getRiskWatchlist
};
