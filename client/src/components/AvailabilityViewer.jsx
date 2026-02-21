const DAY_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DAY_SHORT = { Monday:'Mon', Tuesday:'Tue', Wednesday:'Wed', Thursday:'Thu', Friday:'Fri', Saturday:'Sat', Sunday:'Sun' };

function TimeLabel(t) {
    if (!t) return '';
    const [h] = t.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${display}:00 ${ampm}`;
}

export default function AvailabilityViewer({ weeklyAvailability = [], availableSlots = [] }) {
    const hasStructured = weeklyAvailability?.length > 0;
    const hasLegacy = availableSlots?.length > 0;

    if (!hasStructured && !hasLegacy) return null;

    if (hasStructured) {
        const sorted = [...weeklyAvailability].sort(
            (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day)
        );
        return (
            <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-700 mb-3">Available Times</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {sorted.map(d => (
                        <div key={d.day} className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                            <p className="text-xs font-bold text-indigo-800 mb-1">{DAY_SHORT[d.day] || d.day}</p>
                            {d.slots.map((s, i) => (
                                <p key={i} className="text-xs text-indigo-600">
                                    {TimeLabel(s.start)} – {TimeLabel(s.end)}
                                </p>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Legacy fallback
    return (
        <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-700">Available Times</p>
            <div className="flex flex-wrap gap-2">
                {availableSlots.map((s, i) => (
                    <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-lg border border-indigo-100">
                        {s}
                    </span>
                ))}
            </div>
        </div>
    );
}
