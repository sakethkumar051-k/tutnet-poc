const ProgressReport = require('../models/ProgressReport');
const Booking = require('../models/Booking');
const { createNotification } = require('../utils/notificationHelper');

// @desc    Get all progress reports
// @route   GET /api/progress-reports
// @access  Private
const getProgressReports = async (req, res) => {
    try {
        let filter = {};

        if (req.user.role === 'student') {
            filter.studentId = req.user.id;
        } else if (req.user.role === 'tutor') {
            filter.tutorId = req.user.id;
        }

        const reports = await ProgressReport.find(filter)
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email')
            .populate('bookingId')
            .sort({ createdAt: -1 });

        res.json(reports);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get progress report by ID
// @route   GET /api/progress-reports/:id
// @access  Private
const getProgressReportById = async (req, res) => {
    try {
        const report = await ProgressReport.findById(req.params.id)
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email')
            .populate('bookingId');

        if (!report) {
            return res.status(404).json({ message: 'Progress report not found' });
        }

        // Check access
        if (req.user.role === 'student' && report.studentId._id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        if (req.user.role === 'tutor' && report.tutorId._id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        res.json(report);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create progress report
// @route   POST /api/progress-reports
// @access  Private (Tutor/Admin)
const createProgressReport = async (req, res) => {
    try {
        const report = await ProgressReport.create({
            ...req.body,
            tutorId: req.user.role === 'tutor' ? req.user.id : req.body.tutorId
        });

        const populated = await ProgressReport.findById(report._id)
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email')
            .populate('bookingId');

        await createNotification({
            userId: report.studentId,
            type: 'progress_report_added',
            title: 'New Progress Report',
            message: `${populated.tutorId.name} added a progress report for ${report.month || 'recent sessions'}`,
            link: '/student-dashboard?tab=progress',
            metadata: { reportId: report._id }
        });

        res.status(201).json(populated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update progress report
// @route   PUT /api/progress-reports/:id
// @access  Private (Tutor/Admin)
const updateProgressReport = async (req, res) => {
    try {
        const report = await ProgressReport.findById(req.params.id);

        if (!report) {
            return res.status(404).json({ message: 'Progress report not found' });
        }

        // Check ownership
        if (report.tutorId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const updated = await ProgressReport.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('studentId', 'name email').populate('tutorId', 'name email').populate('bookingId');

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get student progress
// @route   GET /api/progress-reports/student/:studentId
// @access  Private
const getStudentProgress = async (req, res) => {
    try {
        const reports = await ProgressReport.find({ studentId: req.params.studentId })
            .populate('tutorId', 'name email')
            .populate('bookingId')
            .sort({ createdAt: -1 });

        res.json(reports);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get tutor's progress reports
// @route   GET /api/progress-reports/tutor
// @access  Private (Tutor)
const getTutorProgressReports = async (req, res) => {
    try {
        const reports = await ProgressReport.find({ tutorId: req.user.id })
            .populate('studentId', 'name email')
            .populate('bookingId')
            .sort({ createdAt: -1 });

        res.json(reports);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getProgressReports,
    getProgressReportById,
    createProgressReport,
    updateProgressReport,
    getStudentProgress,
    getTutorProgressReports
};

