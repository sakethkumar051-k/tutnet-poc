import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';

const PERIODS = [
    { label: 'All Time', value: 'all' },
    { label: 'This Year', value: 'year' },
    { label: 'This Month', value: 'month' },
    { label: 'This Week', value: 'week' }
];

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const StatCard = ({ label, value, sub, accent }) => (
    <div className={`bg-white rounded-xl border p-5 ${accent ? 'border-indigo-200' : 'border-gray-200'}`}>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${accent ? 'text-indigo-700' : 'text-gray-900'}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
);

export default function EarningsDashboard() {
    const { showSuccess, showError } = useToast();
    const [period, setPeriod] = useState('all');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [logModal, setLogModal] = useState(false);
    const [logForm, setLogForm] = useState({ amount: '', paymentMethod: 'cash', notes: '' });
    const [logSubmitting, setLogSubmitting] = useState(false);

    const loadEarnings = useCallback(async (p) => {
        setLoading(true);
        try {
            const res = await api.get(`/payments/tutor-earnings?period=${p}`);
            setData(res.data);
        } catch {
            // silent — shows empty state
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadEarnings(period);
    }, [period, loadEarnings]);

    const handleLogPayment = async (e) => {
        e.preventDefault();
        if (!logForm.amount) return;
        setLogSubmitting(true);
        try {
            await api.post('/payments/manual', {
                amount: Number(logForm.amount),
                paymentMethod: logForm.paymentMethod,
                notes: logForm.notes || undefined
            });
            showSuccess('Payment logged successfully');
            setLogModal(false);
            setLogForm({ amount: '', paymentMethod: 'cash', notes: '' });
            loadEarnings(period);
        } catch {
            showError('Failed to log payment');
        } finally {
            setLogSubmitting(false);
        }
    };

    const monthly = data?.monthlyBreakdown || [];
    const maxEarning = monthly.length ? Math.max(...monthly.map(m => m.earnings), 1) : 1;

    // Confirmed payments list: new field name with fallback for compatibility
    const paymentsList = data?.confirmedPayments || [];

    return (
        <div className="space-y-6">
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Earnings & Payments</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Confirmed Razorpay income + estimated from completed sessions</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex bg-gray-100 rounded-lg p-0.5">
                        {PERIODS.map(p => (
                            <button
                                key={p.value}
                                onClick={() => setPeriod(p.value)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${period === p.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setLogModal(true)}
                        className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        + Log cash payment
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
                            <div className="h-3 bg-gray-100 rounded w-20 mb-3" />
                            <div className="h-7 bg-gray-100 rounded w-28" />
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    {/* Rate warning */}
                    {!data?.hourlyRate && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
                            <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm text-amber-700">Set your hourly rate in your profile to see accurate earnings estimates.</p>
                        </div>
                    )}

                    {/* Stat cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            label="Confirmed Earnings"
                            value={fmt(data?.confirmedEarnings)}
                            sub="via Razorpay"
                            accent
                        />
                        <StatCard
                            label="Estimated Earnings"
                            value={fmt(data?.estimatedEarnings)}
                            sub={`@ ${fmt(data?.hourlyRate)}/hr`}
                        />
                        <StatCard
                            label="Sessions Completed"
                            value={data?.totalSessions ?? 0}
                            sub="completed sessions"
                        />
                        <StatCard
                            label="Pending"
                            value={fmt(data?.pendingAmount)}
                            sub="awaiting payment"
                        />
                    </div>

                    {/* Monthly bar chart */}
                    {monthly.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <h3 className="text-sm font-semibold text-gray-800 mb-4">Monthly Earnings (Last 6 Months)</h3>
                            <div className="flex items-end gap-3" style={{ height: '140px' }}>
                                {monthly.map(m => {
                                    const pct = Math.round((m.earnings / maxEarning) * 100);
                                    const [yr, mon] = m.month.split('-');
                                    const label = new Date(Number(yr), Number(mon) - 1).toLocaleString('default', { month: 'short' });
                                    return (
                                        <div key={m.month} className="flex flex-col items-center justify-end gap-1 flex-1 h-full">
                                            <span className="text-xs text-gray-500">{fmt(m.earnings)}</span>
                                            <div
                                                className="w-full rounded-t-md bg-indigo-500"
                                                style={{ height: `${Math.max(pct, 4)}%` }}
                                            />
                                            <span className="text-xs text-gray-400">{label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Recent Completed Sessions */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-800">Recent Completed Sessions</h3>
                        </div>
                        {!data?.recentSessions?.length ? (
                            <div className="flex flex-col items-center py-12 text-center">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <p className="text-sm text-gray-500 font-medium">No completed sessions yet</p>
                                <p className="text-xs text-gray-400 mt-1">Sessions you complete will appear here</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50">
                                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Student</th>
                                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subject</th>
                                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment</th>
                                            <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Est. Earn</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {data.recentSessions.map(s => {
                                            const date = s.sessionDate
                                                ? new Date(s.sessionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                                : new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                                            return (
                                                <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-5 py-3 font-medium text-gray-800">{s.studentId?.name || '—'}</td>
                                                    <td className="px-5 py-3 text-gray-600">{s.subject}</td>
                                                    <td className="px-5 py-3 text-gray-500">{date}</td>
                                                    <td className="px-5 py-3">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.isPaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            {s.isPaid ? 'Paid' : 'Pending'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3 text-right font-semibold text-indigo-700">{fmt(data.hourlyRate)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Confirmed Razorpay Payments */}
                    {paymentsList.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-gray-800">Confirmed Razorpay Payments</h3>
                                <span className="text-xs text-gray-400">{paymentsList.length} records</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50">
                                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Method</th>
                                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Booking</th>
                                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                                            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {paymentsList.map(p => (
                                            <tr key={p._id} className="hover:bg-gray-50">
                                                <td className="px-5 py-3 font-semibold text-gray-900">{fmt(p.amount)}</td>
                                                <td className="px-5 py-3 text-gray-600 capitalize">{p.paymentMethod}</td>
                                                <td className="px-5 py-3 text-gray-500 max-w-[160px] truncate">
                                                    {p.bookingId?.subject || p.notes || '—'}
                                                </td>
                                                <td className="px-5 py-3 text-gray-500">
                                                    {new Date(p.paidAt || p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        p.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                        p.status === 'refunded' ? 'bg-red-100 text-red-700' :
                                                        p.status === 'partially_refunded' ? 'bg-orange-100 text-orange-700' :
                                                        'bg-amber-100 text-amber-700'
                                                    }`}>
                                                        {p.status === 'partially_refunded' ? 'Partial refund' : p.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Log Cash Payment Modal */}
            {logModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Log a cash / offline payment</h3>
                                <p className="text-sm text-gray-500 mt-0.5">Record a payment received outside Razorpay.</p>
                            </div>
                            <button onClick={() => setLogModal(false)} className="text-gray-400 hover:text-gray-600 ml-3">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleLogPayment} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Amount (₹) *</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={logForm.amount}
                                    onChange={e => setLogForm(v => ({ ...v, amount: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    placeholder="e.g. 500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Payment Method</label>
                                <select
                                    value={logForm.paymentMethod}
                                    onChange={e => setLogForm(v => ({ ...v, paymentMethod: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    <option value="cash">Cash</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="upi">UPI (offline)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Notes (optional)</label>
                                <input
                                    type="text"
                                    value={logForm.notes}
                                    onChange={e => setLogForm(v => ({ ...v, notes: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    placeholder="e.g. June fee, Math sessions"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setLogModal(false)}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={logSubmitting}
                                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2"
                                >
                                    {logSubmitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                    Save payment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
