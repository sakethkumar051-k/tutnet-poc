import { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';

/**
 * StudentFinanceOverview — single-glance money view for parents/students.
 *
 * Shows:
 *   - Total paid lifetime
 *   - Total refunded
 *   - Credit balance (unapplied platform credit)
 *   - Upcoming dues (unpaid approved bookings + subscriptions ending soon)
 *   - Active subscription usage (sessions remaining per plan)
 *   - Recent transactions (last 5 with invoice-download links)
 *
 * Meant to sit above the detailed FeeTransparency table.
 */
export default function StudentFinanceOverview() {
    const [state, setState] = useState({ loading: true });

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [paymentsRes, bookingsRes] = await Promise.all([
                    api.get('/payments/student-history').catch(() => ({ data: [] })),
                    api.get('/bookings/mine').catch(() => ({ data: [] }))
                ]);
                if (cancelled) return;
                const payments = Array.isArray(paymentsRes.data) ? paymentsRes.data : [];
                const bookings = Array.isArray(bookingsRes.data)
                    ? bookingsRes.data
                    : (bookingsRes.data?.bookings || []);

                // Credits — fetch best-effort from incentives (these are non-critical if absent)
                let credits = { balance: 0, applied: 0, ledger: [] };
                try {
                    const { data } = await api.get('/incentives/summary').catch(() => ({ data: null }));
                    if (data?.parent || data?.platformCredit) {
                        credits = {
                            balance: data.parent?.creditBalance || data.platformCredit?.accrued || 0,
                            applied: data.parent?.creditApplied || data.platformCredit?.applied || 0,
                            ledger: data.parent?.recent || []
                        };
                    }
                } catch { /* silent */ }

                if (cancelled) return;
                setState({ loading: false, payments, bookings, credits });
            } catch (err) {
                if (cancelled) return;
                setState({ loading: false, error: err?.message || 'Failed to load' });
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const derived = useMemo(() => {
        if (state.loading || !state.payments) return null;
        const { payments, bookings } = state;

        const totalPaid = payments
            .filter((p) => p.status === 'completed' || p.status === 'partially_refunded')
            .reduce((sum, p) => sum + (p.amount || 0) - (p.refundAmount || 0), 0);
        const totalRefunded = payments.reduce((sum, p) => sum + (p.refundAmount || 0), 0);
        const transactionCount = payments.filter((p) => p.status !== 'created' && p.status !== 'failed').length;

        // Unpaid approved bookings (dues)
        const unpaid = bookings.filter((b) =>
            ['approved', 'pending'].includes(b.status) &&
            !b.isPaid &&
            b.bookingCategory !== 'trial' &&
            b.lockedHourlyRate > 0
        );
        const duesTotal = unpaid.reduce((sum, b) => sum + (b.lockedHourlyRate || 0), 0);

        // Active subscription/dedicated bookings with session allowance
        const subs = bookings.filter((b) =>
            ['permanent', 'dedicated'].includes(b.bookingCategory) &&
            b.status === 'approved' &&
            typeof b.sessionAllowance === 'number' &&
            b.sessionAllowance > 0
        );

        // This month's spend
        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
        const thisMonthPaid = payments
            .filter((p) => p.status === 'completed' && new Date(p.paidAt || p.createdAt) >= monthStart)
            .reduce((sum, p) => sum + (p.amount || 0) - (p.refundAmount || 0), 0);

        return { totalPaid, totalRefunded, transactionCount, unpaid, duesTotal, subs, thisMonthPaid };
    }, [state]);

    if (state.loading) {
        return (
            <div className="bg-white border border-gray-100 rounded-3xl p-6 animate-pulse">
                <div className="h-6 w-40 bg-gray-100 rounded mb-4" />
                <div className="grid grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-20 bg-gray-50 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }
    if (!derived) return null;

    const { totalPaid, totalRefunded, transactionCount, unpaid, duesTotal, subs, thisMonthPaid } = derived;
    const creditBalance = state.credits?.balance || 0;
    const now = Date.now();

    return (
        <div className="space-y-5">
            {/* Headline stat grid */}
            <div className="bg-gradient-to-br from-white to-royal/[0.03] border border-gray-100 rounded-3xl p-5 sm:p-6">
                <div className="flex items-start justify-between mb-5">
                    <div>
                        <h2 className="text-xl font-extrabold text-navy-950 tracking-tight">Your money at TutNet</h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {transactionCount === 0
                                ? 'No transactions yet. Book a session to get started.'
                                : `${transactionCount} transaction${transactionCount === 1 ? '' : 's'} across all sessions.`}
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <FinanceStat label="Paid lifetime" value={totalPaid} tone="navy" sub={thisMonthPaid > 0 ? `₹${thisMonthPaid.toLocaleString('en-IN')} this month` : null} />
                    <FinanceStat label="Credit balance" value={creditBalance} tone={creditBalance > 0 ? 'lime' : 'gray'} sub={creditBalance > 0 ? 'Applies automatically' : 'None earned yet'} />
                    <FinanceStat label="Outstanding dues" value={duesTotal} tone={duesTotal > 0 ? 'amber' : 'gray'} sub={unpaid.length ? `${unpaid.length} unpaid session${unpaid.length === 1 ? '' : 's'}` : 'All paid'} />
                    <FinanceStat label="Refunded lifetime" value={totalRefunded} tone="gray" sub={totalRefunded > 0 ? 'Credited back' : null} />
                </div>
            </div>

            {/* Unpaid dues call-to-action */}
            {unpaid.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <svg className="w-5 h-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <h3 className="text-base font-extrabold text-amber-900">Pending payments</h3>
                            </div>
                            <p className="text-sm text-amber-800">
                                You have {unpaid.length} booking{unpaid.length === 1 ? '' : 's'} awaiting payment totaling ₹{duesTotal.toLocaleString('en-IN')}. Pay now to confirm your seat.
                            </p>
                        </div>
                    </div>
                    <ul className="mt-3 space-y-2">
                        {unpaid.slice(0, 3).map((b) => (
                            <li key={b._id} className="flex items-center justify-between bg-white/70 border border-amber-100 rounded-lg px-3 py-2 text-xs">
                                <div className="min-w-0">
                                    <p className="font-semibold text-navy-950 truncate">
                                        {b.subject} · {b.tutorId?.name || 'tutor'}
                                    </p>
                                    <p className="text-gray-500">
                                        {b.sessionDate ? new Date(b.sessionDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : b.preferredSchedule || '—'}
                                    </p>
                                </div>
                                <span className="font-bold text-amber-800 whitespace-nowrap">₹{(b.lockedHourlyRate || 0).toLocaleString('en-IN')}</span>
                            </li>
                        ))}
                        {unpaid.length > 3 && (
                            <li className="text-xs text-amber-700 font-semibold">+ {unpaid.length - 3} more — see the payment table below</li>
                        )}
                    </ul>
                </div>
            )}

            {/* Active subscriptions / dedicated plans */}
            {subs.length > 0 && (
                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                    <h3 className="text-base font-extrabold text-navy-950 mb-1">Active plans</h3>
                    <p className="text-sm text-gray-500 mb-4">Sessions remaining across your subscriptions and dedicated packages.</p>
                    <div className="space-y-3">
                        {subs.map((s) => {
                            const used = s.sessionsConsumed || 0;
                            const total = s.sessionAllowance || 1;
                            const remaining = Math.max(0, total - used);
                            const pct = Math.min(100, Math.round((used / total) * 100));
                            const periodEnd = s.planPeriodEnd ? new Date(s.planPeriodEnd) : null;
                            const daysLeft = periodEnd ? Math.ceil((periodEnd - now) / (24 * 3600 * 1000)) : null;
                            return (
                                <div key={s._id} className="rounded-xl border border-gray-100 p-4 bg-gray-50/50">
                                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-navy-950 truncate">
                                                {s.subject}
                                                {s.tutorId?.name && <span className="text-gray-500 font-normal"> · {s.tutorId.name}</span>}
                                            </p>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mt-0.5">
                                                {s.bookingCategory}{s.plan ? ` · ${s.plan}` : ''}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-extrabold text-navy-950">{remaining} <span className="text-xs text-gray-400 font-normal">left</span></p>
                                            <p className="text-[11px] text-gray-500">{used}/{total} used</p>
                                        </div>
                                    </div>
                                    <div className="h-2 bg-white rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all ${remaining === 0 ? 'bg-rose-400' : remaining <= 3 ? 'bg-amber-400' : 'bg-lime-dark'}`}
                                            style={{ width: `${pct}%` }} />
                                    </div>
                                    {daysLeft !== null && (
                                        <p className="text-[11px] text-gray-500 mt-2">
                                            {daysLeft > 0 ? `Plan ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}` : 'Plan period ended — renew to continue'}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function FinanceStat({ label, value, sub, tone = 'navy' }) {
    const valueTone = {
        navy:  'text-navy-950',
        lime:  'text-lime-dark',
        amber: 'text-amber-700',
        gray:  'text-gray-400'
    }[tone] || 'text-navy-950';
    const bgTone = {
        navy:  'bg-white border-gray-100',
        lime:  'bg-lime/10 border-lime/30',
        amber: 'bg-amber-50 border-amber-200',
        gray:  'bg-white border-gray-100'
    }[tone] || 'bg-white border-gray-100';
    const displayValue = typeof value === 'number' ? `₹${value.toLocaleString('en-IN')}` : value;
    return (
        <div className={`rounded-2xl border p-4 ${bgTone}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</p>
            <p className={`text-2xl font-extrabold mt-1 ${valueTone}`}>{displayValue}</p>
            {sub && <p className="text-[10px] text-gray-400 mt-1">{sub}</p>}
        </div>
    );
}
