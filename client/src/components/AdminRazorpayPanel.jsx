import { useEffect, useState } from 'react';
import api from '../utils/api';

/**
 * AdminRazorpayPanel — pulls live test/live payments + orders + refunds from
 * Razorpay's API so admins see gateway reality without opening
 * dashboard.razorpay.com.
 */
export default function AdminRazorpayPanel() {
    const [status, setStatus] = useState(null);
    const [tab, setTab] = useState('payments');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(null);

    const loadStatus = async () => {
        try {
            const { data } = await api.get('/admin/razorpay/status');
            setStatus(data);
        } catch (_) { setStatus({ connected: false }); }
    };

    const loadItems = async (which) => {
        setLoading(true);
        try {
            const { data } = await api.get(`/admin/razorpay/${which}`, { params: { count: 20 } });
            setItems(data.items || []);
            setLastRefresh(new Date());
        } catch (_) {
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStatus();
        loadItems(tab);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    const mode = status?.mode || 'unknown';

    return (
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                    <h3 className="text-lg font-extrabold text-white tracking-tight">
                        Razorpay · Live gateway data
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Real payments, orders &amp; refunds pulled directly from Razorpay's API.
                    </p>
                </div>
                <ModeBadge mode={mode} connected={status?.connected} />
            </div>

            {/* Connection banner if keys are bad */}
            {status && status.connected === false && mode !== 'mock' && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-sm text-rose-300">
                    <p className="font-bold">Razorpay rejected the keys</p>
                    <p className="text-xs mt-0.5 opacity-80">{status.error || 'Authentication failed.'} Regenerate at dashboard.razorpay.com or set <code className="text-[11px] bg-rose-500/20 px-1 rounded">PAYMENT_MODE=mock</code> in server/.env.</p>
                </div>
            )}
            {status && mode === 'mock' && (
                <div className="mb-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-300">
                    <p className="font-bold">Mock mode</p>
                    <p className="text-xs mt-0.5 opacity-80">PAYMENT_MODE=mock — payments are simulated. This panel only shows real gateway data when keys are live.</p>
                </div>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-3">
                {[
                    { id: 'payments', label: 'Payments' },
                    { id: 'orders', label: 'Orders' },
                    { id: 'refunds', label: 'Refunds' }
                ].map((t) => (
                    <button key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            tab === t.id
                                ? 'bg-white/10 text-white'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}>
                        {t.label}
                    </button>
                ))}
                <div className="flex-1" />
                <button onClick={() => loadItems(tab)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300">
                    Refresh
                </button>
                {lastRefresh && (
                    <span className="text-[10px] text-gray-500 ml-2">
                        {lastRefresh.toLocaleTimeString('en-IN')}
                    </span>
                )}
            </div>

            {/* Data table */}
            {loading ? (
                <div className="py-8 text-center text-sm text-gray-500">Loading…</div>
            ) : items.length === 0 ? (
                <div className="py-8 text-center">
                    <p className="text-sm text-gray-500">
                        {mode === 'mock'
                            ? 'Switch to test/live mode to see gateway data.'
                            : 'No ' + tab + ' yet — make a test payment to populate this feed.'}
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-[10px] text-gray-400 uppercase tracking-wider font-bold border-b border-white/5">
                                <th className="text-left py-2.5">ID</th>
                                <th className="text-right">Amount</th>
                                <th className="text-left">Status</th>
                                {tab === 'payments' && <th className="text-left">Method</th>}
                                {tab === 'payments' && <th className="text-left">Email</th>}
                                {tab !== 'payments' && <th className="text-left">Receipt</th>}
                                <th className="text-right">Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((i) => (
                                <tr key={i.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                                    <td className="py-2.5 font-mono text-[11px] text-gray-300 truncate">{i.id}</td>
                                    <td className="text-right text-white font-semibold">₹{((i.amount || 0) / 100).toLocaleString('en-IN')}</td>
                                    <td><StatusChip status={i.status} /></td>
                                    {tab === 'payments' && <td className="text-gray-400">{i.method || '—'}</td>}
                                    {tab === 'payments' && <td className="text-gray-400 truncate max-w-[180px]">{i.email || '—'}</td>}
                                    {tab !== 'payments' && <td className="font-mono text-[10px] text-gray-400 truncate max-w-[180px]">{i.receipt || '—'}</td>}
                                    <td className="text-right text-gray-500 text-[10px]">
                                        {i.created_at ? new Date(i.created_at * 1000).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Quick links to Razorpay dashboard */}
            <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-2">
                <p className="text-[10px] text-gray-500 mr-2 self-center">Open in Razorpay:</p>
                <QuickLink href="https://dashboard.razorpay.com/app/payments?mode=test" label="Payments" />
                <QuickLink href="https://dashboard.razorpay.com/app/orders?mode=test" label="Orders" />
                <QuickLink href="https://dashboard.razorpay.com/app/webhooks?mode=test" label="Webhooks" />
                <QuickLink href="https://dashboard.razorpay.com/app/keys?mode=test" label="API keys" />
            </div>
        </div>
    );
}

function ModeBadge({ mode, connected }) {
    if (mode === 'mock') return <Pill color="yellow" label="MOCK MODE" dot />;
    if (mode === 'test') return <Pill color={connected ? 'lime' : 'rose'} label={connected ? 'TEST · LIVE' : 'TEST · BAD KEYS'} dot />;
    if (mode === 'live') return <Pill color={connected ? 'lime' : 'rose'} label={connected ? 'LIVE · PRODUCTION' : 'LIVE · BAD KEYS'} dot />;
    return <Pill color="gray" label="UNKNOWN" />;
}

function Pill({ color, label, dot }) {
    const cls = {
        lime: 'bg-lime/20 text-lime border-lime/30',
        yellow: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30',
        rose: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        gray: 'bg-white/10 text-gray-300 border-white/20'
    }[color];
    const dotCls = { lime: 'bg-lime', yellow: 'bg-yellow-300', rose: 'bg-rose-300', gray: 'bg-gray-400' }[color];
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold tracking-wider uppercase ${cls}`}>
            {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotCls} ${color === 'lime' ? 'animate-pulse' : ''}`} />}
            {label}
        </span>
    );
}

function StatusChip({ status }) {
    const map = {
        captured: 'bg-lime/20 text-lime',
        created: 'bg-royal/20 text-royal-light',
        authorized: 'bg-yellow-500/20 text-yellow-300',
        failed: 'bg-rose-500/20 text-rose-300',
        refunded: 'bg-white/10 text-gray-300',
        processed: 'bg-lime/20 text-lime',
        paid: 'bg-lime/20 text-lime',
        attempted: 'bg-yellow-500/20 text-yellow-300'
    };
    const cls = map[status] || 'bg-white/10 text-gray-300';
    return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${cls}`}>{status || '—'}</span>;
}

function QuickLink({ href, label }) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-gray-300 hover:text-white transition-colors">
            {label}
            <svg className="w-2.5 h-2.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
        </a>
    );
}
