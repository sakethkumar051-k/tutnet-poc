import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import MockRazorpayCheckout from './MockRazorpayCheckout';
import MoneyFlowReceipt from './MoneyFlowReceipt';

/**
 * CheckoutModal
 *
 * Opens Razorpay checkout for an approved session booking.
 * Props:
 *   booking   - the booking object (must be approved, non-trial, not yet paid)
 *   onClose   - called when modal closes
 *   onSuccess - called after successful payment
 */
export default function CheckoutModal({ booking, onClose, onSuccess }) {
    const { showSuccess, showError } = useToast();
    const [loading, setLoading] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState(null); // null | 'success' | 'failed'
    const [mockOrder, setMockOrder] = useState(null);
    const [paidReceipt, setPaidReceipt] = useState(null);

    // Load Razorpay checkout.js script once
    useEffect(() => {
        if (document.getElementById('razorpay-checkout-js')) return;
        const script = document.createElement('script');
        script.id = 'razorpay-checkout-js';
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
    }, []);

    const handlePay = useCallback(async () => {
        setLoading(true);
        try {
            // Step 1: Create order on server
            const { data: orderData } = await api.post('/payments/create-order', {
                bookingId: booking._id
            });

            const {
                orderId,
                amount,
                currency,
                paymentId,
                keyId,
                prefill,
                notes
            } = orderData;

            // Step 2: Mock mode — open the fake Razorpay UI so user sees full flow
            if (keyId === 'mock_key') {
                setMockOrder({
                    orderId,
                    amount,
                    description: `${notes?.subject || booking.subject} session · ${notes?.tutorName || booking.tutorId?.name}`,
                    prefill
                });
                setLoading(false);
                return;
            }

            // Step 2: Open Razorpay checkout
            const options = {
                key: keyId,
                amount: amount * 100, // already in rupees from server, checkout expects paise
                currency,
                name: 'TutNet',
                description: `${notes?.subject || booking.subject} session with ${notes?.tutorName || booking.tutorId?.name}`,
                order_id: orderId,
                prefill: {
                    name: prefill?.name || '',
                    email: prefill?.email || ''
                },
                notes: {
                    bookingId: booking._id,
                    subject: notes?.subject || booking.subject
                },
                theme: { color: '#1939e5' },
                // Let Razorpay show all methods the account has enabled.
                // (UPI must be toggled ON at dashboard.razorpay.com/app/payment-methods)

                handler: async (response) => {
                    // Step 3: Verify on server (belt-and-suspenders, webhook is authoritative)
                    try {
                        await api.post('/payments/verify', {
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                            bookingId: booking._id
                        });
                        setPaymentStatus('success');
                        showSuccess('Payment successful!');
                        if (onSuccess) onSuccess();
                    } catch (err) {
                        // Webhook will still process — tell user to wait
                        console.error('[CheckoutModal] verify error:', err);
                        setPaymentStatus('success'); // optimistic — webhook confirms
                        showSuccess('Payment received — confirmation may take a moment.');
                        if (onSuccess) onSuccess();
                    }
                },

                modal: {
                    ondismiss: () => {
                        setLoading(false);
                    }
                }
            };

            if (!window.Razorpay) {
                showError('Payment gateway not loaded. Please refresh and try again.');
                setLoading(false);
                return;
            }

            const rzInstance = new window.Razorpay(options);

            rzInstance.on('payment.failed', async (response) => {
                console.error('[Razorpay] Payment failed:', response.error);
                setPaymentStatus('failed');
                showError(`Payment failed: ${response.error?.description || 'Unknown error'}`);
                setLoading(false);
            });

            rzInstance.open();
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to initiate payment';
            showError(msg);
            setLoading(false);
        }
    }, [booking, onSuccess, showSuccess, showError]);

    const tutorName = booking.tutorId?.name || 'your tutor';
    const subject = booking.subject || '';
    const sessionDate = booking.sessionDate
        ? new Date(booking.sessionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : booking.preferredSchedule || 'TBD';

    return (
        <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white rounded-3xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)] w-full max-w-[440px] max-h-[min(92vh,900px)] overflow-y-auto">
                {paymentStatus === 'success' ? (
                    <div className="p-7">
                        <div className="text-center mb-5">
                            <div className="w-14 h-14 rounded-full bg-lime/30 flex items-center justify-center mx-auto mb-3">
                                <svg className="w-7 h-7 text-navy-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-extrabold text-navy-950 tracking-tight">Payment successful</h3>
                            <p className="text-sm text-gray-500 mt-1">Your session with {tutorName} is confirmed.</p>
                        </div>

                        {paidReceipt && (
                            <MoneyFlowReceipt
                                grossAmount={paidReceipt.amount}
                                commissionRate={paidReceipt.commissionRate}
                                commissionAmount={paidReceipt.commissionAmount}
                                tutorShare={paidReceipt.amount - paidReceipt.commissionAmount}
                                appliedCredits={0}
                                tutorName={tutorName}
                                mode="session"
                            />
                        )}

                        <button onClick={onClose}
                            className="mt-6 w-full py-3 bg-navy-950 hover:bg-navy-900 text-white text-sm font-bold rounded-full transition-colors">
                            Done
                        </button>
                    </div>
                ) : paymentStatus === 'failed' ? (
                    <div className="text-center py-6 px-6">
                        <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-7 h-7 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-extrabold text-navy-950 tracking-tight">Payment failed</h3>
                        <p className="text-sm text-gray-500 mt-2">Please try again with a different method.</p>
                        <div className="flex gap-3 justify-center mt-6">
                            <button onClick={onClose}
                                className="px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-full hover:bg-gray-50 transition-colors">
                                Cancel
                            </button>
                            <button onClick={() => { setPaymentStatus(null); setLoading(false); }}
                                className="px-5 py-2.5 bg-lime hover:bg-lime-light text-navy-950 text-sm font-bold rounded-full transition-colors">
                                Try again
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-7">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-5">
                            <div>
                                <p className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Checkout</p>
                                <h3 className="text-xl font-extrabold text-navy-950 tracking-tight mt-1">Complete payment</h3>
                                <p className="text-xs text-gray-500 mt-1">Secure checkout via Razorpay</p>
                            </div>
                            <button onClick={onClose}
                                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Summary */}
                        <div className="bg-[#f7f7f7] rounded-2xl p-4 mb-5 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Tutor</span>
                                <span className="font-semibold text-navy-950">{tutorName}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Subject</span>
                                <span className="font-semibold text-navy-950">{subject}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Session date</span>
                                <span className="font-semibold text-navy-950">{sessionDate}</span>
                            </div>
                            <div className="pt-3 mt-2 border-t border-gray-200 flex items-center justify-between">
                                <span className="text-sm font-bold text-navy-950">Total</span>
                                <AmountDisplay bookingId={booking._id} />
                            </div>
                        </div>

                        {/* Security note */}
                        <p className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-5">
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Secured by Razorpay. Tutnet never stores your card details.
                        </p>

                        <button
                            onClick={handlePay}
                            disabled={loading}
                            className="w-full py-3 bg-lime hover:bg-lime-light text-navy-950 text-sm font-bold rounded-full transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading && (
                                <span className="w-4 h-4 border-2 border-navy-950/30 border-t-navy-950 rounded-full animate-spin" />
                            )}
                            {loading ? 'Opening checkout…' : 'Pay with Razorpay'}
                        </button>
                    </div>
                )}
            </div>

            {/* Mock Razorpay gateway (only in mock mode) */}
            {mockOrder && (
                <MockRazorpayCheckout
                    amount={mockOrder.amount}
                    orderId={mockOrder.orderId}
                    description={mockOrder.description}
                    prefill={mockOrder.prefill}
                    onDismiss={() => setMockOrder(null)}
                    onSuccess={async (rz) => {
                        try {
                            await api.post('/payments/verify', {
                                razorpayOrderId: rz.razorpay_order_id,
                                razorpayPaymentId: rz.razorpay_payment_id,
                                razorpaySignature: rz.razorpay_signature,
                                bookingId: booking._id
                            });
                        } catch (_) { /* webhook catches up */ }
                        // Build the money-flow receipt from booking's commission snapshot if present
                        const commissionRate = booking.commissionRate || 25;
                        const commissionAmount = booking.commissionAmount ?? Math.round(mockOrder.amount * commissionRate / 100);
                        setPaidReceipt({ amount: mockOrder.amount, commissionRate, commissionAmount });
                        setMockOrder(null);
                        setPaymentStatus('success');
                        showSuccess('Payment successful!');
                        if (onSuccess) onSuccess();
                    }}
                />
            )}
        </div>
    );
}

/** Async sub-component that fetches and displays the amount for the booking */
function AmountDisplay({ bookingId }) {
    const [amount, setAmount] = useState(null);
    const [tried, setTried] = useState(false);

    useEffect(() => {
        api.get(`/payments/booking/${bookingId}`)
            .then(({ data }) => {
                if (data.payment?.amount) setAmount(data.payment.amount);
                // payment exists but no amount yet — will be populated when order is created
            })
            .catch(() => {})
            .finally(() => setTried(true));
    }, [bookingId]);

    if (!tried) return <span className="text-sm text-gray-500">Calculating…</span>;
    if (amount === null) return <span className="text-sm text-gray-500">See checkout</span>;
    return <span className="text-xl font-extrabold text-royal tracking-tight">₹{amount.toLocaleString('en-IN')}</span>;
}
