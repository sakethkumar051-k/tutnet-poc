const CurrentTutor = require('../models/CurrentTutor');
const Booking = require('../models/Booking');
const SessionFeedback = require('../models/SessionFeedback');
const Attendance = require('../models/Attendance');

// @desc    Get current tutors for student
// @route   GET /api/current-tutors/student/my-tutors
// @access  Private (Student)
const getCurrentTutors = async (req, res) => {
    try {
        const currentTutors = await CurrentTutor.find({
            studentId: req.user.id,
            isActive: true
        })
            .populate('tutorId', 'name email phone location')
            .sort({ relationshipStartDate: -1 });

        // Get tutor profiles
        const TutorProfile = require('../models/TutorProfile');
        const tutorIds = currentTutors.map(ct => ct.tutorId._id);
        const profiles = await TutorProfile.find({ userId: { $in: tutorIds } })
            .populate('userId', 'name');

        const tutorsWithProfiles = currentTutors.map(ct => {
            const profile = profiles.find(p => p.userId._id.toString() === ct.tutorId._id.toString());
            return {
                ...ct.toObject(),
                tutorProfile: profile
            };
        });

        res.json(tutorsWithProfiles);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get current students for tutor
// @route   GET /api/current-tutors/tutor/my-students
// @access  Private (Tutor)
const getCurrentStudents = async (req, res) => {
    try {
        const currentStudents = await CurrentTutor.find({
            tutorId: req.user.id,
            isActive: true
        })
            .populate('studentId', 'name email phone location')
            .sort({ relationshipStartDate: -1 });

        res.json(currentStudents);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get current tutor/student relationship details
// @route   GET /api/current-tutors/student/tutor/:tutorId or /tutor/student/:studentId
// @access  Private
const getCurrentTutorDetails = async (req, res) => {
    try {
        let filter = { isActive: true };

        if (req.user.role === 'student') {
            filter.studentId = req.user.id;
            filter.tutorId = req.params.tutorId;
        } else {
            filter.tutorId = req.user.id;
            filter.studentId = req.params.studentId;
        }

        const currentTutor = await CurrentTutor.findOne(filter)
            .populate('studentId', 'name email phone location')
            .populate('tutorId', 'name email phone location');

        if (!currentTutor) {
            return res.status(404).json({ message: 'Relationship not found' });
        }

        // Get all bookings for this relationship
        const bookings = await Booking.find({
            studentId: currentTutor.studentId._id,
            tutorId: currentTutor.tutorId._id,
            subject: currentTutor.subject
        }).sort({ sessionDate: -1, createdAt: -1 });

        // Get session feedbacks
        const feedbacks = await SessionFeedback.find({
            currentTutorId: currentTutor._id
        }).sort({ sessionDate: -1 });

        // Get attendance records
        const attendanceRecords = await Attendance.find({
            studentId: currentTutor.studentId._id,
            tutorId: currentTutor.tutorId._id
        }).sort({ sessionDate: -1 });

        res.json({
            relationship: currentTutor,
            bookings,
            feedbacks,
            attendance: attendanceRecords
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    End relationship (student)
// @route   POST /api/current-tutors/student/end/:currentTutorId
// @access  Private (Student)
const endRelationship = async (req, res) => {
    try {
        const currentTutor = await CurrentTutor.findById(req.params.currentTutorId);

        if (!currentTutor) {
            return res.status(404).json({ message: 'Relationship not found' });
        }

        if (currentTutor.studentId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        currentTutor.isActive = false;
        currentTutor.status = 'completed';
        currentTutor.endedAt = new Date();
        currentTutor.endedBy = req.user.id;
        if (req.body.notes) currentTutor.notes = req.body.notes;
        await currentTutor.save();

        res.json({ message: 'Relationship ended successfully', currentTutor });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    End relationship (tutor) with optional handover notes
// @route   POST /api/current-tutors/tutor/end/:currentTutorId
// @access  Private (Tutor)
const endRelationshipAsTutor = async (req, res) => {
    try {
        const { createNotification } = require('../utils/notificationHelper');
        const relationship = await CurrentTutor.findById(req.params.currentTutorId);

        if (!relationship) {
            return res.status(404).json({ message: 'Relationship not found' });
        }
        if (relationship.tutorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { notes, reason } = req.body;
        relationship.isActive = false;
        relationship.status = 'completed';
        relationship.endedAt = new Date();
        relationship.endedBy = req.user.id;
        if (notes) relationship.notes = notes;
        await relationship.save();

        // Notify the student
        const User = require('../models/User');
        const tutor = await User.findById(req.user.id).select('name');
        await createNotification({
            userId: relationship.studentId,
            type: 'system_alert',
            title: 'Tutoring engagement ended',
            message: `${tutor?.name || 'Your tutor'} has ended the tutoring engagement for ${relationship.subject}.${reason ? ` Reason: ${reason}` : ''} Your session history and notes are preserved.`,
            link: '/student-dashboard?tab=sessions'
        });

        res.json({ message: 'Relationship ended', relationship });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get today's sessions
// @route   GET /api/current-tutors/today
// @access  Private
const getTodaysSessions = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        let filter = {
            status: { $in: ['approved', 'scheduled'] },
            $or: [
                { sessionDate: { $gte: today, $lt: tomorrow } },
                { preferredSchedule: { $regex: today.toISOString().split('T')[0] } }
            ]
        };

        if (req.user.role === 'student') {
            filter.studentId = req.user.id;
        } else if (req.user.role === 'tutor') {
            filter.tutorId = req.user.id;
        }

        const sessions = await Booking.find(filter)
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email')
            .populate('currentTutorId')
            .sort({ sessionDate: 1, preferredSchedule: 1 });

        res.json(sessions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get progress analytics for a relationship
// @route   GET /api/current-tutors/analytics/:currentTutorId
// @access  Private
const getProgressAnalytics = async (req, res) => {
    try {
        const currentTutor = await CurrentTutor.findById(req.params.currentTutorId)
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email');

        if (!currentTutor) {
            return res.status(404).json({ message: 'Relationship not found' });
        }

        // Check authorization
        if (req.user.role === 'student' && currentTutor.studentId._id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        if (req.user.role === 'tutor' && currentTutor.tutorId._id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Get all bookings
        const bookings = await Booking.find({
            studentId: currentTutor.studentId._id,
            tutorId: currentTutor.tutorId._id,
            subject: currentTutor.subject
        });

        // Get attendance records
        const attendance = await Attendance.find({
            studentId: currentTutor.studentId._id,
            tutorId: currentTutor.tutorId._id
        });

        // Get session feedbacks
        const feedbacks = await SessionFeedback.find({
            currentTutorId: currentTutor._id
        });

        // Calculate analytics
        const totalSessions = bookings.length;
        const completedSessions = bookings.filter(b => b.status === 'completed').length;
        const scheduledSessions = bookings.filter(b => b.status === 'scheduled' || b.status === 'approved').length;

        // Attendance stats
        const totalAttendance = attendance.length;
        const presentCount = attendance.filter(a => a.status === 'present').length;
        const absentCount = attendance.filter(a => a.status === 'absent').length;
        const attendancePercentage = totalAttendance > 0 
            ? ((presentCount / totalAttendance) * 100).toFixed(1) 
            : 0;

        // Understanding scores (from tutor feedback)
        const understandingScores = feedbacks
            .filter(f => f.understandingScore)
            .map(f => f.understandingScore);
        const avgUnderstanding = understandingScores.length > 0
            ? (understandingScores.reduce((a, b) => a + b, 0) / understandingScores.length).toFixed(1)
            : 0;

        // Student ratings (from student feedback)
        const studentRatings = feedbacks
            .filter(f => f.studentRating)
            .map(f => f.studentRating);
        const avgRating = studentRatings.length > 0
            ? (studentRatings.reduce((a, b) => a + b, 0) / studentRatings.length).toFixed(1)
            : 0;

        // Homework stats
        const allHomework = feedbacks.flatMap(f => f.homework || []);
        const totalHomework = allHomework.length;
        const completedHomework = allHomework.filter(h => h.status === 'completed').length;
        const homeworkCompletionRate = totalHomework > 0
            ? ((completedHomework / totalHomework) * 100).toFixed(1)
            : 0;

        // Topics covered
        const topicsCovered = [...new Set(feedbacks.flatMap(f => f.topicsCovered || []))];

        // Streak calculation
        const sortedAttendance = attendance
            .filter(a => a.status === 'present')
            .sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate));
        
        let streak = 0;
        let checkDate = new Date();
        checkDate.setHours(0, 0, 0, 0);
        
        for (const record of sortedAttendance) {
            const recordDate = new Date(record.sessionDate);
            recordDate.setHours(0, 0, 0, 0);
            const daysDiff = Math.floor((checkDate - recordDate) / (1000 * 60 * 60 * 24));
            
            if (daysDiff === streak) {
                streak++;
            } else {
                break;
            }
            checkDate = recordDate;
        }

        // Progress level (simple calculation)
        let progressLevel = 'Beginner';
        if (completedSessions >= 20) {
            progressLevel = 'Advanced';
        } else if (completedSessions >= 10) {
            progressLevel = 'Intermediate';
        }

        res.json({
            relationship: currentTutor,
            sessions: {
                total: totalSessions,
                completed: completedSessions,
                scheduled: scheduledSessions,
                cancelled: bookings.filter(b => b.status === 'cancelled').length
            },
            attendance: {
                total: totalAttendance,
                present: presentCount,
                absent: absentCount,
                percentage: parseFloat(attendancePercentage),
                streak: streak
            },
            learning: {
                topicsCovered: topicsCovered,
                progressLevel: progressLevel,
                sessionsCompleted: completedSessions
            },
            performance: {
                averageUnderstanding: parseFloat(avgUnderstanding),
                averageRating: parseFloat(avgRating),
                understandingScores: understandingScores,
                studentRatings: studentRatings
            },
            engagement: {
                homeworkTotal: totalHomework,
                homeworkCompleted: completedHomework,
                completionRate: parseFloat(homeworkCompletionRate)
            },
            summaries: [
                `You have completed ${completedSessions} session${completedSessions !== 1 ? 's' : ''} with this ${req.user.role === 'student' ? 'tutor' : 'student'}.`,
                `Attendance: ${attendancePercentage}% (${presentCount} out of ${totalAttendance} session${totalAttendance !== 1 ? 's' : ''} attended).`,
                totalHomework > 0 
                    ? `Homework completion: ${completedHomework} out of ${totalHomework} assigned task${totalHomework !== 1 ? 's' : ''} completed.`
                    : 'No homework assigned yet.'
            ]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getCurrentTutors,
    getCurrentStudents,
    getCurrentTutorDetails,
    endRelationship,
    endRelationshipAsTutor,
    getTodaysSessions,
    getProgressAnalytics
};

