const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const TutorProfile = require('../models/TutorProfile');
const User = require('../models/User');
const { createNotification } = require('../utils/notificationHelper');
const { safe500, isValidObjectId } = require('../utils/responseHelpers');

// ---------------------------------------------------------------------------
// Mock mode — set PAYMENT_MODE=mock in .env to bypass Razorpay entirely.
// Every order auto-succeeds. Safe for dev/testing without real API keys.
// ---------------------------------------------------------------------------
const MOCK_MODE = process.env.PAYMENT_MODE === 'mock';
if (MOCK_MODE) {
    console.log('[payments] Running in MOCK mode — Razorpay calls are simulated');
} else {
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    const hasSecret = !!process.env.RAZORPAY_KEY_SECRET;
    const hasWebhook = !!process.env.RAZORPAY_WEBHOOK_SECRET && process.env.RAZORPAY_WEBHOOK_SECRET !== 'replace_me_after_adding_webhook_in_dashboard';
    const env = keyId.startsWith('rzp_test_') ? 'TEST' : keyId.startsWith('rzp_live_') ? 'LIVE' : 'UNKNOWN';
    console.log(`[payments] Razorpay ${env} mode | key=${keyId ? 'loaded' : 'MISSING'} secret=${hasSecret ? 'loaded' : 'MISSING'} webhook=${hasWebhook ? 'loaded' : 'pending'}`);
}

// ---------------------------------------------------------------------------
// Razorpay client — initialised lazily so a missing key doesn't crash startup
// ---------------------------------------------------------------------------
let razorpay = null;
function getRazorpay() {
    if (!razorpay) {
        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!keyId || !keySecret) {
            throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in .env');
        }
        razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    }
    return razorpay;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Amount in paise (Razorpay expects smallest unit) */
const toPaise = (amount) => Math.round(amount * 100);

/** Verify Razorpay webhook signature. Returns false (not throw) if secret absent so we don't crash production. */
function verifyWebhookSignature(rawBody, signature) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret || secret === 'replace_me_after_adding_webhook_in_dashboard') {
        console.warn('[webhook] RAZORPAY_WEBHOOK_SECRET not configured — rejecting webhook');
        return false;
    }
    try {
        const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
        const a = Buffer.from(expected);
        const b = Buffer.from(signature);
        if (a.length !== b.length) return false;
        return crypto.timingSafeEqual(a, b);
    } catch (err) {
        console.error('[webhook] signature verification failed:', err.message);
        return false;
    }
}

