const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { validate, rules } = require('../utils/validate');
const ctrl = require('../controllers/subscription.controller');

const PLAN_KEYS = ['flex', 'monthly', 'committed', 'intensive'];

// Public: list plans
router.get('/plans', ctrl.listPlans);

// Auth: preview pricing for a specific tutor + plan (so UI can show breakdown)
router.get(
    '/preview',
    protect,
    validate({
        tutorId: [rules.required, rules.objectId],
        planKey: [rules.required, rules.oneOf(PLAN_KEYS)]
    }, 'query'),
    ctrl.previewPlan
);

// Auth: create a subscription booking (Student only)
router.post(
    '/',
    protect,
    (req, res, next) => {
        if (req.user.role !== 'student') {
            return res.status(403).json({ message: 'Only students can subscribe to a tutor' });
        }
        next();
    },
    validate({
        tutorId: [rules.required, rules.objectId],
        planKey: [rules.required, rules.oneOf(PLAN_KEYS)],
        subject: [rules.string, rules.maxLength(200)],
        preferredSchedule: [rules.string, rules.maxLength(200)],
        applyCredits: [rules.boolean]
    }),
    ctrl.createSubscriptionBooking
);

// Auth: current parent credits
router.get('/credits', protect, ctrl.getMyCredits);

module.exports = router;
