/**
 * Invoice Controller — streams a PDF receipt for a Payment.
 *
 * GET /api/payments/:id/invoice.pdf
 *   Auth: student (own payment) or admin. Tutors see their own earnings, not invoices.
 *
 * Layout: simple single-page invoice with TutNet header, parties, line items,
 * commission/reserve breakdown for transparency, and payment IDs. Generated
 * on-demand by pdfkit; nothing is cached on disk.
 */

const PDFDocument = require('pdfkit');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { safe500, sendError } = require('../utils/responseHelpers');

const inr = (n) => `Rs. ${(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const downloadInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const payment = await Payment.findById(id)
            .populate('studentId', 'name email phone location')
            .populate('tutorId', 'name email')
            .populate('bookingId', 'subject bookingCategory plan sessionDate commissionAmount commissionRate');
        if (!payment) return sendError(res, 404, 'Payment not found', 'NOT_FOUND');

        const isOwner = String(payment.studentId?._id || payment.studentId) === String(req.user._id);
        const isAdmin = req.user.role === 'admin';
        if (!isOwner && !isAdmin) {
            return sendError(res, 403, 'Not authorized', 'FORBIDDEN');
        }

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="tutnet-invoice-${payment._id}.pdf"`);
        doc.pipe(res);

        // ── Header ─────────────────────────────────────────────────────
        doc
            .fillColor('#0b1023').fontSize(24).font('Helvetica-Bold').text('TutNet', 50, 50)
            .fillColor('#6b7280').fontSize(10).font('Helvetica').text('West Hyderabad tutoring marketplace', 50, 78)
            .text('hello@tutnet.in  |  tutnet.in', 50, 92);

        doc
            .fontSize(20).fillColor('#0b1023').font('Helvetica-Bold').text('INVOICE', 400, 50, { align: 'right' })
            .fontSize(10).fillColor('#6b7280').font('Helvetica')
            .text(`Invoice ID: ${payment._id}`, 400, 78, { align: 'right' })
            .text(`Issued: ${fmtDate(payment.paidAt || payment.createdAt)}`, 400, 92, { align: 'right' });

        doc.moveTo(50, 120).lineTo(545, 120).strokeColor('#e5e7eb').lineWidth(1).stroke();

        // ── Billed to ──────────────────────────────────────────────────
        doc.fontSize(9).fillColor('#6b7280').font('Helvetica-Bold').text('BILLED TO', 50, 140);
        doc.fontSize(11).fillColor('#0b1023').font('Helvetica-Bold').text(payment.studentId?.name || '—', 50, 155);
        doc.fontSize(10).fillColor('#374151').font('Helvetica')
            .text(payment.studentId?.email || '', 50, 170)
            .text(payment.studentId?.phone || '', 50, 184);
        if (payment.studentId?.location) {
            const loc = [payment.studentId.location.area, payment.studentId.location.city, payment.studentId.location.pincode].filter(Boolean).join(', ');
            if (loc) doc.text(loc, 50, 198);
        }

        // ── Tutor ──────────────────────────────────────────────────────
        doc.fontSize(9).fillColor('#6b7280').font('Helvetica-Bold').text('TUTOR', 320, 140);
        doc.fontSize(11).fillColor('#0b1023').font('Helvetica-Bold').text(payment.tutorId?.name || '—', 320, 155);
        doc.fontSize(10).fillColor('#374151').font('Helvetica').text(payment.tutorId?.email || '', 320, 170);

        // ── Line items ─────────────────────────────────────────────────
        let y = 240;
        doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').lineWidth(1).stroke();
        y += 12;
        doc.fontSize(9).fillColor('#6b7280').font('Helvetica-Bold')
            .text('DESCRIPTION', 50, y)
            .text('CATEGORY', 300, y)
            .text('AMOUNT', 480, y, { width: 65, align: 'right' });
        y += 16;
        doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').lineWidth(1).stroke();
        y += 10;

        doc.fontSize(11).fillColor('#0b1023').font('Helvetica-Bold')
            .text(payment.bookingId?.subject || 'Tutoring session', 50, y, { width: 240 });
        doc.fontSize(10).fillColor('#6b7280').font('Helvetica')
            .text(payment.bookingId?.plan ? `${payment.bookingId.plan} plan` : 'session', 300, y);
        doc.fontSize(12).fillColor('#0b1023').font('Helvetica-Bold')
            .text(inr(payment.amount), 480, y, { width: 65, align: 'right' });

        y += 26;
        if (payment.bookingId?.sessionDate) {
            doc.fontSize(9).fillColor('#9ca3af').font('Helvetica')
                .text(`Session date: ${fmtDate(payment.bookingId.sessionDate)}`, 50, y);
            y += 14;
        }

        // ── Totals ─────────────────────────────────────────────────────
        y += 20;
        doc.moveTo(300, y).lineTo(545, y).strokeColor('#e5e7eb').lineWidth(1).stroke();
        y += 10;

        const rowRight = (label, value, bold = false) => {
            doc.fontSize(10).fillColor(bold ? '#0b1023' : '#374151').font(bold ? 'Helvetica-Bold' : 'Helvetica')
                .text(label, 300, y, { width: 160 })
                .text(value, 470, y, { width: 75, align: 'right' });
            y += 16;
        };

        rowRight('Subtotal', inr(payment.amount));
        if (payment.refundAmount > 0) rowRight('Refund', `- ${inr(payment.refundAmount)}`);
        rowRight('Net paid', inr((payment.amount || 0) - (payment.refundAmount || 0)), true);

        // Admin sees the full platform-commission breakdown
        if (isAdmin && payment.bookingId?.commissionAmount) {
            y += 6;
            doc.fontSize(8).fillColor('#9ca3af').font('Helvetica').text('Platform commission (admin only)', 300, y);
            y += 12;
            rowRight(`Commission (${payment.bookingId.commissionRate || 0}%)`, inr(payment.bookingId.commissionAmount));
        }

        // ── Payment details ────────────────────────────────────────────
        y += 24;
        doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').lineWidth(1).stroke();
        y += 14;
        doc.fontSize(9).fillColor('#6b7280').font('Helvetica-Bold').text('PAYMENT DETAILS', 50, y);
        y += 14;
        const kv = (k, v) => {
            doc.fontSize(10).fillColor('#6b7280').font('Helvetica').text(k, 50, y, { width: 150 });
            doc.fontSize(10).fillColor('#0b1023').font('Helvetica-Bold').text(v || '—', 200, y, { width: 345 });
            y += 14;
        };
        kv('Status', payment.status);
        kv('Method', payment.paymentMethod || 'online');
        kv('Razorpay Order ID', payment.razorpayOrderId || '—');
        kv('Razorpay Payment ID', payment.razorpayPaymentId || '—');
        if (payment.refundAmount > 0) {
            kv('Refund ID', payment.refundId || '—');
            kv('Refund status', payment.refundStatus);
            kv('Refund reason', payment.refundReason || '—');
        }

        // ── Footer ─────────────────────────────────────────────────────
        doc.fontSize(8).fillColor('#9ca3af').font('Helvetica').text(
            'This is a system-generated receipt. For support, email hello@tutnet.in with your Invoice ID.',
            50, 780, { width: 495, align: 'center' }
        );

        doc.end();
    } catch (err) {
        if (!res.headersSent) return safe500(res, err, '[downloadInvoice]');
    }
};

module.exports = { downloadInvoice };