/** Verify payment signature from checkout callback */
function verifyPaymentSignature(orderId, paymentId, signature) {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const body = `${orderId}|${paymentId}`;
    const expected = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// ---------------------------------------------------------------------------
// @desc  Create Razorpay order for a booking (student initiates checkout)
// @route POST /api/payments/create-order
// @access Private (Student)
// ---------------------------------------------------------------------------
const createOrder = async (req, res) => {
    try {
        const { bookingId } = req.body;

        if (!bookingId || !isValidObjectId(bookingId)) {
            return res.status(400).json({ message: 'Valid bookingId is required' });
        }

        const booking = await Booking.findById(bookingId)
            .populate('tutorId', 'name email')
            .populate('studentId', 'name email');

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Only the student of this booking can pay
        if (booking.studentId._id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to pay for this booking' });
        }

        // Only approved bookings need payment (trials are free)
        if (booking.status !== 'approved') {
            return res.status(400).json({ message: 'Only approved bookings can be paid' });
        }

        if (booking.bookingCategory === 'trial') {
            return res.status(400).json({ message: 'Trial sessions are free — no payment required' });
        }

        // Check if already paid
        if (booking.isPaid) {
            return res.status(400).json({ message: 'This booking has already been paid' });
        }

        // Check for an existing incomplete order for this booking
        const existingPayment = await Payment.findOne({
            bookingId,
            status: 'created',
            razorpayOrderId: { $exists: true }
        });
        if (existingPayment) {
            // Return the existing order so the client can reopen checkout
            return res.json({
                orderId: existingPayment.razorpayOrderId,
                amount: existingPayment.amount,
                currency: existingPayment.currency,
                paymentId: existingPayment._id,
                keyId: process.env.RAZORPAY_KEY_ID
            });
        }

        // Determine amount from tutor's hourly rate
        const tutorProfile = await TutorProfile.findOne({ userId: booking.tutorId._id });
        const hourlyRate = tutorProfile?.hourlyRate || 0;
        if (hourlyRate <= 0) {
            return res.status(400).json({ message: 'Tutor has not set a valid hourly rate' });
        }

        // ── MOCK MODE ──────────────────────────────────────────────────────────
        if (MOCK_MODE) {
            const mockOrderId = `mock_order_${Date.now()}`;
            const payment = await Payment.create({
                studentId: booking.studentId._id,
                tutorId: booking.tutorId._id,
                bookingId: booking._id,
                amount: hourlyRate,
                currency: 'INR',
                status: 'created',
                paymentMethod: 'online',
                razorpayOrderId: mockOrderId
            });
            return res.status(201).json({
                orderId: mockOrderId,
                amount: hourlyRate,
                currency: 'INR',
                paymentId: payment._id,
                keyId: 'mock_key',
                mock: true,
                prefill: { name: booking.studentId.name, email: booking.studentId.email },
                notes: { subject: booking.subject, tutorName: booking.tutorId.name }
            });
        }
        // ── END MOCK ───────────────────────────────────────────────────────────

        const rz = getRazorpay();
        const receipt = `tutnet_${booking._id.toString().slice(-8)}_${Date.now().toString().slice(-6)}`;

        let order;
        try {
            order = await rz.orders.create({
                amount: toPaise(hourlyRate),
                currency: 'INR',
                receipt,
                notes: {
                    bookingId: booking._id.toString(),
                    studentName: booking.studentId.name,
                    tutorName: booking.tutorId.name,
                    subject: booking.subject
                }
            });
        } catch (razorpayErr) {
            const rzDesc = razorpayErr?.error?.description || razorpayErr?.message || 'Unknown Razorpay error';
            console.error('[createOrder] Razorpay order.create failed:', rzDesc);
            if (rzDesc.toLowerCase().includes('authentication')) {
                return res.status(503).json({
                    message: 'Payment gateway is not configured correctly. Please contact support.',
                    code: 'PAYMENT_GATEWAY_AUTH',
                    detail: 'RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing or invalid on the server.'
                });
            }
            return res.status(502).json({
                message: `Payment gateway rejected the request: ${rzDesc}`,
                code: 'PAYMENT_GATEWAY_ERROR'
            });
        }

        // Persist the order record
        const payment = await Payment.create({
            studentId: booking.studentId._id,
            tutorId: booking.tutorId._id,
            bookingId: booking._id,
            amount: hourlyRate,
            currency: 'INR',
            status: 'created',
            paymentMethod: 'online',
            razorpayOrderId: order.id
        });

        return res.status(201).json({
            orderId: order.id,
            amount: hourlyRate,
            currency: 'INR',
            paymentId: payment._id,
            keyId: process.env.RAZORPAY_KEY_ID,
            prefill: {
                name: booking.studentId.name,
                email: booking.studentId.email
            },
            notes: {
                subject: booking.subject,
                tutorName: booking.tutorId.name
            }
        });
    } catch (err) {
        return safe500(res, err, '[createOrder]');
    }
};

// ---------------------------------------------------------------------------
// @desc  Verify payment after Razorpay checkout succeeds client-side
//        This is a belt-and-suspenders check — the webhook is authoritative,
//        but this gives the student immediate UI feedback.
// @route POST /api/payments/verify
// @access Private (Student)
// ---------------------------------------------------------------------------
const verifyPayment = async (req, res) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId } = req.body;

        if (!razorpayOrderId || !bookingId) {
            return res.status(400).json({ message: 'razorpayOrderId and bookingId are required' });
        }

        // ── MOCK MODE ──────────────────────────────────────────────────────────
        if (MOCK_MODE) {
            const payment = await Payment.findOne({ razorpayOrderId });
            if (payment && payment.status !== 'completed') {
                payment.razorpayPaymentId = `mock_pay_${Date.now()}`;
                payment.razorpaySignature = 'mock_signature';
                payment.status = 'completed';
                payment.paidAt = new Date();
                await payment.save();
                await Booking.findByIdAndUpdate(bookingId, { isPaid: true });
                const booking = await Booking.findById(bookingId)
                    .populate('studentId', 'name')
                    .populate('tutorId', 'name');
                if (booking) {
                    await createNotification({
                        userId: booking.tutorId._id,
                        type: 'payment_received',
                        title: 'Payment Received',
                        message: `${booking.studentId.name} paid ₹${payment.amount} for the ${booking.subject} session.`,
                        link: '/tutor-dashboard?tab=sessions',
                        bookingId: booking._id
                    });
                    await createNotification({
                        userId: booking.studentId._id,
                        type: 'payment_success',
                        title: 'Payment Successful',
                        message: `Your payment of ₹${payment.amount} for the ${booking.subject} session with ${booking.tutorId.name} was successful.`,
                        link: '/student-dashboard?tab=sessions',
                        bookingId: booking._id
                    });
                }
            }
            return res.json({ message: 'Mock payment verified successfully', status: 'completed' });
        }
        // ── END MOCK ───────────────────────────────────────────────────────────

        if (!razorpayPaymentId || !razorpaySignature) {
            return res.status(400).json({ message: 'razorpayPaymentId and razorpaySignature are required' });
        }

        // Verify signature
        const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
        if (!isValid) {
            return res.status(400).json({ message: 'Invalid payment signature', code: 'INVALID_SIGNATURE' });
        }

        const payment = await Payment.findOne({ razorpayOrderId });
        if (!payment) {
            return res.status(404).json({ message: 'Payment record not found' });
        }

        // Ensure this student owns the payment
        if (payment.studentId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (
            payment.status === 'completed' &&
            payment.razorpayPaymentId &&
            razorpayPaymentId &&
            payment.razorpayPaymentId === razorpayPaymentId
        ) {
            return res.json({ message: 'Payment already verified', status: 'completed' });
        }

        // Update payment record (idempotent)
        if (payment.status !== 'completed') {
            payment.razorpayPaymentId = razorpayPaymentId;
            payment.razorpaySignature = razorpaySignature;
            payment.status = 'completed';
            payment.paidAt = new Date();
            await payment.save();

            // Mark booking as paid
            await Booking.findByIdAndUpdate(bookingId, { isPaid: true });

            // Notify tutor
            const booking = await Booking.findById(bookingId)
                .populate('studentId', 'name')
                .populate('tutorId', 'name');

            if (booking) {
                await createNotification({
                    userId: booking.tutorId._id,
                    type: 'payment_received',
                    title: 'Payment Received',
                    message: `${booking.studentId.name} paid ₹${payment.amount} for the ${booking.subject} session.`,
                    link: '/tutor-dashboard?tab=sessions',
                    bookingId: booking._id
                });
                await createNotification({
                    userId: booking.studentId._id,
                    type: 'payment_success',
                    title: 'Payment Successful',
                    message: `Your payment of ₹${payment.amount} for the ${booking.subject} session with ${booking.tutorId.name} was successful.`,
                    link: '/student-dashboard?tab=sessions',
                    bookingId: booking._id
                });
            }
        }

        return res.json({ message: 'Payment verified successfully', status: 'completed' });
    } catch (err) {
        return safe500(res, err, '[verifyPayment]');
    }
};

