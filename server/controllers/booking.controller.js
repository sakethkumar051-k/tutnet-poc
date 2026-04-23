/**
 * Booking HTTP handlers — split by concern under ./booking/
 * (create / queries / transitions). Re-exported for existing route imports.
 */
module.exports = {
    ...require('./booking/bookingCreate'),
    ...require('./booking/bookingQueries'),
    ...require('./booking/bookingTransitions')
};
