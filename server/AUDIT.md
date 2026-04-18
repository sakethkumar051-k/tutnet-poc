# TutNet Server-Side Audit

> Audit Date: 2026-04-10
> Scope: API Design, Architecture, Security, Performance, Best Practices

---

## 1. ARCHITECTURE AUDIT

### 1.1 Overall Structure

**Pattern:** MVC + Service Layer
**Framework:** Express.js + Mongoose + MongoDB

```
server/
├── server.js              # Entry point, middleware setup, route mounting
├── middleware/             # auth, role, error handlers
├── routes/          (25)  # Route definitions
├── controllers/     (26)  # Request handlers
├── models/          (15)  # Mongoose schemas
├── services/              # Business logic
├── utils/                 # Helpers
├── jobs/                  # Cron jobs
├── config/                # Passport OAuth
└── constants/             # Predefined options
```

**Good:**
- Clear separation of concerns (routes → controllers → services → models)
- Service layer extracts business logic from controllers
- Constants file for tutor profile options prevents magic strings

**Issues:**
- **No input validation layer.** Validation is scattered inside controllers with manual `if` checks. Should use a schema validation library (Joi, Zod, or express-validator) as middleware.
- **No DTO/response shaping layer.** Controllers return raw Mongoose documents, exposing internal fields (e.g., `__v`, internal IDs, password hashes). Need response serializers.
- **No dependency injection.** Controllers directly import models and services, making unit testing difficult.
- **`server.js` is monolithic** (~200 lines). Route mounting, middleware setup, DB connection, cron jobs, and server startup are all in one file. Split into `app.js` (Express app), `db.js` (connection), and `server.js` (startup).

### 1.2 Route Organization

| Domain | Route File(s) | Endpoints | Status |
|--------|--------------|-----------|--------|
| Auth | `auth.routes.js` | 10 | Good |
| Tutors | `tutor.routes.js` | 11 | Good |
| Bookings | `booking.routes.js` + 3 category files | ~50 | Over-split |
| Payments | `payment.routes.js` | 8 | Good |
| Admin | `admin.routes.js` | 16 | Good |
| Messages | `message.routes.js` | 4 | Good |
| Notifications | `notification.routes.js` | 5 | Good |
| Reviews | `review.routes.js` | 3 | Good |
| Favorites | `favorite.routes.js` | 4 | Good |
| Attendance | `attendance.routes.js` | 7 | Good |
| Session Feedback | `sessionFeedback.routes.js` | 9 | Good |
| Current Tutors | `currentTutor.routes.js` | 8 | Good |
| Progress Reports | `progressReport.routes.js` | 6 | Good |
| Study Materials | `studyMaterial.routes.js` | 6 | Good |
| Learning Goals | `learningGoal.routes.js` | 5 | Good |
| Escalations | `escalation.routes.js` | 4 | Good |
| Others | demos, incentives, jobs, analytics | 4 | Fine |

**Issues:**
- **Booking routes are over-fragmented.** 4 separate route files (`booking.routes.js`, `trialBooking.routes.js`, `sessionBooking.routes.js`, `dedicatedBooking.routes.js`) with nearly identical endpoint patterns. The legacy `booking.routes.js` dispatches to scoped controllers, creating an unnecessary indirection layer. Consolidate to one booking route file with category as a query param or path segment.
- **Route naming inconsistency.** Some use plural (`/bookings`), some singular (`/api/attendance`). Standardize to plural nouns.
- **No API versioning.** All routes are under `/api/*`. When breaking changes are needed, old clients will break. Use `/api/v1/*`.
- **Admin routes mix concerns.** Analytics, user management, booking management, tutor approval, and communication are all under `/api/admin/*`. Consider sub-routes like `/api/admin/tutors/*`, `/api/admin/analytics/*`.

---

## 2. API DESIGN AUDIT

### 2.1 RESTful Compliance