// ---------------------------------------------------------------------------
// @desc  Razorpay webhook — authoritative payment confirmation / failure
// @route POST /api/payments/webhook
// @access Public (Razorpay server — signature verified)
// NO protect middleware on this route
// ---------------------------------------------------------------------------
const handleWebhook = async (req, res) => {
    try {
        const signature = req.headers['x-razorpay-signature'];
        if (!signature) {
            return res.status(400).json({ message: 'Missing webhook signature' });
        }

        // req.rawBody is set by the express raw body middleware registered in server.js
        const isValid = verifyWebhookSignature(req.rawBody, signature);
        if (!isValid) {
            console.warn('[webhook] Invalid signature received');
            return res.status(400).json({ message: 'Invalid webhook signature' });
        }

        const event = req.body;
        const eventType = event.event;
        console.log(`[webhook] Event received: ${eventType}`);

        if (eventType === 'payment.captured') {
            const p = event.payload.payment.entity;
            const orderId = p.order_id;

            const payment = await Payment.findOne({ razorpayOrderId: orderId });
            if (!payment) {
                console.warn(`[webhook] No payment record for orderId: ${orderId}`);
                return res.json({ received: true });
            }

            if (payment.status === 'completed') {
                return res.json({ received: true }); // idempotent
            }

            payment.razorpayPaymentId = p.id;
            payment.status = 'completed';
            payment.paidAt = new Date(p.created_at * 1000);
            await payment.save();

            await Booking.findByIdAndUpdate(payment.bookingId, { isPaid: true });

            // Notify both parties
            const booking = await Booking.findById(payment.bookingId)
                .populate('studentId', 'name')
                .populate('tutorId', 'name');
            if (booking) {
                const subjectLabel = booking.plan
                    ? `${booking.plan.charAt(0).toUpperCase() + booking.plan.slice(1)} subscription`
                    : `${booking.subject} session`;
                await createNotification({
                    userId: booking.tutorId._id,
                    type: 'payment_received',
                    title: 'Payment Received',
                    message: `${booking.studentId.name} paid ₹${payment.amount} for the ${subjectLabel}.`,
                    link: '/tutor-dashboard?tab=sessions',
                    bookingId: booking._id
                }).catch(() => {});
                await createNotification({
                    userId: booking.studentId._id,
                    type: 'payment_success',
                    title: 'Payment successful',
                    message: `Your payment of ₹${payment.amount} for the ${subjectLabel} with ${booking.tutorId.name} is confirmed.`,
                    link: '/student-dashboard?tab=sessions',
                    bookingId: booking._id
                }).catch(() => {});
            }
        }

        if (eventType === 'payment.failed') {
            const p = event.payload.payment.entity;
            const orderId = p.order_id;

            const payment = await Payment.findOne({ razorpayOrderId: orderId });
            if (payment && payment.status !== 'completed') {
                payment.status = 'failed';
                await payment.save();

                const booking = await Booking.findById(payment.bookingId)
                    .populate('studentId', 'name')
                    .populate('tutorId', 'name');
                if (booking) {
                    await createNotification({
                        userId: booking.studentId._id,
                        type: 'payment_failed',
                        title: 'Payment Failed',
                        message: `Your payment for the ${booking.subject} session with ${booking.tutorId.name} failed. Please try again.`,
                        link: '/student-dashboard?tab=sessions',
                        bookingId: booking._id
                    });
                }
            }
        }

        if (eventType === 'refund.processed') {
            const r = event.payload.refund.entity;
            const payment = await Payment.findOne({ razorpayPaymentId: r.payment_id });
            if (payment) {
                payment.refundId = r.id;
                payment.refundAmount = r.amount / 100;
                payment.refundStatus = 'processed';
                payment.refundedAt = new Date(r.created_at * 1000);
                payment.status = payment.refundAmount >= payment.amount ? 'refunded' : 'partially_refunded';
                await payment.save();
            }
        }

        return res.json({ received: true });
    } catch (err) {
        console.error('[webhook] Error:', err.message);
        // Always return 200 to Razorpay — it will retry on non-2xx
        return res.status(200).json({ received: true });
    }
};

