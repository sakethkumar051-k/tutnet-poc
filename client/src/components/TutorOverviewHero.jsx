import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuthStore } from '../stores/authStore';
import { getTierMeta } from '../constants/tierMeta';

/**
 * TutorOverviewHero — what the tutor sees first every day.
 *
 * Headline tier strip + today's priorities + the coming Friday payout preview
 * + retention cliff next-up + quick actions. This is the number-one surface,
 * so every element is actionable, not decorative.
 */
export default function TutorOverviewHero() {
    const user = useAuthStore((s) => s.user);
    const [incentives, setIncentives] = useState(null);
    const [payouts, setPayouts] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const [inc, pay, bk] = await Promise.all([
                    api.get('/incentives/summary').catch(() => ({ data: null })),
                    api.get('/payouts/mine').catch(() => ({ data: null })),
                    api.get('/bookings/mine').catch(() => ({ data: [] }))
                ]);
                setIncentives(inc.data);
                setPayouts(pay.data);
                setBookings(Array.isArray(bk.data) ? bk.data : (bk.data?.bookings || []));
            } finally { setLoading(false); }
        })();
    }, []);

    const tier = incentives?.tier || 'starter';
    const meta = getTierMeta(tier);
    const firstName = (user?.name || 'there').split(' ')[0];

    const now = Date.now();

    const nextSession = useMemo(() => {
        const future = bookings
            .filter((b) => b.status === 'approved' && b.sessionDate && new Date(b.sessionDate).getTime() > now)
            .sort((a, b) => new Date(a.sessionDate) - new Date(b.sessionDate));
        return future[0] || null;
    }, [bookings, now]);

    const upcomingCount = useMemo(() => bookings.filter((b) =>
        b.status === 'approved' && b.sessionDate && new Date(b.sessionDate).getTime() > now
    ).length, [bookings, now]);

    const pendingRequests = useMemo(() =>
        bookings.filter((b) => b.status === 'pending').length, [bookings]);

    // Upcoming Friday payout preview from the scheduled ledger entries
    const nextPayout = useMemo(() => {
        const ledger = payouts?.ledger || [];
        const scheduled = ledger.find((p) => p.status === 'scheduled' || p.status === 'processing');
        return scheduled || null;
    }, [payouts]);

    // Days to next Friday
    const daysToFriday = (() => {
        const today = new Date();
        const day = today.getDay();
        const diff = (5 - day + 7) % 7 || 7;
        return diff;
    })();

    return (
        <div className="space-y-6">
            {/* Tier-branded hero */}
            <div className={`relative overflow-hidden rounded-3xl border-2 ${meta.border} ${meta.glow} shadow-xl`}>
                {/* Decorative blobs */}
                <div className={`absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-40 blur-3xl ${meta.accentSoft}`} />
                <div className={`absolute -bottom-20 -left-10 w-56 h-56 rounded-full opacity-25 blur-3xl ${meta.accentSoft}`} />

                <div className={`relative bg-gradient-to-br ${meta.gradient} px-6 sm:px-10 py-7 sm:py-8`}>
                    <div className="flex flex-wrap items-start justify-between gap-5">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${meta.chip}`}>
                                    <StarRow filled={meta.stars} size="xs" />
                                    {meta.label}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                    Commission {meta.commission}%
                                </span>
                            </div>
                            <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${meta.text}`}>
                                Welcome back, {firstName}
                            </h1>
                            <p className={`text-sm mt-1.5 ${meta.textSoft}`}>
                                {upcomingCount > 0
                                    ? `You have ${upcomingCount} upcoming session${upcomingCount === 1 ? '' : 's'}`
                                    : 'No upcoming sessions. Open your schedule to attract new students.'}
                                {pendingRequests > 0 && <> · <strong>{pendingRequests} pending request{pendingRequests === 1 ? '' : 's'}</strong> to respond to.</>}
                            </p>
                        </div>

                        {/* This-week earnings snapshot */}
                        <div className="text-right">
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${meta.textSoft}`}>This week</p>
                            <p className={`text-3xl sm:text-4xl font-black tracking-tighter mt-0.5 ${meta.text}`}>
                                ₹{((payouts?.summary?.scheduledTotal || 0) + (payouts?.summary?.processingTotal || 0)).toLocaleString('en-IN')}
                            </p>
                            <p className={`text-xs ${meta.textSoft} mt-0.5`}>
                                Paying out {daysToFriday === 7 ? 'Friday' : daysToFriday === 1 ? 'tomorrow' : `in ${daysToFriday} days`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Action strip under hero */}
                <div className="bg-white px-6 sm:px-10 py-4 flex flex-wrap items-center gap-2 border-t border-gray-100">
                    <Link to="/tutor-dashboard?tab=sessions"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-royal hover:bg-royal-dark text-white text-xs font-bold rounded-lg">
                        View sessions →
                    </Link>
                    {pendingRequests > 0 && (
                        <Link to="/tutor-dashboard?tab=sessions"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg">
                            Respond to {pendingRequests} request{pendingRequests === 1 ? '' : 's'}
                        </Link>
                    )}
                    <Link to="/tutor-dashboard?tab=schedule"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50">
                        Update availability
                    </Link>
                    <Link to="/tutor-dashboard?tab=earnings"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50">
                        View earnings
                    </Link>
                </div>
            </div>

            {/* 3-column grid: Next session · Weekly payout · Retention cliff */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Next session */}
                <InfoCard
                    title="Next session"
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>}
                    accent="royal">
                    {loading ? (
                        <div className="h-16 animate-pulse bg-gray-50 rounded" />
                    ) : nextSession ? (
                        <>
                            <p className="text-lg font-extrabold text-navy-950 truncate">{nextSession.subject}</p>
                            <p className="text-sm text-gray-600 truncate">with {nextSession.studentId?.name || 'student'}</p>
                            <p className="text-[11px] text-gray-400 mt-2">
                                {new Date(nextSession.sessionDate).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                {' · '}
                                <Countdown to={nextSession.sessionDate} now={now} />
                            </p>
                            {nextSession.sessionJoinUrl && (
                                <Link to={`/session/${nextSession._id}`}
                                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg">
                                    Join video room
                                </Link>
                            )}
                        </>
                    ) : (
                        <p className="text-sm text-gray-400 py-4">No upcoming sessions scheduled.</p>
                    )}
                </InfoCard>

                {/* Weekly payout preview */}
                <InfoCard
                    title="Friday payout"
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>}
                    accent="success">
                    {loading ? (
                        <div className="h-16 animate-pulse bg-gray-50 rounded" />
                    ) : nextPayout ? (
                        <>
                            <p className="text-3xl font-black text-emerald-700 tracking-tighter">
                                ₹{(nextPayout.netPayable || 0).toLocaleString('en-IN')}
                            </p>
                            <div className="text-[11px] text-gray-500 mt-1 space-y-0.5">
                                <p>Gross: ₹{(nextPayout.grossEarnings || 0).toLocaleString('en-IN')}</p>
                                <p>Commission: −₹{(nextPayout.commissionAmount || 0).toLocaleString('en-IN')} ({nextPayout.commissionRate}%)</p>
                                {nextPayout.incentiveBonuses > 0 && <p className="text-emerald-700">Bonuses: +₹{nextPayout.incentiveBonuses.toLocaleString('en-IN')}</p>}
                                {nextPayout.reserveHeld > 0 && <p className="text-amber-700">Reserve: −₹{nextPayout.reserveHeld.toLocaleString('en-IN')}</p>}
                            </div>
                            <p className="text-[11px] text-gray-400 mt-2">{nextPayout.periodLabel}</p>
                        </>
                    ) : (
                        <div>
                            <p className="text-lg font-extrabold text-navy-950">Nothing scheduled</p>
                            <p className="text-xs text-gray-500 mt-1">Complete paid sessions this week to see a payout here.</p>
                        </div>
                    )}
                </InfoCard>

                {/* Incentives snapshot */}
                <InfoCard
                    title="Pending bonuses"
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>}
                    accent="tier"
                    tier={tier}>
                    {loading ? (
                        <div className="h-16 animate-pulse bg-gray-50 rounded" />
                    ) : (
                        <>
                            <p className="text-3xl font-black text-navy-950 tracking-tighter">
                                ₹{(incentives?.pendingBonusTotal || 0).toLocaleString('en-IN')}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                Accrued but not yet paid — rolls into next Friday's payout.
                            </p>
                            <Link to="/tutor-dashboard?tab=earnings"
                                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-royal hover:text-royal-dark">
                                See all incentives →
                            </Link>
                        </>
                    )}
                </InfoCard>
            </div>
        </div>
    );
}

// ── Subcomponents ───────────────────────────────────────────────────────

function InfoCard({ title, icon, children, accent = 'gray', tier }) {
    const borderCls = {
        royal:   'border-royal/30',
        success: 'border-emerald-300',
        amber:   'border-amber-300',
        gray:    'border-gray-100',
        tier:    tier ? getTierMeta(tier).border : 'border-gray-100'
    }[accent];
    const iconBgCls = {
        royal:   'bg-royal/10 text-royal-dark',
        success: 'bg-emerald-100 text-emerald-700',
        amber:   'bg-amber-100 text-amber-800',
        gray:    'bg-gray-100 text-gray-600',
        tier:    tier ? 'bg-white ' + getTierMeta(tier).star : 'bg-gray-100 text-gray-600'
    }[accent];
    return (
        <div className={`bg-white border-2 rounded-2xl p-5 ${borderCls}`}>
            <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBgCls}`}>
                    {icon}
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{title}</p>
            </div>
            {children}
        </div>
    );
}

function StarRow({ filled, size = 'sm' }) {
    const cls = size === 'xs' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5';
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4].map((n) => (
                <svg key={n} className={`${cls} ${n <= filled ? 'fill-current' : 'opacity-25'}`} viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
            ))}
        </div>
    );
}

function Countdown({ to, now }) {
    const diff = new Date(to).getTime() - (now ?? 0);
    const hrs = Math.round(diff / 3_600_000);
    if (hrs < 1) return <span className="text-amber-700 font-bold">in minutes</span>;
    if (hrs < 24) return <span className="text-amber-700 font-bold">in {hrs}h</span>;
    const days = Math.round(hrs / 24);
    return <span className="font-semibold">in {days}d</span>;
}
