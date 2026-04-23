#!/usr/bin/env node
/**
 * Webhook tester — simulate Razorpay webhook events hitting your local server.
 *
 * Usage:
 *   node scripts/test-webhook.js                          # payment.captured on latest pending payment
 *   node scripts/test-webhook.js payment.failed           # simulate failure
 *   node scripts/test-webhook.js refund.processed         # simulate refund
 *   node scripts/test-webhook.js payment.captured <orderId>  # target specific order
 *
 * Requires:
 *   - Server running on http://localhost:5001
 *   - RAZORPAY_WEBHOOK_SECRET in server/.env (not the placeholder)
 *
 * What it does:
 *   1) Builds a Razorpay-format webhook payload
 *   2) Signs with HMAC-SHA256 using your webhook secret
 *   3) POSTs to http://localhost:5001/api/payments/webhook
 *   4) Reports the response + checks DB state
 */

require('dotenv').config();
const crypto = require('crypto');
const http = require('http');
const mongoose = require('mongoose');

const eventType = process.argv[2] || 'payment.captured';
const orderIdArg = process.argv[3] || null;

const c = {
    g: (s) => `\x1b[32m${s}\x1b[0m`,
    r: (s) => `\x1b[31m${s}\x1b[0m`,
    y: (s) => `\x1b[33m${s}\x1b[0m`,
    b: (s) => `\x1b[34m${s}\x1b[0m`,
    dim: (s) => `\x1b[2m${s}\x1b[0m`,
    bold: (s) => `\x1b[1m${s}\x1b[0m`
};

function buildPayload(event, orderId) {
    const now = Math.floor(Date.now() / 1000);
    const paymentId = 'pay_test_' + crypto.randomBytes(8).toString('hex');
    if (event === 'payment.captured') {
        return {
            entity: 'event', account_id: 'acc_test', event: 'payment.captured',
            contains: ['payment'], created_at: now,
            payload: {
                payment: {
                    entity: {
                        id: paymentId, entity: 'payment',
                        amount: 1200000, currency: 'INR', status: 'captured',
                        order_id: orderId, method: 'upi',
                        email: 'test@tutnet.in', contact: '+919999999999',
                        created_at: now
                    }
                }
            }
        };
    }
    if (event === 'payment.failed') {
        return {
            entity: 'event', account_id: 'acc_test', event: 'payment.failed',
            contains: ['payment'], created_at: now,
            payload: {
                payment: {
                    entity: {
                        id: paymentId, entity: 'payment',
                        amount: 1200000, currency: 'INR', status: 'failed',
                        order_id: orderId, method: 'card',
                        error_code: 'BAD_REQUEST_ERROR',
                        error_description: 'Payment failed (simulated by test script)',
                        created_at: now
                    }
                }
            }
        };
    }
    if (event === 'refund.processed') {
        return {
            entity: 'event', account_id: 'acc_test', event: 'refund.processed',
            contains: ['refund'], created_at: now,
            payload: {
                refund: {
                    entity: {
                        id: 'rfnd_test_' + crypto.randomBytes(8).toString('hex'),
                        entity: 'refund', amount: 1200000, currency: 'INR',
                        payment_id: paymentId, status: 'processed',
                        created_at: now
                    }
                }
            }
        };
    }
    throw new Error(`Unknown event: ${event}`);
}

async function main() {
    console.log(c.bold('\n━━━ Webhook test ━━━'));
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret || secret === 'replace_me_after_adding_webhook_in_dashboard') {
        console.log(c.r('✗ RAZORPAY_WEBHOOK_SECRET is not set in server/.env'));
        console.log(c.dim('  Pick any strong random string (e.g. "tutnet_test_wh_9xK2mPqR7wLs3nY")'));
        console.log(c.dim('  and set RAZORPAY_WEBHOOK_SECRET=<same-string> in server/.env. Then restart server.'));
        process.exit(1);
    }

    // Resolve order ID: use arg, or grab the most recent pending Payment from DB
    let orderId = orderIdArg;
    let booking = null;
    let paymentRow = null;
    if (!orderId) {
        await mongoose.connect(process.env.MONGODB_URI);
        const Payment = require('../models/Payment');
        const Booking = require('../models/Booking');
        paymentRow = await Payment.findOne({ status: 'created' }).sort({ createdAt: -1 });
        if (!paymentRow) {
            console.log(c.y('⚠ No pending Payment row found in DB.'));
            console.log(c.dim('  Subscribe or start a checkout first to create one, or pass an orderId:'));
            console.log(c.dim('    node scripts/test-webhook.js ' + eventType + ' order_XXX'));
            await mongoose.disconnect();
            process.exit(1);
        }
        orderId = paymentRow.razorpayOrderId;
        booking = await Booking.findById(paymentRow.bookingId).lean().catch(() => null);
        await mongoose.disconnect();
    }

    const payload = buildPayload(eventType, orderId);
    const body = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

    console.log('Event      :', c.b(eventType));
    console.log('Target order:', orderId);
    if (booking) console.log('Booking    :', booking._id, '·', booking.subject, '·', booking.status);
    console.log('Signature  :', signature.slice(0, 24) + '…');
    console.log('');

    await new Promise((resolve) => {
        const req = http.request({
            method: 'POST',
            hostname: 'localhost',
            port: 5001,
            path: '/api/payments/webhook',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                'X-Razorpay-Signature': signature,
                'X-Razorpay-Event-Id': 'evt_test_' + crypto.randomBytes(8).toString('hex')
            }
        }, (res) => {
            let chunks = [];
            res.on('data', (d) => chunks.push(d));
            res.on('end', () => {
                const text = Buffer.concat(chunks).toString();
                if (res.statusCode === 200) {
                    console.log(c.g('✓ Webhook accepted by server'));
                    console.log(c.dim('  HTTP ' + res.statusCode + ' · body: ' + text));
                } else {
                    console.log(c.r('✗ Webhook rejected · HTTP ' + res.statusCode));
                    console.log(c.dim('  body: ' + text));
                }
                resolve();
            });
        });
        req.on('error', (err) => {
            console.log(c.r('✗ Could not reach http://localhost:5001/api/payments/webhook'));
            console.log(c.dim('  Is the server running? ' + err.message));
            resolve();
        });
        req.write(body);
        req.end();
    });

    // Re-query DB to show the effect
    await mongoose.connect(process.env.MONGODB_URI);
    const Payment = require('../models/Payment');
    const Booking = require('../models/Booking');
    const afterPayment = await Payment.findOne({ razorpayOrderId: orderId }).lean();
    if (afterPayment) {
        console.log('');
        console.log(c.bold('Payment record after webhook:'));
        console.log('  status       :', afterPayment.status);
        console.log('  razorpayPaymentId:', afterPayment.razorpayPaymentId || '—');
        if (afterPayment.paidAt) console.log('  paidAt       :', new Date(afterPayment.paidAt).toISOString());
        if (afterPayment.refundStatus && afterPayment.refundStatus !== 'none') {
            console.log('  refundStatus :', afterPayment.refundStatus, '· refundAmount: ₹' + (afterPayment.refundAmount || 0));
        }
        if (afterPayment.bookingId) {
            const bk = await Booking.findById(afterPayment.bookingId).lean();
            if (bk) console.log('  booking.isPaid:', bk.isPaid);
        }
    }
    await mongoose.disconnect();
    console.log('');
}

main().catch((err) => {
    console.error(c.r('✗ Test failed: ' + err.message));
    process.exit(1);
});
