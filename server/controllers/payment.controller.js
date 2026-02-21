const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const TutorProfile = require('../models/TutorProfile');

// @desc  Get tutor earnings summary + history (derived from completed bookings + payment records)
// @route GET /api/payments/tutor-earnings
// @access Private (Tutor)
const getTutorEarnings = async (req, res) => {
    try {
        const tutorId = req.user._id;
        const { period = 'all' } = req.query;

        const tutorProfile = await TutorProfile.findOne({ userId: tutorId });
        const hourlyRate = tutorProfile?.hourlyRate || 0;

        // Build date filter
        let dateFilter = {};
        const now = new Date();
        if (period === 'month') {
            dateFilter = { createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) } };
        } else if (period === 'week') {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            weekStart.setHours(0, 0, 0, 0);
            dateFilter = { createdAt: { $gte: weekStart } };
        } else if (period === 'year') {
            dateFilter = { createdAt: { $gte: new Date(now.getFullYear(), 0, 1) } };
        }

        // Get completed sessions
        const completedBookings = await Booking.find({
            tutorId,
            status: 'completed',
            bookingCategory: 'session',
            ...dateFilter
        })
            .populate('studentId', 'name email')
            .sort({ createdAt: -1 });

        // Get any explicit payment records
        const paymentRecords = await Payment.find({ tutorId, ...dateFilter })
            .populate('bookingId')
            .sort({ createdAt: -1 });

        // Derive earnings from completed sessions (estimated, 1hr each)
        const estimatedEarnings = completedBookings.reduce((sum, b) => sum + hourlyRate, 0);

        // Explicit payments total
        const explicitPaid = paymentRecords
            .filter(p => p.status === 'completed')
            .reduce((sum, p) => sum + p.amount, 0);

        const explicitPending = paymentRecords
            .filter(p => p.status === 'pending')
            .reduce((sum, p) => sum + p.amount, 0);

        // Monthly breakdown (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyBookings = await Booking.find({
            tutorId,
            status: 'completed',
            bookingCategory: 'session',
            createdAt: { $gte: sixMonthsAgo }
        });

        const monthlyMap = {};
        monthlyBookings.forEach(b => {
            const key = `${b.createdAt.getFullYear()}-${String(b.createdAt.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyMap[key]) monthlyMap[key] = { sessions: 0, earnings: 0 };
            monthlyMap[key].sessions += 1;
            monthlyMap[key].earnings += hourlyRate;
        });
        const monthlyBreakdown = Object.entries(monthlyMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, data]) => ({ month, ...data }));

        res.json({
            hourlyRate,
            totalSessions: completedBookings.length,
            estimatedEarnings,
            explicitPaid,
            explicitPending,
            recentSessions: completedBookings.slice(0, 20),
            paymentRecords: paymentRecords.slice(0, 20),
            monthlyBreakdown
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc  Log a manual payment record (tutor marks a session as paid)
// @route POST /api/payments
// @access Private (Tutor)
const logPayment = async (req, res) => {
    try {
        const { bookingId, amount, paymentMethod, notes, transactionId } = req.body;
        if (!amount) return res.status(400).json({ message: 'Amount is required' });

        const payment = await Payment.create({
            tutorId: req.user._id,
            bookingId: bookingId || null,
            amount,
            paymentMethod: paymentMethod || 'cash',
            status: 'completed',
            paidAt: new Date(),
            notes,
            transactionId
        });

        if (bookingId) {
            await Booking.findByIdAndUpdate(bookingId, { isPaid: true });
        }

        res.status(201).json(payment);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc  Get student payment history (sessions they paid for)
// @route GET /api/payments/student-history
// @access Private (Student)
const getStudentPaymentHistory = async (req, res) => {
    try {
        const bookings = await Booking.find({
            studentId: req.user._id,
            status: { $in: ['approved', 'completed'] },
            bookingCategory: 'session'
        })
            .populate('tutorId', 'name')
            .sort({ createdAt: -1 });

        res.json(bookings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { getTutorEarnings, logPayment, getStudentPaymentHistory };
