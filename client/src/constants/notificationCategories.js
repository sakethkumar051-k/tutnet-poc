/**
 * Client mirror of server/constants/notificationCategories.js — kept in sync manually.
 * Used for filter chips, preferences UI, and inline category pills.
 */

export const CATEGORIES = [
    { key: 'session',   label: 'Sessions',              desc: 'Booking requests, reminders, reschedules, homework' },
    { key: 'payment',   label: 'Payments',              desc: 'Receipts, refunds, payouts, credits' },
    { key: 'review',    label: 'Reviews',               desc: 'New reviews and replies' },
    { key: 'message',   label: 'Messages',              desc: 'New chats from tutors or students' },
    { key: 'admin',     label: 'Admin alerts',          desc: 'Signups, disputes, escalations — admin only' },
    { key: 'system',    label: 'System',                desc: 'Account changes, platform updates' },
    { key: 'marketing', label: 'Tips & announcements',  desc: 'Product news and feature launches (off by default)' }
];

// Same mapping as server. Keep synced.
export const TYPE_TO_CATEGORY = {
    booking_approved: 'session', booking_rejected: 'session', booking_cancelled: 'session', booking: 'session',
    demo_accepted: 'session', demo_rejected: 'session', demo_booking_created: 'session',
    new_booking_request: 'session', new_trial_request: 'session',
    session_reminder: 'session', session_starting_soon: 'session', session_completed: 'session', session_missed: 'session',
    schedule_updated: 'session', attendance_marked: 'session',
    reschedule_request: 'session', reschedule_approved: 'session', reschedule_declined: 'session',
    tutor_change_request: 'session', change_request_approved: 'session', change_request_declined: 'session',
    student_cancellation: 'session', tutor_unavailable: 'session',
    homework_assigned: 'session', homework_completed: 'session',
    progress_report_added: 'session', feedback_received: 'session', study_material_added: 'session', reminder: 'session',
    payment_received: 'payment', payment_success: 'payment', payment_failed: 'payment',
    refund_initiated: 'payment', refund_processed: 'payment',
    credit_topup: 'payment', payout_scheduled: 'payment', payout_paid: 'payment',
    new_review: 'review', review: 'review', review_reply: 'review',
    message: 'message', new_message: 'message',
    admin_alert: 'admin', approval: 'admin',
    new_tutor_registration: 'admin', tutor_pending_approval: 'admin', new_student_signup: 'admin',
    escalation_raised: 'admin', off_platform_report: 'admin', high_value_payment: 'admin',
    report_verified: 'admin', report_dismissed: 'admin',
    system_alert: 'system', system: 'system'
};

export const categoryFor = (type) => TYPE_TO_CATEGORY[type] || 'system';

// Visual style per category for pills / icons
export const CATEGORY_STYLE = {
    session:   { chip: 'bg-royal/10 text-royal-dark',       dot: 'bg-royal' },
    payment:   { chip: 'bg-emerald-100 text-emerald-800',   dot: 'bg-emerald-500' },
    review:    { chip: 'bg-amber-100 text-amber-800',       dot: 'bg-amber-500' },
    message:   { chip: 'bg-purple-100 text-purple-800',     dot: 'bg-purple-500' },
    admin:     { chip: 'bg-rose-100 text-rose-800',         dot: 'bg-rose-500' },
    system:    { chip: 'bg-slate-100 text-slate-700',       dot: 'bg-slate-500' },
    marketing: { chip: 'bg-pink-100 text-pink-800',         dot: 'bg-pink-500' }
};
