/**
 * Off-Platform Report Controller — the "bounty" side of anti-bypass.
 * Per REVENUE_MODEL.md §5.2: parent gets ₹500 credit for a verified report
 * that a tutor asked them to move off-platform.
 *
 * Report triggers:
 *   1. Parent submits a report via UI
 *   2. Admin reviews → verifies / dismisses
 *   3. On verify: parent gets credit + tutor risk score jumps + admin panel flagged
 */

const mongoose = require('mongoose');
const TutorProfile = require('../models/TutorProfile');
const Booking = require('../models/Booking');
const { onOffPlatformReport } = require('../services/incentiveEngine.service');
const { createNotification } = require('../utils/notificationHelper');
const { safe500, isValidObjectId } = require('../utils/responseHelpers');

// Inline schema — simple admin-review queue. Don't need a full model file for this.
const offPlatformReportSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tutorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    description: { type: String, required: true, maxlength: 2000, trim: true },
    evidence: [{ type: String, maxlength: 1000 }],
    status: {
        type: String,
        enum: ['submitted', 'under_review', 'verified', 'dismissed', 'false_report'],
        default: 'submitted',
        index: true
    },
    adminNote: String,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date
}, { timestamps: true });

const OffPlatformReport = mongoose.models.OffPlatformReport
    || mongoose.model('OffPlatformReport', offPlatformReportSchema);

// ── API: parent submits a report ───────────────────────────────────────

const submitReport = async (req, res) => {
    try {
        const { tutorId, bookingId, description, evidence } = req.body;
        if (!tutorId || !isValidObjectId(tutorId)) {
            return res.status(400).json({ message: 'Valid tutorId required' });
        }
        if (!description || description.trim().length < 10) {
            return res.status(400).json({ message: 'Please describe what happened (at least 10 characters)' });
        }

        // Anti-abuse: max 1 report per tutor-parent pair per quarter
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const recent = await OffPlatformReport.findOne({
            studentId: req.user._id,
            tutorId,
            createdAt: { $gte: threeMonthsAgo }
        });
        if (recent) {
            return res.status(429).json({
                message: 'You have already reported this tutor in the last 3 months. Admin will review.'
            });
        }

        const report = await OffPlatformReport.create({
            studentId: req.user._id,
            tutorId,
            bookingId: bookingId || undefined,
            description: description.trim(),
            evidence: Array.isArray(evidence) ? evidence.slice(0, 5) : []
        });

        // Notify admins (skip if no admin notification channel yet)
        // Bump tutor risk score preemptively (mild bump; big bump only after verification)
        await TutorProfile.updateOne(
            { userId: tutorId },
            { $inc: { riskScore: 5, flaggedEventsCount: 1 } }
        ).catch(() => {});

        res.status(201).json({
            message: 'Report submitted. Admin will review within 72 hours.',
            reportId: report._id,
            status: report.status
        });
    } catch (err) {
        return safe500(res, err, '[submitOffPlatformReport]');
    }
};

// ── API: current parent's reports ──────────────────────────────────────

const getMyReports = async (req, res) => {
    try {
        const reports = await OffPlatformReport.find({ studentId: req.user._id })
            .populate('tutorId', 'name')
            .sort({ createdAt: -1 })
            .lean();
        res.json({ reports });
    } catch (err) {
        return safe500(res, err, '[getMyReports]');
    }
};

// ── API (admin): queue ─────────────────────────────────────────────────

const adminListReports = async (req, res) => {
    try {
        const { status } = req.query;
        const q = status ? { status } : {};
        const reports = await OffPlatformReport.find(q)
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email')
            .sort({ createdAt: -1 })
            .lean();
        res.json({ reports });
    } catch (err) {
        return safe500(res, err, '[adminListReports]');
    }
};

// ── API (admin): resolve report ────────────────────────────────────────

const adminResolve = async (req, res) => {
    try {
        const { id } = req.params;
        const { verdict, adminNote } = req.body; // verdict: 'verified' | 'dismissed' | 'false_report'
        if (!['verified', 'dismissed', 'false_report'].includes(verdict)) {
            return res.status(400).json({ message: 'Invalid verdict' });
        }
        const report = await OffPlatformReport.findById(id);
        if (!report) return res.status(404).json({ message: 'Report not found' });

        report.status = verdict;
        report.adminNote = adminNote || '';
        report.reviewedBy = req.user._id;
        report.reviewedAt = new Date();
        await report.save();

        if (verdict === 'verified') {
            // 1. Issue ₹500 platform credit to parent
            await onOffPlatformReport({
                studentId: report.studentId,
                tutorId: report.tutorId,
                bookingId: report.bookingId
            });
            // 2. Big risk-score bump + flagged event on tutor
            await TutorProfile.updateOne(
                { userId: report.tutorId },
                { $inc: { riskScore: 40, flaggedEventsCount: 3 } }
            );
            // 3. Notify parent
            await createNotification({
                userId: report.studentId,
                type: 'report_verified',
                title: 'Report verified — ₹500 credit added',
                message: 'Thank you for reporting the off-platform request. A ₹500 credit has been added to your account.',
                link: '/student-dashboard?tab=sessions'
            }).catch(() => {});
        } else if (verdict === 'false_report') {
            // Small negative signal against parent, future abuse prevention
            await createNotification({
                userId: report.studentId,
                type: 'report_dismissed',
                title: 'Report reviewed',
                message: 'Our team reviewed your report. Please ensure future reports are accurate — repeated false reports may affect your account.',
                link: '/student-dashboard'
            }).catch(() => {});
        }

        res.json({ message: 'Report resolved', report });
    } catch (err) {
        return safe500(res, err, '[adminResolveReport]');
    }
};

module.exports = {
    submitReport,
    getMyReports,
    adminListReports,
    adminResolve,
    OffPlatformReport
};
