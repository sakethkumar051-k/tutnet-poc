const mongoose = require('mongoose');

/**
 * Standard API errors for Express handlers:
 * - `sendError(res, status, message, code)` — 4xx/404 validation-style responses
 * - `safe500(res, err, context)` — catch blocks; never leak internals
 * Global `error.middleware` wraps unhandled errors with the same `{ success, error }` shape.
 */

/**
 * Send a safe 500 response without leaking stack or error details.
 * Log the full error server-side.
 */
function safe500(res, err, context = '') {
    if (context) console.error(context, err);
    else console.error(err);
    return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Server Error' }
    });
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

function sendError(res, status, message, code = 'REQUEST_ERROR') {
    return res.status(status).json({
        success: false,
        error: { code, message }
    });
}

module.exports = { safe500, sendError, isValidObjectId, sanitizeString };
