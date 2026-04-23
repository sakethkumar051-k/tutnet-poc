/**
 * Platform Controller — small cross-cutting endpoints that don't deserve
 * their own controller file: contact form, ICS calendar export, tutor
 * self-payout inbox.
 */

const Booking = require('../models/Booking');
const ContactMessage = require('../models/ContactMessage');
const PayoutLedger = require('../models/PayoutLedger');
const { safe500, sendError } = require('../utils/responseHelpers');

// ── POST /api/contact — public contact form ─────────────────────────────

const submitContact = async (req, res) => {
    try {
        const { name, email, phone, subject, message, sourceUrl } = req.body;
        if (!name || !email || !message) {
            return sendError(res, 400, 'Name, email, and message are required', 'VALIDATION');
        }
        if (String(message).length < 10) {
            return sendError(res, 400, 'Message is too short', 'VALIDATION');
        }
        const doc = await ContactMessage.create({
            name: String(name).trim().slice(0, 120),
            email: String(email).trim().toLowerCase().slice(0, 200),
            phone: String(phone || '').trim().slice(0, 30),
            subject: String(subject || '').trim().slice(0, 200),
            message: String(message).trim().slice(0, 4000),
            sourceUrl: String(sourceUrl || '').slice(0, 500),
            userId: req.user?._id || null
        });
        res.status(201).json({ ok: true, id: doc._id, receivedAt: doc.createdAt });
    } catch (err) {
        return safe500(res, err, '[submitContact]');
    }
};

// ── GET /api/admin/contact — admin inbox ────────────────────────────────

const adminListContact = async (req, res) => {
    try {
        const { status = 'all', limit = 100 } = req.query;
        const filter = {};
        if (status !== 'all') filter.status = status;
        const messages = await ContactMessage.find(filter)
            .sort({ createdAt: -1 })
            .limit(Math.min(parseInt(limit, 10) || 100, 500))
            .lean();
        res.json({ messages });
    } catch (err) {
        return safe500(res, err, '[adminListContact]');
    }
};

// ── PATCH /api/admin/contact/:id — admin updates status / note ──────────

const adminUpdateContact = async (req, res) => {
    try {
        const { status, adminNote } = req.body;
        const allowed = ['new', 'in_progress', 'resolved', 'spam'];
        const update = {};
        if (status && allowed.includes(status)) {
            update.status = status;
            if (status === 'resolved') {
                update.resolvedAt = new Date();
                update.resolvedBy = req.user._id;
            }
        }
        if (typeof adminNote === 'string') {
            update.adminNote = adminNote.slice(0, 1000);
        }
        const doc = await ContactMessage.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!doc) return sendError(res, 404, 'Contact message not found', 'NOT_FOUND');
        res.json({ message: doc });
    } catch (err) {
        return safe500(res, err, '[adminUpdateContact]');
    }
};

// ── GET /api/calendar/mine.ics — ICS export for logged-in user ──────────
// Each session = one VEVENT (VEVENT = one entry in a calendar).

function icsEscape(s = '') {
    return String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}
function icsDate(d) {
    // Format: YYYYMMDDTHHMMSSZ
    return new Date(d).toISOString().replace(/[-:.]/g, '').replace(/\d{3}Z$/, 'Z');
}

const icsExport = async (req, res) => {
    try {
        const uid = req.user._id;
        const role = req.user.role;
        const match = role === 'tutor'
            ? { tutorId: uid }
            : { studentId: uid };
        const bookings = await Booking.find({
            ...match,
            status: { $in: ['approved', 'completed'] },
            sessionDate: { $gte: new Date(Date.now() - 90 * 24 * 3600 * 1000) }
        })
            .sort({ sessionDate: 1 })
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email')
            .lean();

        const lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//TutNet//Session Calendar//EN',
            'CALSCALE:GREGORIAN',
            `X-WR-CALNAME:TutNet Sessions (${role})`
        ];

        const now = icsDate(new Date());
        for (const b of bookings) {
            if (!b.sessionDate) continue;
            const start = new Date(b.sessionDate);
            const end = new Date(start.getTime() + 60 * 60 * 1000); // 60 min default
            const tutorName = b.tutorId?.name || 'Tutor';
            const studentName = b.studentId?.name || 'Student';
            const summary = role === 'tutor'
                ? `${b.subject} with ${studentName}`
                : `${b.subject} with ${tutorName}`;
            const description = [
                `Booking category: ${b.bookingCategory || 'session'}`,
                `Status: ${b.status}`,
                b.sessionJoinUrl ? `Join: ${b.sessionJoinUrl}` : '',
                b.learningGoals ? `Goals: ${b.learningGoals}` : ''
            ].filter(Boolean).join('\\n');
            lines.push(
                'BEGIN:VEVENT',
                `UID:booking-${b._id}@tutnet`,
                `DTSTAMP:${now}`,
                `DTSTART:${icsDate(start)}`,
                `DTEND:${icsDate(end)}`,
                `SUMMARY:${icsEscape(summary)}`,
                `DESCRIPTION:${icsEscape(description)}`,
                b.sessionJoinUrl ? `URL:${b.sessionJoinUrl}` : '',
                'END:VEVENT'
            );
        }
        lines.push('END:VCALENDAR');

        const body = lines.filter(Boolean).join('\r\n');
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="tutnet-${role}-${uid}.ics"`);
        res.send(body);
    } catch (err) {
        return safe500(res, err, '[icsExport]');
    }
};

// ── GET /api/payouts/mine — tutor payout ledger ─────────────────────────

const myPayouts = async (req, res) => {
    try {
        if (req.user.role !== 'tutor') {
            return sendError(res, 403, 'Only tutors have payouts', 'FORBIDDEN');
        }
        const [ledger, summary] = await Promise.all([
            PayoutLedger.find({ tutorId: req.user._id })
                .sort({ periodStart: -1 })
                .limit(60)
                .lean(),
            PayoutLedger.aggregate([
                { $match: { tutorId: req.user._id } },
                { $group: {
                    _id: '$status',
                    total: { $sum: '$netPayable' },
                    count: { $sum: 1 },
                    reserve: { $sum: '$reserveHeld' }
                }}
            ])
        ]);
        const byStatus = Object.fromEntries(
            summary.map((s) => [s._id, { total: s.total, count: s.count, reserve: s.reserve }])
        );
        res.json({
            ledger,
            summary: {
                paidTotal:       byStatus.paid?.total       || 0,
                scheduledTotal:  byStatus.scheduled?.total  || 0,
                processingTotal: byStatus.processing?.total || 0,
                heldTotal:       byStatus.held?.total       || 0,
                totalReserveHeld: ledger.reduce((s, p) => s + (p.reserveHeld || 0), 0),
                count:           ledger.length
            }
        });
    } catch (err) {
        return safe500(res, err, '[myPayouts]');
    }
};

module.exports = {
    submitContact,
    adminListContact,
    adminUpdateContact,
    icsExport,
    myPayouts
};
