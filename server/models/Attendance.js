const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
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
    status: {
        type: String,
        enum: ['present', 'absent', 'late', 'excused'],
        default: 'present'
    },
    duration: {
        type: Number, // in minutes
        default: 60
    },
    notes: {
        type: String
    },
    markedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Parent P0: attendance verification by parent/student
    parentVerificationStatus: {
        type: String,
        enum: ['unverified', 'verified', 'disputed'],
        default: 'unverified'
    },
    parentVerificationNote: {
        type: String,
        trim: true
    },
    parentVerifiedAt: {
        type: Date
    },
    parentVerifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    markedAt: { type: Date, default: Date.now },
    // When marked after 12h window: tutor request, admin must approve
    requestedAfterWindow: { type: Boolean, default: false },
    adminApproved: { type: Boolean, default: null }, // null = N/A, true/false = after review
    adminApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    adminApprovedAt: { type: Date }
}, {
    timestamps: true
});

module.exports = mongoose.model('Attendance', attendanceSchema);

