const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Booking lifecycle (canonical):
 * pending -> approved -> completed
 * pending -> rejected
 * approved -> cancelled
 */
function resolveBookingCategory(bookingCategory, bookingType) {
    if (bookingCategory) return bookingCategory;
    if (bookingType === 'demo') return 'trial';
    if (bookingType === 'regular') return 'session';
    return 'session';
}

/** Check if a date/time falls within tutor's weeklyAvailability or availableSlots */
function isWithinTutorAvailability(tutorProfile, dateTime) {
    const d = new Date(dateTime);
    const dayName = DAY_NAMES[d.getDay()];
    const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

    const wa = tutorProfile.weeklyAvailability || [];
    if (wa.length > 0) {
        const daySlot = wa.find((x) => x.day === dayName);
        if (!daySlot || !daySlot.slots || daySlot.slots.length === 0) return false;
        for (const slot of daySlot.slots) {
            const start = (slot.start || '').substring(0, 5);
            const end = (slot.end || '').substring(0, 5);
            if (start && end && timeStr >= start && timeStr < end) return true;
        }
        return false;
    }

    const legacy = tutorProfile.availableSlots || [];
    const dayAbbr = dayName.substring(0, 3);
    for (const s of legacy) {
        if (typeof s !== 'string') continue;
        if (!s.toLowerCase().includes(dayAbbr.toLowerCase())) continue;
        const range = s.match(/(\d{1,2})\s*-\s*(\d{1,2})/);
        if (range) {
            const hour = d.getHours();
            const startH = parseInt(range[1], 10);
            const endH = parseInt(range[2], 10);
            if (hour >= startH && hour < endH) return true;
        }
    }
    return false;
}

module.exports = {
    DAY_NAMES,
    resolveBookingCategory,
    isWithinTutorAvailability
};
