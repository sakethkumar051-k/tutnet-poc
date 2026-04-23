/**
 * Subscription Controller
 * -----------------------
 * Handles parent subscription plans per REVENUE_MODEL.md §3:
 *   flex       — per-session, 10% surcharge (no commitment)
 *   monthly    — 16 sessions up to 20, prepaid monthly (main SKU)
 *   committed  — 5% off monthly, 3-month minimum commitment
 *   intensive  — 7% off, 24 sessions (up to 28), for exam/JEE parents
 *
 * Creates the Booking with plan + commission snapshot, then creates a
 * Razorpay order sized to plan price minus any applied parent credits.
 */

const Razorpay = require('razorpay');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const TutorProfile = require('../models/TutorProfile');
const User = require('../models/User');
const IncentiveLedger = require('../models/IncentiveLedger');
const { splitAmount } = require('../services/commissionTier.service');
const { pendingParentCredits } = require('../services/incentiveEngine.service');
const { createNotification } = require('../utils/notificationHelper');
const { safe500, isValidObjectId } = require('../utils/responseHelpers');

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

// ── Plan definitions ────────────────────────────────────────────────────

const PLANS = Object.freeze({
    flex: {
        key: 'flex',
        label: 'Flex',
        description: 'Pay per session. No commitment.',
        sessionsIncluded: 1,           // sold per session
        sessionAllowance: null,        // unlimited-as-booked
        surchargePct: 10,              // +10% on per-session rate
        discountPct: 0,
        commitmentMonths: 0,
        defaultSessionsPerMonth: 1
    },
    monthly: {
        key: 'monthly',
        label: 'Monthly',
        description: '16 sessions/month (up to 20). Best value for regular tuition.',
        sessionsIncluded: 16,
        sessionAllowance: 20,
        surchargePct: 0,
        discountPct: 0,
        commitmentMonths: 1,
        defaultSessionsPerMonth: 16
    },
    committed: {
        key: 'committed',
        label: 'Committed',
        description: '3-month commitment, 5% off. Priority support.',
        sessionsIncluded: 16,
        sessionAllowance: 20,
        surchargePct: 0,
        discountPct: 5,
        commitmentMonths: 3,
        defaultSessionsPerMonth: 16
    },
    intensive: {
        key: 'intensive',
        label: 'Intensive',
        description: '24 sessions/month (up to 28), 7% off. Board/JEE/NEET focus.',
        sessionsIncluded: 24,
        sessionAllowance: 28,
        surchargePct: 0,
        discountPct: 7,
        commitmentMonths: 3,
        defaultSessionsPerMonth: 24
    }
});

// ── Pricing calculator ──────────────────────────────────────────────────

function calculateInvoice({ hourlyRate, planKey }) {
    const plan = PLANS[planKey];
    if (!plan) throw new Error(`Unknown plan: ${planKey}`);

    const sessions = plan.defaultSessionsPerMonth;
    const baseAmount = hourlyRate * sessions;

    // Apply surcharge (flex) or discount (committed/intensive)
    const surcharge = plan.surchargePct ? Math.round((baseAmount * plan.surchargePct) / 100) : 0;
    const discount = plan.discountPct ? Math.round((baseAmount * plan.discountPct) / 100) : 0;

    const grossBeforeCredits = baseAmount + surcharge - discount;

    return {
        plan,
        hourlyRate,
        sessions,
        baseAmount,
        surcharge,
        discount,
        grossBeforeCredits
    };
}

// ── API: list available plans ───────────────────────────────────────────

const listPlans = async (_req, res) => {
    res.json({ plans: Object.values(PLANS) });
};

// ── API: pricing preview for a plan + tutor ─────────────────────────────

