/**
 * Message Moderator — Anti-Bypass Chat Filter
 * -------------------------------------------
 * Scans messages between parent and tutor for off-platform contact attempts.
 * Redacts the offending fragment in the stored message and increments the
 * sender's flagged-events counter (which feeds tutor risk score).
 *
 * NOT MARKETING-FACING — referred to as "quality review" externally.
 * Enforcement lives in TSA §3 (non-circumvention).
 */

// ── Patterns ─────────────────────────────────────────────────────────────

// Indian mobile: 10 digits starting 6-9, optionally prefixed +91 / 91 / 0
// Accepts separators like spaces, dashes, dots between digits (obfuscation).
const PHONE_REGEX = /(?:\+?91[\s\-.]?|0)?[6-9](?:[\s\-.]?\d){9}/g;

// UPI handles: text@provider (okhdfc, okaxis, okicici, oksbi, paytm, ybl, ibl, axl, upi, apl, airtel)
const UPI_REGEX = /\b[\w.\-]{2,}@(?:ok(?:hdfc|axis|icici|sbi)|paytm|ybl|ibl|axl|upi|apl|airtel|hdfc|axis|icici|sbi|kotak|pnb)\b/gi;

// Common off-platform keywords (case-insensitive)
const KEYWORD_LIST = [
    'whatsapp', 'whats app', 'wa\\.me', 'wa\\s*link',
    'telegram', 't\\.me',
    'call me at', 'contact me at', 'reach me at', 'ring me',
    'gpay', 'phonepe', 'phone pe', 'paytm', 'google pay',
    'cash only', 'pay cash', 'cash payment', 'in cash',
    'skip the platform', 'skip tutnet', 'skip the app', 'off the app', 'off platform',
    'outside the app', 'outside platform', 'directly to me', 'direct pay'
];
const KEYWORD_REGEX = new RegExp(`\\b(?:${KEYWORD_LIST.join('|')})\\b`, 'gi');

// Obfuscation: digits separated by single spaces/dots (e.g. "9 8 7 6 5 4 3 2 1 0")
const SPACED_DIGITS_REGEX = /(?:\d[\s.]){8,}\d/g;

// Digit-words (nine eight seven six five four three two one zero, with optional dashes)
const WORD_DIGITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const WORD_DIGITS_REGEX = new RegExp(`(?:\\b(?:${WORD_DIGITS.join('|')})[\\s-]*){8,}`, 'gi');

// Email (people occasionally drop one)
const EMAIL_REGEX = /\b[\w.+\-]+@[\w\-]+\.[\w.\-]+\b/g;

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Scan a message; return moderation verdict + sanitized content.
 * Does NOT mutate input.
 *
 * @param {string} text
 * @returns {{ original: string, clean: string, flagged: boolean, reasons: string[], matches: string[] }}
 */
function moderate(text) {
    if (!text || typeof text !== 'string') {
        return { original: text || '', clean: text || '', flagged: false, reasons: [], matches: [] };
    }
    const reasons = [];
    const matches = [];
    let clean = text;

    const checkAndRedact = (regex, reasonLabel) => {
        // Clone regex since the 'g' flag makes it stateful across calls
        const r = new RegExp(regex.source, regex.flags);
        const found = text.match(r);
        if (found && found.length) {
            reasons.push(reasonLabel);
            matches.push(...found);
            clean = clean.replace(new RegExp(regex.source, regex.flags), (m) => '█'.repeat(Math.min(m.length, 12)));
        }
    };

    checkAndRedact(PHONE_REGEX, 'phone_number');
    checkAndRedact(UPI_REGEX, 'upi_id');
    checkAndRedact(EMAIL_REGEX, 'email_address');
    checkAndRedact(KEYWORD_REGEX, 'off_platform_keyword');
    checkAndRedact(SPACED_DIGITS_REGEX, 'obfuscated_digits');
    checkAndRedact(WORD_DIGITS_REGEX, 'word_digits');

    const flagged = reasons.length > 0;

    return {
        original: text,
        clean: flagged
            ? `${clean}\n\n— Phone numbers and payment handles are shared via Tutnet's in-app call feature for safety. Please use the "Call Tutor" button in your booking.`
            : text,
        flagged,
        reasons,
        matches
    };
}

/**
 * Risk-score impact for a single flagged event.
 * Phone/UPI/obfuscation = high signal. Keywords alone = lower.
 */
function riskWeight(reasons = []) {
    let weight = 0;
    if (reasons.includes('phone_number')) weight += 15;
    if (reasons.includes('upi_id')) weight += 20;
    if (reasons.includes('email_address')) weight += 6;
    if (reasons.includes('off_platform_keyword')) weight += 4;
    if (reasons.includes('obfuscated_digits')) weight += 12;
    if (reasons.includes('word_digits')) weight += 10;
    return weight;
}

module.exports = {
    moderate,
    riskWeight,
    // Exported for tests
    _patterns: {
        PHONE_REGEX, UPI_REGEX, KEYWORD_REGEX, SPACED_DIGITS_REGEX, WORD_DIGITS_REGEX, EMAIL_REGEX
    }
};
