const mongoose = require('mongoose');

const currentTutorSchema = new mongoose.Schema({
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
    subject: {
        type: String,
        required: true
    },
    classGrade: {
        type: String
    },
    relationshipStartDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['new', 'active', 'near_completion', 'completed', 'cancelled'],
        default: 'new'
    },
    totalSessionsBooked: {
        type: Number,
        default: 0
    },
    sessionsCompleted: {
        type: Number,
        default: 0
    },
    sessionsCancelled: {
        type: Number,
        default: 0
    },
    sessionsMissed: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    endedAt: {
        type: Date
    },
    endedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    notes: {
        type: String
    }
}, {
    timestamps: true
});

// Ensure one active relationship per student-tutor-subject
currentTutorSchema.index({ studentId: 1, tutorId: 1, subject: 1, isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

module.exports = mongoose.model('CurrentTutor', currentTutorSchema);

