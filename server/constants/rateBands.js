/**
 * Rate Bands — per REVENUE_MODEL.md §2.
 * Values are ₹/hour. Bands are ENFORCED (not suggestions).
 *
 * Structure: keyed by grade-band id. Each entry has:
 *   - grades:   which tutor.classes values map here
 *   - subjects: optional filter for variant bands (e.g. 6-8 core vs languages)
 *   - floor/ceiling: per mode ("online" | "home")
 *   - suggested: 80th-percentile default shown to new tutors
 */

const RATE_BANDS = Object.freeze([
    {
        id: 'classes_1_5',
        label: 'Classes 1–5',
        grades: ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5'],
        subjects: null, // applies to all subjects
        online: { floor: 250, ceiling: 400 },
        home:   { floor: 300, ceiling: 500 },
        suggested: { online: 300, home: 350 }
    },
    {
        id: 'classes_6_8_core',
        label: 'Classes 6–8 · Core (Math / Science / English)',
        grades: ['Class 6', 'Class 7', 'Class 8'],
        subjects: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Computer Science'],
        online: { floor: 350, ceiling: 600 },
        home:   { floor: 400, ceiling: 700 },
        suggested: { online: 450, home: 500 }
    },
    {
        id: 'classes_6_8_lang',
        label: 'Classes 6–8 · Languages / Social Studies',
        grades: ['Class 6', 'Class 7', 'Class 8'],
        subjects: ['Hindi', 'Telugu', 'Sanskrit', 'French', 'Social Studies', 'General Knowledge', 'EVS'],
        online: { floor: 300, ceiling: 500 },
        home:   { floor: 350, ceiling: 600 },
        suggested: { online: 400, home: 450 }
    },
    {
        id: 'classes_9_10_core',
        label: 'Classes 9–10 · Core',
        grades: ['Class 9', 'Class 10'],
        subjects: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Computer Science'],
        online: { floor: 500, ceiling: 800 },
        home:   { floor: 600, ceiling: 950 },
        suggested: { online: 650, home: 750 }
    },
    {
        id: 'classes_9_10_lang',
        label: 'Classes 9–10 · Languages / Social Studies',
        grades: ['Class 9', 'Class 10'],
        subjects: ['Hindi', 'Telugu', 'Sanskrit', 'French', 'Social Studies'],
        online: { floor: 450, ceiling: 700 },
        home:   { floor: 550, ceiling: 850 },
        suggested: { online: 600, home: 700 }
    },
    {
        id: 'classes_11_12_general',
        label: 'Classes 11–12 · General (CBSE / State board)',
        grades: ['Class 11', 'Class 12'],
        subjects: null, // except JEE/NEET — handled by id below
        online: { floor: 700, ceiling: 1200 },
        home:   { floor: 850, ceiling: 1400 },
        suggested: { online: 950, home: 1100 }
    },
    {
        id: 'classes_11_12_jee_neet',
        label: 'Classes 11–12 · JEE / NEET foundation',
        grades: ['Class 11', 'Class 12'],
        subjects: null,
        online: { floor: 900, ceiling: 1500 },
        home:   { floor: 1100, ceiling: 1700 },
        suggested: { online: 1200, home: 1400 },
        // Matches only when strengthTags includes one of these
        strengthTags: ['JEE/NEET', 'JEE', 'NEET', 'Competitive Exams']
    }
]);

/**
 * Given a tutor profile (classes[], subjects[], mode, strengthTags[]),
 * find the most-specific matching band.
 * Returns null if no match (tutor hasn't picked classes yet).
 */
function findBandForTutor(profile) {
    const classes = profile.classes || [];
    const subjects = profile.subjects || [];
    const strengthTags = profile.strengthTags || [];

    // Try more specific bands first (JEE/NEET > general > subject-variant)
    const ordered = [
        'classes_11_12_jee_neet',
        'classes_11_12_general',
        'classes_9_10_core',
        'classes_9_10_lang',
        'classes_6_8_core',
        'classes_6_8_lang',
        'classes_1_5'
    ];

    for (const id of ordered) {
        const band = RATE_BANDS.find((b) => b.id === id);
        if (!band) continue;
        const gradeOverlap = band.grades.some((g) => classes.includes(g));
        if (!gradeOverlap) continue;

        if (band.strengthTags) {
            const tagOverlap = band.strengthTags.some((t) => strengthTags.includes(t));
            if (!tagOverlap) continue;
        }
        if (band.subjects) {
            const subjectOverlap = band.subjects.some((s) => subjects.includes(s));
            if (!subjectOverlap) continue;
        }
        return band;
    }
    return null;
}

/**
 * Validate an hourlyRate against a band + mode.
 * Returns { ok: true } or { ok: false, reason, band, floor, ceiling }
 */
function validateRate({ hourlyRate, mode, profile }) {
    if (typeof hourlyRate !== 'number' || Number.isNaN(hourlyRate) || hourlyRate <= 0) {
        return { ok: false, reason: 'hourlyRate must be a positive number' };
    }
    const band = findBandForTutor(profile);
    if (!band) {
        // No band match (tutor hasn't specified classes yet) — skip enforcement, let them proceed
        return { ok: true, band: null };
    }
    const modeBand = (mode === 'online' || mode === 'both') ? band.online : band.home;
    // For 'both' mode, enforce the tighter of home/online — safer: use the online floor/home ceiling
    const floor = mode === 'both' ? Math.max(band.online.floor, band.home.floor) : modeBand.floor;
    const ceiling = mode === 'both' ? Math.min(band.online.ceiling, band.home.ceiling) : modeBand.ceiling;

    if (hourlyRate < floor) {
        return {
            ok: false,
            reason: `For ${band.label} (${mode}), the minimum hourly rate is ₹${floor}.`,
            band: band.id, floor, ceiling
        };
    }
    if (hourlyRate > ceiling) {
        return {
            ok: false,
            reason: `For ${band.label} (${mode}), the maximum hourly rate is ₹${ceiling}.`,
            band: band.id, floor, ceiling
        };
    }
    return { ok: true, band: band.id, floor, ceiling };
}

module.exports = {
    RATE_BANDS,
    findBandForTutor,
    validateRate
};
