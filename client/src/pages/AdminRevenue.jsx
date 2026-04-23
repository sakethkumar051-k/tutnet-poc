import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import AdminRazorpayPanel from '../components/AdminRazorpayPanel';
import { useToast } from '../context/ToastContext';

/**
 * AdminRevenue — founder/investor view of platform money flow.
 * Lives inside DashboardLayout (h-screen + overflow-hidden), so this page
 * must provide its own scroll container. Refreshes at a user-selectable
 * interval; all data comes from /api/admin/revenue/*.
 */
export default function AdminRevenue() {
    const [headline, setHeadline] = useState(null);
    const [feed, setFeed] = useState([]);
    const [tiers, setTiers] = useState([]);
    const [topEarners, setTopEarners] = useState([]);
    const [watchlist, setWatchlist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(null);
    const [feedFilter, setFeedFilter] = useState('all');
    const [intervalMs, setIntervalMs] = useState(10_000);
    const [alertTarget, setAlertTarget] = useState(null);
    const { showSuccess, showError } = useToast();
    const refreshingRef = useRef(false);

    const refresh = useCallback(async () => {
        if (refreshingRef.current) return;
        refreshingRef.current = true;
        try {
            const [h, f, t, r] = await Promise.all([
                api.get('/admin/revenue/headline'),
                api.get('/admin/revenue/feed'),
                api.get('/admin/revenue/tiers'),
                api.get('/admin/revenue/risk')
            ]);
            setHeadline(h.data);
            setFeed(f.data.events || []);
            setTiers(t.data.tiers || []);
            setTopEarners(t.data.topEarners || []);
            setWatchlist(r.data.watchlist || []);
            setLastRefresh(new Date());
        } catch (err) {
            console.error('[AdminRevenue] refresh error:', err);
        } finally {
            setLoading(false);
            refreshingRef.current = false;
        }
    }, []);

    useEffect(() => {
        refresh();
        if (!intervalMs) return undefined;
        const id = setInterval(refresh, intervalMs);
        return () => clearInterval(id);
    }, [refresh, intervalMs]);

    const filteredFeed = useMemo(() => {
        if (feedFilter === 'all') return feed;
        return feed.filter((e) => e.type === feedFilter);
    }, [feed, feedFilter]);

    const feedCounts = useMemo(() => ({
        all: feed.length,
        payment: feed.filter((e) => e.type === 'payment').length,
        payout: feed.filter((e) => e.type === 'payout').length,
        incentive: feed.filter((e) => e.type === 'incentive').length
    }), [feed]);

    const exportFeedCSV = () => {
        if (!filteredFeed.length) return;
        const header = ['Time', 'Type', 'Status', 'From', 'To', 'Amount', 'Detail'];
        const rows = filteredFeed.map((e) => [
            e.at ? new Date(e.at).toISOString() : '',
            e.type,
            e.status || '',
            e.from || '',
            e.to || '',
            e.amount || 0,
            (e.detail || '').replace(/[\r\n,]+/g, ' ')
        ]);
        const csv = [header, ...rows]
            .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `money-flow-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const sendRiskAlert = async (userId, name, message) => {
        try {
            await api.post('/admin/send-alert', {
                userId,
                title: 'Platform compliance review',
                message: message || 'Our team is reviewing recent activity on your profile. Please check your inbox.'
            });
            showSuccess(`Alert sent to ${name}`);
            setAlertTarget(null);
        } catch {
            showError('Failed to send alert');
        }
    };

    const isTestMode = (headline?.mode || '').toLowerCase() === 'test';
    const isMockMode = (headline?.mode || '').toLowerCase() === 'mock';
    const h = headline?.headline || {};
    const takeRatePct = h.gmvMonthToDate ? ((h.commissionMonthToDate / Math.max(1, h.gmvMonthToDate)) * 100).toFixed(1) : '0.0';

    return (
        <div className="h-full flex flex-col bg-navy-950 text-white">
            {/* Header */}
            <div className="border-b border-white/5 bg-navy-950 flex-shrink-0">
                <div className="max-w-[1500px] mx-auto px-6 lg:px-10 py-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link to="/admin-dashboard" className="text-xs text-gray-400 hover:text-white">← Admin</Link>
                        <div>
                            <p className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">Platform</p>
                            <h1 className="text-2xl font-extrabold tracking-tight">Revenue &amp; Money Flow</h1>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {isTestMode && <ModePill color="yellow" label="Test Mode" pulse />}
                        {isMockMode && <ModePill color="yellow" label="Mock Mode" />}
                        {lastRefresh && (
                            <span className="text-[11px] text-gray-500">
                                Updated {lastRefresh.toLocaleTimeString('en-IN')}
                            </span>
                        )}
                        <IntervalSelect value={intervalMs} onChange={setIntervalMs} />
                        <button onClick={refresh} className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-200 transition-colors">
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Scroll container */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-[1500px] mx-auto px-6 lg:px-10 py-8 space-y-8">
                    {/* HEADLINE CARDS */}
                    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard
                            label="GMV this month"
                            value={h.gmvMonthToDate}
                            sublabel={`${h.transactionsMonthToDate || 0} transactions`}
                            accent="lime"
                            loading={loading}
                        />
                        <StatCard
                            label="Commission captured (MTD)"
                            value={h.commissionMonthToDate}
                            sublabel={`${takeRatePct}% take rate`}
                            accent="royal"
                            loading={loading}
                        />
                        <StatCard
                            label="Active subscriptions"
                            value={h.activeSubscriptions}
                            sublabel="paid & in-period"
                            isCount
                            loading={loading}
                        />
                        <StatCard
                            label="Reserve held"
                            value={h.reserveHeld}
                            sublabel="chargeback buffer"
                            accent="gray"
                            loading={loading}
                        />
                    </section>

                    <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <MiniStat label="GMV all-time" value={h.gmvAllTime} />
                        <MiniStat label="GMV this week" value={h.gmvWeekToDate} />
                        <MiniStat
                            label="Scheduled payouts"
                            value={h.scheduledPayoutsTotal}
                            sublabel={h.scheduledPayoutsCount ? `${h.scheduledPayoutsCount} queued` : undefined}
                        />
                        <MiniStat label="Pending incentives" value={h.pendingIncentivesTotal} />
                        <MiniStat
                            label="Paid out (MTD)"
                            value={h.paidPayoutsMTD}
                            sublabel={h.paidPayoutsCountMTD ? `${h.paidPayoutsCountMTD} payouts` : undefined}
                        />
                    </section>

                    {/* LIVE FEED + TIER DIST */}
                    <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
                        <Card
                            title="Live Money Flow"
                            subtitle={intervalMs ? `Auto-refreshes every ${Math.round(intervalMs / 1000)}s` : 'Manual refresh'}
                            action={
                                <button
                                    onClick={exportFeedCSV}
                                    disabled={!filteredFeed.length}
                                    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                    Export CSV
                                </button>
                            }>
                            <FeedFilter value={feedFilter} onChange={setFeedFilter} counts={feedCounts} />
                            {filteredFeed.length === 0 ? (
                                <EmptyState text={feed.length === 0 ? 'No activity yet. Run a test payment to see it appear here.' : `No ${feedFilter} events in current window.`} />
                            ) : (
                                <div className="divide-y divide-white/5 max-h-[520px] overflow-y-auto -mx-2 px-2">
                                    {filteredFeed.map((ev) => (
                                        <FeedRow key={`${ev.type}-${ev.id}`} event={ev} />
                                    ))}
                                </div>
                            )}
                        </Card>

                        <Card title="Tier Distribution" subtitle="Tutor base by commission tier">
                            <TierGrid tiers={tiers} />

                            <div className="mt-6 pt-4 border-t border-white/5">
                                <p className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase mb-3">Top Earners</p>
                                {topEarners.length === 0 ? (
                                    <EmptyState text="No earnings yet." />
                                ) : (
                                    <div className="space-y-2">
                                        {topEarners.slice(0, 5).map((t) => (
                                            <div key={t._id} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-gray-300 truncate">{t.userId?.name || '—'}</span>
                                                    <TierPill tier={t.tier} />
                                                </div>
                                                <span className="text-white font-semibold">₹{(t.lifetimeGrossEarnings || 0).toLocaleString('en-IN')}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Card>
                    </section>

                    {/* RAZORPAY LIVE GATEWAY PANEL */}
                    <AdminRazorpayPanel />

                    {/* RISK WATCHLIST */}
                    <Card
                        title="Risk Watchlist"
                        subtitle="Tutors with elevated risk score or repeated flagged events"
                        action={<span className="text-[11px] text-gray-500">{watchlist.length} on list</span>}>
                        {watchlist.length === 0 ? (
                            <EmptyState text="All clear. No tutors currently on the watchlist." />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-[10px] text-gray-400 uppercase tracking-widest font-bold border-b border-white/5">
                                            <th className="text-left py-3">Tutor</th>
                                            <th className="text-left">Tier</th>
                                            <th className="text-right">Sessions</th>
                                            <th className="text-right">Rating</th>
                                            <th className="text-right">Flags</th>
                                            <th className="text-right">Risk</th>
                                            <th className="text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {watchlist.map((w) => (
                                            <tr key={w._id} className="border-b border-white/5 hover:bg-white/[0.02]">
                                                <td className="py-3 text-gray-200">
                                                    <div className="flex flex-col">
                                                        <span>{w.userId?.name || '—'}</span>
                                                        {w.userId?.email && <span className="text-[10px] text-gray-500">{w.userId.email}</span>}
                                                    </div>
                                                </td>
                                                <td><TierPill tier={w.tier} /></td>
                                                <td className="text-right text-gray-300">{w.totalSessions || 0}</td>
                                                <td className="text-right text-gray-300">{(w.averageRating || 0).toFixed(2)}</td>
                                                <td className="text-right text-yellow-300 font-semibold">{w.flaggedEventsCount || 0}</td>
                                                <td className="text-right">
                                                    <RiskBar score={w.riskScore || 0} />
                                                </td>
                                                <td className="text-right">
                                                    <button
                                                        onClick={() => setAlertTarget(w)}
                                                        className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors">
                                                        Alert
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {alertTarget && (
                <AlertModal
                    target={alertTarget}
                    onClose={() => setAlertTarget(null)}
                    onSend={(msg) => sendRiskAlert(alertTarget.userId?._id || alertTarget.userId, alertTarget.userId?.name || 'tutor', msg)}
                />
            )}
        </div>
    );
}

// ── Subcomponents ──────────────────────────────────────────────────────

function ModePill({ color, label, pulse }) {
    const cls = {
        lime: 'bg-lime/20 border-lime/30 text-lime',
        yellow: 'bg-yellow-400/20 border-yellow-400/30 text-yellow-300',
        rose: 'bg-rose-500/20 border-rose-500/30 text-rose-300'
    }[color];
    const dot = { lime: 'bg-lime', yellow: 'bg-yellow-300', rose: 'bg-rose-300' }[color];
    return (
        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${cls} text-[10px] font-bold uppercase tracking-wide`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dot} ${pulse ? 'animate-pulse' : ''}`} />
            {label}
        </span>
    );
}

function IntervalSelect({ value, onChange }) {
    const options = [
        { v: 0, label: 'Manual' },
        { v: 10_000, label: '10s' },
        { v: 30_000, label: '30s' },
        { v: 60_000, label: '1m' }
    ];
    return (
        <select
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-200 border border-white/10 focus:outline-none focus:ring-2 focus:ring-royal/40">
            {options.map((o) => (
                <option key={o.v} value={o.v} className="bg-navy-950 text-white">
                    {o.label}
                </option>
            ))}
        </select>
    );
}

function FeedFilter({ value, onChange, counts }) {
    const opts = [
        { id: 'all', label: 'All' },
        { id: 'payment', label: 'Payments' },
        { id: 'payout', label: 'Payouts' },
        { id: 'incentive', label: 'Incentives' }
    ];
    return (
        <div className="flex items-center gap-1 mb-3 flex-wrap">
            {opts.map((o) => (
                <button
                    key={o.id}
                    onClick={() => onChange(o.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        value === o.id ? 'bg-white/10 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}>
                    {o.label}
                    <span className="ml-1.5 text-[10px] opacity-70">{counts[o.id] ?? 0}</span>
                </button>
            ))}
        </div>
    );
}

function StatCard({ label, value, sublabel, accent, loading, isCount }) {
    const accentMap = {
        lime: 'text-lime',
        royal: 'text-royal-light',
        gray: 'text-gray-300'
    };
    const displayVal = loading
        ? '…'
        : isCount
            ? (value ?? 0).toLocaleString('en-IN')
            : `₹${(value ?? 0).toLocaleString('en-IN')}`;
    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase">{label}</p>
            <p className={`text-3xl font-extrabold tracking-tight mt-2 ${accentMap[accent] || 'text-white'}`}>{displayVal}</p>
            {sublabel && <p className="text-xs text-gray-500 mt-1">{sublabel}</p>}
        </div>
    );
}

function MiniStat({ label, value, sublabel }) {
    return (
        <div className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3">
            <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">{label}</p>
            <p className="text-lg font-bold text-white tracking-tight mt-1">₹{(value || 0).toLocaleString('en-IN')}</p>
            {sublabel && <p className="text-[10px] text-gray-500 mt-0.5">{sublabel}</p>}
        </div>
    );
}

function Card({ title, subtitle, action, children }) {
    return (
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                    <h3 className="text-lg font-extrabold text-white tracking-tight">{title}</h3>
                    {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
                </div>
                {action}
            </div>
            {children}
        </div>
    );
}

function EmptyState({ text }) {
    return (
        <div className="py-8 text-center text-sm text-gray-500">{text}</div>
    );
}

function FeedRow({ event }) {
    const icon = iconFor(event.type);
    const timeStr = event.at ? new Date(event.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
    const amount = event.type === 'payout'
        ? `−₹${(event.amount || 0).toLocaleString('en-IN')}`
        : `+₹${(event.amount || 0).toLocaleString('en-IN')}`;
    const amountColor = event.type === 'payment'
        ? 'text-lime'
        : event.type === 'payout'
            ? 'text-rose-300'
            : 'text-royal-light';
    return (
        <div className="py-3 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${icon.bg}`}>
                {icon.svg}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{event.type}</span>
                    <span className={`text-xs font-semibold ${statusColor(event.status)}`}>{event.status}</span>
                </div>
                <p className="text-sm text-white truncate">
                    {event.from ? `${event.from} → ` : ''}{event.to}
                </p>
                <p className="text-[11px] text-gray-500 truncate">{event.detail}</p>
            </div>
            <div className="text-right flex-shrink-0">
                <p className={`text-sm font-bold ${amountColor}`}>{amount}</p>
                <p className="text-[10px] text-gray-500">{timeStr}</p>
            </div>
        </div>
    );
}

