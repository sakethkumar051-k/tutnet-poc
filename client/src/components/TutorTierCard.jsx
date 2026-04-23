import { useEffect, useState } from 'react';
import api from '../utils/api';
import { getTierMeta, getNextTier, TIER_MODEL } from '../constants/tierMeta';

/**
 * TutorTierCard — the tutor's tier showcase.
 *
 * Revenue-model-correct: commission rates and thresholds pulled from
 * client/src/constants/tierMeta.js which mirrors REVENUE_MODEL.md §4. Tier
 * palette is Slate / Slate / Amber-Gold / Emerald-Teal with 1–4 filled stars
 * for Starter / Silver / Gold / Platinum respectively.
 */
export default function TutorTierCard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/incentives/summary')
            .then(({ data }) => setData(data))
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, []);

    const tier = data?.tier || 'starter';
    const meta = getTierMeta(tier);
    const nextKey = getNextTier(tier);
    const next = nextKey ? { key: nextKey, ...TIER_MODEL[nextKey] } : null;

    // Progress: lesser of session-progress and rating-progress → harder gate
    const sessions = data?.totalSessions || 0;
    const rating = data?.averageRating || 0;
    const sessionProgress = next ? Math.min(1, sessions / next.minSessions) : 1;
    const ratingProgress = next
        ? (rating >= next.minRating ? 1 : Math.min(1, rating / next.minRating))
        : 1;
    const progress = next ? Math.min(sessionProgress, ratingProgress) : 1;

    return (
        <div className={`relative overflow-hidden rounded-3xl border-2 shadow-xl ${meta.border} ${meta.glow}`}>
            {/* Decorative top glow */}
            <div className={`absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-30 blur-3xl ${meta.accentSoft}`} />

            {/* Hero band */}
            <div className={`relative bg-gradient-to-br ${meta.gradient} px-6 sm:px-8 py-7`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    {/* Tier identity */}
                    <div className="flex items-center gap-4">
                        <div className={`relative w-16 h-16 rounded-2xl ${meta.accent} flex items-center justify-center shadow-lg ring-4 ring-white`}>
                            <StarCrest stars={meta.stars} tier={tier} />
                        </div>
                        <div>
                            <p className={`text-[10px] font-bold tracking-[0.25em] uppercase ${meta.textSoft}`}>
                                Your tier
                            </p>
                            <p className={`text-3xl font-extrabold tracking-tight mt-0.5 ${meta.text}`}>
                                {meta.label}
                            </p>
                            <StarRow filled={meta.stars} className={meta.star} />
                        </div>
                    </div>

                    {/* Commission */}
                    <div className="text-right">
                        <p className={`text-[10px] font-bold tracking-[0.25em] uppercase ${meta.textSoft}`}>
                            Commission rate
                        </p>
                        <p className={`text-4xl font-black tracking-tighter mt-0.5 ${meta.text}`}>
                            {meta.commission}<span className="text-2xl">%</span>
                        </p>
                        <p className={`text-xs ${meta.textSoft} mt-0.5`}>
                            You keep {100 - meta.commission}%
                        </p>
                    </div>
                </div>
            </div>

            {/* Progress to next */}
            <div className="bg-white px-6 sm:px-8 py-5 border-y border-gray-100">
                {loading ? (
                    <div className="h-16 bg-gray-50 animate-pulse rounded-lg" />
                ) : next ? (
                    <>
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Next tier</p>
                                <p className="text-sm font-bold text-navy-950 mt-0.5">
                                    {next.label}
                                    <span className="ml-2 text-xs text-gray-500 font-normal">
                                        drops commission to {next.commission}%
                                    </span>
                                </p>
                            </div>
                            <p className={`text-xl font-extrabold ${meta.text}`}>{Math.round(progress * 100)}%</p>
                        </div>

                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-4">
                            <div className={`h-full rounded-full transition-all ${meta.accent}`}
                                 style={{ width: `${Math.round(progress * 100)}%` }} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <ProgressMetric
                                label="Sessions"
                                current={sessions}
                                target={next.minSessions}
                                done={sessionProgress >= 1}
                            />
                            <ProgressMetric
                                label="Avg rating"
                                current={rating.toFixed(2)}
                                target={next.minRating.toFixed(1)}
                                suffix="★"
                                done={ratingProgress >= 1}
                            />
                        </div>

                        <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
                            Both thresholds must be met. Promotion runs on the 1st of every month — you'll also earn a
                            <span className="font-semibold text-navy-950"> ₹500 tier-upgrade bonus</span> when you move up.
                        </p>
                    </>
                ) : (
                    <div className="py-3 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${meta.accent} flex items-center justify-center`}>
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-navy-950">Top tier reached</p>
                            <p className="text-xs text-gray-500">You're on our best commission rate — 15%. Nothing higher to unlock.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Earnings snapshot */}
            <div className="bg-gray-50/50 px-6 sm:px-8 py-5 grid grid-cols-3 gap-4">
                <SnapshotStat
                    label="Lifetime gross"
                    value={`₹${(data?.lifetimeGrossEarnings || 0).toLocaleString('en-IN')}`}
                    tone="navy"
                />
                <SnapshotStat
                    label="Commission paid"
                    value={`₹${(data?.lifetimeCommissionPaid || 0).toLocaleString('en-IN')}`}
                    tone="muted"
                />
                <SnapshotStat
                    label="Incentives earned"
                    value={`₹${(data?.lifetimeIncentivesPaid || 0).toLocaleString('en-IN')}`}
                    tone="success"
                />
            </div>

            {/* Pending bonus */}
            {data?.pendingBonusTotal > 0 && (
                <div className="bg-emerald-50 border-t border-emerald-200 px-6 sm:px-8 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" />
                        </svg>
                        <div>
                            <p className="text-sm font-bold text-emerald-900">Pending bonuses</p>
                            <p className="text-[11px] text-emerald-700">Included in your next Friday payout</p>
                        </div>
                    </div>
                    <span className="text-lg font-extrabold text-emerald-900">
                        ₹{data.pendingBonusTotal.toLocaleString('en-IN')}
                    </span>
                </div>
            )}
        </div>
    );
}

// ── Subcomponents ───────────────────────────────────────────────────────

function StarCrest({ stars }) {
    // A 4-pointed crest sized by stars count — reads as tier insignia
    return (
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d={stars >= 4
                ? 'M12 2l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 15.3 6.8 18.1l1-5.8L3.5 8.2l5.9-.9L12 2z'
                : 'M12 2l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z'} />
        </svg>
    );
}

function StarRow({ filled, className }) {
    return (
        <div className="flex gap-0.5 mt-1">
            {[1, 2, 3, 4].map((n) => (
                <svg
                    key={n}
                    className={`w-3.5 h-3.5 ${n <= filled ? className : 'text-gray-300'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
            ))}
        </div>
    );
}

function ProgressMetric({ label, current, target, suffix = '', done }) {
    return (
        <div className={`rounded-xl px-4 py-3 border ${done ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100'}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</p>
            <p className="text-lg font-extrabold text-navy-950 mt-0.5">
                {current}{suffix} <span className="text-xs font-normal text-gray-400">/ {target}{suffix}</span>
            </p>
            {done && <p className="text-[10px] font-bold text-emerald-700 mt-0.5">✓ Met</p>}
        </div>
    );
}

function SnapshotStat({ label, value, tone }) {
    const valueCls = {
        navy:    'text-navy-950',
        muted:   'text-gray-500',
        success: 'text-emerald-700'
    }[tone];
    return (
        <div>
            <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-gray-400">{label}</p>
            <p className={`text-sm font-bold mt-0.5 ${valueCls}`}>{value}</p>
        </div>
    );
}
