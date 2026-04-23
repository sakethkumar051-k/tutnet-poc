import { useEffect, useState } from 'react';
import api from '../utils/api';

/**
 * TutorPayoutsPanel — weekly payout ledger for the logged-in tutor.
 * Shows summary totals + a breakdown of each payout period with commission,
 * bonuses, reserve held, and net payable.
 */
export default function TutorPayoutsPanel() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expanded, setExpanded] = useState(null);

    useEffect(() => {
        api.get('/payouts/mine')
            .then(({ data }) => setData(data))
            .catch((err) => {
                setError(err?.response?.data?.message || 'Could not load payouts');
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="text-center py-10 text-gray-400">Loading payouts…</div>;
    if (error) {
        return (
            <div className="bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 text-sm text-rose-700">
                {error}
            </div>
        );
    }
    if (!data) return null;

    const { ledger = [], summary = {} } = data;

    return (
        <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Paid out (lifetime)" value={summary.paidTotal} tone="lime" />
                <Stat label="Scheduled" value={summary.scheduledTotal} tone="royal" />
                <Stat label="Processing" value={summary.processingTotal} />
                <Stat label="Reserve held" value={summary.totalReserveHeld} tone="yellow" />
            </div>

            {/* Payout ledger */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-gray-200">
                    <h3 className="text-sm font-bold text-navy-950">Payout ledger</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Weekly payouts run every Friday. Completed sessions from prior weeks get included; the current week's sessions go in next Friday's run.
                    </p>
                </div>
                {ledger.length === 0 ? (
                    <div className="text-center py-12 text-sm text-gray-400">
                        No payouts yet. They'll appear here once you complete paid sessions.
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                {['Period', 'Gross', 'Commission', 'Bonuses', 'Reserve', 'Net payable', 'Status', ''].map((h) => (
                                    <th key={h} className="py-2.5 px-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {ledger.map((p) => (
                                <>
                                    <tr key={p._id} className="hover:bg-gray-50">
                                        <td className="py-2.5 px-3 font-medium text-navy-950">{p.periodLabel || fmtDate(p.periodStart)}</td>
                                        <td className="py-2.5 px-3 text-gray-700">₹{(p.grossEarnings || 0).toLocaleString('en-IN')}</td>
                                        <td className="py-2.5 px-3 text-gray-500">
                                            −₹{(p.commissionAmount || 0).toLocaleString('en-IN')}
                                            <span className="text-[10px] text-gray-400"> ({p.commissionRate}%)</span>
                                        </td>
                                        <td className="py-2.5 px-3 text-lime-dark">+₹{(p.incentiveBonuses || 0).toLocaleString('en-IN')}</td>
                                        <td className="py-2.5 px-3 text-yellow-700">₹{(p.reserveHeld || 0).toLocaleString('en-IN')}</td>
                                        <td className="py-2.5 px-3 font-bold text-navy-950">₹{(p.netPayable || 0).toLocaleString('en-IN')}</td>
                                        <td className="py-2.5 px-3"><StatusBadge status={p.status} /></td>
                                        <td className="py-2.5 px-3">
                                            <button onClick={() => setExpanded(expanded === p._id ? null : p._id)}
                                                className="text-[11px] font-semibold text-royal hover:text-royal-dark">
                                                {expanded === p._id ? 'Hide' : 'Details'}
                                            </button>
                                        </td>
                                    </tr>
                                    {expanded === p._id && (
                                        <tr key={`${p._id}-x`} className="bg-gray-50/60">
                                            <td colSpan={8} className="px-3 py-3">
                                                <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-1 text-xs">
                                                    <KV k="Period start" v={fmtDate(p.periodStart)} />
                                                    <KV k="Period end"   v={fmtDate(p.periodEnd)} />
                                                    <KV k="Scheduled"    v={p.scheduledAt ? fmtDT(p.scheduledAt) : '—'} />
                                                    <KV k="Processed"    v={p.processedAt ? fmtDT(p.processedAt) : '—'} />
                                                    <KV k="Paid"         v={p.paidAt ? fmtDT(p.paidAt) : '—'} />
                                                    <KV k="Mode"         v={p.mode || '—'} />
                                                    <KV k="Sessions"     v={p.sessionIds?.length || 0} />
                                                    <KV k="Deductions"   v={`₹${(p.deductions || 0).toLocaleString('en-IN')}`} />
                                                    {p.failureReason && <KV k="Failure" v={p.failureReason} />}
                                                    {p.bankSnapshot?.accountNumberLast4 && (
                                                        <KV k="Bank" v={`**** ${p.bankSnapshot.accountNumberLast4} (${p.bankSnapshot.ifsc || ''})`} />
                                                    )}
                                                    {p.externalPayoutId && <KV k="Gateway ID" v={p.externalPayoutId} mono />}
                                                </dl>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <p className="text-xs text-gray-400">
                Reserve held protects us against chargebacks — it releases ~60 days after each period. Questions about a specific payout? Contact support with the period label.
            </p>
        </div>
    );
}

function Stat({ label, value, tone }) {
    const toneCls = {
        lime: 'text-lime-dark',
        royal: 'text-royal-dark',
        yellow: 'text-yellow-700'
    }[tone] || 'text-navy-950';
    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{label}</p>
            <p className={`text-xl font-extrabold mt-0.5 ${toneCls}`}>₹{(value || 0).toLocaleString('en-IN')}</p>
        </div>
    );
}

function StatusBadge({ status }) {
    const map = {
        paid: 'bg-lime/30 text-navy-950',
        scheduled: 'bg-yellow-100 text-yellow-800',
        processing: 'bg-royal/10 text-royal-dark',
        failed: 'bg-rose-100 text-rose-700',
        reversed: 'bg-rose-100 text-rose-700',
        held: 'bg-gray-100 text-gray-700'
    };
    return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${map[status] || 'bg-gray-100 text-gray-700'}`}>{status}</span>;
}

function KV({ k, v, mono }) {
    return (
        <div className="flex gap-2 min-w-0">
            <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-widest w-[100px] flex-shrink-0 pt-0.5">{k}</dt>
            <dd className={`text-xs text-gray-700 min-w-0 flex-1 break-words ${mono ? 'font-mono text-[10px]' : ''}`}>{v}</dd>
        </div>
    );
}

function fmtDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtDT(d) {
    if (!d) return '';
    return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
