const mongoose = require('mongoose');

/**
 * Send a safe 500 response without leaking stack or error details.
 * Log the full error server-side.
 */
function safe500(res, err, context = '') {
    if (context) console.error(context, err);
    else console.error(err);
    return res.status(500).json({ message: 'Server Error', code: 'INTERNAL_ERROR' });
}

/**
 * Validate that a string is a valid MongoDB ObjectId.
 */
function isValidObjectId(id) {
    if (id == null || typeof id !== 'string') return false;
    return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

/**
 * Sanitize string input: trim and optionally cap length.
 */
function sanitizeString(value, maxLength = 1000) {
    if (value == null) return '';
    const s = String(value).trim();
    return maxLength > 0 && s.length > maxLength ? s.slice(0, maxLength) : s;
}

module.exports = { safe500, isValidObjectId, sanitizeString };
