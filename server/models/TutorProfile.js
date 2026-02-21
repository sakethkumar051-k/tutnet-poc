const mongoose = require('mongoose');

const tutorProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    subjects: [{
        type: String,
        trim: true
    }],
    classes: [{
        type: String,
        trim: true
    }],
    hourlyRate: {
        type: Number,
        required: true
    },
    experienceYears: {
        type: Number,
        default: 0
    },
    mode: {
        type: String,
        enum: ['online', 'home', 'both'],
        default: 'home'
    },
    languages: [{
        type: String,
        trim: true
    }],
    bio: {
        type: String,
        trim: true
    },
    availableSlots: {
        type: [String], // Legacy: simple strings e.g., "Mon 10-12"
        default: []
    },
    // Structured weekly availability (new)
    weeklyAvailability: [{
        day: { type: String, enum: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] },
        slots: [{ start: String, end: String }]
    }],
    education: {
        degree: {
            type: String,
            trim: true
        },
        institution: {
            type: String,
            trim: true
        },
        year: {
            type: String,
            trim: true
        }
    },
    qualifications: [{
        type: String,
        trim: true
    }],
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    rejectionReason: {
        type: String,
        trim: true
    },
    // Human-readable tutor reference code (e.g. TUT-0042). Safe to display, not the DB ID.
    tutorCode: {
        type: String,
        unique: true,
        sparse: true
    },
    // Approval action log — admin-visible history, never exposed raw to students
    approvalHistory: [
        {
            action: {
                type: String,
                enum: ['submitted', 'approved', 'rejected', 'resubmitted'],
                required: true
            },
            adminId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            adminName: { type: String },
            note: { type: String, trim: true },
            timestamp: { type: Date, default: Date.now }
        }
    ],
    averageRating: {
        type: Number,
        default: 0
    },
    totalReviews: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('TutorProfile', tutorProfileSchema);
