import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIMES = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
    '20:00', '21:00', '22:00'
];

function TimeLabel(t) {
    const [h] = t.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${display}:00 ${ampm}`;
}

export default function AvailabilityManager() {
    const { showSuccess, showError } = useToast();
    const [availability, setAvailability] = useState(
        DAYS.map(day => ({ day, slots: [] }))
    );
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.get('/tutors/my-profile')
            .then(res => {
                const wa = res.data?.weeklyAvailability;
                if (wa && wa.length > 0) {
                    const filled = DAYS.map(day => {
                        const existing = wa.find(d => d.day === day);
                        return { day, slots: existing?.slots || [] };
                    });
                    setAvailability(filled);
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const addSlot = (dayIdx) => {
        setAvailability(prev => prev.map((d, i) =>
            i === dayIdx ? { ...d, slots: [...d.slots, { start: '09:00', end: '10:00' }] } : d
        ));
    };

    const removeSlot = (dayIdx, slotIdx) => {
        setAvailability(prev => prev.map((d, i) =>
            i === dayIdx ? { ...d, slots: d.slots.filter((_, j) => j !== slotIdx) } : d
        ));
    };

    const updateSlot = (dayIdx, slotIdx, field, value) => {
        setAvailability(prev => prev.map((d, i) =>
            i === dayIdx
                ? { ...d, slots: d.slots.map((s, j) => j === slotIdx ? { ...s, [field]: value } : s) }
                : d
        ));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const filtered = availability.filter(d => d.slots.length > 0);
            await api.patch('/tutors/availability', { weeklyAvailability: filtered });
            showSuccess('Availability saved');
        } catch (err) {
            showError(err.response?.data?.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-5">
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-base font-bold text-gray-900">Weekly Availability</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Set the times you're available each week. Students will see this before booking.</p>
                </div>
                <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                    {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    Save
                </button>
            </div>

            <div className="space-y-3">
                {availability.map((dayData, dayIdx) => (
                    <div key={dayData.day} className={`rounded-xl border px-4 py-3 ${dayData.slots.length > 0 ? 'border-indigo-100 bg-indigo-50/30' : 'border-gray-100 bg-gray-50/50'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-800">{dayData.day.slice(0, 3)}</span>
                                {dayData.slots.length === 0 && <span className="text-xs text-gray-400">Not available</span>}
                            </div>
                            <button onClick={() => addSlot(dayIdx)}
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add slot
                            </button>
                        </div>

                        {dayData.slots.length > 0 && (
                            <div className="space-y-2 mt-1">
                                {dayData.slots.map((slot, slotIdx) => (
                                    <div key={slotIdx} className="flex items-center gap-2">
                                        <select
                                            value={slot.start}
                                            onChange={e => updateSlot(dayIdx, slotIdx, 'start', e.target.value)}
                                            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                                        >
                                            {TIMES.map(t => <option key={t} value={t}>{TimeLabel(t)}</option>)}
                                        </select>
                                        <span className="text-xs text-gray-400">to</span>
                                        <select
                                            value={slot.end}
                                            onChange={e => updateSlot(dayIdx, slotIdx, 'end', e.target.value)}
                                            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                                        >
                                            {TIMES.map(t => <option key={t} value={t}>{TimeLabel(t)}</option>)}
                                        </select>
                                        <button onClick={() => removeSlot(dayIdx, slotIdx)}
                                            className="text-red-400 hover:text-red-600 transition-colors ml-1">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-700">
                    Availability is shown to students when they view your profile. Changes take effect immediately after saving.
                </p>
            </div>
        </div>
    );
}
