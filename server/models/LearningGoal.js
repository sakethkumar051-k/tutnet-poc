const mongoose = require('mongoose');

const learningGoalSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tutorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    subject: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    targetDate: { type: Date },
    status: {
        type: String,
        enum: ['not_started', 'in_progress', 'achieved', 'dropped'],
        default: 'not_started'
    },
    progressNotes: [{
        note: { type: String },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        addedByRole: { type: String, enum: ['student', 'tutor'] },
        addedAt: { type: Date, default: Date.now }
    }],
    percentComplete: { type: Number, default: 0, min: 0, max: 100 }
}, { timestamps: true });

module.exports = mongoose.model('LearningGoal', learningGoalSchema);
