import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

/**
 * StudentAnalyticsPanel — the "what am I getting for my money" view.
 *
 * Every tile ties spending → learning → loyalty rewards. Built around the
 * parent decision-making loop: "Is this worth it?", "Am I getting the
 * cheapest plan?", "Where is the child's ROI?"
 */
export default function StudentAnalyticsPanel() {
    const [state, setState] = useState({ loading: true });

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const [payRes, bkRes, relRes, revRes] = await Promise.all([
                api.get('/payments/student-history').catch(() => ({ data: [] })),
                api.get('/bookings/mine').catch(() => ({ data: [] })),
                api.get('/current-tutors/student/my-tutors').catch(() => ({ data: [] })),
                api.get('/reviews/student/me').catch(() => ({ data: [] }))
            ]);
            if (cancelled) return;
            setState({
                loading: false,
                payments: Array.isArray(payRes.data) ? payRes.data : [],
                bookings: Array.isArray(bkRes.data) ? bkRes.data : (bkRes.data?.bookings || []),
                relationships: Array.isArray(relRes.data) ? relRes.data : (relRes.data?.currentTutors || relRes.data?.data || []),
                reviews: Array.isArray(revRes.data) ? revRes.data : []
            });
        })();
        return () => { cancelled = true; };
    }, []);

    const analytics = useMemo(() => state.loading ? null : computeStudentAnalytics(state), [state]);

    if (state.loading) return <PanelSkeleton />;
    if (!analytics) return null;

    return (
        <div className="space-y-5">
            {/* Investment overview */}
            <section className="bg-gradient-to-br from-white to-royal/5 border border-gray-100 rounded-3xl p-6 shadow-sm">
                <SectionHeader
                    eyebrow="Your investment"
                    title="What you're getting for your money"
                    action={<Link to="/student-dashboard?tab=payments" className="text-xs font-bold text-royal hover:text-royal-dark">Full history →</Link>}
                />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <MetricTile
                        label="Lifetime spend"
                        value={`₹${analytics.totalSpent.toLocaleString('en-IN')}`}
                        sub={`Across ${analytics.transactionCount} transaction${analytics.transactionCount === 1 ? '' : 's'}`}
                        tone="navy"
                    />
                    <MetricTile
                        label="Hours of learning"
                        value={`${analytics.totalHours}h`}
                        sub={`${analytics.sessionsCompleted} session${analytics.sessionsCompleted === 1 ? '' : 's'} completed`}
                        tone="royal"
                    />
                    <MetricTile
                        label="Effective ₹ / hour"
                        value={`₹${analytics.costPerHour.toLocaleString('en-IN')}`}
                        sub={analytics.costPerHour < 500 ? '✓ Below Hyderabad home-tuition average' : 'Average home-tuition rate'}
                        tone="muted"
                    />
                    <MetricTile
                        label="Active plans"
                        value={analytics.activeSubs.length}
                        sub={analytics.totalSessionsLeft > 0 ? `${analytics.totalSessionsLeft} sessions remaining` : 'Top up or subscribe'}
                        tone={analytics.totalSessionsLeft > 0 ? 'success' : 'amber'}
                    />
                </div>
            </section>

            {/* Plan savings opportunity */}
            {analytics.savingsOpportunity && (
                <section className="rounded-3xl p-6 shadow-sm bg-gradient-to-r from-emerald-50 via-white to-emerald-50 border border-emerald-300">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Save money</p>
                            <h3 className="text-xl font-extrabold text-emerald-900 mt-0.5">
                                {analytics.savingsOpportunity.title}
                            </h3>
                            <p className="text-sm text-emerald-800 mt-1.5 leading-relaxed max-w-xl">
                                {analytics.savingsOpportunity.reason}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-black text-emerald-700 tracking-tighter">
                                ₹{analytics.savingsOpportunity.amount.toLocaleString('en-IN')}
                            </p>
                            <p className="text-[11px] text-emerald-600 font-semibold">{analytics.savingsOpportunity.period}</p>
                        </div>
                    </div>
                </section>
            )}

            {/* Learning performance */}
            <section className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                <SectionHeader
                    eyebrow="Progress"
                    title="How the learning is going"
                    action={<Link to="/student-dashboard?tab=progress" className="text-xs font-bold text-royal hover:text-royal-dark">Full reports →</Link>}
                />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <MetricTile
                        label="Attendance"
                        value={`${analytics.attendanceRate}%`}
                        sub={analytics.attendanceRate >= 90 ? '✓ Strong habit'
                            : analytics.attendanceRate >= 75 ? 'Decent — push past 90%'
                                : 'Missed sessions hurt outcomes'}
                        tone={analytics.attendanceRate >= 90 ? 'success' : analytics.attendanceRate >= 75 ? 'amber' : 'danger'}
                    />
                    <MetricTile
                        label="Understanding score"
                        value={analytics.avgUnderstanding ? `${analytics.avgUnderstanding.toFixed(1)}/5` : '—'}
                        sub="Tutor's rating per session"
                        tone={analytics.avgUnderstanding >= 4 ? 'success' : 'navy'}
                    />
                    <MetricTile
                        label="Homework completed"
                        value={analytics.hwCompletion !== null ? `${analytics.hwCompletion}%` : '—'}
                        sub={analytics.hwTotal ? `${analytics.hwDone}/${analytics.hwTotal} assignments done` : 'No homework yet'}
                        tone={analytics.hwCompletion >= 80 ? 'success' : 'navy'}
                    />
                    <MetricTile
                        label="Topics covered"
                        value={analytics.topicsCount}
                        sub={analytics.topicsCount > 0 ? 'Across all sessions' : 'Starts after first session'}
                        tone="navy"
                    />
                </div>
            </section>

            {/* Loyalty ladder */}
            <section className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                <SectionHeader
                    eyebrow="Loyalty rewards"
                    title="The longer you stay, the more you save"
                    action={null}
                />
                <LoyaltyLadder
                    relationships={analytics.relationships}
                    creditBalance={analytics.creditBalance}
                />
            </section>

            {/* Per-tutor health */}
            {analytics.relationships.length > 0 && (
                <section className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                    <SectionHeader
                        eyebrow="Tutor relationships"
                        title="Is each tutor working out?"
                        action={<Link to="/student-dashboard?tab=tutors" className="text-xs font-bold text-royal hover:text-royal-dark">Manage tutors →</Link>}
                    />
                    <div className="space-y-2.5">
                        {analytics.relationships.map((r) => (
                            <TutorRelationshipRow key={r._id} rel={r} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

// ─── Analytics computation ───────────────────────────────────────────────

function computeStudentAnalytics({ payments, bookings, relationships, reviews }) {
    const now = Date.now();
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

    // Money in / out
    const completed = payments.filter((p) => p.status === 'completed' || p.status === 'partially_refunded');
    const totalSpent = completed.reduce((s, p) => s + (p.amount || 0) - (p.refundAmount || 0), 0);
    const thisMonthSpend = completed
        .filter((p) => new Date(p.paidAt || p.createdAt || 0).getTime() >= monthStart)
        .reduce((s, p) => s + (p.amount || 0) - (p.refundAmount || 0), 0);

    // Session counts
    const completedSessions = bookings.filter((b) => b.status === 'completed');
    const sessionsCompleted = completedSessions.length;
    const totalHours = sessionsCompleted; // 1-hour sessions assumed; refine when duration lands
    const costPerHour = totalHours ? Math.round(totalSpent / totalHours) : 0;

    // Active subscription-like bookings with session allowance
    const activeSubs = bookings.filter((b) =>
        ['permanent', 'dedicated'].includes(b.bookingCategory)
        && b.status === 'approved'
        && typeof b.sessionAllowance === 'number'
    );
    const totalSessionsLeft = activeSubs.reduce((s, b) => s + Math.max(0, (b.sessionAllowance || 0) - (b.sessionsConsumed || 0)), 0);

    // Attendance: approved or completed bookings where session is in the past
    const past = bookings.filter((b) => b.sessionDate && new Date(b.sessionDate).getTime() < now && ['completed', 'approved', 'cancelled'].includes(b.status));
    const attended = past.filter((b) => b.status === 'completed').length;
    const attendanceRate = past.length ? Math.round((attended / past.length) * 100) : 0;

    // Understanding score from reviews the student has received?? actually student sees tutor's feedback via session-feedback — too expensive to fetch all here.
    // For now, pull from completedSessions if an understandingScore was denormalized (present in some bookings):
    const understandingScores = completedSessions.map((b) => b.understandingScore).filter(Boolean);
    const avgUnderstanding = understandingScores.length
        ? understandingScores.reduce((a, b) => a + b, 0) / understandingScores.length
        : null;

    // Homework: not always fetched here, so best-effort
    const hwDone = completedSessions.filter((b) => b.homeworkStatus === 'completed').length;
    const hwTotal = completedSessions.filter((b) => b.homeworkStatus).length;
    const hwCompletion = hwTotal ? Math.round((hwDone / hwTotal) * 100) : null;

    // Topics — derived from bookings.subjects
    const topicsSet = new Set();
    for (const b of completedSessions) {
        if (Array.isArray(b.topicsCovered)) b.topicsCovered.forEach((t) => topicsSet.add(t));
        else if (b.subject) topicsSet.add(b.subject);
    }
    const topicsCount = topicsSet.size;

    // Best plan savings hint
    const savingsOpportunity = computeSavingsOpportunity({ activeSubs, thisMonthSpend, bookings });

    // Credit balance — best-effort via separate endpoint (not fetched here); show 0 as fallback
    const creditBalance = 0;

    return {
        totalSpent,
        transactionCount: completed.length,
        sessionsCompleted,
        totalHours,
        costPerHour,
        activeSubs,
        totalSessionsLeft,
        attendanceRate,
        avgUnderstanding,
        hwDone,
        hwTotal,
        hwCompletion,
        topicsCount,
        relationships,
        creditBalance,
        savingsOpportunity,
        reviewCount: reviews.length
    };
}

function computeSavingsOpportunity({ activeSubs, thisMonthSpend, bookings }) {
    // If on Monthly plan, Committed (3mo, 5% off) would save 5% of monthly spend × 3
    const monthlyPlans = activeSubs.filter((b) => b.plan === 'monthly');
    if (monthlyPlans.length) {
        const monthlyBill = monthlyPlans.reduce((s, b) => s + (b.lockedHourlyRate || 0) * (b.sessionAllowance || 20), 0);
        const savings = Math.round(monthlyBill * 0.05);
        return {
            title: 'Switch to Committed plan — save 5%',
            reason: 'You\'re on Monthly. A 3-month Committed plan gives you the same sessions at 5% off — plus it\'s fully pro-rated if you ever cancel early. Same tutor, same schedule.',
            amount: savings,
            period: '/month'
        };
    }

    // Sporadic users on Flex → recommend Monthly
    const hasFlex = bookings.some((b) => b.plan === 'flex' || (!b.plan && b.bookingCategory === 'session'));
    const completedInMonth = bookings.filter((b) => b.status === 'completed' && new Date(b.sessionDate || 0).getTime() >= Date.now() - 30 * 24 * 3_600_000);
    if (hasFlex && completedInMonth.length >= 6) {
        const flexPremium = Math.round(thisMonthSpend * 0.1);
        return {
            title: `Move to Monthly plan — stop the 10% Flex surcharge`,
            reason: `You've booked ${completedInMonth.length} sessions this month at per-session pricing (which carries a 10% Flex surcharge). A Monthly plan drops that surcharge entirely.`,
            amount: flexPremium,
            period: '/month'
        };
    }

    return null;
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

function MetricTile({ label, value, sub, tone = 'navy' }) {
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
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</p>
            <p className={`text-2xl font-extrabold tracking-tight mt-0.5 ${valueCls}`}>{value}</p>
            {sub && <p className="text-[11px] text-gray-500 mt-1 leading-snug">{sub}</p>}
        </div>
    );
}

function LoyaltyLadder({ relationships, creditBalance }) {
    const [now] = useState(() => Date.now());
    const oldestMonths = relationships.reduce((max, r) => {
        if (!r.relationshipStartDate) return max;
        const months = Math.floor((now - new Date(r.relationshipStartDate).getTime()) / (30 * 24 * 3_600_000));
        return Math.max(max, months);
    }, 0);

    const milestones = [
        { months: 1, label: 'First paid month', reward: 'Trial complete', earned: oldestMonths >= 1 },
        { months: 3, label: '3-month loyalty', reward: '₹300 referral match', earned: oldestMonths >= 3 },
        { months: 6, label: '6-month loyalty', reward: '₹500 credit', earned: oldestMonths >= 6 },
        { months: 12, label: '1-year anniversary', reward: 'Sibling 10% off', earned: oldestMonths >= 12 }
    ];

    return (
        <div className="space-y-2.5">
            {creditBalance > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-emerald-900">You have unused credits</p>
                    <p className="text-xl font-extrabold text-emerald-700">₹{creditBalance.toLocaleString('en-IN')}</p>
                </div>
            )}
            {milestones.map((m) => (
                <div key={m.months}
                    className={`rounded-xl border px-4 py-3 flex items-center justify-between ${
                        m.earned ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50/50 border-gray-100'
                    }`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${m.earned ? 'bg-emerald-200 text-emerald-800' : 'bg-gray-200 text-gray-500'}`}>
                            {m.earned ? '✓' : m.months}
                        </div>
                        <div>
                            <p className={`text-sm font-bold ${m.earned ? 'text-emerald-900' : 'text-gray-700'}`}>{m.label}</p>
                            <p className="text-[11px] text-gray-500">{m.reward}</p>
                        </div>
                    </div>
                    {!m.earned && oldestMonths > 0 && (
                        <p className="text-[11px] text-gray-500 font-semibold">
                            {m.months - oldestMonths}mo to go
                        </p>
                    )}
                </div>
            ))}
        </div>
    );
}

function TutorRelationshipRow({ rel }) {
    const [now] = useState(() => Date.now());
    const tutor = rel.tutorId || {};
    const done = rel.sessionsCompleted || 0;
    const total = rel.totalSessionsBooked || 0;
    const attendance = total ? Math.round((done / total) * 100) : 0;
    const daysSinceStart = rel.relationshipStartDate
        ? Math.floor((now - new Date(rel.relationshipStartDate).getTime()) / (24 * 3_600_000))
        : 0;

    const health = attendance >= 80 ? 'green' : attendance >= 60 ? 'amber' : 'red';
    const healthCls = {
        green: 'bg-emerald-500',
        amber: 'bg-amber-500',
        red:   'bg-rose-500'
    }[health];
    const healthLabel = {
        green: 'Healthy',
        amber: 'Watch',
        red:   'At risk'
    }[health];

    return (
        <div className="flex items-center justify-between gap-3 p-3 border border-gray-100 rounded-xl hover:border-royal/30 transition-colors">
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`w-2 h-10 rounded-full ${healthCls}`} />
                <div className="min-w-0">
                    <p className="text-sm font-bold text-navy-950 truncate">{tutor.name || 'Tutor'}</p>
                    <p className="text-[11px] text-gray-500 truncate">
                        {rel.subject}{rel.classGrade ? ` · Class ${rel.classGrade}` : ''} · Day {daysSinceStart}
                    </p>
                </div>
            </div>
            <div className="text-right flex-shrink-0">
                <p className="text-sm font-extrabold text-navy-950">{attendance}%</p>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${
                    health === 'green' ? 'text-emerald-700' : health === 'amber' ? 'text-amber-700' : 'text-rose-700'
                }`}>{healthLabel}</p>
            </div>
        </div>
    );
}

function PanelSkeleton() {
    return (
        <div className="space-y-5">
            {[0, 1, 2].map((i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-3xl p-6 animate-pulse h-36" />
            ))}
        </div>
    );
}
