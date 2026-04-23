const jwt = require('jsonwebtoken');
const User = require('../models/User');

const LAST_SEEN_MIN_INTERVAL_MS = 60 * 1000;

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if (decoded.typ === 'refresh') {
                return res.status(401).json({ message: 'Invalid token type', code: 'INVALID_TOKEN_TYPE' });
            }

            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            const uid = req.user._id;
            setImmediate(() => {
                const since = new Date(Date.now() - LAST_SEEN_MIN_INTERVAL_MS);
                User.updateOne(
                    {
                        _id: uid,
                        $or: [{ lastSeenAt: { $exists: false } }, { lastSeenAt: null }, { lastSeenAt: { $lt: since } }]
                    },
                    { $set: { lastSeenAt: new Date() } }
                ).catch(() => {});
            });

            return next();
        } catch (error) {
            console.error(error);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    return res.status(401).json({ message: 'Not authorized, no token' });
};

module.exports = { protect };
