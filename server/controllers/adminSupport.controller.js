/**
 * Admin Support Controller
 * ------------------------
 * Customer support / CS console endpoints. Gives an admin (acting as
 * support exec) complete visibility into a single user and the power to
 * take common CS actions (suspend, reset password, add note, cancel
 * booking, issue credit).
 *
 * All routes are behind protect + requireAdmin in adminSupport.routes.js.
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const User = require('../models/User');
const TutorProfile = require('../models/TutorProfile');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const PayoutLedger = require('../models/PayoutLedger');
const IncentiveLedger = require('../models/IncentiveLedger');
const Review = require('../models/Review');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const Favorite = require('../models/Favorite');
const LearningGoal = require('../models/LearningGoal');
const Escalation = require('../models/Escalation');
const CurrentTutor = require('../models/CurrentTutor');
const SessionFeedback = require('../models/SessionFeedback');
const ProgressReport = require('../models/ProgressReport');
const StudyMaterial = require('../models/StudyMaterial');
const { OffPlatformReport } = require('../controllers/offPlatformReport.controller');
const { safe500, sendError } = require('../utils/responseHelpers');

const ENRICHED_USER_FIELDS = 'name email phone role location classGrade authProvider profilePicture isActive lastSeenAt createdAt suspendedAt suspensionReason';

const MOCK_MODE = process.env.PAYMENT_MODE === 'mock';
let razorpayClient = null;
function rz() {
    if (!razorpayClient) {
        razorpayClient = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
    }
    return razorpayClient;
}

// ── GET /api/admin/support/users — enriched search list ─────────────────

const listUsers = async (req, res) => {
    try {
        const { q, role = 'all', status = 'all', limit = 50 } = req.query;
        const filter = {};
        if (role && role !== 'all') filter.role = role;
        if (status === 'active') filter.isActive = true;
        if (status === 'suspended') filter.isActive = false;
        if (q) {
            const safe = String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter.$or = [
                { name: { $regex: safe, $options: 'i' } },
                { email: { $regex: safe, $options: 'i' } },
                { phone: { $regex: safe, $options: 'i' } }
            ];
        }
        const users = await User.find(filter)
            .select(ENRICHED_USER_FIELDS)
            .sort({ createdAt: -1 })
            .limit(Math.min(parseInt(limit, 10) || 50, 200))
            .lean();

        // Join tutor profile summaries (one query)
        const tutorIds = users.filter((u) => u.role === 'tutor').map((u) => u._id);
        const profiles = tutorIds.length
            ? await TutorProfile.find({ userId: { $in: tutorIds } })
                .select('userId tier approvalStatus averageRating totalSessions riskScore flaggedEventsCount tutorCode')
                .lean()
            : [];
        const byUser = Object.fromEntries(profiles.map((p) => [String(p.userId), p]));

        const enriched = users.map((u) => ({
            ...u,
            tutorProfile: u.role === 'tutor' ? byUser[String(u._id)] || null : undefined
        }));

        res.json({ users: enriched, total: enriched.length });
    } catch (err) {
        return safe500(res, err, '[adminSupportListUsers]');
    }
};

// ── GET /api/admin/support/users/:id/full — 360° view ────────────────────

const getUserFull = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return sendError(res, 400, 'Invalid user id', 'INVALID_ID');

        const user = await User.findById(id).lean();
        if (!user) return sendError(res, 404, 'User not found', 'NOT_FOUND');
        delete user.password;

        const uid = new mongoose.Types.ObjectId(id);
        const orUser = { $or: [{ studentId: uid }, { tutorId: uid }] };
        const orRefByMsg = { $or: [{ senderId: uid }, { recipientId: uid }] };
        const orEsc = { $or: [{ raisedBy: uid }, { againstUser: uid }] };

        const [
            tutorProfile,
            bookings,
            payments,
            payouts,
            incentives,
            reviewsGiven,
            reviewsReceived,
            attendance,
            escalations,
            offPlatformReports,
            favorites,
            learningGoals,
            currentTutors,
            sessionFeedbackGiven,
            sessionFeedbackReceived,
            progressReports,
            studyMaterials,
            messageStats,
            flaggedMessages,
            notificationStats,
            recentNotifications
        ] = await Promise.all([
            TutorProfile.findOne({ userId: uid }).lean(),

            Booking.find({ $or: [{ studentId: uid }, { tutorId: uid }, { currentTutorId: uid }] })
                .sort({ createdAt: -1 }).limit(150)
                .populate('studentId', 'name email')
                .populate('tutorId', 'name email')
                .lean(),

            Payment.find(orUser).sort({ createdAt: -1 }).limit(100)
                .populate('studentId', 'name')
                .populate('tutorId', 'name')
                .populate('bookingId', 'subject bookingCategory')
                .lean(),

            PayoutLedger.find({ tutorId: uid }).sort({ createdAt: -1 }).limit(60).lean(),

            IncentiveLedger.find({ userId: uid }).sort({ createdAt: -1 }).limit(80).lean(),

            Review.find({ studentId: uid }).sort({ createdAt: -1 }).limit(40)
                .populate('tutorId', 'name').lean(),
            Review.find({ tutorId: uid }).sort({ createdAt: -1 }).limit(40)
                .populate('studentId', 'name').lean(),

            Attendance.find(orUser).sort({ createdAt: -1 }).limit(80)
                .populate('bookingId', 'subject sessionDate')
                .populate('studentId', 'name')
                .populate('tutorId', 'name')
                .lean(),

            Escalation.find(orEsc).sort({ createdAt: -1 }).limit(40)
                .populate('raisedBy', 'name role')
                .populate('againstUser', 'name role')
                .lean(),

            OffPlatformReport.find({ $or: [{ studentId: uid }, { tutorId: uid }] })
                .sort({ createdAt: -1 }).limit(30)
                .populate('studentId', 'name')
                .populate('tutorId', 'name')
                .lean(),

            Favorite.find({ studentId: uid }).limit(30)
                .populate('tutorId', 'name email').lean(),

            LearningGoal.find({ studentId: uid }).sort({ createdAt: -1 }).limit(30)
                .populate('tutorId', 'name').lean(),

            CurrentTutor.find(orUser).sort({ createdAt: -1 }).limit(30)
                .populate('studentId', 'name email')
                .populate('tutorId', 'name email')
                .lean(),

            SessionFeedback.find({ tutorId: uid }).sort({ createdAt: -1 }).limit(30)
                .populate('studentId', 'name').lean(),
            SessionFeedback.find({ studentId: uid }).sort({ createdAt: -1 }).limit(30)
                .populate('tutorId', 'name').lean(),

            ProgressReport.find(orUser).sort({ createdAt: -1 }).limit(20)
                .populate('studentId', 'name').populate('tutorId', 'name').lean(),

            StudyMaterial.find({ $or: [{ uploadedBy: uid }, { tutorId: uid }] })
                .sort({ createdAt: -1 }).limit(30).lean(),

            Message.aggregate([
                { $match: orRefByMsg },
                { $group: {
                    _id: null,
                    total: { $sum: 1 },
                    sent: { $sum: { $cond: [{ $eq: ['$senderId', uid] }, 1, 0] } },
                    received: { $sum: { $cond: [{ $eq: ['$recipientId', uid] }, 1, 0] } },
                    flagged: { $sum: { $cond: ['$moderation.flagged', 1, 0] } },
                    lastAt: { $max: '$createdAt' }
                }}
            ]),

            Message.find({ $and: [orRefByMsg, { 'moderation.flagged': true }] })
                .sort({ createdAt: -1 }).limit(15)
                .populate('senderId', 'name')
                .populate('recipientId', 'name')
                .lean(),

            Notification.aggregate([
                { $match: { userId: uid } },
                { $group: {
                    _id: null,
                    total: { $sum: 1 },
                    unread: { $sum: { $cond: ['$isRead', 0, 1] } }
                }}
            ]),

            Notification.find({ userId: uid }).sort({ createdAt: -1 }).limit(20).lean()
        ]);

        // Summaries
        const bookingSummary = bookings.reduce(
            (acc, b) => {
                acc.byStatus[b.status] = (acc.byStatus[b.status] || 0) + 1;
                acc.byCategory[b.bookingCategory] = (acc.byCategory[b.bookingCategory] || 0) + 1;
                if (b.status === 'completed') acc.completed += 1;
                if (b.cancellationReason) acc.cancelled += 1;
                return acc;
            },
            { total: bookings.length, completed: 0, cancelled: 0, byStatus: {}, byCategory: {} }
        );

        const paymentSummary = payments.reduce(
            (acc, p) => {
                acc.byStatus[p.status] = (acc.byStatus[p.status] || 0) + 1;
                if (p.status === 'completed') {
                    acc.totalPaid += p.amount || 0;
                    acc.completedCount += 1;
                }
                if (p.refundAmount) acc.totalRefunded += p.refundAmount;
                return acc;
            },
            { totalPaid: 0, totalRefunded: 0, completedCount: 0, byStatus: {} }
        );

        const payoutSummary = payouts.reduce(
            (acc, p) => {
                acc.byStatus[p.status] = (acc.byStatus[p.status] || 0) + 1;
                if (p.status === 'paid') acc.netPaid += p.netPayable || 0;
                if (p.status === 'scheduled') acc.scheduledTotal += p.netPayable || 0;
                acc.reserveHeld += p.reserveHeld || 0;
                return acc;
            },
            { netPaid: 0, scheduledTotal: 0, reserveHeld: 0, byStatus: {} }
        );

        const incentiveSummary = incentives.reduce(
            (acc, i) => {
                acc.byStatus[i.status] = (acc.byStatus[i.status] || 0) + 1;
                if (i.status === 'accrued') acc.accrued += i.amount || 0;
                if (['paid', 'applied'].includes(i.status)) acc.paid += i.amount || 0;
                if (i.settlementType === 'platform_credit') {
                    if (i.status === 'accrued') acc.creditBalance += i.amount || 0;
                    if (i.status === 'applied')  acc.creditApplied += i.amount || 0;
                }
                return acc;
            },
            { accrued: 0, paid: 0, creditBalance: 0, creditApplied: 0, byStatus: {} }
        );

        const attendanceSummary = attendance.reduce(
            (acc, a) => {
                acc.byStatus[a.status] = (acc.byStatus[a.status] || 0) + 1;
                if (a.parentVerificationStatus === 'disputed') acc.disputed += 1;
                return acc;
            },
            { total: attendance.length, disputed: 0, byStatus: {} }
        );
        const presentCount = attendanceSummary.byStatus.present || 0;
        attendanceSummary.rate = attendance.length
            ? Math.round((presentCount / attendance.length) * 1000) / 10
            : 0;

        res.json({
            user,
            tutorProfile: tutorProfile || null,
            summary: {
                bookings: bookingSummary,
                payments: paymentSummary,
                payouts: payoutSummary,
                incentives: incentiveSummary,
                attendance: attendanceSummary,
                reviewsGiven: reviewsGiven.length,
                reviewsReceived: reviewsReceived.length,
                avgReceivedRating: reviewsReceived.length
                    ? Math.round((reviewsReceived.reduce((s, r) => s + r.rating, 0) / reviewsReceived.length) * 10) / 10
                    : 0,
                escalationsFiled: escalations.filter((e) => String(e.raisedBy?._id) === String(uid)).length,
                escalationsAgainst: escalations.filter((e) => String(e.againstUser?._id) === String(uid)).length,
                offPlatformReportsAgainst: offPlatformReports.filter((r) => String(r.tutorId?._id) === String(uid)).length,
                favoriteCount: favorites.length,
                learningGoalCount: learningGoals.length,
                currentTutorCount: currentTutors.filter((c) => c.isActive).length
            },
            bookings,
            payments,
            payouts,
            incentives,
            reviewsGiven,
            reviewsReceived,
            attendance,
            escalations,
            offPlatformReports,
            favorites,
            learningGoals,
            currentTutors,
            sessionFeedbackGiven,
            sessionFeedbackReceived,
            progressReports,
            studyMaterials,
            messageStats: messageStats[0] || { total: 0, sent: 0, received: 0, flagged: 0, lastAt: null },
            flaggedMessages,
            notificationStats: notificationStats[0] || { total: 0, unread: 0 },
            recentNotifications,
            adminNotes: user.adminNotes || []
        });
    } catch (err) {
        return safe500(res, err, '[adminSupportGetUserFull]');
    }
};

// ── PATCH /api/admin/support/users/:id/active — suspend / reactivate ────

const toggleUserActive = async (req, res) => {
    try {
        const { id } = req.params;
        const { active, reason = '' } = req.body;
        if (typeof active !== 'boolean') return sendError(res, 400, '`active` must be boolean', 'INVALID_BODY');
        const user = await User.findById(id);
        if (!user) return sendError(res, 404, 'User not found', 'NOT_FOUND');

        user.isActive = active;
        if (!active) {
            user.suspensionReason = reason || 'Suspended by admin';
            user.suspendedAt = new Date();
            user.adminNotes.push({
                note: `Suspended · ${reason || 'no reason given'}`,
                adminId: req.user._id,
                adminName: req.user.name,
                at: new Date()
            });
        } else {
            user.suspensionReason = '';
            user.suspendedAt = undefined;
            user.adminNotes.push({
                note: `Reactivated · ${reason || 'no reason given'}`,
                adminId: req.user._id,
                adminName: req.user.name,
                at: new Date()
            });
        }
        await user.save();
        res.json({ ok: true, isActive: user.isActive, adminNotes: user.adminNotes });
    } catch (err) {
        return safe500(res, err, '[adminSupportToggleActive]');
    }
};

// ── POST /api/admin/support/users/:id/notes — append internal note ──────

const addAdminNote = async (req, res) => {
    try {
        const { id } = req.params;
        const { note } = req.body;
        if (!note || !note.trim()) return sendError(res, 400, 'Note is required', 'INVALID_BODY');
        const user = await User.findById(id);
        if (!user) return sendError(res, 404, 'User not found', 'NOT_FOUND');

        user.adminNotes.push({
            note: note.trim(),
            adminId: req.user._id,
            adminName: req.user.name,
            at: new Date()
        });
        await user.save();
        res.status(201).json({ adminNotes: user.adminNotes });
    } catch (err) {
        return safe500(res, err, '[adminSupportAddNote]');
    }
};

// ── POST /api/admin/support/users/:id/password-reset — generate link ────

const generatePasswordReset = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) return sendError(res, 404, 'User not found', 'NOT_FOUND');
        if (user.authProvider !== 'local') {
            return sendError(res, 400, `${user.name} uses ${user.authProvider} sign-in; no password to reset.`, 'OAUTH_ACCOUNT');
        }

        const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpire = Date.now() + 30 * 60 * 1000;
        user.adminNotes.push({
            note: `Password reset link issued by admin`,
            adminId: req.user._id,
            adminName: req.user.name,
            at: new Date()
        });
        await user.save();

        const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        const link = `${baseUrl}/reset-password?token=${resetToken}&uid=${user._id}`;
        res.json({
            ok: true,
            resetLink: link,
            expiresAt: new Date(user.resetPasswordExpire).toISOString(),
            adminNotes: user.adminNotes
        });
    } catch (err) {
        return safe500(res, err, '[adminSupportResetPassword]');
    }
};

// ── POST /api/admin/support/bookings/:id/cancel — admin cancel ──────────

const cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason = 'Cancelled by admin' } = req.body;
        const booking = await Booking.findById(id);
        if (!booking) return sendError(res, 404, 'Booking not found', 'NOT_FOUND');
        if (booking.status === 'cancelled' || booking.status === 'completed') {
            return sendError(res, 400, `Booking already ${booking.status}`, 'INVALID_STATE');
        }

        booking.status = 'cancelled';
        booking.cancellationReason = reason;
        booking.cancelledBy = 'admin';
        await booking.save();

        // Fire a notification to both parties
        try {
            await Notification.create([
                {
                    userId: booking.studentId,
                    type: 'booking_cancelled',
                    title: 'Your booking was cancelled by support',
                    message: reason,
                    bookingId: booking._id
                },
                {
                    userId: booking.tutorId,
                    type: 'booking_cancelled',
                    title: 'A booking was cancelled by support',
                    message: reason,
                    bookingId: booking._id
                }
            ]);
        } catch (_) { /* non-fatal */ }

        res.json({ ok: true, booking });
    } catch (err) {
        return safe500(res, err, '[adminSupportCancelBooking]');
    }
};

