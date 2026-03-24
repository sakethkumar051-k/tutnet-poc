import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';

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

            // Step 2: Mock mode — skip the Razorpay overlay entirely
            if (keyId === 'mock_key') {
                await api.post('/payments/verify', {
                    razorpayOrderId: orderId,
                    razorpayPaymentId: `mock_pay_${Date.now()}`,
                    razorpaySignature: 'mock_signature',
                    bookingId: booking._id
                });
                setPaymentStatus('success');
                showSuccess('Payment successful! (mock mode)');
                if (onSuccess) onSuccess();
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
                theme: { color: '#4F46E5' },

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
            style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={{ background: 'var(--color-background-primary)', borderRadius: 'var(--border-radius-xl)', width: '100%', maxWidth: '420px', padding: '1.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>

                {paymentStatus === 'success' ? (
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-background-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                            </svg>
                        </div>
                        <h3 style={{ fontSize: 18, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>Payment successful</h3>
                        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
                            Your session with {tutorName} is confirmed. You'll receive a notification shortly.
                        </p>
                        <button
                            onClick={onClose}
                            style={{ padding: '0.625rem 1.5rem', background: 'var(--color-background-info)', color: 'var(--color-text-info)', borderRadius: 'var(--border-radius-md)', border: 'none', fontWeight: 500, cursor: 'pointer', fontSize: 14 }}
                        >
                            Done
                        </button>
                    </div>
                ) : paymentStatus === 'failed' ? (
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-background-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </div>
                        <h3 style={{ fontSize: 18, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>Payment failed</h3>
                        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
                            Something went wrong. Please try again.
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                            <button onClick={onClose} style={{ padding: '0.625rem 1rem', border: '1px solid var(--color-border-primary)', borderRadius: 'var(--border-radius-md)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
                            <button onClick={() => { setPaymentStatus(null); setLoading(false); }} style={{ padding: '0.625rem 1rem', background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 'var(--border-radius-md)', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>Try again</button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                            <div>
                                <h3 style={{ fontSize: 18, fontWeight: 500, color: 'var(--color-text-primary)', margin: 0 }}>Complete payment</h3>
                                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>Secure checkout via Razorpay</p>
                            </div>
                            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4 }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </div>

                        {/* Summary */}
                        <div style={{ background: 'var(--color-background-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: '1rem', marginBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Tutor</span>
                                <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>{tutorName}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Subject</span>
                                <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>{subject}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Session date</span>
                                <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500 }}>{sessionDate}</span>
                            </div>
                            <div style={{ borderTop: '1px solid var(--color-border-tertiary)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Total</span>
                                <AmountDisplay bookingId={booking._id} />
                            </div>
                        </div>

                        {/* Security note */}
                        <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                            Payments are processed securely by Razorpay. TutNet never stores your card details.
                        </p>

                        <button
                            onClick={handlePay}
                            disabled={loading}
                            style={{ width: '100%', padding: '0.75rem', background: loading ? '#A5B4FC' : '#4F46E5', color: '#fff', border: 'none', borderRadius: 'var(--border-radius-md)', fontWeight: 500, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.15s' }}
                        >
                            {loading && (
                                <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} />
                            )}
                            {loading ? 'Opening checkout...' : 'Pay with Razorpay'}
                        </button>

                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </>
                )}
            </div>
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

    // Fetch will also be triggered when Pay button creates the order; re-fetch on mount is enough
    if (!tried) return <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Calculating...</span>;
    if (amount === null) return <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>See checkout</span>;
    return <span style={{ fontSize: 18, fontWeight: 500, color: '#4F46E5' }}>₹{amount.toLocaleString('en-IN')}</span>;
}
