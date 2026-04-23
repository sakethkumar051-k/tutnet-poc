const Booking = require('../../models/Booking');
const { safe500 } = require('../../utils/responseHelpers');

// @desc    Get my bookings
// @route   GET /api/bookings/mine
// @access  Private
const getMyBookings = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === 'student') {
            query.studentId = req.user.id;
        } else if (req.user.role === 'tutor') {
            query.tutorId = req.user.id;
        } else if (req.user.role === 'admin') {
            // admin sees all bookings — no filter
        } else {
            return res.status(400).json({ message: 'Invalid role for this route' });
        }

        const sinceRaw = req.query.since;
        if (sinceRaw) {
            const sinceDate = new Date(sinceRaw);
            if (Number.isNaN(sinceDate.getTime())) {
                return res.status(400).json({ message: 'Invalid since parameter', code: 'INVALID_SINCE' });
            }
            query.updatedAt = { $gt: sinceDate };
        }

        const bookings = await Booking.find(query)
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email')
            .sort({ createdAt: -1 })
            .lean({ virtuals: true });

        if (sinceRaw) {
            return res.json({
                updates: bookings,
                syncedAt: new Date().toISOString()
            });
        }

        res.json(bookings);
    } catch (error) {
        return safe500(res, error, '[getMyBookings]');
    }
};

// @desc    Get centralized requests (for Student: demo, permanent, reschedule; for Tutor: session, demo, permanent)
// @route   GET /api/bookings/requests
// @access  Private
const getBookingRequests = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        let query = {};
        if (role === 'student') query.studentId = userId;
        else if (role === 'tutor') query.tutorId = userId;
        else if (role === 'admin') { /* admin sees all */ }
        else return res.status(400).json({ message: 'Invalid role' });

        const bookings = await Booking.find(query)
            .populate('studentId', 'name email')
            .populate('tutorId', 'name email')
            .sort({ createdAt: -1 })
            .lean({ virtuals: true });

        const demoRequests = bookings.filter((b) => b.bookingCategory === 'trial' && b.status === 'pending');
        const permanentRequests = bookings.filter((b) => (b.bookingCategory === 'permanent' || b.bookingCategory === 'dedicated') && b.status === 'pending');
        const sessionRequests = bookings.filter((b) => b.bookingCategory === 'session' && b.status === 'pending');
        const rescheduleRequests = bookings.filter(
            (b) => b.status === 'approved' && b.tutorChangeRequest?.status === 'pending'
        );
        const studentRescheduleRequests = bookings.filter(
            (b) => b.status === 'approved' && b.rescheduleRequest?.status === 'pending'
        );

        if (role === 'student') {
            return res.json({
                demoRequests,
                permanentRequests,
                rescheduleRequests: rescheduleRequests,
                allPending: [...demoRequests, ...permanentRequests, ...rescheduleRequests]
            });
        }
        res.json({
            sessionRequests,
            demoRequests,
            permanentRequests,
            allPending: [...sessionRequests, ...demoRequests, ...permanentRequests]
        });
    } catch (error) {
        return safe500(res, error, '[getBookingRequests]');
    }
};
// @desc    Get trial status between student and tutor
// @route   GET /api/bookings/trial-status/:tutorId
// @access  Private (Student)
const getTrialStatus = async (req, res) => {
    try {
        const { tutorId } = req.params;
        const studentId = req.user.id;

        // Find any trial bookings between this student and tutor
        const trials = await Booking.find({
            studentId,
            tutorId,
            bookingCategory: 'trial'
        })
            .sort({ createdAt: -1 })
            .lean();

        if (trials.length === 0) {
            return res.json({
                status: null,
                count: 0,
                hasTriedTutor: false
            });
        }

        const latestTrial = trials[0];

        return res.json({
            status: latestTrial.status,
            count: trials.length,
            maxReached: trials.length >= 2,
            hasTriedTutor: true,
            latestTrial: {
                _id: latestTrial._id,
                status: latestTrial.status,
                subject: latestTrial.subject,
                preferredSchedule: latestTrial.preferredSchedule,
                createdAt: latestTrial.createdAt
            }
        });
    } catch (error) {
        return safe500(res, error, '[getTrialStatus]');
    }
};

// @desc    Fetch a single booking by id (student, tutor, or admin authorized)
// @route   GET /api/bookings/:id
// @access  Private — studentId || tutorId on the booking, or role=admin
const getBookingById = async (req, res) => {
    try {
        const Booking = require('../../models/Booking');
        const mongoose = require('mongoose');
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid booking id', code: 'INVALID_ID' });
        }
        const booking = await Booking.findById(id)
            .populate('studentId', 'name email phone')
            .populate('tutorId', 'name email phone')
            .lean();
        if (!booking) return res.status(404).json({ message: 'Booking not found', code: 'NOT_FOUND' });

        const uid = String(req.user._id);
        const isStudent = String(booking.studentId?._id || booking.studentId) === uid;
        const isTutor   = String(booking.tutorId?._id || booking.tutorId) === uid;
        if (!isStudent && !isTutor && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized', code: 'FORBIDDEN' });
        }
        res.json(booking);
    } catch (err) {
        return safe500(res, err, '[getBookingById]');
    }
};

module.exports = { getMyBookings, getBookingRequests, getTrialStatus, getBookingById };
