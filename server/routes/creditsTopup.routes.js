const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { validate, rules } = require('../utils/validate');
const ctrl = require('../controllers/creditsTopup.controller');

// Public pack list (shown on the wallet UI)
router.get('/packs', ctrl.listPacks);

// Authenticated top-up endpoints
router.post(
    '/create',
    protect,
    validate({
        packKey: [rules.required, rules.oneOf(['pack_500', 'pack_1000', 'pack_2500', 'pack_5000'])]
    }),
    ctrl.createTopupOrder
);

router.post(
    '/verify',
    protect,
    validate({
        razorpayOrderId: [rules.required, rules.string],
        razorpayPaymentId: [rules.required, rules.string],
        packKey: [rules.required, rules.oneOf(['pack_500', 'pack_1000', 'pack_2500', 'pack_5000'])]
    }),
    ctrl.verifyTopup
);

module.exports = router;
