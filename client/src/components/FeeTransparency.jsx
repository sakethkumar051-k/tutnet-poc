import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import CheckoutModal from './CheckoutModal';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const STATUS_COLOR = {
    completed: 'bg-green-100 text-green-700',
    refunded: 'bg-red-100 text-red-700',
    partially_refunded: 'bg-orange-100 text-orange-700',
    failed: 'bg-red-100 text-red-700',
    pending: 'bg-amber-100 text-amber-700',
    created: 'bg-amber-100 text-amber-700',
    unpaid: 'bg-amber-100 text-amber-700'
};

const STATUS_LABEL = {
    completed: 'Paid',
    refunded: 'Refunded',
    partially_refunded: 'Partial refund',
    failed: 'Failed',
    pending: 'Pending',
    created: 'Awaiting payment',
    unpaid: 'Unpaid'
};

export default function FeeTransparency() {
    // payments[] — each item is a Payment doc with bookingId populated
    const [payments, setPayments] = useState([]);
    // unpaidBookings[] — approved, non-trial bookings with no payment record
    const [unpaidBookings, setUnpaidBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('month');
    const [checkoutBooking, setCheckoutBooking] = useState(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Real payment records (Razorpay + manual)
            const { data: paymentData } = await api.get('/payments/student-history');
            setPayments(Array.isArray(paymentData) ? paymentData : []);

            // All bookings to find unpaid approved sessions
            const { data: bookings } = await api.get('/bookings/mine');
            const paidBookingIds = new Set(
                paymentData
                    .filter(p => p.status === 'completed')
                    .map(p => p.bookingId?._id || p.bookingId)
                    .filter(Boolean)
            );
            const unpaid = bookings.filter(b =>
                b.status === 'approved' &&
                b.bookingCategory !== 'trial' &&
                !b.isPaid &&
                !paidBookingIds.has(b._id)
            );
            setUnpaidBookings(unpaid);
        } catch (err) {
            console.error('[FeeTransparency] load error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // Filter payments by selected period
    const now = new Date();
    const filtered = payments.filter(p => {
        const d = new Date(p.paidAt || p.createdAt);
        if (period === 'week') {
            const ws = new Date(now);
            ws.setDate(now.getDate() - now.getDay());
            ws.setHours(0, 0, 0, 0);
            return d >= ws;
        }
        if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        if (period === 'year') return d.getFullYear() === now.getFullYear();
        return true;
    });

    const totalPaid = filtered
        .filter(p => p.status === 'completed')
        .reduce((s, p) => s + p.amount, 0);
    const totalRefunded = filtered
        .filter(p => ['refunded', 'partially_refunded'].includes(p.status))
        .reduce((s, p) => s + (p.refundAmount || p.amount), 0);
    const paidCount = filtered.filter(p => p.status === 'completed').length;

    // Group by tutor (from bookingId.tutorId)
    const byTutor = {};
    filtered.forEach(p => {
        const booking = p.bookingId;
        const tid = booking?.tutorId?._id || booking?.tutorId || 'unknown';
        const tname = booking?.tutorId?.name || '—';
        if (!byTutor[tid]) byTutor[tid] = { name: tname, payments: [] };
        byTutor[tid].payments.push(p);
    });

    if (loading) return (
        <div className="space-y-4 animate-pulse">
            <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
            </div>
            <div className="h-48 bg-gray-100 rounded-xl" />
        </div>
    );

    return (
        <div className="space-y-5">
            {/* Unpaid sessions action banner */}
            {unpaidBookings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
                    <p className="text-sm font-semibold text-amber-800 mb-3">
                        {unpaidBookings.length} approved session{unpaidBookings.length !== 1 ? 's' : ''} awaiting payment
                    </p>
                    <div className="space-y-2">
                        {unpaidBookings.slice(0, 3).map(b => (
                            <div key={b._id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-amber-100">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{b.tutorId?.name || 'Tutor'}</p>
                                    <p className="text-xs text-gray-500">{b.subject} · {b.sessionDate ? new Date(b.sessionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'TBD'}</p>
                                </div>
                                <button
                                    onClick={() => setCheckoutBooking(b)}
                                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    Pay now
                                </button>
                            </div>
                        ))}
                        {unpaidBookings.length > 3 && (
                            <p className="text-xs text-amber-700 text-center pt-1">+{unpaidBookings.length - 3} more — go to Sessions tab to pay</p>
                        )}
                    </div>
                </div>
            )}

            {/* Period filter */}
            <div className="flex items-center gap-2 flex-wrap">
                {[
                    { value: 'week', label: 'This Week' },
                    { value: 'month', label: 'This Month' },
                    { value: 'year', label: 'This Year' },
                    { value: 'all', label: 'All Time' }
                ].map(p => (
                    <button
                        key={p.value}
                        onClick={() => setPeriod(p.value)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${period === p.value ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-indigo-200 p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Paid sessions</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{paidCount}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total paid</p>
                    <p className="text-2xl font-bold text-indigo-700 mt-1">{fmt(totalPaid)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">confirmed payments</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Refunded</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{fmt(totalRefunded)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{unpaidBookings.length} pending</p>
                </div>
            </div>

            {/* Tutor-wise breakdown */}
            {Object.keys(byTutor).length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-800">By tutor</h3>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {Object.values(byTutor).map((t, i) => {
                            const tutorPaid = t.payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
                            return (
                                <div key={i} className="px-5 py-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{t.payments.length} payment{t.payments.length !== 1 ? 's' : ''}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-indigo-700">{fmt(tutorPaid)}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{t.payments.filter(p => p.status === 'completed').length} paid</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Payment history table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-800">Payment history</h3>
                </div>
                {filtered.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-sm text-gray-500 font-medium">No payments in this period</p>
                        <p className="text-xs text-gray-400 mt-1">Your Razorpay payments will appear here once confirmed</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tutor</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subject</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(p => {
                                    const booking = p.bookingId;
                                    const status = p.status || 'unpaid';
                                    return (
                                        <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-5 py-3 font-medium text-gray-800">
                                                {booking?.tutorId?.name || '—'}
                                            </td>
                                            <td className="px-5 py-3 text-gray-600">
                                                {booking?.subject || '—'}
                                            </td>
                                            <td className="px-5 py-3 text-gray-500">
                                                {new Date(p.paidAt || p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-5 py-3 font-semibold text-gray-900">
                                                {fmt(p.amount)}
                                                {p.refundAmount > 0 && (
                                                    <span className="ml-1.5 text-xs font-normal text-red-600">
                                                        (-{fmt(p.refundAmount)} refunded)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[status] || STATUS_COLOR.unpaid}`}>
                                                    {STATUS_LABEL[status] || status}
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

            {/* Checkout modal triggered from unpaid banner */}
            {checkoutBooking && (
                <CheckoutModal
                    booking={checkoutBooking}
                    onClose={() => setCheckoutBooking(null)}
                    onSuccess={() => {
                        setCheckoutBooking(null);
                        loadData();
                    }}
                />
            )}
        </div>
    );
}
