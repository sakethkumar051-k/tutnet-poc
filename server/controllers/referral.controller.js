/**
 * Referral Controller
 * -------------------
 * Each user has a unique referral code. New users register with `?ref=CODE` and
 * get linked via `referredBy`. When that new user completes their first paid
 * session, both sides earn an IncentiveLedger credit.
 *
 *   Parent refers parent  → ₹300 credit to each side (applied on next session)
 *   Tutor refers tutor   → ₹500 bonus to referrer (via payout)
 *
 * Rewards are handled by incentiveEngine.service (service picks amounts from REVENUE_MODEL).
 */

const crypto = require('crypto');
const User = require('../models/User');
const { safe500, sendError } = require('../utils/responseHelpers');

// Generates a 7-char code like "A7K3XQ2". Retries on collision.
async function generateUniqueCode() {
    for (let i = 0; i < 6; i++) {
        const raw = crypto.randomBytes(5).toString('base64').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 7);
        if (raw.length < 5) continue;
        const existing = await User.findOne({ referralCode: raw }).select('_id').lean();
        if (!existing) return raw;
    }
    // Extremely unlikely to land here
    return `R${Date.now().toString(36).toUpperCase()}`;
}

// GET /api/referrals/mine — returns code + stats (lazy-creates code on first call)
const getMyReferral = async (req, res) => {
    try {
        let user = await User.findById(req.user._id);
        if (!user) return sendError(res, 404, 'User not found', 'NOT_FOUND');
        if (!user.referralCode) {
            user.referralCode = await generateUniqueCode();
            await user.save();
        }

        const [invited, rewarded] = await Promise.all([
            User.countDocuments({ referredBy: user._id }),
            User.countDocuments({ referredBy: user._id, referralRewarded: true })
        ]);

        const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        res.json({
            code: user.referralCode,
            shareUrl: `${baseUrl}/register?ref=${user.referralCode}`,
            invited,
            rewarded,
            rewardPerSignup: user.role === 'tutor' ? 500 : 300,
            shareMessage: user.role === 'tutor'
                ? `Join TutNet as a tutor — we pay weekly and have great students. Sign up with my code ${user.referralCode} and get ₹500 bonus after your first completed session.`
                : `I use TutNet for my kid's tutoring — honest pricing, great teachers. Sign up with my code ${user.referralCode} and we both get ₹300 credit after your first session.`
        });
    } catch (err) {
        return safe500(res, err, '[getMyReferral]');
    }
};

// Validates a code BEFORE signup so the frontend can show a "you'll get ₹300 credit" banner.
const lookupReferralCode = async (req, res) => {
    try {
        const code = String(req.query.code || '').trim().toUpperCase();
        if (!code) return sendError(res, 400, 'code is required', 'VALIDATION');
        const user = await User.findOne({ referralCode: code }).select('name role').lean();
        if (!user) return sendError(res, 404, 'Invalid referral code', 'NOT_FOUND');
        res.json({
            valid: true,
            referrerName: user.name,
            referrerRole: user.role,
            reward: user.role === 'tutor' ? 500 : 300
        });
    } catch (err) {
        return safe500(res, err, '[lookupReferralCode]');
    }
};

// GET /api/admin/referrals — admin overview
const adminList = async (req, res) => {
    try {
        const top = await User.aggregate([
            { $match: { referralCode: { $exists: true, $ne: null } } },
            { $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: 'referredBy',
                as: 'referred'
            }},
            { $project: {
                name: 1, email: 1, role: 1, referralCode: 1,
                invitedCount: { $size: '$referred' },
                rewardedCount: { $size: { $filter: { input: '$referred', as: 'r', cond: { $eq: ['$$r.referralRewarded', true] } } } }
            }},
            { $match: { invitedCount: { $gt: 0 } } },
            { $sort: { rewardedCount: -1, invitedCount: -1 } },
            { $limit: 50 }
        ]);
        res.json({ top });
    } catch (err) {
        return safe500(res, err, '[adminListReferrals]');
    }
};

module.exports = {
    getMyReferral,
    lookupReferralCode,
    adminList,
    generateUniqueCode
};
