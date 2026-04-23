const Message = require('../models/Message');
const User = require('../models/User');
const TutorProfile = require('../models/TutorProfile');
const { emitToUser, toPlainMessage } = require('../socket/io');
const { moderate, riskWeight } = require('../services/messageModerator.service');

// Send a message (now with anti-bypass moderation)
const sendMessage = async (req, res) => {
    try {
        const { recipientId, text, bookingId } = req.body;
        if (!recipientId || !text?.trim()) {
            return res.status(400).json({ message: 'recipientId and text are required' });
        }
        const recipient = await User.findById(recipientId);
        if (!recipient) return res.status(404).json({ message: 'Recipient not found' });

        // ── Anti-bypass moderation ─────────────────────────────────────────
        const verdict = moderate(text.trim());

        // If the SENDER is a tutor and the message flagged, this is high-signal for bypass.
        // We always store the cleaned version (redacted). Original is kept for admin audit only.
        const senderRole = req.user.role;
        const isTutorSending = senderRole === 'tutor';

        const message = await Message.create({
            senderId: req.user._id,
            recipientId,
            text: verdict.clean,                     // redacted version goes to recipient
            originalText: verdict.flagged ? verdict.original : undefined,
            bookingId: bookingId || null,
            moderation: verdict.flagged ? {
                flagged: true,
                reasons: verdict.reasons,
                riskWeight: riskWeight(verdict.reasons),
                matches: verdict.matches
            } : undefined
        });

        // If tutor flagged, bump their risk score + flaggedEventsCount
        if (verdict.flagged && isTutorSending) {
            const weight = riskWeight(verdict.reasons);
            await TutorProfile.updateOne(
                { userId: req.user._id },
                {
                    $inc: { flaggedEventsCount: 1, riskScore: weight },
                    $max: { riskScore: 0 } // ensures not negative
                }
            ).catch(() => {});
        }

        const populated = await message.populate('senderId', 'name profilePicture role');
        const plain = toPlainMessage(populated);
        emitToUser(recipientId, 'message:new', { message: plain });

        // Return to sender with flag info so UI can show a warning banner
        res.status(201).json({
            ...(populated.toObject?.() || populated),
            _moderation: verdict.flagged ? { flagged: true, reasons: verdict.reasons } : undefined
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get full conversation between current user and another user
// Optional query: ?since=ISO — only messages with createdAt > since (for lightweight polling)
const getConversation = async (req, res) => {
    try {
        const { userId } = req.params;
        const { since } = req.query;
        const me = req.user._id;

        const threadOr = [
            { senderId: me, recipientId: userId },
            { senderId: userId, recipientId: me }
        ];

        let filter;
        if (since) {
            const sinceDate = new Date(since);
            if (Number.isNaN(sinceDate.getTime())) {
                return res.status(400).json({ message: 'Invalid since parameter', code: 'INVALID_SINCE' });
            }
            filter = { $and: [{ $or: threadOr }, { createdAt: { $gt: sinceDate } }] };
        } else {
            filter = { $or: threadOr };
        }

        const messages = await Message.find(filter)
            .sort({ createdAt: 1 })
            .populate('senderId', 'name profilePicture role');

        if (since) {
            if (messages.length) {
                const incomingIds = messages
                    .filter((m) => String(m.senderId?._id || m.senderId) === String(userId))
                    .map((m) => m._id);
                if (incomingIds.length) {
                    await Message.updateMany(
                        { _id: { $in: incomingIds }, read: false },
                        { $set: { read: true, readAt: new Date() } }
                    );
                }
            }
            return res.json(messages);
        }

        await Message.updateMany(
            { senderId: userId, recipientId: me, read: false },
            { $set: { read: true, readAt: new Date() } }
        );

        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get list of all conversations (unique contacts) for the current user
const getConversationList = async (req, res) => {
    try {
        const me = req.user._id;

        // Aggregate: get the latest message per conversation partner
        const conversations = await Message.aggregate([
            {
                $match: {
                    $or: [{ senderId: me }, { recipientId: me }]
                }
            },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ['$senderId', me] },
                            '$recipientId',
                            '$senderId'
                        ]
                    },
                    lastMessage: { $first: '$$ROOT' }
                }
            },
            { $sort: { 'lastMessage.createdAt': -1 } }
        ]);

        // Populate partner details
        const populated = await Promise.all(
            conversations.map(async (conv) => {
                const partner = await User.findById(conv._id).select('name profilePicture role lastSeenAt');
                const unreadCount = await Message.countDocuments({
                    senderId: conv._id,
                    recipientId: me,
                    read: false
                });
                return {
                    partner,
                    lastMessage: conv.lastMessage,
                    unreadCount
                };
            })
        );

        res.json(populated.filter(c => c.partner));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get total unread count for current user
const getUnreadCount = async (req, res) => {
    try {
        const count = await Message.countDocuments({
            recipientId: req.user._id,
            read: false
        });
        res.json({ count });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { sendMessage, getConversation, getConversationList, getUnreadCount };
