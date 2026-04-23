/**
 * Admin Razorpay Viewer
 * ---------------------
 * Calls the Razorpay API directly so admins can see real test/live payments,
 * orders, and refunds inside the Tutnet admin panel — no need to open
 * dashboard.razorpay.com at all.
 *
 * All routes admin-only. Returns raw Razorpay data (plus mode indicator).
 */

const Razorpay = require('razorpay');
const { safe500 } = require('../utils/responseHelpers');

let rz = null;
function getRz() {
    if (!rz) {
        rz = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
    }
    return rz;
}

const isMock = () => process.env.PAYMENT_MODE === 'mock';
const envLabel = () => {
    const k = process.env.RAZORPAY_KEY_ID || '';
    if (isMock()) return 'mock';
    if (k.startsWith('rzp_test_')) return 'test';
    if (k.startsWith('rzp_live_')) return 'live';
    return 'unknown';
};

// GET /api/admin/razorpay/status  — quick health ping
const status = async (_req, res) => {
    try {
        if (isMock()) {
            return res.json({ mode: 'mock', connected: false, message: 'PAYMENT_MODE=mock — Razorpay API is not being called.' });
        }
        // Lightweight API call to verify keys
        await getRz().orders.all({ count: 1 });
        res.json({ mode: envLabel(), connected: true, keyId: process.env.RAZORPAY_KEY_ID });
    } catch (err) {
        res.json({
            mode: envLabel(),
            connected: false,
            error: err?.error?.description || err.message
        });
    }
};

// GET /api/admin/razorpay/payments?count=20
const payments = async (req, res) => {
    try {
        if (isMock()) return res.json({ mode: 'mock', items: [] });
        const count = Math.min(parseInt(req.query.count, 10) || 20, 100);
        const data = await getRz().payments.all({ count });
        res.json({ mode: envLabel(), items: data.items || [] });
    } catch (err) {
        safe500(res, err, '[adminRazorpayPayments]');
    }
};

// GET /api/admin/razorpay/orders?count=20
const orders = async (req, res) => {
    try {
        if (isMock()) return res.json({ mode: 'mock', items: [] });
        const count = Math.min(parseInt(req.query.count, 10) || 20, 100);
        const data = await getRz().orders.all({ count });
        res.json({ mode: envLabel(), items: data.items || [] });
    } catch (err) {
        safe500(res, err, '[adminRazorpayOrders]');
    }
};

// GET /api/admin/razorpay/refunds?count=20
const refunds = async (req, res) => {
    try {
        if (isMock()) return res.json({ mode: 'mock', items: [] });
        const count = Math.min(parseInt(req.query.count, 10) || 20, 100);
        const data = await getRz().refunds.all({ count });
        res.json({ mode: envLabel(), items: data.items || [] });
    } catch (err) {
        safe500(res, err, '[adminRazorpayRefunds]');
    }
};

module.exports = { status, payments, orders, refunds };
