/** Presence label from server `lastSeenAt` (updated on authenticated API use, throttled). */
const ACTIVE_MS = 5 * 60 * 1000;

export function formatPresence(lastSeenAt) {
    if (!lastSeenAt) return { label: '', isActive: false };
    const d = new Date(lastSeenAt);
    if (Number.isNaN(d.getTime())) return { label: '', isActive: false };
    const diff = Date.now() - d.getTime();
    if (diff < ACTIVE_MS) return { label: 'Active now', isActive: true };
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return { label: `Last seen ${mins}m ago`, isActive: false };
    const hours = Math.floor(mins / 60);
    if (hours < 24) return { label: `Last seen ${hours}h ago`, isActive: false };
    const days = Math.floor(hours / 24);
    if (days < 7) return { label: `Last seen ${days}d ago`, isActive: false };
    return {
        label: `Last seen ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
        isActive: false
    };
}
