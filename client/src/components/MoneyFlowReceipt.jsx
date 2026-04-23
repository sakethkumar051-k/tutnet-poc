/**
 * MoneyFlowReceipt
 * ----------------
 * Educational + transparent receipt that shows EXACTLY where the money goes
 * after a successful payment:
 *
 *   You paid ₹X
 *      ↓
 *   ├─ Tutor's share (X - commission)
 *   ├─ Platform commission (Y% = Z)
 *   ├─ Payment gateway fee (~2%)
 *   └─ Chargeback reserve (15% held, released after 60 days)
 *
 * Props:
 *   grossAmount       — total the parent paid
 *   commissionRate    — % platform takes (from tier)
 *   commissionAmount  — ₹ platform takes
 *   tutorShare        — ₹ tutor receives (gross - commission, approximately)
 *   appliedCredits    — ₹ applied as platform credit (not part of gross cash)
 *   tutorName         — for copy
 *   mode              — 'subscription' | 'session' | 'credits'
 */
export default function MoneyFlowReceipt({
    grossAmount = 0,
    commissionRate = 0,
    commissionAmount = 0,
    tutorShare = null,
    appliedCredits = 0,
    tutorName = 'your tutor',
    mode = 'subscription'
}) {
    // Gross cash received by platform (after applied credits)
    const cashReceived = Math.max(0, grossAmount - appliedCredits);

    // Derived fields
    const actualTutorShare = tutorShare != null ? tutorShare : Math.round(grossAmount - commissionAmount);
    const razorpayFee = Math.round(cashReceived * 0.02);  // ~2% payment gateway
    const reserveHeld = Math.round(actualTutorShare * 0.15); // 15% held against chargebacks
    const tutorNetImmediate = actualTutorShare - reserveHeld;
    const platformNet = commissionAmount - razorpayFee;

    if (mode === 'credits') {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
                <p className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Transaction</p>
                <div className="space-y-1 text-sm">
                    <Row label="You paid" value={`₹${grossAmount.toLocaleString('en-IN')}`} bold />
                    <Row label="Credited to wallet" value={`₹${(grossAmount).toLocaleString('en-IN')}`} />
                    <Row label="Bonus (if pack)" value="auto-applied" dim />
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed pt-2 border-t border-gray-100">
                    Credits apply automatically to your next monthly invoice. They never expire.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-5 pt-5 pb-3">
                <p className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Where your money goes</p>
                <p className="text-xs text-gray-500 mt-0.5">Fully transparent — this is how Tutnet works.</p>
            </div>

            {/* Top: gross → split visualization */}
            <div className="px-5 pb-3">
                <div className="flex items-baseline justify-between mb-2">
                    <span className="text-sm font-bold text-navy-950">You paid</span>
                    <span className="text-2xl font-extrabold text-navy-950 tracking-tight">₹{grossAmount.toLocaleString('en-IN')}</span>
                </div>
                {appliedCredits > 0 && (
                    <p className="text-[11px] text-lime-dark mb-2">
                        Inclusive of ₹{appliedCredits.toLocaleString('en-IN')} platform credits applied (no cash).
                    </p>
                )}

                {/* Two-bar split: tutor vs platform */}
                <div className="mt-3">
                    <div className="flex h-3 rounded-full overflow-hidden">
                        <div
                            className="bg-lime"
                            style={{ width: `${(actualTutorShare / Math.max(1, grossAmount)) * 100}%` }}
                            title={`Tutor gets ₹${actualTutorShare}`}
                        />
                        <div
                            className="bg-royal"
                            style={{ width: `${(commissionAmount / Math.max(1, grossAmount)) * 100}%` }}
                            title={`Platform keeps ₹${commissionAmount}`}
                        />
                    </div>
                    <div className="flex items-center justify-between mt-1.5 text-[10px] font-bold tracking-wider uppercase">
                        <span className="text-lime-dark">{Math.round((actualTutorShare / Math.max(1, grossAmount)) * 100)}% tutor</span>
                        <span className="text-royal">{commissionRate}% platform</span>
                    </div>
                </div>
            </div>

            {/* Tutor section */}
            <div className="px-5 py-3 border-t border-gray-100 bg-lime/[0.06]">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-lime/30 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-navy-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-navy-950">Tutor's share — {tutorName}</p>
                        <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">
                            Paid out weekly after attendance confirmation. 15% held as chargeback reserve, released after 60 days.
                        </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <p className="text-base font-extrabold text-lime-dark tracking-tight">₹{actualTutorShare.toLocaleString('en-IN')}</p>
                        <p className="text-[10px] text-gray-400">gross to tutor</p>
                    </div>
                </div>
                <div className="mt-2 pl-11 space-y-1 text-[11px]">
                    <MiniRow label="Pays out this week" value={`₹${tutorNetImmediate.toLocaleString('en-IN')}`} />
                    <MiniRow label="Reserve held · 60 days" value={`₹${reserveHeld.toLocaleString('en-IN')}`} dim />
                </div>
            </div>

            {/* Platform section */}
            <div className="px-5 py-3 border-t border-gray-100 bg-royal/[0.04]">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-royal/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-royal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-navy-950">Platform · {commissionRate}% commission</p>
                        <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">
                            Funds refund protection, backup tutor replacement, dispute resolution, and 24h support.
                        </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <p className="text-base font-extrabold text-royal tracking-tight">₹{commissionAmount.toLocaleString('en-IN')}</p>
                        <p className="text-[10px] text-gray-400">gross commission</p>
                    </div>
                </div>
                <div className="mt-2 pl-11 space-y-1 text-[11px]">
                    <MiniRow label="Razorpay fee · ~2%" value={`−₹${razorpayFee.toLocaleString('en-IN')}`} dim />
                    <MiniRow label="Net to Tutnet" value={`₹${platformNet.toLocaleString('en-IN')}`} />
                </div>
            </div>

            {/* Footer with commitments */}
            <div className="px-5 py-3 border-t border-gray-100 bg-[#fafafa]">
                <p className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase mb-2">Your protection</p>
                <ul className="grid grid-cols-2 gap-y-1 text-[11px] text-gray-600">
                    <li className="flex items-center gap-1.5"><CheckDot /> Backup tutor in 24h</li>
                    <li className="flex items-center gap-1.5"><CheckDot /> Prorated refund on no-shows</li>
                    <li className="flex items-center gap-1.5"><CheckDot /> Monthly progress report</li>
                    <li className="flex items-center gap-1.5"><CheckDot /> GST invoice emailed</li>
                </ul>
            </div>
        </div>
    );
}

function Row({ label, value, bold, dim }) {
    return (
        <div className="flex items-center justify-between">
            <span className={`${dim ? 'text-gray-400' : 'text-gray-600'}`}>{label}</span>
            <span className={`${bold ? 'font-extrabold text-navy-950' : 'font-semibold text-navy-950'} ${dim ? 'text-gray-400' : ''}`}>{value}</span>
        </div>
    );
}

function MiniRow({ label, value, dim }) {
    return (
        <div className={`flex items-center justify-between ${dim ? 'text-gray-400' : 'text-gray-600'}`}>
            <span>{label}</span>
            <span className="font-semibold">{value}</span>
        </div>
    );
}

function CheckDot() {
    return (
        <svg className="w-2.5 h-2.5 text-lime-dark flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
    );
}
