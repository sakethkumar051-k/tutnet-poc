import { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { getTierMeta, TIERS, TUTOR_INCENTIVES } from '../constants/tierMeta';

/**
 * IncentiveDashboard — the incentive schedule from REVENUE_MODEL §5.1, rendered
 * as a checklist the tutor can scan for "what can I earn next?". Each row is
 * tier-gated per the model, with amount, cadence, trigger, and eligibility
 * clearly shown.
 */
export default function IncentiveDashboard() {
    const [data, setData] = useState(null);

    useEffect(() => {
        api.get('/incentives/summary')
            .then((r) => setData(r.data))
            .catch(() => setData(null));
    }, []);

    const tier = data?.tier || 'starter';
    const meta = getTierMeta(tier);
    const tierIdx = TIERS.indexOf(tier);

    const rows = useMemo(() => TUTOR_INCENTIVES.map((row) => {
        const eligible = row.tiers.includes(tier);
        const minTier = row.tiers[0];
        const minTierLabel = getTierMeta(minTier).label;
        return { ...row, eligible, minTierLabel };
    }), [tier]);

    const eligibleCount = rows.filter((r) => r.eligible).length;
    const potentialMonthly = rows
        .filter((r) => r.eligible && (r.cadence === 'monthly' || r.cadence === 'per student'))
        .reduce((s, r) => s + r.amount, 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="text-xl font-extrabold text-navy-950 tracking-tight">Rewards &amp; Incentives</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        What you can earn beyond session fees. Amounts are fixed by REVENUE_MODEL §5.1 — no bait, no fine print.
                    </p>
                </div>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${meta.chip}`}>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Your tier</span>
                    <span className="text-sm font-extrabold">{meta.label}</span>
                </div>
            </div>

            {/* Earnings snapshot + monthly potential */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <HeadlineStat
                    label="Total bonus earned"
                    value={`₹${(data?.totalBonusEarned || data?.lifetimeIncentivesPaid || 0).toLocaleString('en-IN')}`}
                    sub="Lifetime"
                />
                <HeadlineStat
                    label="Incentives unlocked for your tier"
                    value={`${eligibleCount}/${TUTOR_INCENTIVES.length}`}
                    sub={tierIdx < 3 ? `${TUTOR_INCENTIVES.length - eligibleCount} more at higher tiers` : 'All unlocked'}
                />
                <HeadlineStat
                    label="Potential recurring / month"
                    value={`₹${potentialMonthly.toLocaleString('en-IN')}`}
                    sub="Perfect month + volume + 1 cliff"
                    accent
                />
            </div>

            {/* Incentive schedule */}
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-sm font-bold text-navy-950">Incentive schedule</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                        Greyed rows unlock as you progress through tiers. Paid after the triggering event — never upfront.
                    </p>
                </div>
                <ul className="divide-y divide-gray-100">
                    {rows.map((row) => (
                        <IncentiveRow key={row.key} row={row} />
                    ))}
                </ul>
            </div>

            {/* Guardrails (REVENUE_MODEL §10) */}
            <div className="bg-royal/5 border border-royal/20 rounded-2xl px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-widest text-royal-dark mb-1.5">How bonuses pay out</p>
                <ul className="text-xs text-royal space-y-1 leading-relaxed list-disc pl-4">
                    <li>Paid with the next <strong>Friday weekly payout</strong> after the trigger is met.</li>
                    <li>Every ₹ is funded by commission already collected — zero upfront promises.</li>
                    <li>Tier progress counts only confirmed on-platform sessions; off-platform sessions do not count.</li>
                    <li>3-month and 6-month cliffs are paid <strong>per student</strong> — 5 retained students = 5× the bonus.</li>
                </ul>
            </div>
        </div>
    );
}

function IncentiveRow({ row }) {
    const meta = getTierMeta(row.tiers[0]);
    return (
        <li className={`px-5 py-4 flex items-start gap-4 ${row.eligible ? '' : 'opacity-55'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${row.eligible ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                {row.eligible ? (
                    <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                ) : (
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <p className={`text-sm font-bold ${row.eligible ? 'text-navy-950' : 'text-gray-600'}`}>{row.label}</p>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">· {row.cadence}</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{row.desc}</p>
                {!row.eligible && (
                    <p className="text-[11px] font-semibold mt-1" style={{ color: 'rgb(71 85 105)' }}>
                        <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${meta.accent}`} />
                        Unlocks at {row.minTierLabel} tier
                    </p>
                )}
            </div>
            <div className="text-right flex-shrink-0">
                <p className={`text-base font-extrabold ${row.eligible ? 'text-emerald-700' : 'text-gray-400'}`}>
                    +₹{row.amount.toLocaleString('en-IN')}
                </p>
            </div>
        </li>
    );
}

function HeadlineStat({ label, value, sub, accent }) {
    return (
        <div className={`rounded-2xl border px-5 py-4 ${accent ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100'}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</p>
            <p className={`text-2xl font-extrabold mt-1 ${accent ? 'text-emerald-800' : 'text-navy-950'}`}>{value}</p>
            {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
    );
}
