/**
 * Tiny input validation helper — no external dep.
 * Express middleware factory.
 *
 *   const { validate, rules } = require('../utils/validate');
 *   router.post('/', validate({
 *     tutorId: [rules.required, rules.objectId],
 *     planKey: [rules.required, rules.oneOf(['flex','monthly','committed','intensive'])],
 *     subject: [rules.string, rules.maxLength(200)]
 *   }), ctrl.create);
 */

const mongoose = require('mongoose');

const rules = {
    required: (v) => (v === undefined || v === null || v === '' ? 'is required' : null),
    string: (v) => (v !== undefined && v !== null && typeof v !== 'string' ? 'must be a string' : null),
    number: (v) => (v !== undefined && v !== null && typeof v !== 'number' && Number.isNaN(Number(v))
        ? 'must be a number' : null),
    boolean: (v) => (v !== undefined && v !== null && typeof v !== 'boolean' ? 'must be a boolean' : null),
    objectId: (v) => (v && !mongoose.Types.ObjectId.isValid(String(v)) ? 'is not a valid id' : null),
    email: (v) => (v && !/^[\w.+\-]+@[\w-]+\.[\w.\-]+$/.test(String(v)) ? 'is not a valid email' : null),

    minLength: (n) => (v) => (typeof v === 'string' && v.length < n ? `must be at least ${n} chars` : null),
    maxLength: (n) => (v) => (typeof v === 'string' && v.length > n ? `must be at most ${n} chars` : null),
    min: (n) => (v) => (v !== undefined && v !== null && Number(v) < n ? `must be at least ${n}` : null),
    max: (n) => (v) => (v !== undefined && v !== null && Number(v) > n ? `must be at most ${n}` : null),
    oneOf: (list) => (v) => (v !== undefined && v !== null && !list.includes(v)
        ? `must be one of: ${list.join(', ')}` : null)
};

function validate(schema, source = 'body') {
    return (req, res, next) => {
        const data = source === 'query' ? req.query : source === 'params' ? req.params : req.body;
        const errors = {};
        for (const [field, checks] of Object.entries(schema)) {
            const val = data[field];
            for (const check of checks) {
                const msg = check(val);
                if (msg) {
                    if (!errors[field]) errors[field] = [];
                    errors[field].push(msg);
                }
            }
        }
        if (Object.keys(errors).length > 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid input — see fields',
                    fields: errors
                }
            });
        }
        next();
    };
}

module.exports = { validate, rules };
