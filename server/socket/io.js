const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let ioInstance = null;

function toPlainMessage(doc) {
    if (!doc) return null;
    if (typeof doc.toObject === 'function') return doc.toObject({ virtuals: true });
    return doc;
}

function emitToUser(userId, event, payload) {
    if (!ioInstance || userId == null) return;
    ioInstance.to(`user:${String(userId)}`).emit(event, payload);
}

/**
 * Notify both student and tutor that bookings list may have changed (refetch via store).
 */
function emitBookingInvalidate(booking) {
    if (!booking) return;
    const sid = booking.studentId?._id || booking.studentId;
    const tid = booking.tutorId?._id || booking.tutorId;
    const payload = { bookingId: booking._id };
    if (sid) emitToUser(sid, 'bookings:invalidate', payload);
    if (tid) emitToUser(tid, 'bookings:invalidate', payload);
}

function initSocket(httpServer, corsOptions) {
    const io = new Server(httpServer, {
        path: '/socket.io',
        cors: {
            origin: corsOptions?.origin ?? true,
            credentials: corsOptions?.credentials !== false
        }
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token) {
            return next(new Error('Unauthorized'));
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id;
            return next();
        } catch {
            return next(new Error('Unauthorized'));
        }
    });

    io.on('connection', (socket) => {
        socket.join(`user:${String(socket.userId)}`);
    });

    ioInstance = io;
    return io;
}

function getIO() {
    return ioInstance;
}

function closeIO(callback) {
    if (!ioInstance) {
        if (callback) callback();
        return;
    }
    ioInstance.close(callback);
}

module.exports = {
    initSocket,
    getIO,
    closeIO,
    emitToUser,
    emitBookingInvalidate,
    toPlainMessage
};
