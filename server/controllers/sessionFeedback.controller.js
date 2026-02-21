const SessionFeedback = require('../models/SessionFeedback');
const Booking = require('../models/Booking');
const CurrentTutor = require('../models/CurrentTutor');
const Attendance = require('../models/Attendance');
const { createNotification } = require('../utils/notificationHelper');

// @desc    Get session feedback
// @route   GET /api/session-feedback/booking/:bookingId
// @access  Private
const getSessionFeedback = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.bookingId);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Check authorization
        if (req.user.role === 'student' && booking.studentId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        if (req.user.role === 'tutor' && booking.tutorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        let feedback = await SessionFeedback.findOne({ bookingId: req.params.bookingId })
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email');

        if (!feedback) {
            // Create empty feedback if doesn't exist
            const currentTutor = await CurrentTutor.findOne({
                studentId: booking.studentId,
                tutorId: booking.tutorId,
                subject: booking.subject,
                isActive: true
            });

            feedback = await SessionFeedback.create({
                bookingId: req.params.bookingId,
                currentTutorId: currentTutor?._id,
                studentId: booking.studentId,
                tutorId: booking.tutorId,
                sessionDate: booking.sessionDate || booking.createdAt
            });

            await feedback.populate('studentId', 'name email');
            await feedback.populate('tutorId', 'name email');
        }

        // Also attach the attendance record (for parent verification UI)
        const attendanceRecord = await Attendance.findOne({ bookingId: req.params.bookingId })
            .select('_id parentVerificationStatus parentVerificationNote parentVerifiedAt');

        const result = feedback.toObject ? feedback.toObject() : feedback;
        if (attendanceRecord) {
            result.attendanceRecordId = attendanceRecord._id;
            result.parentVerificationStatus = attendanceRecord.parentVerificationStatus;
            result.parentVerificationNote = attendanceRecord.parentVerificationNote;
            result.parentVerifiedAt = attendanceRecord.parentVerifiedAt;
        }

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Submit tutor feedback
// @route   POST /api/session-feedback/booking/:bookingId/tutor-feedback
// @access  Private (Tutor)
const submitTutorFeedback = async (req, res) => {
    try {
        const { tutorSummary, understandingScore, topicsCovered, nextSteps } = req.body;
        const booking = await Booking.findById(req.params.bookingId);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.tutorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        let feedback = await SessionFeedback.findOne({ bookingId: req.params.bookingId });

        if (!feedback) {
            const currentTutor = await CurrentTutor.findOne({
                studentId: booking.studentId,
                tutorId: booking.tutorId,
                subject: booking.subject,
                isActive: true
            });

            feedback = await SessionFeedback.create({
                bookingId: req.params.bookingId,
                currentTutorId: currentTutor?._id,
                studentId: booking.studentId,
                tutorId: booking.tutorId,
                sessionDate: booking.sessionDate || booking.createdAt
            });
        }

        feedback.tutorSummary = tutorSummary;
        feedback.understandingScore = understandingScore;
        feedback.topicsCovered = topicsCovered || [];
        feedback.nextSteps = nextSteps;
        feedback.tutorSubmittedAt = new Date();
        await feedback.save();

        // Mark booking as having feedback
        booking.hasFeedback = true;
        await booking.save();

        await createNotification({
            userId: booking.studentId,
            type: 'feedback_received',
            title: 'Tutor Feedback Received',
            message: 'Your tutor has provided feedback for a session.',
            link: '/student-dashboard?tab=sessions',
            bookingId: booking._id
        });

        res.json(feedback);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Submit student feedback
// @route   POST /api/session-feedback/booking/:bookingId/student-feedback
// @access  Private (Student)
const submitStudentFeedback = async (req, res) => {
    try {
        const { studentRating, studentComment } = req.body;
        const booking = await Booking.findById(req.params.bookingId);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.studentId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        let feedback = await SessionFeedback.findOne({ bookingId: req.params.bookingId });

        if (!feedback) {
            const currentTutor = await CurrentTutor.findOne({
                studentId: booking.studentId,
                tutorId: booking.tutorId,
                subject: booking.subject,
                isActive: true
            });

            feedback = await SessionFeedback.create({
                bookingId: req.params.bookingId,
                currentTutorId: currentTutor?._id,
                studentId: booking.studentId,
                tutorId: booking.tutorId,
                sessionDate: booking.sessionDate || booking.createdAt
            });
        }

        feedback.studentRating = studentRating;
        feedback.studentComment = studentComment;
        feedback.studentSubmittedAt = new Date();
        await feedback.save();

        res.json(feedback);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Add study material to session
// @route   POST /api/session-feedback/booking/:bookingId/study-material
// @access  Private (Tutor)
const addStudyMaterial = async (req, res) => {
    try {
        const { type, title, url, description } = req.body;
        const booking = await Booking.findById(req.params.bookingId);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.tutorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        let feedback = await SessionFeedback.findOne({ bookingId: req.params.bookingId });

        if (!feedback) {
            const currentTutor = await CurrentTutor.findOne({
                studentId: booking.studentId,
                tutorId: booking.tutorId,
                subject: booking.subject,
                isActive: true
            });

            feedback = await SessionFeedback.create({
                bookingId: req.params.bookingId,
                currentTutorId: currentTutor?._id,
                studentId: booking.studentId,
                tutorId: booking.tutorId,
                sessionDate: booking.sessionDate || booking.createdAt
            });
        }

        feedback.studyMaterials.push({
            type,
            title,
            url,
            description,
            assignedAt: new Date()
        });

        await feedback.save();

        await createNotification({
            userId: booking.studentId,
            type: 'study_material_added',
            title: 'New Study Material',
            message: `New study material added: ${title}`,
            link: '/student-dashboard?tab=sessions',
            bookingId: booking._id
        });

        res.json(feedback);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update study material
// @route   PUT /api/session-feedback/study-material/:feedbackId/:materialIndex
// @access  Private (Tutor)
const updateStudyMaterial = async (req, res) => {
    try {
        const feedback = await SessionFeedback.findById(req.params.feedbackId);

        if (!feedback) {
            return res.status(404).json({ message: 'Feedback not found' });
        }

        if (feedback.tutorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const index = parseInt(req.params.materialIndex);
        if (index >= 0 && index < feedback.studyMaterials.length) {
            feedback.studyMaterials[index] = {
                ...feedback.studyMaterials[index].toObject(),
                ...req.body
            };
            await feedback.save();
        }

        res.json(feedback);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Add homework
// @route   POST /api/session-feedback/booking/:bookingId/homework
// @access  Private (Tutor)
const addHomework = async (req, res) => {
    try {
        const { description, dueDate } = req.body;
        const booking = await Booking.findById(req.params.bookingId);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.tutorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        let feedback = await SessionFeedback.findOne({ bookingId: req.params.bookingId });

        if (!feedback) {
            const currentTutor = await CurrentTutor.findOne({
                studentId: booking.studentId,
                tutorId: booking.tutorId,
                subject: booking.subject,
                isActive: true
            });

            feedback = await SessionFeedback.create({
                bookingId: req.params.bookingId,
                currentTutorId: currentTutor?._id,
                studentId: booking.studentId,
                tutorId: booking.tutorId,
                sessionDate: booking.sessionDate || booking.createdAt
            });
        }

        feedback.homework.push({
            description,
            dueDate: dueDate ? new Date(dueDate) : undefined,
            status: 'assigned',
            assignedAt: new Date()
        });

        await feedback.save();

        await createNotification({
            userId: booking.studentId,
            type: 'homework_assigned',
            title: 'New Homework Assigned',
            message: `New homework assigned: ${description}`,
            link: '/student-dashboard?tab=sessions',
            bookingId: booking._id
        });

        res.json(feedback);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update homework status
// @route   PATCH /api/session-feedback/homework/:feedbackId/:homeworkIndex
// @access  Private
const updateHomeworkStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const feedback = await SessionFeedback.findById(req.params.feedbackId);

        if (!feedback) {
            return res.status(404).json({ message: 'Feedback not found' });
        }

        // Check authorization
        if (req.user.role === 'student' && feedback.studentId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        if (req.user.role === 'tutor' && feedback.tutorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const index = parseInt(req.params.homeworkIndex);
        if (index >= 0 && index < feedback.homework.length) {
            feedback.homework[index].status = status;
            if (status === 'completed') {
                feedback.homework[index].completedAt = new Date();
            }
            await feedback.save();
        }

        if (req.user.role === 'student' && status === 'completed') {
            await createNotification({
                userId: feedback.tutorId,
                type: 'homework_completed',
                title: 'Homework Completed',
                message: 'Student has marked homework as completed.',
                link: '/tutor-dashboard?tab=sessions',
                bookingId: feedback.bookingId
            });
        }

        res.json(feedback);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Mark attendance for session
// @route   POST /api/session-feedback/booking/:bookingId/attendance
// @access  Private (Tutor)
const markAttendance = async (req, res) => {
    try {
        const { status, duration, notes } = req.body;
        const booking = await Booking.findById(req.params.bookingId);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.tutorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Update booking attendance status
        // Map status from frontend to valid enum values for booking
        const statusLower = (status || '').toLowerCase();
        let bookingAttendanceStatus = 'pending';

        if (statusLower === 'completed' || statusLower === 'present') {
            bookingAttendanceStatus = 'present';
        } else if (statusLower === 'student_absent' || statusLower === 'absent') {
            bookingAttendanceStatus = 'absent';
        }

        booking.attendanceStatus = bookingAttendanceStatus;
        if (duration) booking.duration = duration;
        await booking.save();

        // Get or create SessionFeedback
        let feedback = await SessionFeedback.findOne({ bookingId: req.params.bookingId });
        if (!feedback) {
            const currentTutor = await CurrentTutor.findOne({
                studentId: booking.studentId,
                tutorId: booking.tutorId,
                subject: booking.subject,
                isActive: true
            });

            feedback = await SessionFeedback.create({
                bookingId: req.params.bookingId,
                currentTutorId: currentTutor?._id,
                studentId: booking.studentId,
                tutorId: booking.tutorId,
                sessionDate: booking.sessionDate || booking.createdAt
            });
        }

        // Update SessionFeedback with attendance
        feedback.attendanceStatus = status;
        feedback.duration = duration || 60;
        feedback.attendanceNotes = notes;
        await feedback.save();

        // Create/update attendance record
        // statusLower is already declared above, so we can reuse it
        let attendanceStatusValue = 'present'; // default

        if (statusLower === 'completed' || statusLower === 'present') {
            attendanceStatusValue = 'present';
        } else if (statusLower === 'student_absent' || statusLower === 'absent') {
            attendanceStatusValue = 'absent';
        } else if (statusLower === 'pending') {
            attendanceStatusValue = 'pending';
        }

        const attendance = await Attendance.findOneAndUpdate(
            {
                bookingId: req.params.bookingId,
                sessionDate: booking.sessionDate || booking.createdAt
            },
            {
                bookingId: req.params.bookingId,
                studentId: booking.studentId,
                tutorId: booking.tutorId,
                sessionDate: booking.sessionDate || booking.createdAt,
                status: attendanceStatusValue,
                duration: duration || 60,
                notes,
                markedBy: req.user.id
            },
            { upsert: true, new: true }
        );

        // Update CurrentTutor stats
        const currentTutor = await CurrentTutor.findOne({
            studentId: booking.studentId,
            tutorId: booking.tutorId,
            subject: booking.subject,
            isActive: true
        });

        if (currentTutor) {
            if (status === 'completed') {
                currentTutor.sessionsCompleted += 1;
            } else if (status === 'student_absent') {
                currentTutor.sessionsMissed += 1;
            }
            await currentTutor.save();
        }

        res.json(attendance);

        // Parent P0: Missed class alert when tutor marks student absent
        if (statusLower === 'absent' || statusLower === 'student_absent') {
            const populatedBooking = await Booking.findById(req.params.bookingId).populate('tutorId', 'name');
            const tutorName = populatedBooking?.tutorId?.name || 'Your tutor';
            const sessionDateStr = booking.sessionDate ? new Date(booking.sessionDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
            await createNotification({
                userId: booking.studentId,
                type: 'session_missed',
                title: 'Class missed',
                message: `A class with ${tutorName} was marked as missed${sessionDateStr ? ` (${sessionDateStr})` : ''}. Check your sessions for details.`,
                link: '/student-dashboard?tab=sessions',
                bookingId: booking._id
            });
        } else {
            await createNotification({
                userId: booking.studentId,
                type: 'attendance_marked',
                title: 'Attendance Marked',
                message: `Your attendance has been marked as ${status}.`,
                link: '/student-dashboard?tab=sessions',
                bookingId: booking._id
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc  Get all session-by-session progress reports for a student (or tutor's student)
// @route GET /api/session-feedback/progress-reports?studentId=&tutorId=&limit=
// @access Private
const getProgressReports = async (req, res) => {
    try {
        const { studentId, tutorId, limit = 20 } = req.query;
        const filter = {};

        if (req.user.role === 'student') {
            filter.studentId = req.user._id;
            if (tutorId) filter.tutorId = tutorId;
        } else if (req.user.role === 'tutor') {
            filter.tutorId = req.user._id;
            if (studentId) filter.studentId = studentId;
        } else {
            // admin — allow any combo
            if (studentId) filter.studentId = studentId;
            if (tutorId) filter.tutorId = tutorId;
        }

        const reports = await SessionFeedback.find(filter)
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email')
            .populate('bookingId', 'subject sessionDate preferredSchedule bookingCategory')
            .sort({ sessionDate: -1 })
            .limit(Number(limit));

        res.json(reports);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    getSessionFeedback,
    submitTutorFeedback,
    submitStudentFeedback,
    addStudyMaterial,
    updateStudyMaterial,
    addHomework,
    updateHomeworkStatus,
    markAttendance,
    getProgressReports
};

