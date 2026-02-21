const User = require('../models/User');
const TutorProfile = require('../models/TutorProfile');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Attendance = require('../models/Attendance');
const ProgressReport = require('../models/ProgressReport');
const { createNotification } = require('../utils/notificationHelper');

// @desc    Get all pending tutors
// @route   GET /api/admin/tutors/pending
// @access  Private/Admin
const getPendingTutors = async (req, res) => {
    try {
        const tutors = await TutorProfile.find({ approvalStatus: 'pending' })
            .populate('userId', 'name email phone location');
        res.json(tutors);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Approve a tutor
// @route   PATCH /api/admin/tutors/:id/approve
// @access  Private/Admin
const approveTutor = async (req, res) => {
    try {
        const admin = await User.findById(req.user.id).select('name');
        const tutor = await TutorProfile.findById(req.params.id);

        if (!tutor) {
            return res.status(404).json({ message: 'Tutor not found' });
        }

        tutor.approvalStatus = 'approved';

        // Generate a human-readable tutorCode if not already assigned
        if (!tutor.tutorCode) {
            const count = await TutorProfile.countDocuments();
            tutor.tutorCode = `TUT-${String(count).padStart(4, '0')}`;
        }

        // Record approval in history
        tutor.approvalHistory.push({
            action: 'approved',
            adminId: req.user.id,
            adminName: admin?.name || 'Admin',
            note: req.body.note || '',
            timestamp: new Date()
        });

        await tutor.save();

        await createNotification({
            userId: tutor.userId,
            type: 'system_alert',
            title: 'Profile Approved!',
            message: 'Your tutor profile has been approved. You can now start accepting bookings.',
            link: '/tutor-dashboard'
        });

        res.json({ message: 'Tutor approved', tutor });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Reject a tutor
// @route   PATCH /api/admin/tutors/:id/reject
// @access  Private/Admin
const rejectTutor = async (req, res) => {
    try {
        const admin = await User.findById(req.user.id).select('name');
        const tutor = await TutorProfile.findById(req.params.id);

        if (!tutor) {
            return res.status(404).json({ message: 'Tutor not found' });
        }

        tutor.approvalStatus = 'rejected';
        tutor.rejectionReason = req.body.reason || 'No reason provided';

        // Record rejection in history
        tutor.approvalHistory.push({
            action: 'rejected',
            adminId: req.user.id,
            adminName: admin?.name || 'Admin',
            note: req.body.reason || 'No reason provided',
            timestamp: new Date()
        });

        await tutor.save();

        await createNotification({
            userId: tutor.userId,
            type: 'system_alert',
            title: 'Profile Rejected',
            message: `Your tutor profile was rejected. Reason: ${tutor.rejectionReason}. Please update your profile.`,
            link: '/complete-profile'
        });

        res.json({ message: 'Tutor rejected', tutor });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all tutors (all statuses) with approval history summary
// @route   GET /api/admin/tutors
// @access  Private/Admin
const getAllTutors = async (req, res) => {
    try {
        const { status } = req.query;
        const filter = status ? { approvalStatus: status } : {};

        const tutors = await TutorProfile.find(filter)
            .populate('userId', 'name email phone location createdAt')
            .sort({ createdAt: -1 });

        res.json(tutors);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get approval history for a specific tutor
// @route   GET /api/admin/tutors/:id/history
// @access  Private/Admin
const getTutorHistory = async (req, res) => {
    try {
        const tutor = await TutorProfile.findById(req.params.id)
            .populate('userId', 'name email createdAt')
            .select('approvalHistory approvalStatus tutorCode rejectionReason userId subjects');

        if (!tutor) {
            return res.status(404).json({ message: 'Tutor not found' });
        }

        res.json(tutor);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all pending bookings
// @route   GET /api/admin/bookings/pending
// @access  Private/Admin
const getPendingBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ status: 'pending' })
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email');
        res.json(bookings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Approve a booking
// @route   PATCH /api/admin/bookings/:id/approve
// @access  Private/Admin
const approveBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        booking.status = 'approved';
        await booking.save();

        res.json({ message: 'Booking approved', booking });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Reject a booking
// @route   PATCH /api/admin/bookings/:id/reject
// @access  Private/Admin
const rejectBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        booking.status = 'rejected';
        await booking.save();

        res.json({ message: 'Booking rejected', booking });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get analytics dashboard data
// @route   GET /api/admin/analytics
// @access  Private/Admin
const getAnalytics = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalStudents = await User.countDocuments({ role: 'student' });
        const totalTutors = await User.countDocuments({ role: 'tutor' });
        const approvedTutors = await TutorProfile.countDocuments({ approvalStatus: 'approved' });
        const pendingTutors = await TutorProfile.countDocuments({ approvalStatus: 'pending' });

        const totalBookings = await Booking.countDocuments();
        const completedBookings = await Booking.countDocuments({ status: 'completed' });
        const pendingBookings = await Booking.countDocuments({ status: 'pending' });

        const totalReviews = await Review.countDocuments();
        const avgRating = await Review.aggregate([
            { $group: { _id: null, avgRating: { $avg: '$rating' } } }
        ]);

        const totalAttendance = await Attendance.countDocuments();
        const presentAttendance = await Attendance.countDocuments({ status: 'present' });
        const attendanceRate = totalAttendance > 0
            ? ((presentAttendance / totalAttendance) * 100).toFixed(1)
            : 0;

        // Recent activity (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentBookings = await Booking.countDocuments({
            createdAt: { $gte: thirtyDaysAgo }
        });
        const recentUsers = await User.countDocuments({
            createdAt: { $gte: thirtyDaysAgo }
        });

        res.json({
            users: {
                total: totalUsers,
                students: totalStudents,
                tutors: totalTutors,
                approvedTutors,
                pendingTutors,
                recent: recentUsers
            },
            bookings: {
                total: totalBookings,
                completed: completedBookings,
                pending: pendingBookings,
                recent: recentBookings
            },
            reviews: {
                total: totalReviews,
                averageRating: avgRating[0]?.avgRating?.toFixed(1) || 0
            },
            attendance: {
                total: totalAttendance,
                present: presentAttendance,
                rate: parseFloat(attendanceRate)
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Generate report
// @route   GET /api/admin/reports
// @access  Private/Admin
const generateReport = async (req, res) => {
    try {
        const { type, startDate, endDate } = req.query;

        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();

        let report = {};

        switch (type) {
            case 'users':
                report = {
                    total: await User.countDocuments({ createdAt: { $gte: start, $lte: end } }),
                    students: await User.countDocuments({ role: 'student', createdAt: { $gte: start, $lte: end } }),
                    tutors: await User.countDocuments({ role: 'tutor', createdAt: { $gte: start, $lte: end } }),
                    users: await User.find({ createdAt: { $gte: start, $lte: end } })
                        .select('name email role createdAt')
                        .sort({ createdAt: -1 })
                };
                break;
            case 'bookings':
                report = {
                    total: await Booking.countDocuments({ createdAt: { $gte: start, $lte: end } }),
                    byStatus: {
                        pending: await Booking.countDocuments({ status: 'pending', createdAt: { $gte: start, $lte: end } }),
                        approved: await Booking.countDocuments({ status: 'approved', createdAt: { $gte: start, $lte: end } }),
                        completed: await Booking.countDocuments({ status: 'completed', createdAt: { $gte: start, $lte: end } }),
                        cancelled: await Booking.countDocuments({ status: 'cancelled', createdAt: { $gte: start, $lte: end } })
                    },
                    bookings: await Booking.find({ createdAt: { $gte: start, $lte: end } })
                        .populate('studentId', 'name email')
                        .populate('tutorId', 'name email')
                        .sort({ createdAt: -1 })
                };
                break;
            case 'tutors':
                report = {
                    total: await TutorProfile.countDocuments({ createdAt: { $gte: start, $lte: end } }),
                    byStatus: {
                        approved: await TutorProfile.countDocuments({ approvalStatus: 'approved', createdAt: { $gte: start, $lte: end } }),
                        pending: await TutorProfile.countDocuments({ approvalStatus: 'pending', createdAt: { $gte: start, $lte: end } }),
                        rejected: await TutorProfile.countDocuments({ approvalStatus: 'rejected', createdAt: { $gte: start, $lte: end } })
                    },
                    tutors: await TutorProfile.find({ createdAt: { $gte: start, $lte: end } })
                        .populate('userId', 'name email')
                        .sort({ createdAt: -1 })
                };
                break;
            default:
                report = {
                    users: await User.countDocuments({ createdAt: { $gte: start, $lte: end } }),
                    bookings: await Booking.countDocuments({ createdAt: { $gte: start, $lte: end } }),
                    tutors: await TutorProfile.countDocuments({ createdAt: { $gte: start, $lte: end } })
                };
        }

        report.generatedAt = new Date();
        report.period = { start, end };

        res.json(report);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get user activity
// @route   GET /api/admin/activity
// @access  Private/Admin
const getUserActivity = async (req, res) => {
    try {
        const { limit = 50 } = req.query;

        // Get recent bookings
        const recentBookings = await Booking.find()
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        // Get recent reviews
        const recentReviews = await Review.find()
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        // Get recent users
        const recentUsers = await User.find()
            .select('name email role createdAt')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        res.json({
            bookings: recentBookings,
            reviews: recentReviews,
            users: recentUsers
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Send mass communication
// @route   POST /api/admin/mass-communication
// @access  Private/Admin
const sendMassCommunication = async (req, res) => {
    try {
        const { recipients, subject, message, type } = req.body;

        if (!recipients || !message) {
            return res.status(400).json({ message: 'Recipients and message are required' });
        }

        let users = [];
        if (recipients === 'all') {
            users = await User.find({ isActive: true });
        } else if (recipients === 'students') {
            users = await User.find({ role: 'student', isActive: true });
        } else if (recipients === 'tutors') {
            users = await User.find({ role: 'tutor', isActive: true });
        } else if (Array.isArray(recipients)) {
            users = await User.find({ _id: { $in: recipients }, isActive: true });
        }

        // In a real implementation, you would send emails/notifications here
        // For now, we'll just return the list of recipients

        res.json({
            message: 'Mass communication sent',
            recipientsCount: users.length,
            recipients: users.map(u => ({ id: u._id, name: u.name, email: u.email })),
            subject,
            message,
            type: type || 'email'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all users with search/filter
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsers = async (req, res) => {
    try {
        const { role, search, limit = 50 } = req.query;
        const filter = {};
        if (role && role !== 'all') filter.role = role;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        const users = await User.find(filter)
            .select('name email role createdAt isActive phone location')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Attendance cross-check: disputed + unverified sessions
// @route   GET /api/admin/attendance/cross-check
// @access  Private/Admin
const getAttendanceCrossCheck = async (req, res) => {
    try {
        const { filter = 'disputed' } = req.query;
        const matchFilter = filter === 'all'
            ? {}
            : filter === 'unverified'
            ? { parentVerificationStatus: 'unverified' }
            : { parentVerificationStatus: 'disputed' };

        const records = await Attendance.find(matchFilter)
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email')
            .populate('bookingId', 'subject sessionDate')
            .sort({ createdAt: -1 })
            .limit(100);

        const disputed  = await Attendance.countDocuments({ parentVerificationStatus: 'disputed' });
        const unverified = await Attendance.countDocuments({ parentVerificationStatus: 'unverified' });
        const verified  = await Attendance.countDocuments({ parentVerificationStatus: 'verified' });

        res.json({ records, stats: { disputed, unverified, verified, total: disputed + unverified + verified } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Detect at-risk patterns (students with high absence, tutors with complaints)
// @route   GET /api/admin/patterns
// @access  Private/Admin
const getAtRiskPatterns = async (req, res) => {
    try {
        // Students with ≥30% absence rate (min 3 sessions)
        const studentStats = await Attendance.aggregate([
            { $group: {
                _id: '$studentId',
                total: { $sum: 1 },
                absent: { $sum: { $cond: [{ $in: ['$status', ['absent']] }, 1, 0] } },
                disputed: { $sum: { $cond: [{ $eq: ['$parentVerificationStatus', 'disputed'] }, 1, 0] } }
            }},
            { $match: { total: { $gte: 3 } } },
            { $addFields: { absenceRate: { $divide: ['$absent', '$total'] } } },
            { $match: { $or: [{ absenceRate: { $gte: 0.3 } }, { disputed: { $gte: 1 } }] } },
            { $sort: { absenceRate: -1 } }
        ]);

        await Attendance.populate(studentStats, { path: '_id', select: 'name email', model: 'User' });

        // Tutors with high student absence rate
        const tutorStats = await Attendance.aggregate([
            { $group: {
                _id: '$tutorId',
                total: { $sum: 1 },
                absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } }
            }},
            { $match: { total: { $gte: 5 } } },
            { $addFields: { absenceRate: { $divide: ['$absent', '$total'] } } },
            { $match: { absenceRate: { $gte: 0.4 } } },
            { $sort: { absenceRate: -1 } }
        ]);

        await Attendance.populate(tutorStats, { path: '_id', select: 'name email', model: 'User' });

        // Disputed attendance records not yet resolved
        const unresolvedDisputes = await Attendance.countDocuments({ parentVerificationStatus: 'disputed' });

        res.json({
            atRiskStudents: studentStats.map(s => ({
                student: s._id,
                total: s.total,
                absent: s.absent,
                disputed: s.disputed,
                absenceRate: parseFloat((s.absenceRate * 100).toFixed(1))
            })),
            atRiskTutors: tutorStats.map(t => ({
                tutor: t._id,
                total: t.total,
                absent: t.absent,
                absenceRate: parseFloat((t.absenceRate * 100).toFixed(1))
            })),
            unresolvedDisputes
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Send an alert notification to a user (Parent P0: admin alerts)
// @route   POST /api/admin/send-alert
// @access  Private/Admin
const sendAlertToUser = async (req, res) => {
    try {
        const { userId, title, message, link } = req.body;

        if (!userId || !title || !message) {
            return res.status(400).json({ message: 'userId, title, and message are required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await createNotification({
            userId,
            type: 'admin_alert',
            title,
            message,
            link: link || (user.role === 'student' ? '/student-dashboard' : user.role === 'tutor' ? '/tutor-dashboard' : '/admin')
        });

        res.json({ message: 'Alert sent', userId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getPendingTutors,
    approveTutor,
    rejectTutor,
    getAllTutors,
    getTutorHistory,
    getPendingBookings,
    approveBooking,
    rejectBooking,
    getAnalytics,
    generateReport,
    getUserActivity,
    sendMassCommunication,
    sendAlertToUser,
    getUsers,
    getAttendanceCrossCheck,
    getAtRiskPatterns
};