const previewPlan = async (req, res) => {
    try {
        const { tutorId, planKey } = req.query;
        if (!tutorId || !isValidObjectId(tutorId)) {
            return res.status(400).json({ message: 'Valid tutorId required' });
        }
        if (!PLANS[planKey]) {
            return res.status(400).json({ message: 'Invalid plan' });
        }
        const tutorProfile = await TutorProfile.findOne({ userId: tutorId });
        if (!tutorProfile) return res.status(404).json({ message: 'Tutor not found' });

        const hourlyRate = tutorProfile.hourlyRate;
        const invoice = calculateInvoice({ hourlyRate, planKey });

        // Include available platform credits the parent could apply
        const { total: availableCredits } = await pendingParentCredits(req.user._id);
        const creditsApplicable = Math.min(availableCredits, invoice.grossBeforeCredits);

        res.json({
            tutor: { id: tutorId, hourlyRate, tier: tutorProfile.tier },
            plan: invoice.plan,
            breakdown: {
                hourlyRate: invoice.hourlyRate,
                sessions: invoice.sessions,
                baseAmount: invoice.baseAmount,
                surcharge: invoice.surcharge,
                discount: invoice.discount,
                grossBeforeCredits: invoice.grossBeforeCredits,
                availableCredits,
                creditsApplicable,
                netPayable: invoice.grossBeforeCredits - creditsApplicable
            }
        });
    } catch (err) {
        return safe500(res, err, '[previewPlan]');
    }
};

// ── API: create subscription booking + Razorpay order ───────────────────

