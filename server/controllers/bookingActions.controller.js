const Booking = require('../models/Booking');
const { safe500, isValidObjectId, sanitizeString } = require('../utils/responseHelpers');
const { emitBookingInvalidate } = require('../socket/io');

// @desc    Tutor acknowledged a pending booking (student sees "tutor saw your request")
// @route   PATCH /api/booking-actions/:id/viewed-by-tutor
// @access  Private (tutor)
const markViewedByTutor = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || !isValidObjectId(id)) {
            return res.status(400).json({ message: 'Valid booking ID is required', code: 'INVALID_BOOKING_ID' });
        }
        const booking = await Booking.findById(id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        if (booking.tutorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized', code: 'FORBIDDEN' });
        }
        if (booking.status !== 'pending') {
            return res.status(400).json({ message: 'Only pending bookings can be marked as viewed', code: 'INVALID_STATUS' });
        }
        booking.viewedByTutorAt = new Date();
        await booking.save();
        const populated = await Booking.findById(booking._id)
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email');
        emitBookingInvalidate(populated);
        res.json({ message: 'Recorded', booking: populated });
    } catch (error) {
        return safe500(res, error, '[markViewedByTutor]');
    }
};

// @desc    Participant joined / left the online session (attendance / duration)
// @route   PATCH /api/booking-actions/:id/session-presence
// @access  Private (student or tutor on this booking)
const updateSessionPresence = async (req, res) => {
    try {
        const id = req.params.id;
        const { action } = req.body;
        if (!id || !isValidObjectId(id)) {
            return res.status(400).json({ message: 'Valid booking ID is required', code: 'INVALID_BOOKING_ID' });
        }
        if (!['join', 'leave'].includes(action)) {
            return res.status(400).json({ message: 'action must be "join" or "leave"', code: 'INVALID_ACTION' });
        }
        const booking = await Booking.findById(id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        const uid = req.user.id.toString();
        const sid = booking.studentId.toString();
        const tid = booking.tutorId.toString();
        if (uid !== sid && uid !== tid) {
            return res.status(403).json({ message: 'Not authorized', code: 'FORBIDDEN' });
        }
        if (!['approved', 'pending'].includes(booking.status)) {
            return res.status(400).json({ message: 'Session presence is only tracked for active bookings', code: 'INVALID_STATUS' });
        }
        if (action === 'join') {
            if (!booking.joinedSessionAt) booking.joinedSessionAt = new Date();
        } else {
            booking.leftSessionAt = new Date();
        }
        await booking.save();
        emitBookingInvalidate(booking);
        res.json({ message: 'Updated', booking });
    } catch (error) {
        return safe500(res, error, '[updateSessionPresence]');
    }
};

// @desc    Tutor sets / updates the video-call join URL for a booking
// @route   PATCH /api/booking-actions/:id/session-join-url
// @access  Private (tutor)
const updateSessionJoinUrl = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id || !isValidObjectId(id)) {
            return res.status(400).json({ message: 'Valid booking ID is required', code: 'INVALID_BOOKING_ID' });
        }
        const { sessionJoinUrl } = req.body;
        if (sessionJoinUrl == null || !String(sessionJoinUrl).trim()) {
            return res.status(400).json({ message: 'sessionJoinUrl is required', code: 'VALIDATION' });
        }
        const booking = await Booking.findById(id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        if (booking.tutorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Only the tutor can set the join link', code: 'FORBIDDEN' });
        }
        booking.sessionJoinUrl = sanitizeString(String(sessionJoinUrl), 2000);
        await booking.save();
        emitBookingInvalidate(booking);
        res.json({ message: 'Join URL updated', booking });
    } catch (error) {
        return safe500(res, error, '[updateSessionJoinUrl]');
    }
};

module.exports = {
    markViewedByTutor,
    updateSessionPresence,
    updateSessionJoinUrl
};