| Principle | Status | Details |
|-----------|--------|---------|
| Resource-based URLs | Mostly | Some action-verbs in URLs (e.g., `/approve`, `/reject`) |
| HTTP methods used correctly | Mostly | PATCH for partial updates is correct |
| Consistent response format | Partial | No standardized envelope |
| Pagination | Missing | No pagination on list endpoints |
| Filtering | Partial | Tutor list has filters; bookings don't |
| Sorting | Missing | No server-side sort params |
| Error codes | Partial | Some use `code` field, most don't |

**Issues:**
- **No standard response envelope.** Responses vary between `{ data }`, `{ bookings }`, `{ message }`, and raw arrays. Standardize to `{ success, data, meta, error }`.
- **No pagination on any list endpoint.** `GET /api/bookings/mine` returns ALL bookings. For active users with hundreds of sessions, this will be slow and wasteful.
- **Action endpoints use PATCH + verb** (e.g., `PATCH /bookings/:id/approve`). While common, a more RESTful approach would be `PATCH /bookings/:id` with `{ status: 'approved' }`, using the controller to validate state transitions.
- **No HATEOAS or link headers.** Clients must hardcode all endpoint paths.
- **No rate limiting per endpoint.** The global 300 req/15min limit applies to everything equally. Auth endpoints should have stricter limits (e.g., 10 login attempts/15min).

### 2.2 Booking API Complexity

The booking system is the most complex part of the API:

```
4 booking categories × 12 actions = 48 endpoint variations
```

**Issues:**
- **Category-scoped controllers duplicate logic.** `trialBooking.controller.js`, `sessionBooking.controller.js`, and `dedicatedBooking.controller.js` all wrap the same `booking.controller.js` methods with category filtering. This creates maintenance overhead.
- **Booking lifecycle transitions are partially enforced.** `bookingLifecycle.service.js` defines valid transitions but it's not used as a middleware gate — individual controller methods check status manually.
- **No idempotency keys.** Creating a booking can be duplicated if the client retries a failed request. Add idempotency key support for POST endpoints.
- **Trial booking rules are complex and scattered.** Max 3 active trials, max 2 per tutor, 48h expiry — these rules are in the controller, not the model or service layer.

### 2.3 Payment API

**Good:**
- Razorpay webhook with HMAC signature verification
- Mock mode for testing (`PAYMENT_MODE=mock`)
- Refund support (full and partial)

**Issues:**
- **No payment retry mechanism.** If Razorpay order creation fails, the student must start over.
- **Webhook endpoint has no replay protection.** The same webhook could be processed multiple times. Add event ID deduplication.
- **Manual payment logging** (`POST /api/payments/manual`) by tutors has no verification. A tutor could log fake payments. Need admin approval or student confirmation.
- **No payment receipt generation.** Students get a payment record but no downloadable receipt/invoice.

---

## 3. DATABASE AUDIT

### 3.1 Schema Design

**Good:**
- Appropriate indexing on high-query fields
- Unique constraints where needed (e.g., `studentId+tutorId` on Favorite)
- TTL index on Notifications (30-day auto-delete)
- Virtual fields used appropriately (e.g., `isExpired` on Booking)

**Issues:**
- **Booking model is overloaded** (~160 lines, 40+ fields). It handles trials, sessions, dedicated bookings, reschedule requests, tutor change requests, and payment status all in one document. Consider splitting:
  - `Booking` (core: student, tutor, subject, category, status, dates)
  - `RescheduleRequest` (separate collection, ref booking)
  - `TutorChangeRequest` (separate collection, ref booking)
  - Dedicated booking details in a sub-document or separate model
- **No soft delete pattern.** Bookings/Users are never truly deleted, but there's no `deletedAt` field or consistent soft-delete approach. `Notification` has `isDeleted`, but `Booking` doesn't.
- **`User` model stores tutor-specific fields** (`demosUsed`, `demoLimit`, `lastDemoDate`). These should be on the student's profile or a separate `StudentProfile` model to mirror `TutorProfile`.
- **No data archival strategy.** Completed bookings from years ago will accumulate in the same collection. Consider archiving old data.
- **`emergencyContact` on User** is a bare field with no structure. Should be `{ name, phone, relationship }`.
- **No schema validation for embedded arrays.** `weeklySchedule` in Booking accepts any shape. Add Mongoose sub-document schemas.