const createSubscriptionBooking = async (req, res) => {
    try {
        const { tutorId, planKey, subject, preferredSchedule, applyCredits = true } = req.body;
        if (!tutorId || !isValidObjectId(tutorId)) {
            return res.status(400).json({ message: 'Valid tutorId required' });
        }
        if (!PLANS[planKey]) {
            return res.status(400).json({ message: 'Invalid plan' });
        }
        const student = await User.findById(req.user._id);
        if (!student) return res.status(404).json({ message: 'Student not found' });
        const tutorUser = await User.findById(tutorId);
        if (!tutorUser) return res.status(404).json({ message: 'Tutor not found' });
        const tutorProfile = await TutorProfile.findOne({ userId: tutorId });
        if (!tutorProfile) return res.status(404).json({ message: 'Tutor profile not found' });

        // 1. Compute pricing
        const invoice = calculateInvoice({ hourlyRate: tutorProfile.hourlyRate, planKey });

        // 2. Commission snapshot (tier-aware)
        const commission = splitAmount({
            grossAmount: invoice.grossBeforeCredits,
            tutorTier: tutorProfile.tier || 'starter'
        });

        // 3. Apply available parent credits
        const appliedCreditsAmount = applyCredits ? 0 : 0; // resolved below
        const { total: availableCredits, rows: creditRows } = await pendingParentCredits(req.user._id);
        const creditsApplicable = applyCredits ? Math.min(availableCredits, invoice.grossBeforeCredits) : 0;
        const netPayable = invoice.grossBeforeCredits - creditsApplicable;

        // 4. Create the Booking
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        const booking = await Booking.create({
            studentId: req.user._id,
            tutorId,
            subject: subject || (tutorProfile.subjects?.[0] || 'General'),
            preferredSchedule: preferredSchedule || `${invoice.plan.label} plan`,
            bookingCategory: 'session',
            status: 'approved',               // subscriptions are auto-approved on payment
            plan: planKey,
            sessionAllowance: invoice.plan.sessionAllowance,
            sessionsConsumed: 0,
            planPeriodStart: now,
            planPeriodEnd: periodEnd,
            commissionRate: commission.rate,
            commissionAmount: commission.commissionAmount,
            tutorTierAtBooking: commission.tier,
            lockedHourlyRate: tutorProfile.hourlyRate,
            priceLockedAt: now,
            appliedCreditsAmount: creditsApplicable,
            appliedCreditsReasons: creditRows.map((r) => r.kind)
        });

        // 5. Mark credit rows as applied (link to the booking) — only if actually applied
        if (creditsApplicable > 0) {
            let remaining = creditsApplicable;
            for (const row of creditRows) {
                if (remaining <= 0) break;
                row.status = 'applied';
                row.appliedAt = new Date();
                row.trigger.bookingId = booking._id;
                await row.save();
                remaining -= row.amount;
            }
        }

        // 6. Create Razorpay order (or mock)
        if (netPayable === 0) {
            // Fully covered by credits — mark paid immediately
            await Payment.create({
                studentId: req.user._id,
                tutorId,
                bookingId: booking._id,
                amount: 0,
                currency: 'INR',
                status: 'completed',
                paymentMethod: 'online',
                paidAt: new Date(),
                razorpayOrderId: `credit_only_${booking._id}`
            });
            booking.isPaid = true;
            await booking.save();
            return res.status(201).json({
                bookingId: booking._id,
                orderId: null,
                fullyCovered: true,
                invoice: { ...invoice, commission, appliedCredits: creditsApplicable, netPayable: 0 }
            });
        }

        if (MOCK_MODE) {
            const mockOrderId = `mock_order_${Date.now()}`;
            const payment = await Payment.create({
                studentId: req.user._id,
                tutorId,
                bookingId: booking._id,
                amount: netPayable,
                currency: 'INR',
                status: 'created',
                paymentMethod: 'online',
                razorpayOrderId: mockOrderId
            });
            return res.status(201).json({
                bookingId: booking._id,
                orderId: mockOrderId,
                amount: netPayable,
                currency: 'INR',
                paymentId: payment._id,
                keyId: 'mock_key',
                mock: true,
                invoice: { ...invoice, commission, appliedCredits: creditsApplicable, netPayable },
                prefill: { name: student.name, email: student.email }
            });
        }

        const rz = getRazorpay();
        const receipt = `sub_${booking._id.toString().slice(-8)}_${Date.now().toString().slice(-6)}`;
        let order;
        try {
            order = await rz.orders.create({
                amount: Math.round(netPayable * 100),
                currency: 'INR',
                receipt,
                notes: {
                    bookingId: booking._id.toString(),
                    plan: planKey,
                    tutorId: tutorId.toString(),
                    studentName: student.name
                }
            });
        } catch (razorpayErr) {
            // Roll back the booking we just created
            await Booking.findByIdAndDelete(booking._id).catch(() => {});
            // Re-issue any credit rows we applied
            if (creditsApplicable > 0) {
                for (const row of creditRows) {
                    row.status = 'accrued';
                    row.appliedAt = undefined;
                    await row.save().catch(() => {});
                }
            }
            const rzDesc = razorpayErr?.error?.description || razorpayErr?.message || 'Unknown Razorpay error';
            const rzCode = razorpayErr?.statusCode || razorpayErr?.error?.code || 'RAZORPAY_ERROR';
            console.error('[createSubscriptionBooking] Razorpay order.create failed:', rzCode, rzDesc);
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

        const payment = await Payment.create({
            studentId: req.user._id,
            tutorId,
            bookingId: booking._id,
            amount: netPayable,
            currency: 'INR',
            status: 'created',
            paymentMethod: 'online',
            razorpayOrderId: order.id
        });

        // Notify tutor about new subscription request
        await createNotification({
            userId: tutorId,
            type: 'subscription_created',
            title: `New ${invoice.plan.label} subscription`,
            message: `${student.name} signed up for a ${invoice.plan.label} plan (${invoice.sessions} sessions).`,
            link: '/tutor-dashboard?tab=sessions',
            bookingId: booking._id
        }).catch(() => {});

        return res.status(201).json({
            bookingId: booking._id,
            orderId: order.id,
            amount: netPayable,
            currency: 'INR',
            paymentId: payment._id,
            keyId: process.env.RAZORPAY_KEY_ID,
            invoice: { ...invoice, commission, appliedCredits: creditsApplicable, netPayable },
            prefill: { name: student.name, email: student.email }
        });
    } catch (err) {
        return safe500(res, err, '[createSubscriptionBooking]');
    }
};

// ── API: get available credits for current parent ───────────────────────

const getMyCredits = async (req, res) => {
    try {
        const { total, rows } = await pendingParentCredits(req.user._id);
        res.json({ total, rows });
    } catch (err) {
        return safe500(res, err, '[getMyCredits]');
    }
};

module.exports = {
    PLANS,
    calculateInvoice,
    listPlans,
    previewPlan,
    createSubscriptionBooking,
    getMyCredits
};