// ---------------------------------------------------------------------------
// @desc  Initiate a refund when a booking is cancelled
// @route POST /api/payments/refund/:bookingId
// @access Private (Student — own booking only)
// ---------------------------------------------------------------------------
const initiateRefund = async (req, res) => {
    try {
        const { bookingId } = req.params;
        if (!isValidObjectId(bookingId)) {
            return res.status(400).json({ message: 'Valid bookingId is required' });
        }

        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        if (booking.studentId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const payment = await Payment.findOne({
            bookingId,
            status: 'completed',
            refundStatus: 'none'
        });

        if (!payment) {
            return res.status(404).json({ message: 'No completed payment found for this booking, or refund already initiated' });
        }

        if (!payment.razorpayPaymentId) {
            return res.status(400).json({ message: 'Cannot refund — no Razorpay payment ID on record' });
        }

        const rz = getRazorpay();
        const refund = await rz.payments.refund(payment.razorpayPaymentId, {
            amount: toPaise(payment.amount),
            notes: { reason: req.body.reason || 'Booking cancelled' }
        });

        payment.refundId = refund.id;
        payment.refundStatus = 'initiated';
        payment.refundReason = req.body.reason || 'Booking cancelled';
        await payment.save();

        // Notify student
        await createNotification({
            userId: req.user.id,
            type: 'refund_initiated',
            title: 'Refund Initiated',
            message: `Your refund of ₹${payment.amount} has been initiated. It will reflect in 5-7 business days.`,
            link: '/student-dashboard?tab=sessions',
            bookingId
        });

        return res.json({ message: 'Refund initiated successfully', refundId: refund.id });
    } catch (err) {
        return safe500(res, err, '[initiateRefund]');
    }
};

// ---------------------------------------------------------------------------
// @desc  Get payment status for a booking (student checks after checkout)
// @route GET /api/payments/booking/:bookingId
// @access Private (Student or Tutor of that booking)
// ---------------------------------------------------------------------------
const getPaymentByBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        if (!isValidObjectId(bookingId)) {
            return res.status(400).json({ message: 'Valid bookingId required' });
        }

        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        // Only student or tutor of this booking can query
        const isStudent = booking.studentId.toString() === req.user.id;
        const isTutor = booking.tutorId.toString() === req.user.id;
        if (!isStudent && !isTutor) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const payment = await Payment.findOne({ bookingId }).sort({ createdAt: -1 });
        if (!payment) {
            return res.json({ status: 'unpaid', payment: null });
        }

        return res.json({ status: payment.status, payment });
    } catch (err) {
        return safe500(res, err, '[getPaymentByBooking]');
    }
};

