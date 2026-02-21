const Attendance = require('../models/Attendance');
const Booking = require('../models/Booking');
const { createNotification } = require('../utils/notificationHelper');

// @desc    Get attendance records
// @route   GET /api/attendance
// @access  Private
const getAttendance = async (req, res) => {
    try {
        let filter = {};

        if (req.user.role === 'student') {
            filter.studentId = req.user.id;
        } else if (req.user.role === 'tutor') {
            filter.tutorId = req.user.id;
        }

        const attendance = await Attendance.find(filter)
            .populate('bookingId')
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email')
            .sort({ sessionDate: -1 });

        res.json(attendance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Attendance allowed only during session or up to 12 hours after session end
const ATTENDANCE_WINDOW_HOURS = 12;

// @desc    Mark attendance
// @route   POST /api/attendance
// @access  Private (Tutor/Admin)
const markAttendance = async (req, res) => {
    try {
        const { bookingId, sessionDate, status, duration, notes } = req.body;

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.status !== 'approved' && booking.status !== 'completed') {
            return res.status(400).json({ message: 'Attendance can only be marked for approved sessions' });
        }

        const sessionDt = new Date(sessionDate);
        const now = new Date();
        if (sessionDt > now) {
            return res.status(400).json({ message: 'Cannot mark attendance for upcoming sessions. Please mark after the session time.' });
        }

        const durationMin = duration || 60;
        const sessionEnd = new Date(sessionDt.getTime() + durationMin * 60 * 1000);
        const windowEnd = new Date(sessionEnd.getTime() + ATTENDANCE_WINDOW_HOURS * 60 * 60 * 1000);
        const withinWindow = now <= windowEnd;
        const requestedAfterWindow = !withinWindow;

        if (requestedAfterWindow && req.user.role !== 'admin') {
            return res.status(400).json({
                message: `Attendance can be marked only during the session or up to ${ATTENDANCE_WINDOW_HOURS} hours after. This session is outside that window. Please raise an attendance request for admin approval.`,
                code: 'ATTENDANCE_WINDOW_EXPIRED'
            });
        }

        const statusVal = status && ['present', 'absent', 'late', 'excused'].includes(status) ? status : 'present';

        const existing = await Attendance.findOne({
            bookingId,
            sessionDate: sessionDt
        });

        if (existing) {
            return res.status(400).json({ message: 'Attendance already marked for this session' });
        }

        const attendance = await Attendance.create({
            bookingId,
            studentId: booking.studentId,
            tutorId: booking.tutorId,
            sessionDate: sessionDt,
            status: statusVal,
            duration: durationMin,
            notes,
            markedBy: req.user.id,
            requestedAfterWindow: requestedAfterWindow || undefined,
            adminApproved: requestedAfterWindow && req.user.role === 'admin' ? true : undefined
        });

        const populated = await Attendance.findById(attendance._id)
            .populate('bookingId')
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email');

        res.status(201).json(populated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update attendance
// @route   PUT /api/attendance/:id
// @access  Private (Tutor/Admin)
const updateAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.findById(req.params.id);

        if (!attendance) {
            return res.status(404).json({ message: 'Attendance record not found' });
        }

        // Check authorization
        if (attendance.tutorId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const updated = await Attendance.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('bookingId')
         .populate('studentId', 'name email')
         .populate('tutorId', 'name email');

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get student attendance
// @route   GET /api/attendance/student/:studentId
// @access  Private
const getStudentAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.find({ studentId: req.params.studentId })
            .populate('bookingId')
            .populate('tutorId', 'name email')
            .sort({ sessionDate: -1 });

        res.json(attendance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get tutor attendance records
// @route   GET /api/attendance/tutor
// @access  Private (Tutor)
const getTutorAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.find({ tutorId: req.user.id })
            .populate('bookingId')
            .populate('studentId', 'name email')
            .sort({ sessionDate: -1 });

        res.json(attendance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get attendance statistics
// @route   GET /api/attendance/stats
// @access  Private
const getAttendanceStats = async (req, res) => {
    try {
        let filter = {};

        if (req.user.role === 'student') {
            filter.studentId = req.user.id;
        } else if (req.user.role === 'tutor') {
            filter.tutorId = req.user.id;
        }

        const attendance = await Attendance.find(filter);

        const total = attendance.length;
        const present = attendance.filter(a => a.status === 'present').length;
        const absent = attendance.filter(a => a.status === 'absent').length;
        const late = attendance.filter(a => a.status === 'late').length;
        const excused = attendance.filter(a => a.status === 'excused').length;

        const attendancePercentage = total > 0 ? ((present + excused) / total * 100).toFixed(1) : 0;

        res.json({
            total,
            present,
            absent,
            late,
            excused,
            attendancePercentage: parseFloat(attendancePercentage)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Parent verifies or disputes attendance
// @route   PATCH /api/attendance/:id/parent-verify
// @access  Private (Student only — acts as parent/student)
const parentVerifyAttendance = async (req, res) => {
    try {
        const { status, note } = req.body;

        if (!['verified', 'disputed'].includes(status)) {
            return res.status(400).json({ message: 'Status must be "verified" or "disputed"' });
        }

        const attendance = await Attendance.findById(req.params.id);
        if (!attendance) {
            return res.status(404).json({ message: 'Attendance record not found' });
        }

        // Only the student in this record can verify
        if (attendance.studentId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Don't allow re-verification after it's already been set
        if (attendance.parentVerificationStatus !== 'unverified') {
            return res.status(400).json({ message: 'Attendance has already been verified or disputed' });
        }

        attendance.parentVerificationStatus = status;
        attendance.parentVerificationNote = note || '';
        attendance.parentVerifiedAt = new Date();
        attendance.parentVerifiedBy = req.user.id;
        await attendance.save();

        // Notify tutor that parent verified / disputed
        await createNotification({
            userId: attendance.tutorId,
            type: status === 'disputed' ? 'system_alert' : 'attendance_marked',
            title: status === 'disputed' ? 'Attendance disputed by student' : 'Attendance confirmed by student',
            message: status === 'disputed'
                ? `A student has disputed the attendance record for the session on ${new Date(attendance.sessionDate).toLocaleDateString()}. Note: "${note || 'No note provided'}"`
                : `Student confirmed the attendance for the session on ${new Date(attendance.sessionDate).toLocaleDateString()}.`,
            link: '/tutor-dashboard?tab=sessions'
        });

        // If disputed, also alert admin
        if (status === 'disputed') {
            const User = require('../models/User');
            const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
            for (const admin of admins) {
                await createNotification({
                    userId: admin._id,
                    type: 'admin_alert',
                    title: 'Attendance dispute raised',
                    message: `A student has disputed an attendance record (session: ${new Date(attendance.sessionDate).toLocaleDateString()}). Review may be required.`,
                    link: '/admin'
                });
            }
        }

        const populated = await Attendance.findById(attendance._id)
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email');

        res.json(populated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getAttendance,
    markAttendance,
    updateAttendance,
    getStudentAttendance,
    getTutorAttendance,
    getAttendanceStats,
    parentVerifyAttendance
};

