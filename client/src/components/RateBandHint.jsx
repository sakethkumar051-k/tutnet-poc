import { useEffect, useState, useMemo } from 'react';
import api from '../utils/api';

/**
 * RateBandHint — shows the tutor the rate band that applies to their current
 * grades/subjects selection, and flags when their entered rate is out of band.
 *
 * Matches REVENUE_MODEL.md §2 (platform rate bands) verbatim on server side.
 * On the client we fetch the band list once and compute locally for responsiveness.
 */
export default function RateBandHint({ classes = [], subjects = [], strengthTags = [], mode = 'home', currentRate = 0 }) {
    const [bands, setBands] = useState([]);

    useEffect(() => {
        api.get('/rate-bands')
            .then(({ data }) => setBands(data.bands || []))
            .catch(() => setBands([]));
    }, []);

    const matchedBand = useMemo(() => {
        if (bands.length === 0) return null;
        // Client-side replica of server-side matching logic — keep in sync with constants/rateBands.js
        const ordered = ['classes_11_12_jee_neet', 'classes_11_12_general', 'classes_9_10_core', 'classes_9_10_lang', 'classes_6_8_core', 'classes_6_8_lang', 'classes_1_5'];
        for (const id of ordered) {
            const b = bands.find((x) => x.id === id);
            if (!b) continue;
            const gradeOverlap = (b.grades || []).some((g) => classes.includes(g));
            if (!gradeOverlap) continue;
            if (b.strengthTags && !b.strengthTags.some((t) => strengthTags.includes(t))) continue;
            if (b.subjects && !b.subjects.some((s) => subjects.includes(s))) continue;
            return b;
        }
        return null;
    }, [bands, classes, subjects, strengthTags]);

    if (!matchedBand) {
        return (
            <p className="mt-1.5 text-xs text-gray-500">
                Pick your grade(s) and subjects above to see the applicable price band.
            </p>
        );
    }

    const modeBand = mode === 'online' ? matchedBand.online : matchedBand.home;
    const suggested = (matchedBand.suggested || {})[mode] ?? modeBand?.floor ?? 0;
    const outOfBand = currentRate > 0 && (currentRate < modeBand.floor || currentRate > modeBand.ceiling);

    return (
        <div className="mt-2 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                    {matchedBand.label} · {mode}
                </p>
                <span className="text-[10px] text-gray-400">
                    ₹{modeBand.floor} – ₹{modeBand.ceiling}/hr
                </span>
            </div>
            {outOfBand ? (
                <p className="text-xs font-semibold text-rose-600 flex items-start gap-1.5">
                    <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                    </svg>
                    Rate is outside the allowed range. Platform will reject on save.
                </p>
            ) : currentRate > 0 ? (
                <p className="text-xs text-lime-dark flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Within band. {suggested && currentRate < suggested && (
                        <span className="text-gray-500 ml-1">Suggested default: ₹{suggested}/hr.</span>
                    )}
                </p>
            ) : (
                <p className="text-xs text-gray-500">
                    Suggested default: <span className="font-semibold text-navy-950">₹{suggested}/hr</span>
                </p>
            )}
        </div>
    );
}