// ---------------------------------------------------------------------------
// @desc  Tutor earnings summary
// @route GET /api/payments/tutor-earnings
// @access Private (Tutor)
// ---------------------------------------------------------------------------
const getTutorEarnings = async (req, res) => {
    try {
        const tutorId = req.user._id;
        const { period = 'all' } = req.query;

        const tutorProfile = await TutorProfile.findOne({ userId: tutorId });
        const hourlyRate = tutorProfile?.hourlyRate || 0;

        let dateFilter = {};
        const now = new Date();
        if (period === 'month') {
            dateFilter = { createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) } };
        } else if (period === 'week') {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            weekStart.setHours(0, 0, 0, 0);
            dateFilter = { createdAt: { $gte: weekStart } };
        } else if (period === 'year') {
            dateFilter = { createdAt: { $gte: new Date(now.getFullYear(), 0, 1) } };
        }

        const completedBookings = await Booking.find({
            tutorId,
            status: 'completed',
            bookingCategory: 'session',
            ...dateFilter
        }).populate('studentId', 'name email').sort({ createdAt: -1 });

        // Real confirmed payments via Razorpay
        const confirmedPayments = await Payment.find({
            tutorId,
            status: 'completed',
            ...dateFilter
        }).populate('bookingId').sort({ createdAt: -1 });

        const pendingPayments = await Payment.find({
            tutorId,
            status: { $in: ['created', 'pending'] },
            ...dateFilter
        });

        const confirmedEarnings = confirmedPayments.reduce((s, p) => s + p.amount, 0);
        const estimatedEarnings = completedBookings.reduce((s) => s + hourlyRate, 0);
        const pendingAmount = pendingPayments.reduce((s, p) => s + p.amount, 0);

        // Monthly breakdown (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyBookings = await Booking.find({
            tutorId,
            status: 'completed',
            bookingCategory: 'session',
            createdAt: { $gte: sixMonthsAgo }
        });

        const monthlyMap = {};
        monthlyBookings.forEach(b => {
            const key = `${b.createdAt.getFullYear()}-${String(b.createdAt.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyMap[key]) monthlyMap[key] = { sessions: 0, earnings: 0 };
            monthlyMap[key].sessions += 1;
            monthlyMap[key].earnings += hourlyRate;
        });
        const monthlyBreakdown = Object.entries(monthlyMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, data]) => ({ month, ...data }));

        return res.json({
            hourlyRate,
            totalSessions: completedBookings.length,
            confirmedEarnings,
            estimatedEarnings,
            pendingAmount,
            recentSessions: completedBookings.slice(0, 20),
            confirmedPayments: confirmedPayments.slice(0, 20),
            monthlyBreakdown
        });
    } catch (err) {
        return safe500(res, err, '[getTutorEarnings]');
    }
};

// ---------------------------------------------------------------------------
// @desc  Student payment history
// @route GET /api/payments/student-history
// @access Private (Student)
// ---------------------------------------------------------------------------
const getStudentPaymentHistory = async (req, res) => {
    try {
        const payments = await Payment.find({ studentId: req.user._id })
            .populate({ path: 'bookingId', populate: [{ path: 'tutorId', select: 'name' }] })
            .sort({ createdAt: -1 });

        return res.json(payments);
    } catch (err) {
        return safe500(res, err, '[getStudentPaymentHistory]');
    }
};

// ---------------------------------------------------------------------------
// @desc  Log a manual/cash payment (tutor)
// @route POST /api/payments/manual
// @access Private (Tutor)
// ---------------------------------------------------------------------------
const logManualPayment = async (req, res) => {
    try {
        const { bookingId, amount, paymentMethod, notes, transactionId } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ message: 'Valid amount is required' });

        let studentId = null;
        if (bookingId && isValidObjectId(bookingId)) {
            const booking = await Booking.findById(bookingId);
            if (booking) {
                if (booking.tutorId.toString() !== req.user.id) {
                    return res.status(403).json({ message: 'Not authorized to log payment for this booking' });
                }
                studentId = booking.studentId;
                await Booking.findByIdAndUpdate(bookingId, { isPaid: true });
            }
        }

        const payment = await Payment.create({
            tutorId: req.user._id,
            studentId: studentId || req.user._id, // fallback — not ideal but keeps model valid
            bookingId: bookingId || null,
            amount,
            paymentMethod: paymentMethod || 'cash',
            status: 'completed',
            paidAt: new Date(),
            notes,
            transactionId
        });

        return res.status(201).json(payment);
    } catch (err) {
        return safe500(res, err, '[logManualPayment]');
    }
};

module.exports = {
    createOrder,
    verifyPayment,
    handleWebhook,
    initiateRefund,
    getPaymentByBooking,
    getTutorEarnings,
    getStudentPaymentHistory,
    logManualPayment
};