### 3.2 Query Patterns

**Issues:**
- **N+1 queries in several controllers.** `getTutors()` fetches tutor profiles, then for each one separately fetches user data. Use `.populate()` or aggregation pipeline.
- **No projection/field selection.** Most queries return all fields: `Booking.find({ studentId })`. Specify only needed fields: `Booking.find({ studentId }).select('subject status sessionDate')`.
- **`getTutors()` cache is in-memory Map.** This won't work in a multi-process/multi-server deployment. Use Redis or MongoDB's built-in caching.
- **Aggregate queries in analytics have no indexes.** Admin analytics endpoints run aggregation pipelines on large collections without dedicated indexes.

### 3.3 Data Integrity

**Issues:**
- **No transaction support.** Multi-document operations (e.g., creating a booking + creating a notification + updating trial count) are not wrapped in MongoDB transactions. If one fails, data becomes inconsistent.
- **`demosUsed` counter on User can drift.** If a trial booking is created but the `demosUsed` increment fails, the counter becomes inaccurate. Use transactions or derive the count from booking records.
- **`averageRating` on TutorProfile is denormalized.** Updated when reviews are added, but if a review is deleted (no API for this), the rating becomes stale. Either prevent review deletion or recalculate on change.
- **No referential integrity checks.** Deleting a User doesn't cascade to their Bookings, Messages, or Reviews. Mongoose doesn't enforce foreign keys — add pre-delete middleware.

---

## 4. SECURITY AUDIT

### 4.1 Authentication & Authorization

| Check | Status | Details |
|-------|--------|---------|
| JWT signing | Good | `JWT_SECRET` from env |
| Password hashing | Good | bcrypt with salt |
| OAuth implementation | Good | Passport.js + one-time codes |
| Role-based access | Good | `authorize()` middleware |
| Token expiry | Good | 30-day TTL |

**Issues:**
- **JWT secret is a single string.** No key rotation mechanism. If compromised, all tokens are valid until they expire. Consider asymmetric signing (RS256) or at minimum, secret rotation support.
- **No refresh token.** 30-day access tokens are a security risk — a stolen token grants access for a month. Implement short-lived access tokens (15min) + refresh tokens.
- **Admin authentication uses a shared secret** (`ADMIN_SECRET`). This is a weak pattern — anyone who knows the secret can become an admin. Use invite-based admin creation or a separate admin management system.
- **No account lockout after failed login attempts.** Brute force attacks are only rate-limited globally (300 req/15min per IP), not per account.
- **OAuth in-memory code store won't work in clustered deployments.** Codes stored in a Map are per-process. Use Redis or MongoDB for code storage.
- **`protect` middleware doesn't check if user is still active.** A deactivated user (`isActive: false`) with a valid token can still access the API.

### 4.2 Input Security

**Issues:**
- **No centralized input sanitization.** Controllers manually trim and cap string lengths, but there's no middleware to prevent NoSQL injection, XSS payloads, or malformed data.
- **MongoDB injection risk.** Query parameters like `{ subject: req.query.subject }` are passed directly to Mongoose queries. While Mongoose provides some protection, explicitly sanitize with `mongo-sanitize`.
- **No request body size limit.** Express default is ~100KB, but there's no explicit limit. A malicious client could send large payloads.
- **File upload endpoints (if any) have no file type/size validation.** Study materials endpoint accepts URLs but if file upload is added, validation is needed.
- **`additionalNotes` and `learningGoals` in booking accept up to 2000 chars** of unsanitized text that could contain script tags (XSS if rendered without escaping).

### 4.3 Data Exposure

**Issues:**
- **Password hash can leak.** `User.find()` returns all fields including `password`. While some endpoints use `.select('-password')`, not all do. Add a model-level `toJSON` transform to always exclude `password`.
- **Internal ObjectIDs exposed.** MongoDB `_id` values are sequential and reveal document creation time. This is minor but worth noting.
- **Error stack traces in development.** Error middleware returns `err.stack` in non-production. Ensure `NODE_ENV=production` is always set in deployment.
- **No CORS origin whitelist in production.** CORS is configured but verify it restricts to the actual frontend domain, not `*`.

