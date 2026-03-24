const mongoose = require('mongoose');

const tutorProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    subjects: [{ type: String, trim: true }],
    classes: [{ type: String, trim: true }],
    hourlyRate: { type: Number, required: true },
    experienceYears: { type: Number, default: 0 },
    mode: { type: String, enum: ['online', 'home', 'both'], default: 'home' },
    languages: [{ type: String, trim: true }],
    bio: { type: String, trim: true },
    availableSlots: { type: [String], default: [] },
    availabilityMode: { type: String, enum: ['fixed', 'flexible'], default: 'flexible' },
    weeklyAvailability: [{
        day: { type: String, enum: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] },
        slots: [{ start: String, end: String }]
    }],
    travelRadius: { type: Number, min: 0, max: 100 },
    noticePeriodHours: { type: Number, min: 0, max: 168 },
    maxSessionsPerDay: { type: Number, min: 1, max: 12 },
    education: {
        degree: { type: String, trim: true },
        institution: { type: String, trim: true },
        year: { type: String, trim: true }
    },
    qualifications: [{ type: String, trim: true }],
    strengthTags: [{ type: String, trim: true }],
    profileStatus: {
        type: String,
        enum: ['draft', 'pending', 'approved', 'rejected'],
        default: 'draft'
    },
    verificationLevel: {
        type: String,
        enum: ['none', 'phone', 'id', 'full'],
        default: 'none'
    },
    profileCompletionScore: { type: Number, min: 0, max: 100, default: 0 },
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    rejectionReason: { type: String, trim: true },
    tutorCode: { type: String, unique: true, sparse: true },
    approvalHistory: [{
        action: {
            type: String,
            enum: ['submitted', 'approved', 'rejected', 'resubmitted'],
            required: true
        },
        adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        adminName: { type: String },
        note: { type: String, trim: true },
        timestamp: { type: Date, default: Date.now }
    }],
    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 }
}, {
    timestamps: true
});

tutorProfileSchema.index({ approvalStatus: 1, profileStatus: 1 });
tutorProfileSchema.index({ subjects: 1 });
tutorProfileSchema.index({ classes: 1 });
tutorProfileSchema.index({ mode: 1 });

module.exports = mongoose.model('TutorProfile', tutorProfileSchema);
