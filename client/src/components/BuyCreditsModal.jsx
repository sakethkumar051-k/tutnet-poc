import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import MockRazorpayCheckout from './MockRazorpayCheckout';

/**
 * BuyCreditsModal — pack picker + Razorpay checkout for wallet top-up.
 * Credits are immediately added on payment success and apply to the next invoice.
 */
export default function BuyCreditsModal({ onClose, onPurchased }) {
    const { showSuccess, showError } = useToast();
    const [packs, setPacks] = useState([]);
    const [selected, setSelected] = useState('pack_1000');
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [status, setStatus] = useState(null); // null | 'success' | 'failed'
    const [mockOrder, setMockOrder] = useState(null);

    useEffect(() => {
        if (document.getElementById('razorpay-checkout-js')) return;
        const s = document.createElement('script');
        s.id = 'razorpay-checkout-js';
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.async = true;
        document.body.appendChild(s);
    }, []);

    useEffect(() => {
        api.get('/credits/topup/packs')
            .then(({ data }) => setPacks(data.packs || []))
            .catch(() => setPacks([]))
            .finally(() => setLoading(false));
    }, []);

    const handleBuy = async () => {
        setProcessing(true);
        try {
            const { data } = await api.post('/credits/topup/create', { packKey: selected });

            if (data.keyId === 'mock_key') {
                setMockOrder({
                    orderId: data.orderId,
                    amount: data.amount,
                    credits: data.credits,
                    description: `Credits top-up · ${data.pack?.label || ''}`,
                    prefill: data.prefill
                });
                setProcessing(false);
                return;
            }

            if (!window.Razorpay) {
                showError('Payment gateway not loaded. Refresh and try again.');
                setProcessing(false);
                return;
            }

            const rz = new window.Razorpay({
                key: data.keyId,
                amount: Math.round(data.amount * 100),
                currency: 'INR',
                name: 'Tutnet',
                description: `Credits top-up — ${data.pack?.label || ''}`,
                order_id: data.orderId,
                prefill: data.prefill || {},
                theme: { color: '#1939e5' },
                handler: async (response) => {
                    try {
                        await api.post('/credits/topup/verify', {
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                            packKey: selected
                        });
                        setStatus('success');
                        showSuccess(`₹${data.credits} credited to your wallet`);
                        if (onPurchased) onPurchased(data.credits);
                    } catch (_) {
                        setStatus('success');
                        showSuccess('Payment received — credits may take a moment to appear.');
                        if (onPurchased) onPurchased(data.credits);
                    }
                },
                modal: { ondismiss: () => setProcessing(false) }
            });
            rz.on('payment.failed', (r) => {
                setStatus('failed');
                showError(r?.error?.description || 'Payment failed');
                setProcessing(false);
            });
            rz.open();
        } catch (err) {
            const code = err.response?.data?.code;
            const msg = err.response?.data?.message || err.message || 'Could not start checkout';
            if (code === 'PAYMENT_GATEWAY_AUTH') {
                showError('Payment gateway is temporarily unavailable. Please try again later.');
            } else {
                showError(msg);
            }
            setProcessing(false);
        }
    };

    if (status === 'success') {
        return (
            <Modal onClose={onClose}>
                <div className="text-center py-6">
                    <div className="w-14 h-14 rounded-full bg-lime/30 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-7 h-7 text-navy-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-extrabold text-navy-950 tracking-tight">Credits added</h3>
                    <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto leading-relaxed">
                        Your wallet has been topped up. Credits are applied automatically to your next invoice.
                    </p>
                    <button onClick={onClose}
                        className="mt-6 px-5 py-2.5 bg-navy-950 hover:bg-navy-900 text-white text-sm font-bold rounded-full transition-colors">
                        Done
                    </button>
                </div>
            </Modal>
        );
    }

    return (
        <Modal onClose={onClose}>
            <div className="p-7">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Wallet top-up</p>
                        <h3 className="text-xl font-extrabold text-navy-950 tracking-tight mt-1">Buy credits</h3>
                    </div>
                    <button onClick={onClose}
                        className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                    Credits apply automatically to your next monthly invoice. Bigger packs come with a bonus.
                </p>

                <div className="mt-5 space-y-2.5">
                    {loading ? (
                        <div className="animate-pulse space-y-2">
                            {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 bg-gray-100 rounded-xl" />)}
                        </div>
                    ) : packs.map((p) => (
                        <button
                            key={p.key}
                            type="button"
                            onClick={() => setSelected(p.key)}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${
                                selected === p.key
                                    ? 'border-royal bg-royal/[0.03] shadow-sm'
                                    : 'border-gray-100 hover:border-gray-300 bg-white'
                            }`}
                        >
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-navy-950">{p.label}</span>
                                    {p.bonusPct > 0 && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-lime/30 text-[10px] font-bold text-navy-950">
                                            +{p.bonusPct}% BONUS
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    You pay ₹{p.price.toLocaleString('en-IN')} · Credited ₹{p.credits.toLocaleString('en-IN')}
                                </p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                                selected === p.key ? 'border-royal bg-royal' : 'border-gray-300 bg-white'
                            }`}>
                                {selected === p.key && (
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleBuy}
                    disabled={processing || loading}
                    className="mt-6 w-full py-3 bg-lime hover:bg-lime-light text-navy-950 text-sm font-bold rounded-full transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {processing ? (
                        <>
                            <span className="w-4 h-4 border-2 border-navy-950/30 border-t-navy-950 rounded-full animate-spin" />
                            Processing…
                        </>
                    ) : (
                        `Buy ${packs.find(p => p.key === selected)?.label || 'credits'}`
                    )}
                </button>

                <div className="flex items-center gap-2 mt-3 text-[11px] text-gray-500">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Secured by Razorpay · Credits never expire
                </div>
            </div>

            {mockOrder && (
                <MockRazorpayCheckout
                    amount={mockOrder.amount}
                    orderId={mockOrder.orderId}
                    description={mockOrder.description}
                    prefill={mockOrder.prefill}
                    onDismiss={() => setMockOrder(null)}
                    onSuccess={async (rz) => {
                        try {
                            await api.post('/credits/topup/verify', {
                                razorpayOrderId: rz.razorpay_order_id,
                                razorpayPaymentId: rz.razorpay_payment_id,
                                razorpaySignature: rz.razorpay_signature,
                                packKey: selected
                            });
                        } catch (_) { /* silent */ }
                        setMockOrder(null);
                        setStatus('success');
                        showSuccess(`₹${mockOrder.credits} credited to your wallet`);
                        if (onPurchased) onPurchased(mockOrder.credits);
                    }}
                />
            )}
        </Modal>
    );
}

function Modal({ children, onClose }) {
    return (
        <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white rounded-3xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)] w-full max-w-[460px] max-h-[min(92vh,900px)] overflow-y-auto">
                {children}
            </div>
        </div>
    );
}