---

## 5. PERFORMANCE AUDIT

### 5.1 Server Configuration

| Check | Status | Details |
|-------|--------|---------|
| Rate limiting | Partial | Global only, 300/15min |
| Request logging | Good | Morgan middleware |
| CORS | Good | Configured |
| Compression | Missing | No gzip/brotli response compression |
| Helmet | Missing | No security headers |

**Issues:**
- **No response compression.** Add `compression` middleware to gzip API responses (can reduce payload by 60-80%).
- **No Helmet.js.** Security headers (X-Frame-Options, X-Content-Type-Options, HSTS, etc.) are not set. Add `helmet()` middleware.
- **No request body parsing limits.** Add `express.json({ limit: '10kb' })` to prevent large payload attacks.
- **No graceful shutdown.** `server.js` doesn't handle `SIGTERM`/`SIGINT` to close DB connections and drain requests.
- **No health check endpoint.** No `/api/health` for load balancer probes or monitoring.

### 5.2 Database Performance

**Issues:**
- **In-memory tutor cache with 2-min TTL** won't survive server restarts and doesn't work across multiple instances.
- **No connection pooling configuration.** Mongoose defaults are used. For production, configure `maxPoolSize`, `minPoolSize`, and `serverSelectionTimeoutMS`.
- **No query timeouts.** A slow aggregation query can block the event loop. Set `maxTimeMS` on expensive queries.
- **No lean queries.** Most queries return full Mongoose documents. Use `.lean()` for read-only operations to reduce memory usage by 50%.
- **Cron jobs run on the same process.** Trial expiry and session reminders compete with request handling. For production, use a separate worker process or a job queue (Bull/BullMQ).

### 5.3 Scalability Concerns

| Concern | Severity | Details |
|---------|----------|---------|
| In-memory state (cache, OAuth codes) | High | Breaks in multi-process/multi-server |
| No job queue | Medium | Cron jobs on main process |
| No pagination | High | Unbounded list responses |
| No streaming for large exports | Low | Admin reports loaded into memory |
| Single DB connection | Medium | No read replicas for analytics |

---

## 6. ERROR HANDLING AUDIT

### 6.1 Current Patterns

**Global Error Handler** (`middleware/error.middleware.js`):
```javascript
// Catches all unhandled errors
// Returns 500 with message + stack (dev only)
```

**Controller-Level:**
```javascript
try {
    // ... logic
    res.json({ ... });
} catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
}
```

**Issues:**
- **Generic 500 for all errors.** Validation errors, not-found errors, and server errors all return 500. Use custom error classes:
  - `ValidationError` → 400
  - `NotFoundError` → 404
  - `UnauthorizedError` → 401
  - `ForbiddenError` → 403
  - `ConflictError` → 409
- **No structured error response.** Error responses vary: `{ message }`, `{ error }`, `{ message, code }`. Standardize to `{ success: false, error: { code, message, details } }`.
- **Unhandled promise rejections.** No global handler for `unhandledRejection` or `uncaughtException`. These will crash the process in Node 15+.
- **Console.error for logging.** Use a structured logger (Winston, Pino) for production with log levels, timestamps, and request context.
- **No error tracking.** No Sentry/Bugsnag integration for production error monitoring.

---

## 7. TESTING AUDIT

**Current State: No tests exist.**

| Type | Status | Priority |
|------|--------|----------|
| Unit tests (services, utils) | Missing | High |
| Integration tests (API endpoints) | Missing | High |
| Model validation tests | Missing | Medium |
| Auth flow tests | Missing | High |
| Booking lifecycle tests | Missing | High |
| Payment flow tests | Missing | High |
| Load/stress tests | Missing | Medium |

**Recommendations:**
- Add Jest + Supertest for API integration tests
- Test all booking state transitions
- Test payment webhook processing
- Test auth flows (register, login, OAuth, token refresh)
- Test role-based access for all endpoints
- Add MongoDB Memory Server for isolated test DB