// ── POST /api/admin/support/payments/:id/refund — manual refund ─────────

const refundPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, reason = 'Refund issued by admin' } = req.body;
        if (!mongoose.isValidObjectId(id)) return sendError(res, 400, 'Invalid payment id', 'INVALID_ID');
        const payment = await Payment.findById(id);
        if (!payment) return sendError(res, 404, 'Payment not found', 'NOT_FOUND');
        if (!['completed', 'partially_refunded'].includes(payment.status)) {
            return sendError(res, 400, `Cannot refund a ${payment.status} payment`, 'INVALID_STATE');
        }
        const alreadyRefunded = payment.refundAmount || 0;
        const maxRefundable = Math.max(0, payment.amount - alreadyRefunded);
        const refundAmount = amount ? Math.min(Number(amount), maxRefundable) : maxRefundable;
        if (refundAmount <= 0) return sendError(res, 400, 'Nothing left to refund', 'FULLY_REFUNDED');

        // Mock mode or no razorpay id → record the refund without hitting gateway
        if (MOCK_MODE || !payment.razorpayPaymentId) {
            payment.refundId = `mock_refund_${Date.now()}`;
            payment.refundAmount = alreadyRefunded + refundAmount;
            payment.refundStatus = 'processed';
            payment.refundReason = reason;
            payment.refundedAt = new Date();
            payment.status = payment.refundAmount >= payment.amount ? 'refunded' : 'partially_refunded';
            await payment.save();
        } else {
            const refund = await rz().payments.refund(payment.razorpayPaymentId, {
                amount: Math.round(refundAmount * 100),
                notes: { reason, admin_id: String(req.user._id) }
            });
            payment.refundId = refund.id;
            payment.refundStatus = 'initiated';
            payment.refundAmount = alreadyRefunded + refundAmount;
            payment.refundReason = reason;
            await payment.save();
        }

        // Log to admin notes of the student
        try {
            await User.findByIdAndUpdate(payment.studentId, {
                $push: {
                    adminNotes: {
                        note: `Refund of ₹${refundAmount} issued on payment ${payment._id} — ${reason}`,
                        adminId: req.user._id,
                        adminName: req.user.name,
                        at: new Date()
                    }
                }
            });
        } catch (_) { /* non-fatal */ }

        // Notify student
        try {
            await Notification.create({
                userId: payment.studentId,
                type: 'refund_initiated',
                title: MOCK_MODE ? 'Refund processed' : 'Refund initiated',
                message: `₹${refundAmount} has been ${MOCK_MODE ? 'refunded' : 'initiated — it will reflect in 5–7 business days'}. Reason: ${reason}`,
                bookingId: payment.bookingId
            });
        } catch (_) { /* non-fatal */ }

        res.json({ ok: true, payment, refundAmount });
    } catch (err) {
        return safe500(res, err, '[adminSupportRefund]');
    }
};

