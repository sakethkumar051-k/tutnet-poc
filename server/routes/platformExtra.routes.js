const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const referral = require('../controllers/referral.controller');
const family = require('../controllers/family.controller');
const uploads = require('../controllers/uploads.controller');
const invoice = require('../controllers/invoice.controller');

const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    next();
};

// ── Referrals ─────────────────────────────────────────────────────
router.get('/referrals/mine', protect, referral.getMyReferral);
router.get('/referrals/lookup', referral.lookupReferralCode);         // public — for signup UI
router.get('/admin/referrals', protect, requireAdmin, referral.adminList);

// ── Family / multi-child ──────────────────────────────────────────
router.get('/family/mine', protect, family.getMyFamily);
router.post('/family/children', protect, family.createChild);
router.post('/family/link', protect, family.linkExistingChild);
router.delete('/family/children/:id', protect, family.unlinkChild);

// ── Uploads ───────────────────────────────────────────────────────
router.post('/uploads/:category', protect, uploads.uploadFile);
router.delete('/uploads/qualification', protect, uploads.deleteQualificationDoc);

// ── Invoice PDF ───────────────────────────────────────────────────
router.get('/payments/:id/invoice.pdf', protect, invoice.downloadInvoice);

module.exports = router;
