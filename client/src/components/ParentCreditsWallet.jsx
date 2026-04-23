import { useEffect, useState } from 'react';
import api from '../utils/api';
import BuyCreditsModal from './BuyCreditsModal';

/**
 * ParentCreditsWallet — shows available platform credits + buy-more action + how-to-earn list.
 * Lives in the student dashboard.
 */
export default function ParentCreditsWallet() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showBuy, setShowBuy] = useState(false);

    const fetchData = () => {
        return api.get('/subscriptions/credits')
            .then(({ data }) => setData(data))
            .catch(() => setData(null));
    };

    useEffect(() => {
        fetchData().finally(() => setLoading(false));
    }, []);

    const total = data?.total || 0;
    const rows = data?.rows || [];

    return (
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
            {/* Header with balance */}
            <div className="bg-gradient-to-br from-navy-950 to-royal p-6 text-white">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">Tutnet credits</p>
                        <div className="flex items-end gap-2 mt-2">
                            <p className="text-4xl font-extrabold tracking-tight">
                                ₹{loading ? '—' : total.toLocaleString('en-IN')}
                            </p>
                            <p className="text-xs opacity-60 pb-1.5">available</p>
                        </div>
                        <p className="text-xs opacity-70 mt-1">Applied automatically to your next invoice.</p>
                    </div>
                    <button
                        onClick={() => setShowBuy(true)}
                        className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-lime hover:bg-lime-light text-navy-950 text-xs font-bold transition-colors shadow-sm"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Buy credits
                    </button>
                </div>
            </div>

            {/* History */}
            <div className="p-6">
                <p className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase mb-3">Recent activity</p>
                {loading ? (
                    <div className="animate-pulse space-y-2">
                        <div className="h-4 bg-gray-100 rounded w-3/4" />
                        <div className="h-4 bg-gray-100 rounded w-1/2" />
                    </div>
                ) : rows.length === 0 ? (
                    <div className="py-6 text-center">
                        <p className="text-sm text-gray-500">No credits yet.</p>
                        <p className="text-xs text-gray-400 mt-1">
                            Refer a friend, complete a demo, or report off-platform requests to earn.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {rows.slice(0, 8).map((r) => (
                            <div key={r._id} className="py-2.5 flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-navy-950 capitalize">
                                        {KIND_LABEL[r.kind] || r.kind.replace(/_/g, ' ')}
                                    </p>
                                    <p className="text-[11px] text-gray-400">
                                        {new Date(r.accruedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                    </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-sm font-bold text-lime-dark">
                                        +₹{r.amount.toLocaleString('en-IN')}
                                    </p>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                                        {r.status}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Explainer */}
            <div className="px-6 py-4 bg-[#f7f7f7] border-t border-gray-100">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">How to earn</p>
                <ul className="text-xs text-gray-600 space-y-1.5">
                    <li className="flex items-center gap-2">
                        <Dot /> Refer a parent — <span className="font-semibold">₹300</span> after their first month
                    </li>
                    <li className="flex items-center gap-2">
                        <Dot /> Book within 24h of a trial — <span className="font-semibold">₹200</span> off
                    </li>
                    <li className="flex items-center gap-2">
                        <Dot /> Report off-platform request — <span className="font-semibold">₹500</span> verified
                    </li>
                    <li className="flex items-center gap-2">
                        <Dot /> 6 months with same tutor — <span className="font-semibold">₹500</span> loyalty
                    </li>
                </ul>
            </div>

            {showBuy && (
                <BuyCreditsModal
                    onClose={() => setShowBuy(false)}
                    onPurchased={() => { fetchData(); }}
                />
            )}
        </div>
    );
}

function Dot() {
    return <span className="w-1.5 h-1.5 rounded-full bg-lime flex-shrink-0" />;
}

const KIND_LABEL = {
    trial_conversion: 'Trial → paid bonus',
    parent_referral: 'Referral reward',
    sibling_discount: 'Sibling discount',
    long_loyalty: '6-month loyalty',
    off_platform_report: 'Safety report reward',
    committed_plan: 'Committed plan discount'
};