// ── POST /api/admin/support/users/:id/credit — issue manual credit ──────

const issueCredit = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, reason = 'Admin goodwill credit' } = req.body;
        const amt = Number(amount);
        if (!amt || amt <= 0) return sendError(res, 400, 'Positive amount required', 'INVALID_BODY');
        const user = await User.findById(id);
        if (!user) return sendError(res, 404, 'User not found', 'NOT_FOUND');
        if (user.role !== 'student') return sendError(res, 400, 'Credits can only be issued to students', 'INVALID_ROLE');

        const entry = await IncentiveLedger.create({
            userId: user._id,
            userRole: 'student',
            kind: 'credit_topup',
            amount: amt,
            settlementType: 'platform_credit',
            status: 'accrued',
            trigger: { reason: `[ADMIN] ${reason}` },
            idempotencyKey: `admin_credit_${user._id}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
            notes: `Issued by ${req.user.name} (admin)`
        });

        user.adminNotes.push({
            note: `Issued ₹${amt} platform credit — ${reason}`,
            adminId: req.user._id,
            adminName: req.user.name,
            at: new Date()
        });
        await user.save();

        try {
            await Notification.create({
                userId: user._id,
                type: 'credit_topup',
                title: `₹${amt} credit added`,
                message: `${reason}. It'll apply automatically on your next session.`,
                link: '/student-dashboard?tab=sessions'
            });
        } catch (_) { /* non-fatal */ }

        res.status(201).json({ ok: true, credit: entry, adminNotes: user.adminNotes });
    } catch (err) {
        return safe500(res, err, '[adminSupportIssueCredit]');
    }
};

