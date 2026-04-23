/**
 * Session Reminders Job
 * Sends in-app notifications 24h and 1h before upcoming sessions.
 * When SMTP_* env vars are set, also sends email via utils/emailDelivery.js.
 */

const Booking = require('../models/Booking');
const User = require('../models/User');
const { createNotification } = require('../utils/notificationHelper');
const { sendEmailIfConfigured } = require('../utils/emailDelivery');
const { sendSessionReminderPushIfEnabled } = require('../utils/pushDelivery');

function wantsEmailChannel(prefs) {
    const ch = prefs?.reminderChannels;
    if (!ch || ch.length === 0) return true;
    return ch.includes('email');
}

function wantsPushChannel(prefs) {
    return prefs?.reminderChannels?.includes('push');
}

function wantsLeadTime(prefs, label) {
    const key = label === '24h' ? '24h' : '1h';
    const lead = prefs?.reminderLeadTimes;
    if (!lead || lead.length === 0) return true;
    return lead.includes(key);
}

const sendSessionReminders = async () => {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in1h  = new Date(now.getTime() +      60 * 60 * 1000);

    const window = (target) => ({
        $gte: new Date(target.getTime() - 5 * 60 * 1000),
        $lte: new Date(target.getTime() + 5 * 60 * 1000)
    });

    const bookings24h = await Booking.find({
        status: 'approved',
        sessionDate: window(in24h),
        'reminders.sent24h': { $ne: true }
    }).populate('studentId tutorId', 'name email');

    const bookings1h = await Booking.find({
        status: 'approved',
        sessionDate: window(in1h),
        'reminders.sent1h': { $ne: true }
    }).populate('studentId tutorId', 'name email');

    const notify = async (b, label) => {
        const subject = b.subject || 'your session';
        const when = label === '24h' ? 'tomorrow' : 'in 1 hour';

        await Promise.all([
            createNotification({
                userId: b.studentId._id,
                type: 'session_reminder',
                title: `Session reminder — ${when}`,
                message: `Your ${subject} class with ${b.tutorId.name} is ${when}. Get ready!`,
                link: '/student-dashboard?tab=sessions'
            }),
            createNotification({
                userId: b.tutorId._id,
                type: 'session_reminder',
                title: `Upcoming session — ${when}`,
                message: `You have a ${subject} session with ${b.studentId.name} ${when}.`,
                link: '/tutor-dashboard?tab=sessions'
            })
        ]);

        const [studentUser, tutorUser] = await Promise.all([
            User.findById(b.studentId._id).select('email preferences deviceTokens').lean(),
            User.findById(b.tutorId._id).select('email preferences deviceTokens').lean()
        ]);

        const emailTasks = [];
        const pushTasks = [];
        if (
            studentUser?.email &&
            wantsEmailChannel(studentUser.preferences) &&
            wantsLeadTime(studentUser.preferences, label)
        ) {
            emailTasks.push(
                sendEmailIfConfigured({
                    to: studentUser.email,
                    subject: `TutNet: session ${when}`,
                    text: `Reminder: your ${subject} class with ${b.tutorId.name} is ${when}. Open TutNet for details.`
                })
            );
        }
        if (
            tutorUser?.email &&
            wantsEmailChannel(tutorUser.preferences) &&
            wantsLeadTime(tutorUser.preferences, label)
        ) {
            emailTasks.push(
                sendEmailIfConfigured({
                    to: tutorUser.email,
                    subject: `TutNet: upcoming session ${when}`,
                    text: `Reminder: ${subject} session with ${b.studentId.name} is ${when}.`
                })
            );
        }

        if (studentUser && wantsPushChannel(studentUser.preferences) && wantsLeadTime(studentUser.preferences, label)) {
            pushTasks.push(
                sendSessionReminderPushIfEnabled(studentUser, {
                    title: `Session reminder — ${when}`,
                    body: `Your ${subject} class with ${b.tutorId.name} is ${when}.`,
                    data: { type: 'session_reminder', bookingId: String(b._id), role: 'student' }
                })
            );
        }
        if (tutorUser && wantsPushChannel(tutorUser.preferences) && wantsLeadTime(tutorUser.preferences, label)) {
            pushTasks.push(
                sendSessionReminderPushIfEnabled(tutorUser, {
                    title: `Upcoming session — ${when}`,
                    body: `You have a ${subject} session with ${b.studentId.name} ${when}.`,
                    data: { type: 'session_reminder', bookingId: String(b._id), role: 'tutor' }
                })
            );
        }

        await Promise.all([...emailTasks, ...pushTasks]);

        if (label === '24h') b.set('reminders.sent24h', true);
        else                  b.set('reminders.sent1h', true);
        await b.save();
    };

    await Promise.all([
        ...bookings24h.map(b => notify(b, '24h')),
        ...bookings1h.map(b  => notify(b, '1h'))
    ]);

    return {
        processed24h: bookings24h.length,
        processed1h:  bookings1h.length
    };
};

module.exports = { sendSessionReminders };
