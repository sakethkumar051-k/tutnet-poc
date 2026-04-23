/**
 * Family Controller — parent-child linkage.
 *
 * A parent user has User.children[]; each child has User.parentUserId.
 * Parents can switch between children via the dashboard child-switcher; all
 * data fetches use the "active child" as the effective `studentId`.
 *
 * Endpoints:
 *   GET  /api/family/mine            — children of logged-in parent (or parent of logged-in minor)
 *   POST /api/family/children        — create a child sub-account under this parent
 *   POST /api/family/link            — link an existing child account via email (child approves later — for MVP auto-approves if email matches an account)
 *   DELETE /api/family/children/:id  — unlink a child (breaks the linkage; does not delete the user)
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { safe500, sendError } = require('../utils/responseHelpers');

const SHAPE = 'name email phone role classGrade location isActive lastSeenAt createdAt';

// GET /api/family/mine
const getMyFamily = async (req, res) => {
    try {
        const me = req.user;
        if (me.parentUserId) {
            const parent = await User.findById(me.parentUserId).select(SHAPE).lean();
            return res.json({ mode: 'child', parent, children: [] });
        }
        const children = await User.find({ parentUserId: me._id }).select(SHAPE).lean();
        res.json({ mode: 'parent', parent: null, children });
    } catch (err) {
        return safe500(res, err, '[getMyFamily]');
    }
};

// POST /api/family/children
// Creates a brand-new student sub-account under this parent.
// Body: { name, classGrade, phone?, password? (for login later), location? }
const createChild = async (req, res) => {
    try {
        if (req.user.role !== 'student' && req.user.role !== 'admin') {
            return sendError(res, 403, 'Only parent (student-role) accounts can add children', 'FORBIDDEN');
        }
        const { name, classGrade, phone, location, password } = req.body;
        if (!name || !String(name).trim()) {
            return sendError(res, 400, 'Child name is required', 'VALIDATION');
        }

        // Synthesize a deterministic email so child login works even without giving the child a public email.
        // Pattern: <parentEmailLocal>+child<n>@<domain>
        const parent = await User.findById(req.user._id);
        const [local, domain] = String(parent.email).split('@');
        const existingChildCount = parent.children?.length || 0;
        const childEmail = `${local}+child${existingChildCount + 1}@${domain}`.toLowerCase();

        const hashed = password && password.length >= 6
            ? await bcrypt.hash(password, 10)
            : await bcrypt.hash(`child-${parent._id}-${Date.now()}`, 10); // parent logs in as child via /family/switch-to below

        const child = await User.create({
            name: String(name).trim().slice(0, 120),
            email: childEmail,
            phone: String(phone || parent.phone || '0000000000').slice(0, 20),
            password: hashed,
            role: 'student',
            location: location || parent.location,
            classGrade: String(classGrade || '').slice(0, 20),
            parentUserId: parent._id,
            authProvider: 'local'
        });

        await User.findByIdAndUpdate(parent._id, { $addToSet: { children: child._id } });

        const obj = child.toObject();
        delete obj.password;
        res.status(201).json({ child: obj });
    } catch (err) {
        return safe500(res, err, '[createChild]');
    }
};

// POST /api/family/link — link existing account by email (for real parent/child scenarios)
const linkExistingChild = async (req, res) => {
    try {
        const { childEmail } = req.body;
        if (!childEmail) return sendError(res, 400, 'childEmail required', 'VALIDATION');
        const child = await User.findOne({ email: String(childEmail).toLowerCase().trim() });
        if (!child) return sendError(res, 404, 'No account with that email', 'NOT_FOUND');
        if (child.role !== 'student') return sendError(res, 400, 'Only student accounts can be linked as children', 'INVALID_ROLE');
        if (child.parentUserId && String(child.parentUserId) !== String(req.user._id)) {
            return sendError(res, 409, 'That account is already linked to another parent', 'ALREADY_LINKED');
        }
        child.parentUserId = req.user._id;
        await child.save();
        await User.findByIdAndUpdate(req.user._id, { $addToSet: { children: child._id } });
        const obj = child.toObject();
        delete obj.password;
        res.json({ child: obj });
    } catch (err) {
        return safe500(res, err, '[linkExistingChild]');
    }
};

// DELETE /api/family/children/:id
const unlinkChild = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return sendError(res, 400, 'Invalid child id', 'INVALID_ID');
        const child = await User.findById(id);
        if (!child) return sendError(res, 404, 'Child not found', 'NOT_FOUND');
        if (String(child.parentUserId) !== String(req.user._id)) {
            return sendError(res, 403, 'Not your child account', 'FORBIDDEN');
        }
        child.parentUserId = null;
        await child.save();
        await User.findByIdAndUpdate(req.user._id, { $pull: { children: child._id } });
        res.json({ ok: true });
    } catch (err) {
        return safe500(res, err, '[unlinkChild]');
    }
};

module.exports = { getMyFamily, createChild, linkExistingChild, unlinkChild };
