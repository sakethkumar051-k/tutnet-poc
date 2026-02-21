const mongoose = require('mongoose');

const progressReportSchema = new mongoose.Schema({
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
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking'
    },
    subject: {
        type: String,
        required: true
    },
    attendance: {
        totalSessions: {
            type: Number,
            default: 0
        },
        attendedSessions: {
            type: Number,
            default: 0
        },
        attendancePercentage: {
            type: Number,
            default: 0
        }
    },
    performance: {
        assignmentsCompleted: {
            type: Number,
            default: 0
        },
        averageScore: {
            type: Number,
            default: 0
        },
        improvement: {
            type: String,
            enum: ['excellent', 'good', 'average', 'needs_improvement'],
            default: 'average'
        }
    },
    notes: {
        type: String
    },
    generatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ProgressReport', progressReportSchema);

