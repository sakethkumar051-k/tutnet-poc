import { useState, useEffect } from 'react';
import api from '../utils/api';

const TIER_STYLES = {
    Bronze: { bg: 'bg-lime/20',   border: 'border-lime/40', text: 'text-navy-950', bar: 'bg-lime-dark' },
    Silver: { bg: 'bg-gray-50',    border: 'border-gray-200',  text: 'text-gray-700',  bar: 'bg-gray-400' },
    Gold:   { bg: 'bg-yellow-50',  border: 'border-yellow-200',text: 'text-yellow-800',bar: 'bg-yellow-400' },
    Elite:  { bg: 'bg-royal/10',  border: 'border-royal/20',text: 'text-navy-900',bar: 'bg-royal/50' }
};

export default function IncentiveDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/incentives/summary')
            .then(res => setData(res.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-royal border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (!data) return null;

    const tierStyle = TIER_STYLES[data.currentTier?.name] || TIER_STYLES.Bronze;
    const earnedCount = data.milestones?.filter(m => m.earned).length || 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-navy-950">Rewards & Incentives</h2>
                <p className="text-sm text-gray-500 mt-0.5">Track your progress, milestones, and bonus earnings</p>
            </div>

            {/* Tier card */}
            <div className={`rounded-2xl border p-6 ${tierStyle.bg} ${tierStyle.border}`}>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Current Tier</p>
                        <div className="flex items-center gap-2">
                            <span className="text-3xl">{data.currentTier?.badge}</span>
                            <span className={`text-2xl font-bold ${tierStyle.text}`}>{data.currentTier?.name}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500 mb-0.5">Total Bonus Earned</p>
                        <p className="text-2xl font-bold text-navy-950">₹{data.totalBonusEarned?.toLocaleString()}</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white/60 rounded-xl px-4 py-3 text-center">
                        <p className="text-2xl font-bold text-navy-950">{data.sessionCount}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Sessions</p>
                    </div>
                    <div className="bg-white/60 rounded-xl px-4 py-3 text-center">
                        <p className="text-2xl font-bold text-navy-950">{data.avgRating > 0 ? data.avgRating.toFixed(1) : '—'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Avg Rating</p>
                    </div>
                    <div className="bg-white/60 rounded-xl px-4 py-3 text-center">
                        <p className="text-2xl font-bold text-navy-950">{earnedCount}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Milestones</p>
                    </div>
                </div>

                {/* Progress to next tier */}
                {data.nextTier && (
                    <div className="mt-5 bg-white/50 rounded-xl px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-gray-600">Progress to {data.nextTier.badge} {data.nextTier.tier}</p>
                        </div>
                        <div className="space-y-1.5">
                            {data.nextTier.sessionsNeeded > 0 && (
                                <p className="text-xs text-gray-500">
                                    <span className="font-semibold text-gray-700">{data.nextTier.sessionsNeeded}</span> more sessions needed
                                </p>
                            )}
                            {parseFloat(data.nextTier.ratingNeeded) > 0 && (
                                <p className="text-xs text-gray-500">
                                    <span className="font-semibold text-gray-700">{data.nextTier.ratingNeeded}</span> rating improvement needed
                                </p>
                            )}
                            {data.nextTier.sessionsNeeded === 0 && parseFloat(data.nextTier.ratingNeeded) === 0 && (
                                <p className="text-xs text-lime-dark font-medium">You qualify for the next tier!</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Milestones */}
            <div>
                <h3 className="text-base font-bold text-navy-950 mb-3">Milestones & Bonuses</h3>
                <div className="grid grid-cols-1 gap-3">
                    {data.milestones?.map(m => (
                        <div key={m.id}
                            className={`flex items-center gap-4 px-5 py-4 rounded-xl border transition-all ${m.earned ? 'bg-lime/20 border-lime/40' : 'bg-gray-50 border-gray-100 opacity-60'}`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${m.earned ? 'bg-lime/30' : 'bg-gray-100'}`}>
                                {m.earned ? '✅' : '🔒'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold ${m.earned ? 'text-navy-950' : 'text-gray-500'}`}>{m.label}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{m.desc}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className={`text-sm font-bold ${m.earned ? 'text-navy-950' : 'text-gray-400'}`}>+₹{m.bonus}</p>
                                <p className="text-xs text-gray-400">{m.earned ? 'Earned' : 'Locked'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Info note */}
            <div className="bg-royal/5 border border-royal/20 rounded-xl px-5 py-4">
                <p className="text-xs font-semibold text-navy-900 mb-1">About Bonuses</p>
                <p className="text-xs text-royal leading-relaxed">
                    Bonuses are credited to your account at the end of each month. Tier upgrades are evaluated monthly based on your cumulative performance.
                    Ratings must be from verified completed sessions to count.
                </p>
            </div>
        </div>
    );
}
