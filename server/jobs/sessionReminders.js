/**
 * Session Reminders Job
 * Sends in-app notifications 24h and 1h before upcoming sessions.
 * Call this via the /api/jobs/send-reminders endpoint (protected, admin only)
 * or wire it to a cron scheduler (e.g. node-cron, Vercel Cron, Render Cron).
 */

const Booking = require('../models/Booking');
const { createNotification } = require('../utils/notificationHelper');

const sendSessionReminders = async () => {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in1h  = new Date(now.getTime() +      60 * 60 * 1000);

    // Window: sessions happening between [target - 5min, target + 5min]
    const window = (target) => ({
        $gte: new Date(target.getTime() - 5 * 60 * 1000),
        $lte: new Date(target.getTime() + 5 * 60 * 1000)
    });

    const bookings24h = await Booking.find({
        status: 'approved',
        sessionDate: window(in24h),
        'reminders.sent24h': { $ne: true }
    }).populate('studentId tutorId', 'name');

    const bookings1h = await Booking.find({
        status: 'approved',
        sessionDate: window(in1h),
        'reminders.sent1h': { $ne: true }
    }).populate('studentId tutorId', 'name');

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

        // Mark as sent
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
