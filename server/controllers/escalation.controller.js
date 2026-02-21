const Escalation = require('../models/Escalation');
const { createNotification } = require('../utils/notificationHelper');
const User = require('../models/User');

// @desc  Raise an escalation/complaint to admin
// @route POST /api/escalations
// @access Private (tutor, student)
const raiseEscalation = async (req, res) => {
    try {
        const { type, description, againstUserId, bookingId } = req.body;
        if (!type || !description?.trim())
            return res.status(400).json({ message: 'type and description are required' });

        const escalation = await Escalation.create({
            raisedBy: req.user.id,
            raisedByRole: req.user.role,
            againstUser: againstUserId || null,
            bookingId: bookingId || null,
            type,
            description
        });

        // Notify all admins
        const admins = await User.find({ role: 'admin' }).select('_id');
        await Promise.all(admins.map(admin =>
            createNotification({
                userId: admin._id,
                type: 'escalation',
                title: `New ${type.replace('_', ' ')} report`,
                message: `A ${req.user.role} has raised a concern: "${description.substring(0, 80)}${description.length > 80 ? '…' : ''}"`,
                link: '/admin-dashboard?tab=escalations'
            })
        ));

        res.status(201).json({ message: 'Report submitted to admin team', escalation });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc  Get escalations raised by this user
// @route GET /api/escalations/my
// @access Private
const getMyEscalations = async (req, res) => {
    try {
        const escalations = await Escalation.find({ raisedBy: req.user.id })
            .populate('againstUser', 'name email')
            .populate('bookingId', 'subject sessionDate')
            .sort({ createdAt: -1 });
        res.json(escalations);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc  Get all escalations (admin only)
// @route GET /api/escalations
// @access Private (admin)
const getAllEscalations = async (req, res) => {
    try {
        const { status } = req.query;
        const filter = {};
        if (status) filter.status = status;

        const escalations = await Escalation.find(filter)
            .populate('raisedBy', 'name email role')
            .populate('againstUser', 'name email role')
            .populate('bookingId', 'subject sessionDate')
            .sort({ createdAt: -1 });
        res.json(escalations);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc  Update escalation status (admin only)
// @route PATCH /api/escalations/:id
// @access Private (admin)
const updateEscalation = async (req, res) => {
    try {
        const { status, adminNotes } = req.body;
        const escalation = await Escalation.findById(req.params.id);
        if (!escalation) return res.status(404).json({ message: 'Escalation not found' });

        if (status) escalation.status = status;
        if (adminNotes) escalation.adminNotes = adminNotes;
        if (status === 'resolved' || status === 'dismissed') {
            escalation.resolvedAt = new Date();
        }
        await escalation.save();

        // Notify the person who raised it
        await createNotification({
            userId: escalation.raisedBy,
            type: 'escalation_update',
            title: 'Your report has been updated',
            message: `Your report status is now: ${status}${adminNotes ? `. Admin note: ${adminNotes}` : ''}`,
            link: req.user.role === 'tutor' ? '/tutor-dashboard?tab=safety' : '/student-dashboard?tab=safety'
        });

        res.json(escalation);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { raiseEscalation, getMyEscalations, getAllEscalations, updateEscalation };
