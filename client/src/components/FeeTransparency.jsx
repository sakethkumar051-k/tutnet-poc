import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function FeeTransparency() {
    const [sessions, setSessions] = useState([]);
    const [tutorRates, setTutorRates] = useState({});
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('month');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: bookings } = await api.get('/payments/student-history');
            setSessions(bookings);

            // Fetch tutor profiles to get hourly rates
            const tutorIds = [...new Set(bookings.map(b => b.tutorId?._id).filter(Boolean))];
            const rates = {};
            await Promise.all(tutorIds.map(async (tid) => {
                try {
                    const { data: profile } = await api.get(`/tutors/${tid}/profile`);
                    rates[tid] = profile.hourlyRate || 0;
                } catch { rates[tid] = 0; }
            }));
            setTutorRates(rates);
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const now = new Date();
    const filtered = sessions.filter(s => {
        const d = new Date(s.sessionDate || s.createdAt);
        if (period === 'week') {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            weekStart.setHours(0, 0, 0, 0);
            return d >= weekStart;
        }
        if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        if (period === 'year') return d.getFullYear() === now.getFullYear();
        return true;
    });

    const totalCost = filtered.reduce((s, b) => s + (tutorRates[b.tutorId?._id] || 0), 0);
    const paidCount = filtered.filter(b => b.isPaid).length;

    // Group by tutor
    const byTutor = {};
    filtered.forEach(b => {
        const tid = b.tutorId?._id;
        const tname = b.tutorId?.name || 'Unknown';
        if (!byTutor[tid]) byTutor[tid] = { name: tname, sessions: [], rate: tutorRates[tid] || 0 };
        byTutor[tid].sessions.push(b);
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
            {/* Period filter */}
            <div className="flex items-center gap-2">
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
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Classes</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{filtered.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Estimated Cost</p>
                    <p className="text-2xl font-bold text-indigo-700 mt-1">{fmt(totalCost)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Based on tutor rates</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Paid</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{paidCount}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{filtered.length - paidCount} pending</p>
                </div>
            </div>

            {/* Tutor-wise breakdown */}
            {Object.entries(byTutor).length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-800">Tutor-wise Breakdown</h3>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {Object.values(byTutor).map((t, i) => (
                            <div key={i} className="px-5 py-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{t.sessions.length} sessions · {fmt(t.rate)}/hr</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-indigo-700">{fmt(t.rate * t.sessions.length)}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{t.sessions.filter(s => s.isPaid).length} paid</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Session-level table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-800">Session Details</h3>
                </div>
                {filtered.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-sm text-gray-500 font-medium">No sessions in this period</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tutor</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subject</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rate</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map(s => (
                                    <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-5 py-3 font-medium text-gray-800">{s.tutorId?.name || '—'}</td>
                                        <td className="px-5 py-3 text-gray-600">{s.subject}</td>
                                        <td className="px-5 py-3 text-gray-500">
                                            {s.sessionDate
                                                ? new Date(s.sessionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                                : new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                        </td>
                                        <td className="px-5 py-3 text-gray-600">{fmt(tutorRates[s.tutorId?._id])}</td>
                                        <td className="px-5 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.isPaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {s.isPaid ? 'Paid' : 'Pending'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
