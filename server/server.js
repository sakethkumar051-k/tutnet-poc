const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const ALLOWED_ORIGINS = [
    'https://tutnet-ffxb.vercel.app',
    /\.vercel\.app$/, // Allow all Vercel preview deployments
    /^http:\/\/localhost(:\d+)?$/,   // any localhost port (dev)
    /^http:\/\/127\.0\.0\.1(:\d+)?$/, // 127.0.0.1 equivalent
    /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/, // LAN dev
];

const corsOptions = {
    origin: (origin, callback) => {
        // Allow same-origin / curl / mobile native (no Origin header)
        if (!origin) return callback(null, true);
        const ok = ALLOWED_ORIGINS.some((o) =>
            o instanceof RegExp ? o.test(origin) : o === origin
        );
        return callback(ok ? null : new Error(`CORS: origin ${origin} not allowed`), ok);
    },
    credentials: true,
};

app.use(cors(corsOptions));
// Make sure preflight OPTIONS requests on every route get a CORS response,
// even before hitting the rate limiter or auth middleware.
app.options('*', cors(corsOptions));
// Razorpay webhook needs the raw body for HMAC signature verification.
// Capture raw bytes for /api/payments/webhook BEFORE express.json() parses it.
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }), (req, _res, next) => {
    req.rawBody = req.body; // Buffer
    try { req.body = JSON.parse(req.body.toString()); } catch (_) { req.body = {}; }
    next();
});

app.use(express.json());
app.use(morgan('dev'));

// Rate limit API to reduce abuse (booking create/approve, auth, etc.)
const rateLimit = require('express-rate-limit');
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    // Never rate-limit preflight or local dev traffic — preflight without CORS
    // response headers manifests as a CORS error in the browser.
    skip: (req) => req.method === 'OPTIONS' || process.env.NODE_ENV !== 'production',
    message: { message: 'Too many requests. Please try again later.', code: 'RATE_LIMIT_EXCEEDED' }
});
app.use('/api', apiLimiter);

// Session configuration
const session = require('express-session');
const passport = require('passport');

app.use(session({
    secret: process.env.SESSION_SECRET || 'tutnet-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Passport config
require('./config/passport')(passport);

// Health check endpoint (defined early, before routes)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Tutnet API is running',
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.send('Tutor Connect API is running');
});

// Database Connection (non-blocking - server will start even if DB fails)
const { startAllJobs } = require('./jobs');
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('MongoDB Connected');
        startAllJobs();
    })
    .catch(err => {
        console.error('MongoDB Connection Error:', err);
        console.log('Server will continue without database connection');
    });

// Routes (wrapped in try-catch to prevent server crash)
try {
    app.use('/api/auth', require('./routes/auth.routes'));
    app.use('/api/admin', require('./routes/admin.routes'));
    app.use('/api/tutors', require('./routes/tutor.routes'));
    // Split booking APIs by category while keeping the same Booking model/controller logic.
    app.use('/api/trial-bookings', require('./routes/trialBooking.routes'));
    app.use('/api/session-bookings', require('./routes/sessionBooking.routes'));
    app.use('/api/permanent-bookings', require('./routes/permanentBooking.routes'));
    app.use('/api/dedicated-bookings', require('./routes/dedicatedBooking.routes'));
    // Legacy endpoint retained for backward compatibility.
    app.use('/api/bookings', require('./routes/booking.routes'));
    app.use('/api/demos', require('./routes/demos.routes'));
    app.use('/api/reviews', require('./routes/review.routes'));
    app.use('/api/favorites', require('./routes/favorite.routes'));
    app.use('/api/progress-reports', require('./routes/progressReport.routes'));
    app.use('/api/attendance', require('./routes/attendance.routes'));
    app.use('/api/current-tutors', require('./routes/currentTutor.routes'));
    app.use('/api/my-tutor', require('./routes/myTutor.routes'));
    app.use('/api/session-feedback', require('./routes/sessionFeedback.routes'));
    app.use('/api/study-materials', require('./routes/studyMaterial.routes'));
    app.use('/api/messages', require('./routes/message.routes'));
    app.use('/api/payments', require('./routes/payment.routes'));
    app.use('/api/escalations', require('./routes/escalation.routes'));
    app.use('/api/incentives', require('./routes/incentive.routes'));
    app.use('/api/jobs', require('./routes/jobs.routes'));
    app.use('/api/goals', require('./routes/learningGoal.routes'));
    app.use('/api/analytics', require('./routes/platformAnalytics.routes'));

    // Notification routes with specific error handling
    try {
        const notificationRoutes = require('./routes/notification.routes');
        app.use('/api/notifications', notificationRoutes);
        console.log('✓ Notification routes loaded successfully');
    } catch (notifError) {
        console.error('✗ Error loading notification routes:', notifError.message);
        console.error(notifError.stack);
    }

    console.log('All routes loaded successfully');
} catch (error) {
    console.error('Error loading routes:', error);
    // Server will still start, but routes won't work
}

// 404 Handler for undefined routes
app.use((req, res, next) => {
    // Check if it's a method mismatch (e.g., GET on a POST-only route)
    const methodMismatch = {
        '/api/auth/login': 'POST',
        '/api/auth/register': 'POST',
        '/api/auth/forgot-password': 'POST',
        '/api/auth/reset-password': 'POST',
        '/api/auth/verify-admin': 'POST',
        '/api/trial-bookings': 'POST',
        '/api/session-bookings': 'POST',
        '/api/permanent-bookings': 'POST',
        '/api/dedicated-bookings': 'POST',
        '/api/bookings': 'POST',
        '/api/reviews': 'POST',
        '/api/current-tutors/student/my-tutors': 'GET',
        '/api/current-tutors/tutor/my-students': 'GET',
        '/api/session-feedback/booking/:bookingId/tutor-feedback': 'POST',
        '/api/session-feedback/booking/:bookingId/student-feedback': 'POST'
    };

    const correctMethod = methodMismatch[req.path];
    const methodHint = correctMethod && req.method !== correctMethod
        ? ` This endpoint requires ${correctMethod} method, but you used ${req.method}.`
        : '';

    res.status(404).json({
        message: `Route ${req.method} ${req.path} not found.${methodHint}`,
        hint: correctMethod
            ? `Try using ${correctMethod} method instead of ${req.method}`
            : 'Check the API documentation for the correct endpoint and method',
        availableEndpoints: [
            'GET /',
            'GET /api/health',
            'POST /api/auth/register',
            'POST /api/auth/login',
            'GET /api/auth/me (requires auth)',
            'GET /api/tutors',
            'GET /api/tutors/:id'
        ]
    });
});

// Error Handler (must be last)
app.use(require('./middleware/error.middleware').errorHandler);

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check available at: http://localhost:${PORT}/api/health`);
    // Background jobs are started inside the MongoDB `.then()` above so they
    // can't run before the DB is ready. Nothing else to schedule here.
});
