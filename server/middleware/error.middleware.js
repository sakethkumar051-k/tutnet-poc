/**
 * Central Express error handler — consistent JSON envelope (never leak stack in production).
 */
const errorHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    const statusCode =
        Number.isInteger(err.statusCode) && err.statusCode >= 400 && err.statusCode < 600
            ? err.statusCode
            : Number.isInteger(err.status) && err.status >= 400 && err.status < 600
              ? err.status
              : 500;

    const code =
        typeof err.code === 'string' && err.code.length > 0 && err.code !== 'ECONNRESET'
            ? err.code
            : statusCode === 500
              ? 'INTERNAL_ERROR'
              : 'REQUEST_ERROR';

    const message =
        typeof err.message === 'string' && err.message.length > 0
            ? err.message
            : statusCode === 500
              ? 'Something went wrong'
              : 'Request failed';

    res.status(statusCode);

    const body = {
        success: false,
        error: {
            code,
            message
        }
    };

    if (process.env.NODE_ENV !== 'production' && err.stack) {
        body.stack = err.stack;
    }

    res.json(body);
};

module.exports = { errorHandler };
