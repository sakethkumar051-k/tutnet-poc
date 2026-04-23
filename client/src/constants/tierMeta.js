/**
 * Single source of truth for tutor tier visual identity + revenue-model values.
 * Every tutor surface reads TIER_META from here so changing a color or a
 * threshold happens in exactly one place.
 *
 * Values mirror REVENUE_MODEL.md §4 (thresholds, commission rates) and §5.1
 * (tier-gated incentive eligibility).
 */

export const TIERS = ['starter', 'silver', 'gold', 'platinum'];

// ── Revenue-model values (REVENUE_MODEL.md §4) ──────────────────────────
export const TIER_MODEL = {
    starter:  { label: 'Starter',  stars: 1, commission: 25, minSessions: 0,   minRating: 0,   eligibleForCliffs: false },
    silver:   { label: 'Silver',   stars: 2, commission: 22, minSessions: 21,  minRating: 4.0, eligibleForCliffs: true  },
    gold:     { label: 'Gold',     stars: 3, commission: 18, minSessions: 76,  minRating: 4.4, eligibleForCliffs: true  },
    platinum: { label: 'Platinum', stars: 4, commission: 15, minSessions: 201, minRating: 4.7, eligibleForCliffs: true  }
};

// ── Visual palette per tier (Tailwind classes) ──────────────────────────
// Starter = slate/neutral; Silver = slate-silver; Gold = amber; Platinum = emerald
export const TIER_VISUAL = {
    starter: {
        gradient: 'from-slate-50 via-white to-slate-100',
        border: 'border-slate-200',
        accent: 'bg-slate-500',
        accentSoft: 'bg-slate-100',
        text: 'text-slate-900',
        textSoft: 'text-slate-600',
        star: 'text-slate-400',
        ring: 'ring-slate-300',
        chip: 'bg-slate-100 text-slate-700',
        glow: 'shadow-slate-200/50'
    },
    silver: {
        gradient: 'from-slate-50 via-slate-100 to-slate-200',
        border: 'border-slate-300',
        accent: 'bg-gradient-to-br from-slate-400 to-slate-500',
        accentSoft: 'bg-slate-200',
        text: 'text-slate-900',
        textSoft: 'text-slate-600',
        star: 'text-slate-500',
        ring: 'ring-slate-400',
        chip: 'bg-slate-200 text-slate-800',
        glow: 'shadow-slate-300/50'
    },
    gold: {
        gradient: 'from-amber-50 via-yellow-50 to-amber-100',
        border: 'border-amber-300',
        accent: 'bg-gradient-to-br from-amber-400 to-yellow-500',
        accentSoft: 'bg-amber-100',
        text: 'text-amber-950',
        textSoft: 'text-amber-800',
        star: 'text-amber-500',
        ring: 'ring-amber-400',
        chip: 'bg-amber-100 text-amber-900',
        glow: 'shadow-amber-200/60'
    },
    platinum: {
        gradient: 'from-emerald-50 via-teal-50 to-cyan-50',
        border: 'border-emerald-400',
        accent: 'bg-gradient-to-br from-emerald-500 to-teal-500',
        accentSoft: 'bg-emerald-100',
        text: 'text-emerald-950',
        textSoft: 'text-emerald-800',
        star: 'text-emerald-500',
        ring: 'ring-emerald-400',
        chip: 'bg-emerald-100 text-emerald-900',
        glow: 'shadow-emerald-300/60'
    }
};

export const getTierMeta = (tier) => ({
    key: tier,
    ...(TIER_MODEL[tier] || TIER_MODEL.starter),
    ...(TIER_VISUAL[tier] || TIER_VISUAL.starter)
});

export const getNextTier = (tier) => {
    const idx = TIERS.indexOf(tier);
    if (idx < 0 || idx === TIERS.length - 1) return null;
    return TIERS[idx + 1];
};