---

## 8. SCHEDULED JOBS AUDIT

### 8.1 Trial Expiry Job (`jobs/trialExpiry.job.js`)

**Runs:** Every 10 minutes
**Purpose:** Cancel expired pending trials and sessions with past dates

**Issues:**
- **No error reporting.** If the job fails, it's only logged to console. Should alert via monitoring.
- **No distributed lock.** In a multi-instance deployment, every instance runs the job simultaneously. Use a distributed lock (Redis) or a single job runner.
- **Bulk update without limit.** Could update thousands of documents in one operation, blocking the DB.

### 8.2 Session Reminders Job (`jobs/sessionReminders.js`)

**Runs:** Every 30 minutes
**Purpose:** Send 24h and 1h reminders for approved sessions

**Issues:**
- **Only creates Notification records.** No actual email or push notification is sent. The "reminder" only works if the user checks the in-app notification panel.
- **Reminder timing is imprecise.** Running every 30 minutes means reminders could be sent anywhere from 30 to 60 minutes before the target time.
- **No SMS/push integration.** For a tutoring platform, session reminders via email/SMS are critical.

---

## 9. PRIORITY RECOMMENDATIONS

### Critical (Do First)
1. **Add input validation middleware** (Joi/Zod) — remove manual validation from controllers
2. **Add pagination** to all list endpoints (bookings, tutors, messages, notifications)
3. **Add Helmet.js** for security headers
4. **Add response compression** (gzip)
5. **Implement MongoDB transactions** for multi-document operations (booking creation)
6. **Add health check endpoint** (`GET /api/health`)

### High Priority
7. **Standardize error handling** with custom error classes and structured responses
8. **Add `.select('-password')` globally** or model-level `toJSON` transform
9. **Implement refresh tokens** — replace 30-day access tokens
10. **Add structured logging** (Winston/Pino) — replace `console.error`
11. **Move in-memory state to Redis** (tutor cache, OAuth codes)
12. **Add per-route rate limiting** (stricter for auth endpoints)
13. **Add graceful shutdown** handling

### Medium Priority
14. **Consolidate booking routes** — merge 4 files into 1 with category param
15. **Add API versioning** (`/api/v1/`)
16. **Standardize response envelope** (`{ success, data, meta, error }`)
17. **Add lean queries** for read-only operations
18. **Implement email/SMS** for session reminders
19. **Add test suite** (Jest + Supertest)
20. **Split `server.js`** into app.js, db.js, server.js

### Nice to Have
21. **Add webhook replay protection** with event ID deduplication
22. **Implement WebSocket** for real-time messages and notifications
23. **Add Swagger/OpenAPI documentation** for all endpoints
24. **Add data archival strategy** for old bookings
25. **Add distributed job locking** for cron jobs

---

## 10. ENDPOINT MAP