function iconFor(type) {
    if (type === 'payment') {
        return {
            bg: 'bg-lime/20',
            svg: <svg className="w-4 h-4 text-lime" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>
        };
    }
    if (type === 'payout') {
        return {
            bg: 'bg-rose-500/15',
            svg: <svg className="w-4 h-4 text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
        };
    }
    return {
        bg: 'bg-royal/20',
        svg: <svg className="w-4 h-4 text-royal-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
    };
}

function statusColor(status) {
    if (['completed', 'paid', 'applied'].includes(status)) return 'text-lime';
    if (['failed', 'clawed_back', 'void'].includes(status)) return 'text-rose-400';
    return 'text-gray-400';
}

function TierGrid({ tiers }) {
    const meta = {
        starter:  { label: 'Starter',  rate: '25%', color: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
        silver:   { label: 'Silver',   rate: '22%', color: 'bg-slate-400/20 text-slate-200 border-slate-400/30' },
        gold:     { label: 'Gold',     rate: '18%', color: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30' },
        platinum: { label: 'Platinum', rate: '15%', color: 'bg-lime/20 text-lime border-lime/30' }
    };
    const byTier = Object.fromEntries((tiers || []).map((t) => [t._id, t]));
    return (
        <div className="grid grid-cols-2 gap-3">
            {['starter', 'silver', 'gold', 'platinum'].map((key) => {
                const t = byTier[key] || {};
                const m = meta[key];
                return (
                    <div key={key} className={`rounded-xl border p-3 ${m.color}`}>
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wide">{m.label}</span>
                            <span className="text-[10px] font-semibold">{m.rate}</span>
                        </div>
                        <p className="text-2xl font-extrabold mt-1">{t.count || 0}</p>
                        <p className="text-[10px] opacity-70 mt-0.5">avg {(t.avgRating || 0).toFixed(1)}★</p>
                    </div>
                );
            })}
        </div>
    );
}

function TierPill({ tier }) {
    const cls = {
        starter: 'bg-gray-500/20 text-gray-300',
        silver: 'bg-slate-400/20 text-slate-200',
        gold: 'bg-yellow-400/20 text-yellow-300',
        platinum: 'bg-lime/20 text-lime'
    }[tier] || 'bg-gray-500/20 text-gray-400';
    return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${cls}`}>{tier || '—'}</span>;
}

function RiskBar({ score }) {
    const pct = Math.min(100, Math.max(0, score));
    const color = pct >= 60 ? 'bg-rose-400' : pct >= 30 ? 'bg-yellow-400' : 'bg-lime';
    return (
        <div className="flex items-center gap-2 justify-end">
            <div className="w-20 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-gray-300 font-semibold w-8 text-right">{pct}</span>
        </div>
    );
}

function AlertModal({ target, onClose, onSend }) {
    const [message, setMessage] = useState('Our team is reviewing recent activity on your profile. Please check your inbox for next steps.');
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-navy-950 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6">
                <h3 className="text-lg font-bold text-white mb-1">Send Alert</h3>
                <p className="text-xs text-gray-500 mb-4">
                    To <strong className="text-gray-300">{target.userId?.name || 'tutor'}</strong>
                    {target.userId?.email && <> · {target.userId.email}</>}
                </p>
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-royal/40 resize-none mb-4" />
                <div className="flex gap-2 justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-white/10 rounded-lg">Cancel</button>
                    <button
                        onClick={() => onSend(message)}
                        disabled={!message.trim()}
                        className="px-4 py-2 text-sm bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-lg disabled:opacity-50">
                        Send Alert
                    </button>
                </div>
            </div>
        </div>
    );
}
