/**
 * Credits Top-Up Controller
 * -------------------------
 * Lets a parent buy platform credits directly.
 * Credits are stored as IncentiveLedger rows of kind `credit_topup` (settlementType: platform_credit),
 * so they flow through the same apply-on-next-invoice pipeline as referral/loyalty credits.
 *
 * Flow:
 *   1. POST /api/credits/topup/packs       → list available packs
 *   2. POST /api/credits/topup/create      → create Razorpay order
 *   3. POST /api/credits/topup/verify      → verify signature + credit wallet
 */

const crypto = require('crypto');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const IncentiveLedger = require('../models/IncentiveLedger');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { safe500 } = require('../utils/responseHelpers');

const MOCK_MODE = process.env.PAYMENT_MODE === 'mock';

let razorpay = null;
function getRazorpay() {
    if (!razorpay) {
        razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
    }
    return razorpay;
}

// ── Credit packs (priced to match typical session spend) ──────────────────
const PACKS = Object.freeze([
    { key: 'pack_500',  label: '₹500 pack',  price: 500,  credits: 500,  bonusPct: 0  },
    { key: 'pack_1000', label: '₹1,000 pack', price: 1000, credits: 1050, bonusPct: 5  },
    { key: 'pack_2500', label: '₹2,500 pack', price: 2500, credits: 2700, bonusPct: 8  },
    { key: 'pack_5000', label: '₹5,000 pack', price: 5000, credits: 5500, bonusPct: 10 }
]);

const listPacks = async (_req, res) => {
    res.json({ packs: PACKS });
};

// ── Create order ──────────────────────────────────────────────────────────

const createTopupOrder = async (req, res) => {
    try {
        const { packKey } = req.body;
        const pack = PACKS.find((p) => p.key === packKey);
        if (!pack) return res.status(400).json({ message: 'Invalid credit pack' });

        const student = await User.findById(req.user._id).select('name email');
        if (!student) return res.status(404).json({ message: 'User not found' });

        // Mock mode: skip Razorpay
        if (MOCK_MODE) {
            const mockOrderId = `mock_credit_order_${Date.now()}`;
            const payment = await Payment.create({
                studentId: req.user._id,
                tutorId: req.user._id, // self-reference for credit top-ups (not a tutor session)
                amount: pack.price,
                currency: 'INR',
                status: 'created',
                paymentMethod: 'online',
                razorpayOrderId: mockOrderId,
                notes: 'credits_topup_' + pack.key
            });
            return res.json({
                orderId: mockOrderId,
                amount: pack.price,
                credits: pack.credits,
                pack,
                paymentId: payment._id,
                keyId: 'mock_key',
                mock: true,
                prefill: { name: student.name, email: student.email }
            });
        }

        let order;
        try {
            order = await getRazorpay().orders.create({
                amount: Math.round(pack.price * 100),
                currency: 'INR',
                receipt: `credits_${req.user._id.toString().slice(-6)}_${Date.now().toString().slice(-6)}`,
                notes: {
                    type: 'credits_topup',
                    userId: String(req.user._id),
                    packKey: pack.key,
                    credits: String(pack.credits)
                }
            });
        } catch (err) {
            const desc = err?.error?.description || err?.message || 'Gateway error';
            if (String(desc).toLowerCase().includes('authentication')) {
                return res.status(503).json({ message: 'Payment gateway is temporarily unavailable. Please try again later.', code: 'PAYMENT_GATEWAY_AUTH' });
            }
            return res.status(502).json({ message: `Payment gateway rejected the request: ${desc}`, code: 'PAYMENT_GATEWAY_ERROR' });
        }

        const payment = await Payment.create({
            studentId: req.user._id,
            tutorId: req.user._id,
            amount: pack.price,
            currency: 'INR',
            status: 'created',
            paymentMethod: 'online',
            razorpayOrderId: order.id,
            notes: 'credits_topup_' + pack.key
        });

        res.json({
            orderId: order.id,
            amount: pack.price,
            credits: pack.credits,
            pack,
            paymentId: payment._id,
            keyId: process.env.RAZORPAY_KEY_ID,
            prefill: { name: student.name, email: student.email }
        });
    } catch (err) {
        return safe500(res, err, '[createTopupOrder]');
    }
};

// ── Verify + credit ───────────────────────────────────────────────────────

const verifyTopup = async (req, res) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, packKey } = req.body;
        const pack = PACKS.find((p) => p.key === packKey);
        if (!pack) return res.status(400).json({ message: 'Invalid credit pack' });

        const payment = await Payment.findOne({ razorpayOrderId });
        if (!payment) return res.status(404).json({ message: 'Payment record not found' });
        if (String(payment.studentId) !== String(req.user._id)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Mock mode bypass
        const isMock = razorpayPaymentId?.startsWith('mock_') || MOCK_MODE;
        if (!isMock) {
            const secret = process.env.RAZORPAY_KEY_SECRET;
            const body = `${razorpayOrderId}|${razorpayPaymentId}`;
            const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
            if (expected !== razorpaySignature) {
                return res.status(400).json({ message: 'Invalid payment signature', code: 'INVALID_SIGNATURE' });
            }
        }

        // Idempotency: if already credited, just return
        const existing = await IncentiveLedger.findOne({
            idempotencyKey: `credit_topup:${razorpayOrderId}`
        });
        if (existing) {
            return res.json({ message: 'Already credited', credits: pack.credits, status: 'already_processed' });
        }

        // Update payment
        if (payment.status !== 'completed') {
            payment.razorpayPaymentId = razorpayPaymentId;
            payment.razorpaySignature = razorpaySignature;
            payment.status = 'completed';
            payment.paidAt = new Date();
            await payment.save();
        }

        // Credit the wallet
        await IncentiveLedger.create({
            userId: req.user._id,
            userRole: 'student',
            kind: 'credit_topup',
            amount: pack.credits,
            settlementType: 'platform_credit',
            status: 'accrued',
            idempotencyKey: `credit_topup:${razorpayOrderId}`,
            trigger: {
                reason: `Credits top-up · ${pack.label} (${pack.bonusPct > 0 ? `+${pack.bonusPct}% bonus` : 'no bonus'})`
            },
            notes: `Paid ₹${pack.price}, credited ₹${pack.credits}`
        }).catch((err) => {
            // If duplicate key (race), that's fine — just log
            if (err.code !== 11000) throw err;
        });

        return res.json({
            message: 'Credits added to your wallet',
            credits: pack.credits,
            pack,
            status: 'completed'
        });
    } catch (err) {
        return safe500(res, err, '[verifyTopup]');
    }
};

module.exports = {
    PACKS,
    listPacks,
    createTopupOrder,
    verifyTopup
};
