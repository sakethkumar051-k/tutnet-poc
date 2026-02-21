const Message = require('../models/Message');
const User = require('../models/User');

// Send a message
const sendMessage = async (req, res) => {
    try {
        const { recipientId, text, bookingId } = req.body;
        if (!recipientId || !text?.trim()) {
            return res.status(400).json({ message: 'recipientId and text are required' });
        }
        const recipient = await User.findById(recipientId);
        if (!recipient) return res.status(404).json({ message: 'Recipient not found' });

        const message = await Message.create({
            senderId: req.user._id,
            recipientId,
            text: text.trim(),
            bookingId: bookingId || null
        });
        const populated = await message.populate('senderId', 'name profilePicture role');
        res.status(201).json(populated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get full conversation between current user and another user
const getConversation = async (req, res) => {
    try {
        const { userId } = req.params;
        const me = req.user._id;
        const messages = await Message.find({
            $or: [
                { senderId: me, recipientId: userId },
                { senderId: userId, recipientId: me }
            ]
        })
            .sort({ createdAt: 1 })
            .populate('senderId', 'name profilePicture role');

        // Mark incoming unread messages as read
        await Message.updateMany(
            { senderId: userId, recipientId: me, read: false },
            { read: true }
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
                const partner = await User.findById(conv._id).select('name profilePicture role');
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
