import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { getTierMeta, TIER_MODEL } from '../constants/tierMeta';

/**
 * TutorAnalyticsPanel — the "I'm running a business" view for tutors.
 *
 * Every tile is either a comparison (WoW %, vs last month, vs next tier) or
 * the ₹ value of the next concrete action. Data is pulled once from existing
 * endpoints and analysed client-side — we don't need a new aggregation
 * endpoint yet.
 */
export default function TutorAnalyticsPanel() {
    const [state, setState] = useState({ loading: true });

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const [inc, pay, bk, ear] = await Promise.all([
                api.get('/incentives/summary').catch(() => ({ data: null })),
                api.get('/payouts/mine').catch(() => ({ data: null })),
                api.get('/bookings/mine').catch(() => ({ data: [] })),
                api.get('/payments/tutor-earnings?period=year').catch(() => ({ data: null }))
            ]);
            if (cancelled) return;
            setState({
                loading: false,
                incentives: inc.data,
                payouts: pay.data,
                bookings: Array.isArray(bk.data) ? bk.data : (bk.data?.bookings || []),
                earnings: ear.data
            });
        })();
        return () => { cancelled = true; };
    }, []);

    const analytics = useMemo(() => state.loading ? null : computeAnalytics(state), [state]);

    if (state.loading) return <AnalyticsSkeleton />;
    if (!analytics) return null;

    const tier = state.incentives?.tier || 'starter';
    const meta = getTierMeta(tier);

    return (
        <div className="space-y-5">
            {/* Headline KPIs with deltas */}
            <section className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                <SectionHeader
                    eyebrow="Earnings analytics"
                    title="Your business this week"
                    action={<Link to="/tutor-dashboard?tab=earnings" className="text-xs font-bold text-royal hover:text-royal-dark">Full ledger →</Link>}
                />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <MetricTile
                        label="This week"
                        value={`₹${analytics.weekly.thisWeek.toLocaleString('en-IN')}`}
                        delta={analytics.weekly.deltaPct}
                        sub={`vs ₹${analytics.weekly.lastWeek.toLocaleString('en-IN')} last week`}
                        tone="royal"
                    />
                    <MetricTile
                        label="This month projection"
                        value={`₹${analytics.monthly.projection.toLocaleString('en-IN')}`}
                        sub={`${analytics.monthly.daysRemaining} days left · pacing from current run-rate`}
                        tone="navy"
                    />
                    <MetricTile
                        label="Avg ₹/session"
                        value={`₹${analytics.avgPerSession.toLocaleString('en-IN')}`}
                        sub={`After ${meta.commission}% commission`}
                        tone="muted"
                    />
                    <MetricTile
                        label="Active paying students"
                        value={analytics.activePayingStudents}
                        sub={analytics.activePayingStudents >= 5
                            ? '🎯 Volume bonus qualified'
                            : `${5 - analytics.activePayingStudents} more for ₹1,500 volume bonus`}
                        tone={analytics.activePayingStudents >= 5 ? 'success' : 'amber'}
                    />
                </div>
            </section>

            {/* Tier ladder — show ₹ impact of next tier */}
            <section className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                <SectionHeader
                    eyebrow="Upside"
                    title="What your next tier is worth"
                    action={<Link to="/tutor-dashboard?tab=earnings" className="text-xs font-bold text-royal hover:text-royal-dark">Incentive schedule →</Link>}
                />
                <TierLadder tier={tier} lifetimeGross={state.incentives?.lifetimeGrossEarnings || 0} />
            </section>

            {/* Bonus race — this month's active earnables */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <BonusRaceCard
                    title="Volume bonus"
                    amount={1500}
                    progress={Math.min(1, analytics.activePayingStudents / 5)}
                    progressLabel={`${analytics.activePayingStudents}/5 paying students`}
                    hint={analytics.activePayingStudents >= 5 ? 'On track — hold through month-end' : `Onboard ${5 - analytics.activePayingStudents} more active students this month`}
                    locked={!['silver', 'gold', 'platinum'].includes(tier)}
                    lockLabel="Unlocks at Silver tier" />

                <BonusRaceCard
                    title="Perfect month"
                    amount={300}
                    progress={analytics.perfectMonth.progress}
                    progressLabel={`${analytics.perfectMonth.missed} missed · ${analytics.perfectMonth.rating.toFixed(2)}★ avg`}
                    hint={analytics.perfectMonth.onTrack
                        ? 'On track. Keep missed sessions = 0 and rating ≥ 4.8.'
                        : analytics.perfectMonth.missed > 0
                            ? 'Missed already recorded this month — bonus will miss.'
                            : 'Lift avg rating to 4.8+ through month-end.'}
                    locked={!['silver', 'gold', 'platinum'].includes(tier)}
                    lockLabel="Unlocks at Silver tier" />

                <BonusRaceCard
                    title="Demo → paid conversion"
                    amount={150}
                    progress={analytics.demoConversion.rate}
                    progressLabel={`${analytics.demoConversion.converted}/${analytics.demoConversion.total || 0} trials converted`}
                    hint={analytics.demoConversion.total === 0
                        ? 'No recent trials. Accept trial bookings promptly to unlock.'
                        : analytics.demoConversion.rate >= 0.5
                            ? 'Great conversion. Each paid trial pays ₹150.'
                            : 'Send a warm intro message + a sharp first-session plan to lift conversion.'}
                />
            </section>

            {/* Retention pipeline — every active student with next cliff */}
            <section className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                <SectionHeader
                    eyebrow="Retention pipeline"
                    title="Cliffs in your future"
                    action={<Link to="/tutor-dashboard?tab=students" className="text-xs font-bold text-royal hover:text-royal-dark">All students →</Link>}
                />
                <p className="text-xs text-gray-500 -mt-3 mb-4 leading-relaxed">
                    Each row = one active student. Hit 3 months together → ₹1,000. Hit 6 months → ₹2,500. Paid <strong>per student</strong> — not once.
                </p>
                <RetentionPipeline students={analytics.students} tierEligible={['silver', 'gold', 'platinum'].includes(tier)} />
            </section>

            {/* Rating trend + quality signals */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <QualityCard
                    eyebrow="Rating trend"
                    title={analytics.rating.current ? `${analytics.rating.current.toFixed(2)}★ current average` : 'No ratings yet'}
                    delta={analytics.rating.delta}
                    deltaLabel="vs prior 30 days"
                    hint={
                        analytics.rating.delta >= 0.2 ? 'Momentum. Reviews drive search rank — you\'ll appear more.'
                            : analytics.rating.delta <= -0.2 ? 'Slipping. Ask satisfied parents for a review to correct the average.'
                                : 'Steady. Lift to 4.7+ to qualify for Platinum tier.'
                    }
                    meta={`${analytics.rating.count} review${analytics.rating.count === 1 ? '' : 's'} total`}
                />
                <QualityCard
                    eyebrow="Funnel"
                    title={`${Math.round(analytics.funnel.completionRate * 100)}% session completion`}
                    delta={null}
                    hint={
                        analytics.funnel.rebookRate === 0 ? 'No repeat bookings yet. Strong first sessions lead to rebooking.'
                            : `${Math.round(analytics.funnel.rebookRate * 100)}% of students rebook — industry benchmark is 60%.`
                    }
                    meta={`${analytics.funnel.completed} completed · ${analytics.funnel.cancelled} cancelled · ${analytics.funnel.rebooks} rebookings`}
                />
            </section>

            {/* Search visibility + profile */}
            {state.incentives && (
                <section className="bg-gradient-to-br from-royal/5 via-white to-royal/5 border border-royal/20 rounded-3xl p-6">
                    <SectionHeader
                        eyebrow="Visibility"
                        title="How students find you"
                        action={null}
                    />
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <MetricTile
                            label="Search impressions (wk)"
                            value={analytics.visibility.weekImpressions}
                            sub="Profile shown in search"
                            tone="royal"
                        />
                        <MetricTile
                            label="Avg impressions / tutor"
                            value="~65"
                            sub="Hyderabad base rate"
                            tone="muted"
                        />
                        <MetricTile
                            label="Profile completion"
                            value={`${analytics.visibility.profileCompletion}%`}
                            sub={analytics.visibility.profileCompletion >= 90 ? 'Top-bracket discoverability' : 'Hit 90%+ → 4× more impressions'}
                            tone={analytics.visibility.profileCompletion >= 90 ? 'success' : 'amber'}
                        />
                        <MetricTile
                            label="Risk score"
                            value={analytics.visibility.riskScore}
                            sub={analytics.visibility.riskScore === 0 ? '✓ Clean record' : 'Off-platform flags hurt ranking'}
                            tone={analytics.visibility.riskScore === 0 ? 'success' : 'danger'}
                        />
                    </div>
                </section>
            )}
        </div>
    );
}

// ─── Analytics computation ───────────────────────────────────────────────

function computeAnalytics({ incentives, payouts, bookings, earnings }) {
    const now = Date.now();
    const weekStart = now - 7 * 24 * 3_600_000;
    const prevWeekStart = now - 14 * 24 * 3_600_000;
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const prev30 = now - 30 * 24 * 3_600_000;
    const prev60 = now - 60 * 24 * 3_600_000;

    // Weekly earnings comparison from payouts ledger
    const ledger = payouts?.ledger || [];
    const thisWeekPayout = ledger.find((p) => new Date(p.periodEnd).getTime() >= weekStart);
    const lastWeekPayout = ledger.find((p) => {
        const e = new Date(p.periodEnd).getTime();
        return e < weekStart && e >= prevWeekStart;
    });
    const thisWeek = thisWeekPayout?.netPayable || 0;
    const lastWeek = lastWeekPayout?.netPayable || 0;
    const deltaPct = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;

    // Monthly projection at current pace
    const paidThisMonth = ledger
        .filter((p) => new Date(p.periodEnd).getTime() >= monthStart && p.status === 'paid')
        .reduce((s, p) => s + (p.netPayable || 0), 0);
    const dayOfMonth = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - dayOfMonth;
    const projection = dayOfMonth > 0 ? Math.round((paidThisMonth / dayOfMonth) * daysInMonth) : 0;

    // Completed paid bookings for counts
    const completed = bookings.filter((b) => b.status === 'completed');
    const completedPaid = completed.filter((b) => b.isPaid && b.bookingCategory !== 'trial');
    const avgPerSession = completedPaid.length
        ? Math.round(completedPaid.reduce((s, b) => s + (b.lockedHourlyRate || 0) * (1 - (b.commissionRate || 22) / 100), 0) / completedPaid.length)
        : (earnings?.confirmedEarnings && completedPaid.length ? Math.round(earnings.confirmedEarnings / completedPaid.length) : 0);

    // Active paying students = distinct studentId on non-trial paid bookings in the last 45 days
    const recent = bookings.filter((b) => b.isPaid && b.bookingCategory !== 'trial' && new Date(b.createdAt || b.sessionDate || 0).getTime() >= now - 45 * 24 * 3_600_000);
    const activePayingStudents = new Set(recent.map((b) => String(b.studentId?._id || b.studentId))).size;

    // Perfect month — count tutor-caused cancellations this month
    const thisMonthCancelled = bookings.filter((b) => b.status === 'cancelled' && new Date(b.sessionDate || 0).getTime() >= monthStart && b.cancelledBy === 'tutor');
    const missedThisMonth = thisMonthCancelled.length;
    const avgRating = incentives?.averageRating || 0;
    const perfectMonth = {
        missed: missedThisMonth,
        rating: avgRating,
        onTrack: missedThisMonth === 0 && avgRating >= 4.8,
        progress: missedThisMonth === 0 ? (avgRating >= 4.8 ? 1 : Math.min(0.9, avgRating / 4.8)) : 0
    };

    // Demo conversion (last 30 days)
    const trialsRecent = bookings.filter((b) => b.bookingCategory === 'trial' && new Date(b.createdAt || 0).getTime() >= prev30);
    const converted = trialsRecent.filter((b) => b.trialOutcome === 'converted').length;
    const demoConversion = {
        total: trialsRecent.length,
        converted,
        rate: trialsRecent.length ? converted / trialsRecent.length : 0
    };

    // Funnel
    const approved = bookings.filter((b) => ['approved', 'completed'].includes(b.status));
    const cancelledCount = bookings.filter((b) => b.status === 'cancelled').length;
    const studentBookingCounts = {};
    for (const b of completedPaid) {
        const key = String(b.studentId?._id || b.studentId);
        studentBookingCounts[key] = (studentBookingCounts[key] || 0) + 1;
    }
    const rebooks = Object.values(studentBookingCounts).filter((n) => n > 1).length;
    const uniqueCompletedStudents = Object.keys(studentBookingCounts).length || 1;
    const funnel = {
        completionRate: approved.length ? completed.length / approved.length : 0,
        rebookRate: uniqueCompletedStudents ? rebooks / uniqueCompletedStudents : 0,
        completed: completed.length,
        cancelled: cancelledCount,
        rebooks
    };

    // Rating trend — we don't have per-review timestamps here; fall back to zero delta
    const rating = {
        current: avgRating,
        delta: 0, // TODO: wire when reviews endpoint returns timestamps in the summary
        count: incentives?.totalReviews || 0
    };
    // Clean-room: if lifetimeReviews grew in last 30d we'd compute a delta. For now it's static.
    void prev30; void prev60;

    // Retention pipeline — active students with days to next cliff
    // Derived from bookings: first paid-completed → start date
    const studentStart = {};
    for (const b of completedPaid) {
        const key = String(b.studentId?._id || b.studentId);
        const name = b.studentId?.name || 'Student';
        const at = new Date(b.sessionDate || b.createdAt || 0).getTime();
        if (!studentStart[key] || at < studentStart[key].startedAt) {
            studentStart[key] = { name, startedAt: at };
        }
    }
    const students = Object.entries(studentStart)
        .map(([id, s]) => {
            const monthsActive = Math.floor((now - s.startedAt) / (30 * 24 * 3_600_000));
            const nextCliff = monthsActive < 3 ? { label: '3-month', bonus: 1000, monthsLeft: 3 - monthsActive }
                : monthsActive < 6 ? { label: '6-month', bonus: 2500, monthsLeft: 6 - monthsActive }
                    : { label: '6-month earned', bonus: 0, monthsLeft: 0 };
            return { id, name: s.name, monthsActive, nextCliff };
        })
        .sort((a, b) => (a.nextCliff.monthsLeft || 99) - (b.nextCliff.monthsLeft || 99))
        .slice(0, 6);

    return {
        weekly: { thisWeek, lastWeek, deltaPct },
        monthly: { projection, daysRemaining, paidThisMonth },
        avgPerSession,
        activePayingStudents,
        perfectMonth,
        demoConversion,
        funnel,
        rating,
        students,
        visibility: {
            weekImpressions: incentives?.searchAppearancesThisWeek || 0,
            profileCompletion: incentives?.profileCompletionScore || 0,
            riskScore: incentives?.riskScore || 0
        }
    };
}

// ─── Subcomponents ───────────────────────────────────────────────────────

function SectionHeader({ eyebrow, title, action }) {
    return (
        <div className="flex items-start justify-between gap-4 mb-4">
            <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{eyebrow}</p>
                <h3 className="text-lg font-extrabold text-navy-950 mt-0.5">{title}</h3>
            </div>
            {action}
        </div>
    );
}

function MetricTile({ label, value, sub, delta, tone = 'navy' }) {
    const valueCls = {
        navy:    'text-navy-950',
        royal:   'text-royal-dark',
        muted:   'text-gray-600',
        success: 'text-emerald-700',
        amber:   'text-amber-700',
        danger:  'text-rose-700'
    }[tone];
    return (
        <div className="rounded-2xl border border-gray-100 bg-gray-50/50 px-4 py-3.5">
            <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</p>
                {typeof delta === 'number' && <DeltaChip value={delta} />}
            </div>
            <p className={`text-2xl font-extrabold tracking-tight ${valueCls}`}>{value}</p>
            {sub && <p className="text-[11px] text-gray-500 mt-1 leading-snug">{sub}</p>}
        </div>
    );
}

function DeltaChip({ value }) {
    if (value == null) return null;
    const up = value >= 0;
    return (
        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
            up ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
        }`}>
            {up ? '▲' : '▼'} {Math.abs(value)}%
        </span>
    );
}

function TierLadder({ tier, lifetimeGross }) {
    // Compute "what would you have earned at each tier" on current lifetime gross
    const tiers = ['starter', 'silver', 'gold', 'platinum'];
    const currentIdx = tiers.indexOf(tier);
    const rows = tiers.map((t, i) => {
        const m = TIER_MODEL[t];
        const netAtThisTier = Math.round(lifetimeGross * (100 - m.commission) / 100);
        const currentNet = Math.round(lifetimeGross * (100 - TIER_MODEL[tier].commission) / 100);
        const delta = netAtThisTier - currentNet;
        return {
            key: t,
            ...m,
            visual: getTierMeta(t),
            isCurrent: i === currentIdx,
            isNext: i === currentIdx + 1,
            isLocked: i < currentIdx,
            netAtThisTier,
            delta
        };
    });

    return (
        <div className="space-y-2.5">
            {rows.map((r) => (
                <div key={r.key}
                    className={`rounded-2xl border px-4 py-3.5 transition-colors ${
                        r.isCurrent ? `${r.visual.accentSoft} ${r.visual.border} border-2`
                            : r.isNext ? 'bg-white border-royal/30 border-2'
                                : 'bg-gray-50/50 border-gray-100'
                    }`}>
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-xl ${r.visual.accent} flex items-center justify-center flex-shrink-0`}>
                                <span className="text-[10px] font-black text-white">{r.stars}★</span>
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className={`text-sm font-extrabold ${r.visual.text}`}>{r.label}</p>
                                    {r.isCurrent && <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">You are here</span>}
                                    {r.isNext && <span className="text-[9px] font-bold uppercase tracking-widest text-royal-dark">Next tier</span>}
                                </div>
                                <p className="text-[11px] text-gray-500">
                                    {r.commission}% commission · {r.minSessions}+ sessions · {r.minRating || '0.0'}★ rating
                                </p>
                            </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-navy-950">₹{r.netAtThisTier.toLocaleString('en-IN')}</p>
                            {r.delta !== 0 && (
                                <p className={`text-[10px] font-bold ${r.delta > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>
                                    {r.delta > 0 ? '+' : ''}{r.delta.toLocaleString('en-IN')} vs current
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            ))}
            <p className="text-[11px] text-gray-400 pt-2 leading-relaxed">
                Each tier's figure is your current lifetime gross re-priced at that tier's commission. Real upside comes from <em>new</em> sessions at the lower rate — plus <strong>₹500 tier-upgrade bonus</strong> when you move up.
            </p>
        </div>
    );
}

function BonusRaceCard({ title, amount, progress, progressLabel, hint, locked, lockLabel }) {
    const pct = Math.min(100, Math.round(progress * 100));
    return (
        <div className={`rounded-2xl border p-5 ${locked ? 'bg-gray-50 border-gray-200 opacity-70' : 'bg-white border-gray-100'}`}>
            <div className="flex items-start justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{title}</p>
                <span className="text-xl font-black text-emerald-700">+₹{amount.toLocaleString('en-IN')}</span>
            </div>
            {locked ? (
                <p className="text-xs text-gray-500 font-semibold py-4">🔒 {lockLabel}</p>
            ) : (
                <>
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="font-semibold text-navy-950">{progressLabel}</span>
                        <span className="font-bold text-emerald-700">{pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                        <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">{hint}</p>
                </>
            )}
        </div>
    );
}

function RetentionPipeline({ students, tierEligible }) {
    if (!tierEligible) {
        return (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center">
                <p className="text-sm font-semibold text-slate-700">🔒 Retention bonuses unlock at Silver tier</p>
                <p className="text-xs text-slate-500 mt-1">Complete 21+ sessions with 4.0+ rating to qualify.</p>
            </div>
        );
    }
    if (students.length === 0) {
        return (
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-5 text-center">
                <p className="text-sm text-gray-500">No paying students yet. First paid session starts the retention clock.</p>
            </div>
        );
    }
    const totalAtStake = students.reduce((s, st) => s + (st.nextCliff.bonus || 0), 0);
    return (
        <>
            <div className="overflow-hidden rounded-2xl border border-gray-100">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50/50">
                        <tr>
                            {['Student', 'Active', 'Next cliff', 'Time left', 'Bonus at stake'].map((h) => (
                                <th key={h} className="py-2.5 px-4 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {students.map((s) => {
                            const urgent = s.nextCliff.monthsLeft === 1;
                            const earned = s.nextCliff.bonus === 0;
                            return (
                                <tr key={s.id} className="hover:bg-gray-50/70">
                                    <td className="py-3 px-4 text-sm font-semibold text-navy-950 truncate max-w-[180px]">{s.name}</td>
                                    <td className="py-3 px-4 text-xs text-gray-600">{s.monthsActive} mo</td>
                                    <td className="py-3 px-4 text-xs">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                            earned ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                                        }`}>
                                            {s.nextCliff.label}
                                        </span>
                                    </td>
                                    <td className={`py-3 px-4 text-xs font-bold ${urgent ? 'text-amber-700' : earned ? 'text-emerald-700' : 'text-gray-600'}`}>
                                        {earned ? 'Earned ✓' : `${s.nextCliff.monthsLeft}mo left`}
                                    </td>
                                    <td className="py-3 px-4 text-sm font-extrabold text-navy-950">
                                        {s.nextCliff.bonus > 0 ? `₹${s.nextCliff.bonus.toLocaleString('en-IN')}` : '—'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-emerald-800 mt-3 font-bold">
                ₹{totalAtStake.toLocaleString('en-IN')} in retention bonuses in your pipeline. Keep these students through the next cliff and the money lands on your next Friday payout.
            </p>
        </>
    );
}

function QualityCard({ eyebrow, title, delta, deltaLabel, hint, meta }) {
    return (
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{eyebrow}</p>
            <div className="flex items-center gap-2 mt-1">
                <h3 className="text-xl font-extrabold text-navy-950">{title}</h3>
                {delta != null && Math.abs(delta) > 0 && (
                    <span className={`text-xs font-bold ${delta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                    </span>
                )}
            </div>
            {deltaLabel && delta != null && (
                <p className="text-[10px] text-gray-400 mt-0.5">{deltaLabel}</p>
            )}
            <p className="text-sm text-gray-600 mt-3 leading-relaxed">{hint}</p>
            {meta && <p className="text-[11px] text-gray-400 mt-2">{meta}</p>}
        </div>
    );
}

function AnalyticsSkeleton() {
    return (
        <div className="space-y-5">
            {[0, 1, 2].map((i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-3xl p-6 animate-pulse h-40" />
            ))}
        </div>
    );
}
