import { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from './LoadingSpinner';

const FILTERS = [
    { id: 'all',   label: 'All Time' },
    { id: 'month', label: 'This Month' },
    { id: 'week',  label: 'This Week' }
];

const statusColor = {
    completed: 'bg-green-100 text-green-800',
    approved:  'bg-indigo-100 text-indigo-800',
    pending:   'bg-amber-100 text-amber-800',
    cancelled: 'bg-gray-100 text-gray-600',
    rejected:  'bg-red-100 text-red-700'
};

const ClassHistoryTracker = () => {
    const [bookings, setBookings]     = useState([]);
    const [profile, setProfile]       = useState(null);
    const [loading, setLoading]       = useState(true);
    const [filter, setFilter]         = useState('all');
    const { showError } = useToast();

    useEffect(() => {
        Promise.all([
            api.get('/bookings/mine'),
            api.get('/tutors/my-profile').catch(() => ({ data: null }))
        ])
            .then(([bookingsRes, profileRes]) => {
                setBookings(bookingsRes.data || []);
                setProfile(profileRes.data);
            })
            .catch(() => showError('Failed to load history'))
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        const now = new Date();
        return bookings.filter(b => {
            if (filter === 'all') return true;
            const date = b.sessionDate ? new Date(b.sessionDate) : new Date(b.createdAt);
            if (filter === 'week') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return date >= weekAgo;
            }
            if (filter === 'month') {
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            }
            return true;
        });
    }, [bookings, filter]);

    const completed   = filtered.filter(b => b.status === 'completed');
    const hourlyRate  = profile?.hourlyRate || 0;
    // Estimate earnings: completed sessions × hourlyRate × (duration/60), default 1hr
    const totalEarnings = completed.reduce((sum, b) => {
        const hrs = (b.duration || 60) / 60;
        return sum + hourlyRate * hrs;
    }, 0);
    const totalHours = completed.reduce((sum, b) => sum + (b.duration || 60) / 60, 0);

    if (loading) {
        return <div className="flex justify-center py-10"><LoadingSpinner size="lg" /></div>;
    }

    return (
        <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Sessions', value: filtered.length, color: 'text-gray-900' },
                    { label: 'Completed', value: completed.length, color: 'text-green-700' },
                    { label: 'Hours Taught', value: `${totalHours.toFixed(1)}h`, color: 'text-indigo-700' },
                    { label: 'Est. Earnings', value: `₹${totalEarnings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: 'text-emerald-700' }
                ].map(card => (
                    <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                        <p className="text-xs text-gray-500 font-medium mb-1">{card.label}</p>
                        <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                    </div>
                ))}
            </div>

            {hourlyRate === 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                    Set your hourly rate in your profile to see accurate earnings estimates.
                </p>
            )}

            {/* Filter */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 font-medium">Show:</span>
                {FILTERS.map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            filter === f.id
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Session list */}
            {filtered.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                    <p className="text-gray-400 text-sm">No sessions found for this period.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Student</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subject</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Duration</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Earnings</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map(b => {
                                const hrs = (b.duration || 60) / 60;
                                const earning = b.status === 'completed' ? hourlyRate * hrs : null;
                                return (
                                    <tr key={b._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="py-3 px-4 font-medium text-gray-900">
                                            {b.studentId?.name || '—'}
                                        </td>
                                        <td className="py-3 px-4 text-gray-600">{b.subject}</td>
                                        <td className="py-3 px-4 text-gray-500">
                                            {b.sessionDate
                                                ? new Date(b.sessionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                                : b.preferredSchedule || '—'}
                                        </td>
                                        <td className="py-3 px-4 text-gray-500">
                                            {b.duration ? `${b.duration} min` : '60 min'}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColor[b.status] || 'bg-gray-100 text-gray-600'}`}>
                                                {b.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                                            {earning !== null ? `₹${earning.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ClassHistoryTracker;
