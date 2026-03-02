// Permanent tutor bookings: preferredStartDate, subjects, frequency, monthsCommitted, learningGoals, termsAccepted.
const { buildScopedBookingController } = require('./scopedBooking.factory');

module.exports = buildScopedBookingController('permanent');
