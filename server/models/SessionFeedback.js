const mongoose = require('mongoose');

const sessionFeedbackSchema = new mongoose.Schema({
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true,
        unique: true
    },
    currentTutorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CurrentTutor',
        required: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tutorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sessionDate: {
        type: Date,
        required: true
    },
    // Tutor feedback
    tutorSummary: {
        type: String
    },
    understandingScore: {
        type: Number,
        min: 1,
        max: 5
    },
    topicsCovered: [String],
    nextSteps: {
        type: String
    },
    tutorSubmittedAt: {
        type: Date
    },
    // Student feedback
    studentRating: {
        type: Number,
        min: 1,
        max: 5
    },
    studentComment: {
        type: String
    },
    studentSubmittedAt: {
        type: Date
    },
    // Attendance
    attendanceStatus: {
        type: String,
        enum: ['scheduled', 'completed', 'student_absent', 'tutor_absent', 'rescheduled']
    },
    duration: {
        type: Number,
        default: 60
    },
    attendanceNotes: {
        type: String
    },
    // Study material and homework
    studyMaterials: [{
        type: {
            type: String,
            enum: ['link', 'file', 'topic'],
            required: true
        },
        title: {
            type: String,
            required: true
        },
        url: String,
        description: String,
        assignedAt: {
            type: Date,
            default: Date.now
        }
    }],
    homework: [{
        description: {
            type: String,
            required: true
        },
        dueDate: {
            type: Date
        },
        status: {
            type: String,
            enum: ['assigned', 'in_progress', 'completed'],
            default: 'assigned'
        },
        completedAt: {
            type: Date
        },
        assignedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('SessionFeedback', sessionFeedbackSchema);

