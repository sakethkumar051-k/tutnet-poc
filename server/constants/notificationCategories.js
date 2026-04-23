/**
 * Notification categories — drive user preference toggles.
 *
 * Every `type` maps to exactly one `category`. When a user turns off a
 * category in /notifications/settings, every type inside it is suppressed.
 *
 * IMPORTANT: keep this file in sync with client/src/constants/notificationCategories.js
 * (mirror file so the client can label things without a round-trip).
 */

const CATEGORIES = ['session', 'payment', 'review', 'message', 'admin', 'system', 'marketing'];

// type → category
const TYPE_TO_CATEGORY = {
    // Session lifecycle
    booking_approved:         'session',
    booking_rejected:         'session',
    booking_cancelled:        'session',
    booking:                  'session',
    demo_accepted:            'session',
    demo_rejected:            'session',
    demo_booking_created:     'session',
    new_booking_request:      'session',
    new_trial_request:        'session',
    session_reminder:         'session',
    session_starting_soon:    'session',
    session_completed:        'session',
    session_missed:           'session',
    schedule_updated:         'session',
    attendance_marked:        'session',
    reschedule_request:       'session',
    reschedule_approved:      'session',
    reschedule_declined:      'session',
    tutor_change_request:     'session',
    change_request_approved:  'session',
    change_request_declined:  'session',
    student_cancellation:     'session',
    tutor_unavailable:        'session',
    homework_assigned:        'session',
    homework_completed:       'session',
    progress_report_added:    'session',
    feedback_received:        'session',
    study_material_added:     'session',
    reminder:                 'session',

    // Payment / money
    payment_received:         'payment',
    payment_success:          'payment',
    payment_failed:           'payment',
    refund_initiated:         'payment',
    refund_processed:         'payment',
    credit_topup:             'payment',
    payout_scheduled:         'payment',
    payout_paid:              'payment',

    // Reviews
    new_review:               'review',
    review:                   'review',
    review_reply:             'review',

    // Direct messages
    message:                  'message',
    new_message:              'message',

    // Admin-targeted alerts
    admin_alert:              'admin',
    approval:                 'admin',
    new_tutor_registration:   'admin',
    tutor_pending_approval:   'admin',
    new_student_signup:       'admin',
    escalation_raised:        'admin',
    off_platform_report:      'admin',
    high_value_payment:       'admin',
    report_verified:          'admin',
    report_dismissed:         'admin',

    // System / platform events (the catch-all)
    system_alert:             'system',
    system:                   'system'
};

function categoryFor(type) {
    return TYPE_TO_CATEGORY[type] || 'system';
}

module.exports = { CATEGORIES, TYPE_TO_CATEGORY, categoryFor };
