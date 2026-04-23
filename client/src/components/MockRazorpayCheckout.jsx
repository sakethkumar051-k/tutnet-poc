import { useState, useEffect } from 'react';

/**
 * MockRazorpayCheckout
 * --------------------
 * In mock mode, real Razorpay isn't hit. Instead of auto-succeeding invisibly
 * (which hides the whole checkout UX from you), this component simulates
 * the Razorpay checkout flow end-to-end so you can experience how a parent
 * will see it: method picker → details → processing → success callback.
 *
 * Props:
 *   amount        — ₹ amount
 *   description   — line shown in the header (e.g. "Monthly plan · Chemistry")
 *   prefill       — { name, email }
 *   onSuccess     — called with { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 *   onDismiss     — called on user cancel
 *   orderId       — the mock order id we created server-side
 */
export default function MockRazorpayCheckout({ amount, description, prefill, onSuccess, onDismiss, orderId }) {
    const [step, setStep] = useState('method'); // method | card | upi | netbank | processing | success | failed
    const [method, setMethod] = useState(null);
    const [card, setCard] = useState({ number: '4111 1111 1111 1111', expiry: '12/29', cvv: '123', name: prefill?.name || '' });
    const [upi, setUpi] = useState('success@razorpay');
    const [delayMs, setDelayMs] = useState(1600);

    const startProcessing = (willSucceed) => {
        setStep('processing');
        setTimeout(() => {
            if (willSucceed) {
                setStep('success');
                setTimeout(() => {
                    onSuccess({
                        razorpay_order_id: orderId,
                        razorpay_payment_id: `mock_pay_${Date.now()}`,
                        razorpay_signature: 'mock_signature'
                    });
                }, 600);
            } else {
                setStep('failed');
            }
        }, delayMs);
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
             onClick={(e) => { if (e.target === e.currentTarget && step !== 'processing') onDismiss?.(); }}>
            <div className="bg-white w-full sm:max-w-[440px] sm:rounded-3xl rounded-t-3xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)] overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header — simulates Razorpay's look */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-md bg-[#072654] flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-[10px] font-extrabold tracking-tight">R</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[13px] font-bold text-navy-950 leading-none">Tutnet</p>
                            <p className="text-[10px] text-gray-500 truncate">Simulated · Mock mode</p>
                        </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Amount</p>
                        <p className="text-sm font-extrabold text-navy-950">₹{amount.toLocaleString('en-IN')}</p>
                    </div>
                    {step !== 'processing' && step !== 'success' && (
                        <button onClick={onDismiss} className="ml-2 w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                <div className="overflow-y-auto">
                    {step === 'method' && (
                        <MethodPicker
                            description={description}
                            onPick={(m) => { setMethod(m); setStep(m); }}
                        />
                    )}
                    {step === 'card' && (
                        <CardForm
                            card={card}
                            onChange={setCard}
                            onBack={() => setStep('method')}
                            onPay={() => startProcessing(true)}
                            onFail={() => startProcessing(false)}
                            amount={amount}
                        />
                    )}
                    {step === 'upi' && (
                        <UpiForm
                            upi={upi}
                            onChange={setUpi}
                            onBack={() => setStep('method')}
                            onPay={() => startProcessing(upi.startsWith('success'))}
                            amount={amount}
                        />
                    )}
                    {step === 'netbank' && (
                        <NetbankForm
                            onBack={() => setStep('method')}
                            onPay={(willSucceed) => startProcessing(willSucceed)}
                            amount={amount}
                        />
                    )}
                    {step === 'processing' && (
                        <ProcessingScreen amount={amount} method={method} />
                    )}
                    {step === 'success' && (
                        <SuccessScreen amount={amount} />
                    )}
                    {step === 'failed' && (
                        <FailedScreen onRetry={() => setStep('method')} onClose={onDismiss} />
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Step screens ──────────────────────────────────────────────────────

function MethodPicker({ description, onPick }) {
    return (
        <div className="p-5">
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">{description}</p>
            <p className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase mb-3">Pay using</p>
            <div className="space-y-2">
                <MethodRow
                    icon={<RupeeIcon />}
                    label="UPI"
                    sub="Fastest · GPay, PhonePe, Paytm, any UPI ID"
                    onClick={() => onPick('upi')}
                />
                <MethodRow
                    icon={<CardIcon />}
                    label="Card"
                    sub="Visa, Mastercard, Rupay · Credit & debit"
                    onClick={() => onPick('card')}
                />
                <MethodRow
                    icon={<BankIcon />}
                    label="Netbanking"
                    sub="50+ banks supported"
                    onClick={() => onPick('netbank')}
                />
            </div>
            <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-2 text-[10px] text-gray-400">
                <LockIcon /> Simulated checkout · TutNet never stores your card details
            </div>
        </div>
    );
}

function CardForm({ card, onChange, onBack, onPay, onFail, amount }) {
    return (
        <div className="p-5">
            <button onClick={onBack} className="text-xs text-gray-500 hover:text-navy-950 mb-4 flex items-center gap-1">
                <ArrowLeft /> Back to methods
            </button>
            <p className="text-sm font-bold text-navy-950 mb-1">Enter card details</p>
            <p className="text-xs text-gray-400 mb-4">Test card is pre-filled. Swap in real values to see validation.</p>

            <div className="space-y-3">
                <LabeledInput
                    label="Card number"
                    value={card.number}
                    onChange={(v) => onChange({ ...card, number: v })}
                    monospace
                />
                <div className="grid grid-cols-2 gap-3">
                    <LabeledInput label="Expiry" value={card.expiry} onChange={(v) => onChange({ ...card, expiry: v })} monospace />
                    <LabeledInput label="CVV" value={card.cvv} onChange={(v) => onChange({ ...card, cvv: v })} monospace />
                </div>
                <LabeledInput label="Name on card" value={card.name} onChange={(v) => onChange({ ...card, name: v })} />
            </div>

            <div className="mt-3 p-2.5 rounded-lg bg-lime/15 border border-lime/30 text-[11px] text-navy-950 leading-relaxed">
                <span className="font-bold">Test cards:</span> 4111 1111 1111 1111 (success) · 5267 3181 8797 5449 (success) · any other = fail
            </div>

            <div className="mt-4 flex gap-2">
                <button onClick={onPay}
                    className="flex-1 py-3 bg-[#072654] hover:bg-[#0a3271] text-white text-sm font-bold rounded-xl transition-colors">
                    Pay ₹{amount.toLocaleString('en-IN')}
                </button>
                <button onClick={onFail}
                    title="Simulate payment failure"
                    className="px-3 py-3 border border-gray-200 text-gray-500 text-[11px] font-semibold rounded-xl hover:bg-gray-50">
                    Fail
                </button>
            </div>
        </div>
    );
}

function UpiForm({ upi, onChange, onBack, onPay, amount }) {
    const isSuccess = upi.startsWith('success');
    return (
        <div className="p-5">
            <button onClick={onBack} className="text-xs text-gray-500 hover:text-navy-950 mb-4 flex items-center gap-1">
                <ArrowLeft /> Back to methods
            </button>
            <p className="text-sm font-bold text-navy-950 mb-1">Pay via UPI</p>
            <p className="text-xs text-gray-400 mb-4">Enter any UPI ID — Razorpay test IDs are pre-filled.</p>

            <LabeledInput label="UPI ID" value={upi} onChange={onChange} monospace />

            <div className="mt-3 grid grid-cols-2 gap-2">
                <QuickPick label="success@razorpay" onClick={() => onChange('success@razorpay')} active={upi === 'success@razorpay'} />
                <QuickPick label="failure@razorpay" onClick={() => onChange('failure@razorpay')} active={upi === 'failure@razorpay'} />
            </div>

            <button onClick={onPay}
                className={`mt-5 w-full py-3 text-white text-sm font-bold rounded-xl transition-colors ${isSuccess ? 'bg-[#072654] hover:bg-[#0a3271]' : 'bg-rose-500 hover:bg-rose-600'}`}>
                {isSuccess ? `Pay ₹${amount.toLocaleString('en-IN')}` : `Simulate failure ₹${amount.toLocaleString('en-IN')}`}
            </button>
        </div>
    );
}

function NetbankForm({ onBack, onPay, amount }) {
    const banks = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Kotak Mahindra', 'Axis Bank'];
    return (
        <div className="p-5">
            <button onClick={onBack} className="text-xs text-gray-500 hover:text-navy-950 mb-4 flex items-center gap-1">
                <ArrowLeft /> Back to methods
            </button>
            <p className="text-sm font-bold text-navy-950 mb-3">Choose your bank</p>
            <div className="space-y-1.5 mb-4">
                {banks.map((b) => (
                    <button key={b} onClick={() => onPay(true)}
                        className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-royal/40 hover:bg-royal/5 transition-all text-sm text-navy-950 font-semibold">
                        {b}
                    </button>
                ))}
            </div>
            <p className="text-[11px] text-gray-400 text-center">Total: ₹{amount.toLocaleString('en-IN')}</p>
        </div>
    );
}

function ProcessingScreen({ amount, method }) {
    return (
        <div className="p-8 text-center">
            <div className="relative w-20 h-20 mx-auto mb-5">
                <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#072654] animate-spin" />
            </div>
            <p className="text-base font-bold text-navy-950">Processing payment</p>
            <p className="text-xs text-gray-500 mt-1.5 max-w-[220px] mx-auto leading-relaxed">
                Authenticating ₹{amount.toLocaleString('en-IN')} via {method || 'gateway'}. Don't close this window.
            </p>
        </div>
    );
}

function SuccessScreen({ amount }) {
    return (
        <div className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-lime/30 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-navy-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <p className="text-base font-extrabold text-navy-950 tracking-tight">Payment authorised</p>
            <p className="text-xs text-gray-500 mt-1">₹{amount.toLocaleString('en-IN')} captured · Returning to Tutnet…</p>
        </div>
    );
}

function FailedScreen({ onRetry, onClose }) {
    return (
        <div className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </div>
            <p className="text-base font-extrabold text-navy-950 tracking-tight">Payment failed</p>
            <p className="text-xs text-gray-500 mt-1">The bank declined this transaction. Try a different method.</p>
            <div className="flex gap-2 justify-center mt-5">
                <button onClick={onClose} className="px-5 py-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-full hover:bg-gray-50">Close</button>
                <button onClick={onRetry} className="px-5 py-2 bg-[#072654] hover:bg-[#0a3271] text-white text-sm font-bold rounded-full">Try again</button>
            </div>
        </div>
    );
}

// ── UI helpers ────────────────────────────────────────────────────────

function MethodRow({ icon, label, sub, onClick }) {
    return (
        <button onClick={onClick}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-royal/40 hover:bg-royal/[0.02] transition-all text-left">
            <div className="w-9 h-9 rounded-lg bg-[#072654]/5 flex items-center justify-center text-[#072654] flex-shrink-0">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-navy-950">{label}</p>
                <p className="text-[11px] text-gray-500 truncate">{sub}</p>
            </div>
            <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
        </button>
    );
}

function LabeledInput({ label, value, onChange, monospace }) {
    return (
        <label className="block">
            <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">{label}</span>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-navy-950 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal/40 transition-all ${monospace ? 'font-mono tracking-wider' : ''}`}
            />
        </label>
    );
}

function QuickPick({ label, onClick, active }) {
    return (
        <button type="button" onClick={onClick}
            className={`px-3 py-2 rounded-lg text-[11px] font-mono border transition-all ${active ? 'border-royal bg-royal/[0.05] text-navy-950' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}>
            {label}
        </button>
    );
}

const RupeeIcon = () => <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M7 4h11a1 1 0 110 2h-3.09c.26.63.4 1.3.4 2 0 .35-.02.68-.08 1H18a1 1 0 110 2h-3.2c-.7 1.92-2.5 3.38-5.3 3.82L15.5 20H13l-5.8-5.4c-.14-.12-.2-.3-.2-.6v-1c0-.55.45-1 1-1h1c2 0 3.34-.82 3.85-2H7a1 1 0 110-2h6.83c.11-.33.17-.66.17-1 0-.73-.3-1.4-.82-2H7a1 1 0 010-2z"/></svg>;
const CardIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h6m-6 3h18a2 2 0 002-2V8a2 2 0 00-2-2H3a2 2 0 00-2 2v7a2 2 0 002 2z" /></svg>;
const BankIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v4m4-4v4m4-4v4" /></svg>;
const LockIcon = () => <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;
const ArrowLeft = () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