```
/api
├── /auth
│   ├── POST   /register
│   ├── POST   /login
│   ├── GET    /me
│   ├── PUT    /profile
│   ├── POST   /verify-admin
│   ├── POST   /forgot-password
│   ├── POST   /reset-password
│   ├── GET    /google
│   ├── GET    /google/callback
│   └── GET    /oauth-token/:code
│
├── /tutors
│   ├── GET    /                     (filtered list)
│   ├── GET    /me
│   ├── GET    /my-profile
│   ├── GET    /profile/complete
│   ├── GET    /profile/options
│   ├── GET    /profile-by-user/:userId
│   ├── GET    /recommendations
│   ├── GET    /:id
│   ├── PUT    /profile
│   ├── PATCH  /profile/submit
│   └── PATCH  /availability
│
├── /bookings (legacy + category-scoped)
│   ├── GET    /                     (list)
│   ├── POST   /                     (create)
│   ├── GET    /mine
│   ├── GET    /requests
│   ├── PATCH  /:id/cancel
│   ├── PATCH  /:id/approve
│   ├── PATCH  /:id/reject
│   ├── PATCH  /:id/complete
│   ├── PATCH  /:id/reschedule-request
│   ├── PATCH  /:id/reschedule-respond
│   ├── PATCH  /:id/tutor-change-request
│   └── PATCH  /:id/tutor-change-respond
│   (× 4 category variants: /trial-bookings, /session-bookings, /dedicated-bookings)
│
├── /payments
│   ├── POST   /webhook
│   ├── POST   /create-order
│   ├── POST   /verify
│   ├── POST   /refund/:bookingId
│   ├── POST   /manual
│   ├── GET    /student-history
│   ├── GET    /tutor-earnings
│   └── GET    /booking/:bookingId
│
├── /admin
│   ├── GET    /tutors/pending
│   ├── GET    /tutors
│   ├── GET    /tutors/:id/history
│   ├── PATCH  /tutors/:id/approve
│   ├── PATCH  /tutors/:id/reject
│   ├── GET    /bookings/pending
│   ├── PATCH  /bookings/:id/approve
│   ├── PATCH  /bookings/:id/reject
│   ├── GET    /analytics
│   ├── GET    /reports
│   ├── GET    /activity
│   ├── GET    /users
│   ├── GET    /attendance/cross-check
│   ├── GET    /patterns
│   ├── POST   /mass-communication
│   └── POST   /send-alert
│
├── /messages
│   ├── POST   /
│   ├── GET    /conversations
│   ├── GET    /unread-count
│   └── GET    /:userId
│
├── /notifications
│   ├── GET    /
│   ├── GET    /unread-count
│   ├── PATCH  /:id/read
│   ├── PATCH  /read-all
│   └── DELETE /:id
│
├── /reviews
│   ├── POST   /
│   ├── GET    /tutor/:tutorId
│   └── GET    /student/:studentId
│
├── /favorites
│   ├── GET    /
│   ├── POST   /
│   ├── DELETE /:tutorId
│   └── GET    /check/:tutorId
│
├── /attendance
│   ├── GET    /
│   ├── GET    /stats
│   ├── GET    /student/:studentId
│   ├── GET    /tutor
│   ├── POST   /
│   ├── PUT    /:id
│   └── PATCH  /:id/parent-verify
│
├── /session-feedback
│   ├── GET    /booking/:bookingId
│   ├── POST   /booking/:bookingId/tutor-feedback
│   ├── POST   /booking/:bookingId/student-feedback
│   ├── POST   /booking/:bookingId/study-material
│   ├── PUT    /study-material/:feedbackId/:materialIndex
│   ├── POST   /booking/:bookingId/homework
│   ├── PATCH  /homework/:feedbackId/:homeworkIndex
│   ├── POST   /booking/:bookingId/attendance
│   └── GET    /progress-reports
│
├── /current-tutors
│   ├── GET    /student/my-tutors
│   ├── GET    /student/tutor/:tutorId
│   ├── POST   /student/end/:currentTutorId
│   ├── GET    /tutor/my-students
│   ├── GET    /tutor/student/:studentId
│   ├── POST   /tutor/end/:currentTutorId
│   ├── GET    /today
│   └── GET    /analytics/:currentTutorId
│
├── /progress-reports
│   ├── GET    /
│   ├── GET    /student/:studentId
│   ├── GET    /tutor
│   ├── GET    /:id
│   ├── POST   /
│   └── PUT    /:id
│
├── /study-materials
│   ├── GET    /
│   ├── GET    /:id
│   ├── GET    /tutor/:tutorId
│   ├── POST   /
│   ├── PUT    /:id
│   └── DELETE /:id
│
├── /goals
│   ├── POST   /
│   ├── GET    /my
│   ├── GET    /students
│   ├── PATCH  /:id
│   └── DELETE /:id
│
├── /escalations
│   ├── POST   /
│   ├── GET    /my
│   ├── GET    /           (admin)
│   └── PATCH  /:id        (admin)
│
├── /demos
│   └── GET    /my-demos
│
├── /incentives
│   └── GET    /summary
│
├── /jobs
│   └── POST   /send-reminders
│
└── /analytics
    └── GET    /platform
```
