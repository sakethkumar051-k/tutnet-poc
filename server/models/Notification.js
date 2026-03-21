const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: [
            'booking_approved',
            'booking_rejected',
            'demo_accepted',
            'demo_rejected',
            'demo_booking_created',
            'session_reminder',
            'session_starting_soon',
            'session_completed',
            'session_missed',
            'schedule_updated',
            'admin_alert',
            'progress_report_added',
            'tutor_unavailable',
            'booking_cancelled',
            'homework_assigned',
            'feedback_received',
            'attendance_marked',
            'study_material_added',
            'new_booking_request',
            'new_trial_request',
            'new_review',
            'payment_received',
            'student_cancellation',
            'homework_completed',
            'reschedule_request',
            'reschedule_approved',
            'reschedule_declined',
            'tutor_change_request',
            'change_request_approved',
            'change_request_declined',
            'payment_success',
            'payment_failed',
            'refund_initiated',
            'refund_processed',
            'new_tutor_registration',
            'tutor_pending_approval',
            'system_alert',
            'booking',
            'review',
            'approval',
            'message',
            'reminder',
            'system'
        ],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    link: {
        type: String
    },
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

notificationSchema.index({ userId: 1, isRead: 1, isDeleted: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('Notification', notificationSchema);
