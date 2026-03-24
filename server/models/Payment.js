const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    // Who paid and who receives
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    tutorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        index: true
    },

    // Amount
    amount: {
        type: Number,
        required: true,
        min: 1
    },
    currency: {
        type: String,
        default: 'INR'
    },

    // Lifecycle status
    // created  → order created on Razorpay, user hasn't paid yet
    // pending  → user initiated payment, waiting for webhook confirmation
    // completed → webhook confirmed payment captured
    // failed   → payment failed / webhook reported failure
    // refunded → full refund processed
    // partially_refunded → partial refund processed
    status: {
        type: String,
        enum: ['created', 'pending', 'completed', 'failed', 'refunded', 'partially_refunded'],
        default: 'created',
        index: true
    },

    paymentMethod: {
        type: String,
        enum: ['online', 'cash', 'bank_transfer', 'upi'],
        default: 'online'
    },

    // Razorpay gateway fields
    razorpayOrderId: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },
    razorpayPaymentId: {
        type: String,
        sparse: true,
        index: true
    },
    razorpaySignature: {
        type: String
    },

    // Refund tracking
    refundId: {
        type: String,
        sparse: true
    },
    refundStatus: {
        type: String,
        enum: ['none', 'initiated', 'processed', 'failed'],
        default: 'none'
    },
    refundAmount: {
        type: Number,
        default: 0
    },
    refundReason: {
        type: String,
        trim: true
    },
    refundedAt: {
        type: Date
    },

    paidAt: {
        type: Date
    },

    // Manual payment fields (cash / bank_transfer logged by tutor)
    transactionId: {
        type: String,
        trim: true
    },
    notes: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

paymentSchema.index({ studentId: 1, status: 1 });
paymentSchema.index({ tutorId: 1, status: 1 });
paymentSchema.index({ bookingId: 1, status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
