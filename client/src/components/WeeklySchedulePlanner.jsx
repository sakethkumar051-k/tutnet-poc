import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_SLOTS = [
    '6:00–8:00', '8:00–10:00', '10:00–12:00',
    '12:00–14:00', '14:00–16:00', '16:00–18:00',
    '18:00–20:00', '20:00–22:00'
];

// Convert "Mon 10:00–12:00" → { day, slot }
const parseSlot = (str) => {
    const parts = str.split(' ');
    return { day: parts[0], slot: parts.slice(1).join(' ') };
};

const toKey = (day, slot) => `${day} ${slot}`;

const WeeklySchedulePlanner = () => {
    const [selected, setSelected] = useState(new Set());
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const { showSuccess, showError } = useToast();

    useEffect(() => {
        api.get('/tutors/my-profile')
            .then(({ data }) => {
                const slots = (data.availableSlots || []).map(s => s.trim());
                setSelected(new Set(slots));
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const toggle = (day, slot) => {
        const key = toKey(day, slot);
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put('/tutors/profile', { availableSlots: [...selected] });
            showSuccess('Schedule saved');
        } catch {
            showError('Failed to save schedule');
        } finally {
            setSaving(false);
        }
    };

    const selectedCount = selected.size;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <svg className="animate-spin h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-bold text-gray-900">Weekly Availability</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Click slots to mark when you are available to teach.
                        {selectedCount > 0 && <span className="ml-1 font-medium text-indigo-600">{selectedCount} slot{selectedCount !== 1 ? 's' : ''} selected.</span>}
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                    {saving ? 'Saving…' : 'Save Schedule'}
                </button>
            </div>

            {/* Grid */}
            <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 w-28">
                                Time
                            </th>
                            {DAYS.map(day => (
                                <th key={day} className="py-3 px-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide border-b border-gray-200">
                                    {day}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {TIME_SLOTS.map((slot, rowIdx) => (
                            <tr key={slot} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                <td className="py-2.5 px-4 text-xs font-medium text-gray-500 border-r border-gray-100 whitespace-nowrap">
                                    {slot}
                                </td>
                                {DAYS.map(day => {
                                    const key = toKey(day, slot);
                                    const active = selected.has(key);
                                    return (
                                        <td key={day} className="py-2 px-2 text-center">
                                            <button
                                                onClick={() => toggle(day, slot)}
                                                aria-label={`${active ? 'Remove' : 'Add'} ${day} ${slot}`}
                                                className={`w-full h-9 rounded-lg text-xs font-semibold transition-all ${
                                                    active
                                                        ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700'
                                                        : 'bg-gray-100 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 border border-transparent hover:border-indigo-200'
                                                }`}
                                            >
                                                {active ? '✓' : ''}
                                            </button>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedCount === 0 && (
                <p className="text-center text-sm text-gray-400 py-2">
                    No slots selected yet. Click on the grid to mark your availability.
                </p>
            )}
        </div>
    );
};

export default WeeklySchedulePlanner;