// ── POST /api/admin/support/tutors/:id/clear-risk — zero risk score ─────

const clearTutorRisk = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason = 'Cleared by admin' } = req.body;
        const profile = await TutorProfile.findOne({ userId: id });
        if (!profile) return sendError(res, 404, 'Tutor profile not found', 'NOT_FOUND');

        const prior = { riskScore: profile.riskScore, flaggedEventsCount: profile.flaggedEventsCount };
        profile.riskScore = 0;
        profile.flaggedEventsCount = 0;
        await profile.save();

        try {
            await User.findByIdAndUpdate(id, {
                $push: {
                    adminNotes: {
                        note: `Risk cleared (was ${prior.riskScore}, ${prior.flaggedEventsCount} flagged events) — ${reason}`,
                        adminId: req.user._id,
                        adminName: req.user.name,
                        at: new Date()
                    }
                }
            });
        } catch (_) { /* non-fatal */ }

        res.json({ ok: true, profile, prior });
    } catch (err) {
        return safe500(res, err, '[adminSupportClearRisk]');
    }
};

module.exports = {
    listUsers,
    getUserFull,
    toggleUserActive,
    addAdminNote,
    generatePasswordReset,
    cancelBooking,
    refundPayment,
    issueCredit,
    clearTutorRisk
};
