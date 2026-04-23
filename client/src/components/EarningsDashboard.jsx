import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { getTierMeta } from '../constants/tierMeta';

/**
 * EarningsDashboard
 * -----------------
 * Revenue-model-accurate earnings view for tutors.
 *
 * Removed (intentional):
 *   - "Log cash payment" button. Cash payments violate TSA §3 non-circumvention
 *     and REVENUE_MODEL §5.3 ("No subsidized rates — platform rate = tutor's
 *     listed rate"). A tutor cannot self-report off-platform earnings — it
 *     would corrupt tier progression and the commission base.
 *
 * Added:
 *   - Plan mix (Flex / Monthly / Committed / Intensive) from completed bookings
 *   - Soft-cap session awareness (sessions 21–24 free at tutor's discretion, per §3.3)
 *   - Non-circumvention reminder card
 *   - Month-on-month bar chart
 *   - Confirmed payments table with status chips (Razorpay only)
 */

const PERIODS = [
    { label: 'All time', value: 'all' },
    { label: 'This year', value: 'year' },
    { label: 'This month', value: 'month' },
    { label: 'This week', value: 'week' }
];

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function EarningsDashboard() {
    const [period, setPeriod] = useState('month');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadEarnings = useCallback(async (p) => {
        setLoading(true);
        try {
            const { data } = await api.get(`/payments/tutor-earnings?period=${p}`);
            setData(data);
        } catch { /* empty state handled in view */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadEarnings(period); }, [period, loadEarnings]);

    const tier = data?.tier || 'starter';
    const meta = getTierMeta(tier);

    const monthly = data?.monthlyBreakdown || [];
    const maxEarning = monthly.length ? Math.max(...monthly.map((m) => m.earnings), 1) : 1;
    const payments = data?.confirmedPayments || [];

    // Plan mix: client-side group-by on the payments list with a bookingCategory/plan field.
    const planMix = useMemo(() => {
        const by = {};
        for (const p of payments) {
            const plan = p.plan || p.bookingCategory || 'session';
            by[plan] = (by[plan] || 0) + 1;
        }
        return by;
    }, [payments]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                    <h2 className="text-xl font-extrabold text-navy-950 tracking-tight">Earnings &amp; payouts</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Razorpay-confirmed income + estimated from completed sessions this period.
                    </p>
                </div>
                <div className="inline-flex bg-gray-100 rounded-xl p-1 self-start sm:self-auto">
                    {PERIODS.map((p) => (
                        <button
                            key={p.value}
                            onClick={() => setPeriod(p.value)}
                            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                period === p.value
                                    ? 'bg-white text-navy-950 shadow-sm'
                                    : 'text-gray-500 hover:text-navy-950'
                            }`}>
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stat row */}
            {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-[96px]" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Stat
                        label="Confirmed earnings"
                        value={fmt(data?.confirmedEarnings)}
                        sub="via Razorpay"
                        accent />
                    <Stat
                        label="Estimated earnings"
                        value={fmt(data?.estimatedEarnings)}
                        sub={data?.hourlyRate ? `@ ₹${data.hourlyRate}/hr` : 'From completed sessions'} />
                    <Stat
                        label="Sessions completed"
                        value={data?.completedSessions || 0}
                        sub={data?.softCapSoonCount ? `${data.softCapSoonCount} at soft-cap` : 'This period'} />
                    <Stat
                        label={`Commission @ ${meta.commission}%`}
                        value={fmt(data?.commissionWithheld)}
                        sub={`You keep ${100 - meta.commission}% of gross`}
                        tier={tier} />
                </div>
            )}

            {/* Non-circumvention notice — replaces "Log cash payment" */}
            <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-amber-800" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
                    </svg>
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold text-amber-950">All payments flow through the platform</p>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                        TutNet doesn't log cash or off-platform payments. Every session you deliver on-platform counts toward your
                        <span className="font-semibold"> tier progression</span>, retention bonuses, and the
                        <span className="font-semibold"> ₹1,500/month volume bonus</span>. Off-platform payments don't —
                        and they violate <span className="font-semibold">TSA §3</span>. If a parent asks you to go off-platform,
                        <a href="/tutor-agreement" className="underline font-semibold ml-1 hover:text-amber-900">report it</a>
                        and earn a goodwill token.
                    </p>
                </div>
            </div>

            {/* Plan mix + Monthly chart row */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-4">
                {/* Monthly earnings bar chart */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5">
                    <div className="flex items-end justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-bold text-navy-950">Monthly earnings · last 6 months</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Confirmed Razorpay receipts, rolled up by month.</p>
                        </div>
                    </div>
                    {monthly.length === 0 ? (
                        <div className="text-center py-10 text-sm text-gray-400">No earnings yet this period.</div>
                    ) : (
                        <>
                            <div className="flex items-end gap-2 h-40">
                                {monthly.map((m, i) => {
                                    const pct = Math.round((m.earnings / maxEarning) * 100);
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                                            <span className="text-[10px] text-gray-400 font-semibold opacity-0 group-hover:opacity-100 absolute -top-4">
                                                {fmt(m.earnings)}
                                            </span>
                                            <div className="w-full rounded-t-lg bg-gradient-to-t from-royal to-royal-light transition-all"
                                                 style={{ height: `${Math.max(pct, 3)}%` }} />
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex items-end gap-2 mt-2">
                                {monthly.map((m, i) => (
                                    <div key={i} className="flex-1 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                        {m.label || m.month || '-'}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Plan mix */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-navy-950">Booking mix</h3>
                    <p className="text-xs text-gray-500 mt-0.5 mb-3">Completed bookings by plan this period.</p>
                    {Object.keys(planMix).length === 0 ? (
                        <p className="text-sm text-gray-400 py-6 text-center">No completed bookings yet.</p>
                    ) : (
                        <div className="space-y-2.5">
                            {Object.entries(planMix)
                                .sort((a, b) => b[1] - a[1])
                                .map(([plan, count]) => {
                                    const total = Object.values(planMix).reduce((s, n) => s + n, 0);
                                    const pct = Math.round((count / total) * 100);
                                    return (
                                        <div key={plan}>
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span className="font-semibold text-navy-950 capitalize">{plan}</span>
                                                <span className="text-gray-500">{count} · {pct}%</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${planBarColor(plan)}`} style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                    <p className="text-[11px] text-gray-400 mt-4 leading-relaxed">
                        <strong className="text-navy-950">Soft-cap tip:</strong> Monthly / Committed plans cover up to 20 sessions;
                        sessions 21–24 are free to deliver. This eliminates parent incentive to buy extra sessions in cash.
                    </p>
                </div>
            </div>

            {/* Confirmed payments table */}
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-navy-950">Confirmed payments</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Every Razorpay success tied to a completed booking. Every ₹ flows through here — no off-platform logging.
                    </p>
                </div>
                {payments.length === 0 ? (
                    <div className="text-center py-10 text-sm text-gray-400">No confirmed payments yet.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Date', 'Student', 'Subject', 'Plan', 'Gross', 'Commission', 'Net', 'Status'].map((h) => (
                                        <th key={h} className="py-2.5 px-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {payments.map((p) => {
                                    const gross = p.amount || 0;
                                    const commRate = p.commissionRate ?? meta.commission;
                                    const commAmt = p.commissionAmount ?? Math.round(gross * commRate / 100);
                                    const net = gross - commAmt;
                                    const refund = p.refundAmount > 0;
                                    return (
                                        <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">
                                                {new Date(p.paidAt || p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                                            </td>
                                            <td className="py-3 px-4 text-sm font-medium text-navy-950">{p.studentName || p.studentId?.name || '—'}</td>
                                            <td className="py-3 px-4 text-xs text-gray-600">{p.subject || p.bookingId?.subject || '—'}</td>
                                            <td className="py-3 px-4 text-xs">
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${planChipClass(p.plan || p.bookingCategory)}`}>
                                                    {p.plan || p.bookingCategory || 'session'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-sm font-semibold text-navy-950">{fmt(gross)}</td>
                                            <td className="py-3 px-4 text-xs text-gray-500">
                                                −{fmt(commAmt)} <span className="text-[10px] text-gray-400">({commRate}%)</span>
                                            </td>
                                            <td className="py-3 px-4 text-sm font-bold text-emerald-700">{fmt(net)}</td>
                                            <td className="py-3 px-4">
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                    refund ? 'bg-rose-100 text-rose-700'
                                                        : p.status === 'completed' ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {refund ? 'Refunded' : p.status || 'done'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Subcomponents ───────────────────────────────────────────────────────

function Stat({ label, value, sub, accent, tier }) {
    const meta = tier ? getTierMeta(tier) : null;
    const accentCls = meta
        ? `border-2 ${meta.border}`
        : accent ? 'border-royal/30' : 'border-gray-100';
    const valueCls = meta
        ? meta.text
        : accent ? 'text-royal-dark' : 'text-navy-950';
    return (
        <div className={`bg-white rounded-2xl border p-5 ${accentCls}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</p>
            <p className={`text-2xl font-extrabold mt-1 ${valueCls}`}>{value}</p>
            {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
    );
}

function planBarColor(plan) {
    return {
        flex:      'bg-slate-400',
        monthly:   'bg-royal',
        committed: 'bg-emerald-500',
        intensive: 'bg-amber-500',
        session:   'bg-slate-300',
        trial:     'bg-gray-300',
        permanent: 'bg-royal',
        dedicated: 'bg-emerald-500'
    }[plan] || 'bg-gray-300';
}

function planChipClass(plan) {
    return {
        flex:      'bg-slate-100 text-slate-700',
        monthly:   'bg-royal/10 text-royal-dark',
        committed: 'bg-emerald-100 text-emerald-800',
        intensive: 'bg-amber-100 text-amber-800',
        session:   'bg-slate-100 text-slate-700',
        trial:     'bg-gray-100 text-gray-600',
        permanent: 'bg-royal/10 text-royal-dark',
        dedicated: 'bg-emerald-100 text-emerald-800'
    }[plan] || 'bg-gray-100 text-gray-600';
}
