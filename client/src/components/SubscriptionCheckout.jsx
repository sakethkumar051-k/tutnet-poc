import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import MockRazorpayCheckout from './MockRazorpayCheckout';
import MoneyFlowReceipt from './MoneyFlowReceipt';

/**
 * SubscriptionCheckout
 * --------------------
 * The ONE checkout experience. Shows all 4 plans (flex / monthly / committed / intensive)
 * for the selected tutor, lets parent pick, shows live breakdown with credits applied,
 * and opens Razorpay (or mock) checkout.
 *
 * Props:
 *   tutor      — { _id, name, hourlyRate, tier?, subjects? }
 *   onClose    — called when modal closes
 *   onSuccess  — called on successful payment with { bookingId }
 */
export default function SubscriptionCheckout({ tutor, onClose, onSuccess }) {
    const { showSuccess, showError } = useToast();
    const [plans, setPlans] = useState([]);
    const [selectedPlan, setSelectedPlan] = useState('monthly');
    const [preview, setPreview] = useState(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState(null); // null | 'success' | 'failed'
    const [mockOrder, setMockOrder] = useState(null); // { orderId, amount, bookingId, invoice }
    const [lastInvoice, setLastInvoice] = useState(null);
    const [subject, setSubject] = useState(tutor?.subjects?.[0] || 'General');
    const [schedule, setSchedule] = useState('Weekday evenings');

    // Load Razorpay script once
    useEffect(() => {
        if (document.getElementById('razorpay-checkout-js')) return;
        const s = document.createElement('script');
        s.id = 'razorpay-checkout-js';
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.async = true;
        document.body.appendChild(s);
    }, []);

    // Load plan list
    useEffect(() => {
        api.get('/subscriptions/plans').then(({ data }) => setPlans(data.plans || [])).catch(() => {});
    }, []);

    // Load pricing preview whenever selection changes
    useEffect(() => {
        if (!tutor?._id || !selectedPlan) return;
        setLoadingPreview(true);
        api.get('/subscriptions/preview', { params: { tutorId: tutor._id, planKey: selectedPlan } })
            .then(({ data }) => setPreview(data))
            .catch(() => setPreview(null))
            .finally(() => setLoadingPreview(false));
    }, [tutor?._id, selectedPlan]);

    const handleSubscribe = useCallback(async () => {
        // Guard: we need a valid tutor id
        if (!tutor?._id) {
            showError('Tutor information is missing. Please refresh the page and try again.');
            return;
        }
        setProcessing(true);
        try {
            const { data } = await api.post('/subscriptions', {
                tutorId: tutor._id,
                planKey: selectedPlan,
                subject,
                preferredSchedule: schedule,
                applyCredits: true
            });

            // Fully covered by credits (no payment needed)
            if (data.fullyCovered) {
                setPaymentStatus('success');
                showSuccess('Subscription activated with your credits. No payment needed!');
                if (onSuccess) onSuccess({ bookingId: data.bookingId });
                return;
            }

            // Mock mode — open the fake Razorpay checkout UI instead of auto-succeeding
            if (data.keyId === 'mock_key') {
                setLastInvoice(data.invoice);
                setMockOrder({
                    orderId: data.orderId,
                    amount: data.amount,
                    bookingId: data.bookingId,
                    description: `${data.invoice?.plan?.label || selectedPlan} plan · ${tutor.name}`,
                    prefill: data.prefill
                });
                setProcessing(false);
                return;
            }

            // Real Razorpay test flow — ensure the SDK is loaded
            if (!window.Razorpay) {
                // Attempt to inject the script if missing
                await new Promise((resolve, reject) => {
                    const existing = document.getElementById('razorpay-checkout-js');
                    if (existing) { existing.addEventListener('load', resolve, { once: true }); existing.addEventListener('error', reject, { once: true }); return; }
                    const s = document.createElement('script');
                    s.id = 'razorpay-checkout-js';
                    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
                    s.async = true;
                    s.onload = resolve;
                    s.onerror = reject;
                    document.body.appendChild(s);
                });
                // Give the script a tick to initialize
                await new Promise((r) => setTimeout(r, 100));
            }
            if (!window.Razorpay) {
                showError('Payment gateway could not load. Check your internet and try again.');
                setProcessing(false);
                return;
            }
            if (!data.keyId || !data.orderId) {
                showError('Payment order could not be created. The platform may be in maintenance — please try again shortly.');
                setProcessing(false);
                return;
            }

            const options = {
                key: data.keyId,
                amount: Math.round(data.amount * 100),
                currency: data.currency || 'INR',
                name: 'Tutnet',
                description: `${data.invoice?.plan?.label || selectedPlan} plan · ${tutor.name}`,
                order_id: data.orderId,
                prefill: data.prefill || {},
                notes: { bookingId: data.bookingId, plan: selectedPlan },
                theme: { color: '#1939e5' },
                // Let Razorpay show all methods the account has enabled, in its default order.
                // (UPI must be enabled on the account at dashboard.razorpay.com/app/payment-methods)
                handler: async (response) => {
                    try {
                        await api.post('/payments/verify', {
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                            bookingId: data.bookingId
                        });
                        setPaymentStatus('success');
                        showSuccess('Payment successful! Your subscription is active.');
                        if (onSuccess) onSuccess({ bookingId: data.bookingId });
                    } catch (err) {
                        setPaymentStatus('success'); // webhook will still confirm
                        showSuccess('Payment received — confirmation may take a moment.');
                        if (onSuccess) onSuccess({ bookingId: data.bookingId });
                    }
                },
                modal: { ondismiss: () => setProcessing(false) }
            };

            const rz = new window.Razorpay(options);
            rz.on('payment.failed', (r) => {
                setPaymentStatus('failed');
                showError(`Payment failed: ${r?.error?.description || 'Unknown error'}`);
                setProcessing(false);
            });
            rz.open();
        } catch (err) {
            const code = err.response?.data?.code;
            const serverMsg = err.response?.data?.message
                || err.response?.data?.error?.message
                || err.message
                || 'Failed to create subscription';
            const fields = err.response?.data?.error?.fields;
            const detail = fields ? ' — ' + Object.entries(fields).map(([k, v]) => `${k}: ${(v || []).join(', ')}`).join('; ') : '';
            console.error('[SubscriptionCheckout] error:', err.response?.data || err);

            if (code === 'PAYMENT_GATEWAY_AUTH') {
                setPaymentStatus('gateway_unavailable');
            } else {
                showError(serverMsg + detail);
            }
            setProcessing(false);
        }
    }, [tutor, selectedPlan, subject, schedule, showSuccess, showError, onSuccess]);

    const currentPlan = plans.find((p) => p.key === selectedPlan);
    const tierBadge = useMemo(() => {
        if (!tutor?.tier) return null;
        const label = { starter: 'Starter', silver: 'Silver', gold: 'Gold', platinum: 'Platinum' }[tutor.tier];
        return label || null;
    }, [tutor]);

    // ── SUCCESS / FAILURE STATES ───────────────────────────────────────

    if (paymentStatus === 'success') {
        const inv = lastInvoice;
        const commissionAmount = inv?.commission?.commissionAmount ?? 0;
        const commissionRate = inv?.commission?.rate ?? 0;
        const tutorShare = inv?.commission?.tutorShare ?? 0;
        const grossAmount = inv?.grossBeforeCredits ?? 0;
        const applied = inv?.appliedCredits ?? 0;
        return (
            <Modal onClose={onClose} wide>
                <div className="p-7">
                    <div className="text-center mb-5">
                        <div className="w-14 h-14 rounded-full bg-lime/30 flex items-center justify-center mx-auto mb-3">
                            <svg className="w-7 h-7 text-navy-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-extrabold text-navy-950 tracking-tight">Subscription active</h3>
                        <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto leading-relaxed">
                            {currentPlan?.label} plan with {tutor.name} is live. Here's where your money went.
                        </p>
                    </div>

                    {inv && (
                        <MoneyFlowReceipt
                            grossAmount={grossAmount}
                            commissionRate={commissionRate}
                            commissionAmount={commissionAmount}
                            tutorShare={tutorShare}
                            appliedCredits={applied}
                            tutorName={tutor.name}
                            mode="subscription"
                        />
                    )}

                    <button onClick={onClose}
                        className="mt-6 w-full py-3 bg-navy-950 hover:bg-navy-900 text-white text-sm font-bold rounded-full transition-colors">
                        View my sessions
                    </button>
                </div>
            </Modal>
        );
    }
    if (paymentStatus === 'failed') {
        return (
            <Modal onClose={onClose}>
                <div className="text-center py-6">
                    <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-7 h-7 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-extrabold text-navy-950 tracking-tight">Payment failed</h3>
                    <p className="text-sm text-gray-500 mt-2">Please try again with a different method.</p>
                    <div className="flex gap-3 justify-center mt-6">
                        <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-full hover:bg-gray-50 transition-colors">Cancel</button>
                        <button onClick={() => setPaymentStatus(null)} className="px-5 py-2.5 bg-lime hover:bg-lime-light text-navy-950 text-sm font-bold rounded-full transition-colors">Try again</button>
                    </div>
                </div>
            </Modal>
        );
    }
    if (paymentStatus === 'gateway_unavailable') {
        return (
            <Modal onClose={onClose}>
                <div className="text-center py-6 px-4">
                    <div className="w-14 h-14 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-7 h-7 text-yellow-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-extrabold text-navy-950 tracking-tight">Payments are temporarily unavailable</h3>
                    <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto leading-relaxed">
                        We're experiencing a short issue with our payment gateway. Your booking is not lost — please try again in a few minutes.
                    </p>
                    <p className="text-xs text-gray-400 mt-3 max-w-xs mx-auto">
                        If the issue persists, reach us at <a href="mailto:support@tutnet.in" className="text-royal font-semibold">support@tutnet.in</a>.
                    </p>
                    <div className="flex gap-3 justify-center mt-6">
                        <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-full hover:bg-gray-50 transition-colors">Close</button>
                        <button onClick={() => setPaymentStatus(null)} className="px-5 py-2.5 bg-navy-950 hover:bg-navy-900 text-white text-sm font-bold rounded-full transition-colors">Try again</button>
                    </div>
                </div>
            </Modal>
        );
    }

    // ── MAIN CHECKOUT VIEW ─────────────────────────────────────────────

    return (
        <Modal onClose={onClose} wide>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-0">
                {/* LEFT — plan picker */}
                <div className="p-7 lg:p-8">
                    <div className="flex items-start justify-between mb-1">
                        <div>
                            <p className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Subscribe</p>
                            <h2 className="text-2xl font-extrabold text-navy-950 tracking-tight mt-1">Choose your plan</h2>
                        </div>
                        <button onClick={onClose}
                            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex items-center gap-2 mt-3 mb-6 text-sm text-gray-500">
                        <span>with</span>
                        <span className="font-semibold text-navy-950">{tutor?.name}</span>
                        {tierBadge && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-lime/20 text-[10px] font-bold uppercase tracking-wide text-navy-950">
                                {tierBadge} tutor
                            </span>
                        )}
                        <span>·</span>
                        <span>₹{tutor?.hourlyRate}/hr</span>
                    </div>

                    <div className="space-y-3">
                        {plans.map((p) => (
                            <PlanCard
                                key={p.key}
                                plan={p}
                                hourlyRate={tutor?.hourlyRate}
                                selected={p.key === selectedPlan}
                                onSelect={() => setSelectedPlan(p.key)}
                            />
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-6">
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Subject"
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-navy-950 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal/40 transition-all"
                        />
                        <input
                            type="text"
                            value={schedule}
                            onChange={(e) => setSchedule(e.target.value)}
                            placeholder="Preferred schedule"
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-navy-950 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal/40 transition-all"
                        />
                    </div>
                </div>

                {/* RIGHT — breakdown + CTA */}
                <div className="bg-[#f7f7f7] p-7 lg:p-8 border-t lg:border-t-0 lg:border-l border-gray-100">
                    <p className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase mb-3">Summary</p>
                    {loadingPreview ? (
                        <div className="animate-pulse space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4" />
                            <div className="h-4 bg-gray-200 rounded w-1/2" />
                            <div className="h-4 bg-gray-200 rounded w-2/3" />
                        </div>
                    ) : preview ? (
                        <>
                            <div className="space-y-2 text-sm">
                                <Row label={`${preview.breakdown.sessions} sessions × ₹${preview.breakdown.hourlyRate}`} value={`₹${preview.breakdown.baseAmount.toLocaleString('en-IN')}`} />
                                {preview.breakdown.surcharge > 0 && (
                                    <Row label="Flex surcharge (10%)" value={`+₹${preview.breakdown.surcharge.toLocaleString('en-IN')}`} />
                                )}
                                {preview.breakdown.discount > 0 && (
                                    <Row label={`${preview.plan.label} discount (${preview.plan.discountPct}%)`} value={`−₹${preview.breakdown.discount.toLocaleString('en-IN')}`} dim />
                                )}
                                {preview.breakdown.creditsApplicable > 0 && (
                                    <Row label="Tutnet credits" value={`−₹${preview.breakdown.creditsApplicable.toLocaleString('en-IN')}`} dim emphasis />
                                )}
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-200 flex items-baseline justify-between">
                                <span className="text-sm font-bold text-navy-950">You pay today</span>
                                <span className="text-2xl font-extrabold text-royal">₹{preview.breakdown.netPayable.toLocaleString('en-IN')}</span>
                            </div>
                            {preview.plan.commitmentMonths > 1 && (
                                <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
                                    {preview.plan.commitmentMonths}-month commitment. Cancel anytime after month 1 per our terms.
                                </p>
                            )}
                        </>
                    ) : (
                        <p className="text-sm text-gray-400">Select a plan to see pricing.</p>
                    )}

                    <button
                        onClick={handleSubscribe}
                        disabled={processing || !preview}
                        className="w-full mt-6 py-3 bg-lime hover:bg-lime-light text-navy-950 text-sm font-bold rounded-full transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {processing ? (
                            <>
                                <span className="w-4 h-4 border-2 border-navy-950/30 border-t-navy-950 rounded-full animate-spin" />
                                Processing…
                            </>
                        ) : preview?.breakdown?.netPayable === 0 ? 'Activate with credits' : 'Pay and activate'}
                    </button>

                    <div className="flex items-center gap-2 mt-4 text-[11px] text-gray-500">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>Secured by Razorpay · UPI, cards, netbanking</span>
                    </div>

                    {/* Test-mode cheat sheet — only shows in test mode */}
                    <TestModeCheatSheet />
                </div>
            </div>

            {/* Mock Razorpay gateway (only in mock mode) */}
            {mockOrder && (
                <MockRazorpayCheckout
                    amount={mockOrder.amount}
                    orderId={mockOrder.orderId}
                    description={mockOrder.description}
                    prefill={mockOrder.prefill}
                    onDismiss={() => { setMockOrder(null); setProcessing(false); }}
                    onSuccess={async (rz) => {
                        try {
                            await api.post('/payments/verify', {
                                razorpayOrderId: rz.razorpay_order_id,
                                razorpayPaymentId: rz.razorpay_payment_id,
                                razorpaySignature: rz.razorpay_signature,
                                bookingId: mockOrder.bookingId
                            });
                        } catch (_) { /* webhook will catch up */ }
                        setMockOrder(null);
                        setPaymentStatus('success');
                        showSuccess('Payment successful! Subscription is active.');
                        if (onSuccess) onSuccess({ bookingId: mockOrder.bookingId });
                    }}
                />
            )}
        </Modal>
    );
}

// ── Subcomponents ──────────────────────────────────────────────────────

function Modal({ children, onClose, wide }) {
    return (
        <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className={`bg-white rounded-3xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)] w-full ${wide ? 'max-w-[920px]' : 'max-w-[440px]'} overflow-y-auto max-h-[min(92vh,900px)]`}>
                {children}
            </div>
        </div>
    );
}

function PlanCard({ plan, hourlyRate, selected, onSelect }) {
    const sessions = plan.defaultSessionsPerMonth || 1;
    const base = (hourlyRate || 0) * sessions;
    const surcharge = plan.surchargePct ? Math.round((base * plan.surchargePct) / 100) : 0;
    const discount = plan.discountPct ? Math.round((base * plan.discountPct) / 100) : 0;
    const final = base + surcharge - discount;

    return (
        <button
            type="button"
            onClick={onSelect}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                selected
                    ? 'border-royal bg-royal/[0.03] shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-navy-950 text-[15px]">{plan.label}</span>
                        {plan.discountPct > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-lime/30 text-[10px] font-bold text-navy-950">
                                {plan.discountPct}% OFF
                            </span>
                        )}
                        {plan.surchargePct > 0 && (
                            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">No commitment</span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{plan.description}</p>
                    <p className="text-[11px] text-gray-400 mt-2">
                        {plan.key === 'flex' ? 'Per session' : `${sessions} sessions/month${plan.sessionAllowance && plan.sessionAllowance > sessions ? ` · up to ${plan.sessionAllowance}` : ''}`}
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-lg font-extrabold text-navy-950 whitespace-nowrap">
                        ₹{final.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-gray-400 font-medium">
                        {plan.key === 'flex' ? '/session' : '/month'}
                    </div>
                </div>
            </div>
        </button>
    );
}

function Row({ label, value, dim, emphasis }) {
    return (
        <div className={`flex items-baseline justify-between ${dim ? 'text-gray-500' : 'text-navy-950'}`}>
            <span className={`${emphasis ? 'font-semibold text-lime-dark' : ''}`}>{label}</span>
            <span className={`font-semibold ${emphasis ? 'text-navy-950' : ''}`}>{value}</span>
        </div>
    );
}

/**
 * TestModeCheatSheet — shows test credentials in dev. Fetches /api/health
 * once; only renders when paymentMode === 'test'.
 */
function TestModeCheatSheet() {
    const [mode, setMode] = useState(null);
    useEffect(() => {
        fetch('/api/health').then((r) => r.json()).then((d) => setMode(d?.paymentMode)).catch(() => {});
    }, []);
    if (mode !== 'test') return null;
    return (
        <div className="mt-3 p-3 rounded-xl bg-yellow-50 border border-yellow-200">
            <p className="text-[10px] font-bold tracking-[0.2em] text-yellow-800 uppercase mb-1.5">
                Test mode · use these in the Razorpay popup
            </p>
            <div className="space-y-1 text-[11px]">
                <div className="flex items-baseline gap-2">
                    <span className="font-bold text-navy-950 w-12">UPI:</span>
                    <code className="font-mono bg-white/60 px-1.5 py-0.5 rounded text-navy-950">success@razorpay</code>
                    <span className="text-gray-500">(or <code className="font-mono text-rose-600">failure@razorpay</code>)</span>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="font-bold text-navy-950 w-12">Card:</span>
                    <code className="font-mono bg-white/60 px-1.5 py-0.5 rounded text-navy-950">4111 1111 1111 1111</code>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="font-bold text-navy-950 w-12">OTP:</span>
                    <code className="font-mono bg-white/60 px-1.5 py-0.5 rounded text-navy-950">1234</code>
                    <span className="text-gray-500">· any future expiry · any CVV</span>
                </div>
            </div>
        </div>
    );
}