// ── Incentive schedule (REVENUE_MODEL.md §5.1) ──────────────────────────
// Each entry is what appears on the tutor's incentive ledger / milestones UI.
export const TUTOR_INCENTIVES = [
    { key: 'demo_conversion',   label: 'Demo → paid conversion',   amount: 150,  desc: 'Trial converts to paid within 48h',                    tiers: ['starter','silver','gold','platinum'], cadence: 'per event' },
    { key: 'first_session',     label: 'First-session milestone',  amount: 100,  desc: 'Your very first completed session',                   tiers: ['starter'],                             cadence: 'one-time'  },
    { key: 'ten_sessions',      label: '10-session milestone',     amount: 200,  desc: '10 lifetime sessions',                                tiers: ['starter','silver','gold','platinum'], cadence: 'one-time'  },
    { key: 'retention_3mo',     label: '3-month retention',        amount: 1000, desc: '3 consecutive months with same paying parent',         tiers: ['silver','gold','platinum'],            cadence: 'per student' },
    { key: 'retention_6mo',     label: '6-month retention',        amount: 2500, desc: '6 consecutive months with same paying parent',         tiers: ['silver','gold','platinum'],            cadence: 'per student' },
    { key: 'volume_bonus',      label: 'Volume bonus',             amount: 1500, desc: '5+ active paying students in a month',                 tiers: ['silver','gold','platinum'],            cadence: 'monthly'   },
    { key: 'perfect_month',     label: 'Perfect month',            amount: 300,  desc: '0 missed sessions + avg rating ≥ 4.8',                 tiers: ['silver','gold','platinum'],            cadence: 'monthly'   },
    { key: 'tier_upgrade',      label: 'Tier upgrade bonus',       amount: 500,  desc: 'Paid on promotion to next tier',                       tiers: ['silver','gold','platinum'],            cadence: 'per tier'  },
    { key: 'tutor_referral',    label: 'Tutor referral',           amount: 500,  desc: 'Referred tutor completes 5 sessions',                  tiers: ['starter','silver','gold','platinum'], cadence: 'per referral' }
];

// ── Subscription plans (REVENUE_MODEL.md §3) ────────────────────────────
export const PLANS = [
    { key: 'flex',       label: 'Flex',       commitment: 'Per session',     discount: 0,  surcharge: 10, sessionsTarget: null, note: 'Sporadic users · trial→paid path' },
    { key: 'monthly',    label: 'Monthly',    commitment: '1 month',         discount: 0,  surcharge: 0,  sessionsTarget: 16,   note: 'Main volume product' },
    { key: 'committed',  label: 'Committed',  commitment: '3 months',        discount: 5,  surcharge: 0,  sessionsTarget: 16,   note: 'Higher retention · 5% off' },
    { key: 'intensive',  label: 'Intensive',  commitment: '3 months',        discount: 7,  surcharge: 0,  sessionsTarget: 24,   note: 'Board-exam / JEE / NEET · 7% off' }
];

// ── Rate bands (REVENUE_MODEL.md §2) ────────────────────────────────────
export const RATE_BANDS = [
    { grade: 'Classes 1–5',           subjectLabel: 'All',                   online: [250, 400],  home: [300, 500] },
    { grade: 'Classes 6–8',           subjectLabel: 'Core (Math/Sci/Eng)',   online: [350, 600],  home: [400, 700] },
    { grade: 'Classes 6–8',           subjectLabel: 'Languages / SS',        online: [300, 500],  home: [350, 600] },
    { grade: 'Classes 9–10',          subjectLabel: 'Core',                  online: [500, 800],  home: [600, 950] },
    { grade: 'Classes 9–10',          subjectLabel: 'Languages / SS',        online: [450, 700],  home: [550, 850] },
    { grade: 'Classes 11–12',         subjectLabel: 'General (CBSE/State)',  online: [700, 1200], home: [850, 1400] },
    { grade: 'Classes 11–12',         subjectLabel: 'JEE/NEET foundation',   online: [900, 1500], home: [1100, 1700] }
];
