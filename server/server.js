const http = require('http');
const cookieParser = require('cookie-parser');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const helmet = require('helmet');
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

app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false
}));
app.use(compression());
app.use(cors(corsOptions));
// Make sure preflight OPTIONS requests on every route get a CORS response,
// even before hitting the rate limiter or auth middleware.
app.options('*', cors(corsOptions));
// Razorpay webhook needs the raw body for HMAC signature verification.
// Capture raw bytes for /api/payments/webhook BEFORE express.json() parses it.
app.use('/api/payments/webhook', express.raw({ type: 'application/json', limit: '256kb' }), (req, _res, next) => {
    req.rawBody = req.body; // Buffer
    try { req.body = JSON.parse(req.body.toString()); } catch (_) { req.body = {}; }
    next();
});

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(morgan('dev'));

const rateLimit = require('express-rate-limit');

const strictAuthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS' || process.env.NODE_ENV !== 'production',
    message: { message: 'Too many attempts. Try again later.', code: 'AUTH_RATE_LIMIT' }
});

const paymentsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS' || process.env.NODE_ENV !== 'production',
    message: { message: 'Too many payment requests. Try again later.', code: 'PAYMENTS_RATE_LIMIT' }
});

app.use('/api/auth/login', strictAuthLimiter);
app.use('/api/auth/register', strictAuthLimiter);

app.use('/api/payments', (req, res, next) => {
    if (req.path === '/webhook' || req.originalUrl.includes('/webhook')) return next();
    return paymentsLimiter(req, res, next);
});

// Rate limit API to reduce abuse (booking create/approve, auth, etc.)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
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
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        paymentMode: process.env.PAYMENT_MODE || 'live',
        payoutMode: process.env.PAYOUT_MODE || 'mock',
        env: process.env.NODE_ENV || 'development'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.send('Tutor Connect API is running');
});

// Database Connection (non-blocking + auto-retry; bails to log-only on persistent failure)
const { startAllJobs } = require('./jobs');
let jobsStarted = false;
const connectWithRetry = (attempt = 1) => {
    const delay = Math.min(30_000, 2_000 * Math.pow(2, attempt - 1));
    mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10_000
    })
        .then(() => {
            console.log(`MongoDB Connected (attempt ${attempt})`);
            if (!jobsStarted) { startAllJobs(); jobsStarted = true; }
        })
        .catch(err => {
            console.error(`MongoDB Connection Error (attempt ${attempt}):`, err.message);
            console.log(`Retrying in ${Math.round(delay / 1000)}s…`);
            setTimeout(() => connectWithRetry(attempt + 1), delay);
        });
};
mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected — attempting to reconnect…');
    if (mongoose.connection.readyState === 0) connectWithRetry();
});
mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));
connectWithRetry();

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
    app.use('/api/booking-actions', require('./routes/bookingActions.routes'));
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
    app.use('/api/subscriptions', require('./routes/subscription.routes'));
    app.use('/api/credits/topup', require('./routes/creditsTopup.routes'));
    app.use('/api/rate-bands', require('./routes/rateBands.routes'));
    app.use('/api/off-platform-reports', require('./routes/offPlatformReport.routes'));
    app.use('/api/admin/revenue', require('./routes/adminRevenue.routes'));
    app.use('/api/admin/razorpay', require('./routes/adminRazorpay.routes'));
    app.use('/api/admin/support', require('./routes/adminSupport.routes'));
    // Platform misc: contact form, ics calendar, tutor payout ledger.
    // Mounted at /api (routes define their own leaf path).
    app.use('/api', require('./routes/platform.routes'));
    // More cross-cutting endpoints: referrals, family (parent/child), uploads, invoices.
    app.use('/api', require('./routes/platformExtra.routes'));
    // Serve uploaded files as static assets (read-only public access via unguessable path).
    app.use('/uploads', express.static(require('path').resolve(__dirname, 'uploads')));
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
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: `Route ${req.method} ${req.path} not found.${methodHint}`
        },
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

const { initSocket, closeIO } = require('./socket/io');
const server = http.createServer(app);
initSocket(server, corsOptions);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check available at: http://localhost:${PORT}/api/health`);
});

function gracefulShutdown(signal) {
    console.log(`${signal} received: closing Socket.IO and HTTP server…`);
    closeIO(() => {
        server.close((err) => {
            if (err) {
                console.error('Error closing HTTP server:', err);
                process.exit(1);
            }
            mongoose.connection.close().then(() => {
                console.log('MongoDB connection closed.');
                process.exit(0);
            }).catch((e) => {
                console.error('Error closing MongoDB:', e);
                process.exit(1);
            });
        });
    });
    setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10_000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
