# Tutnet Backend — Architecture & Cleanup Plan

Living reference for the Tutnet Express/Mongo backend. Split into three parts:

1. **What we just cleaned up** — already shipped.
2. **Current schema & route inventory** — the state of the backend today.
3. **Potential changes** — staged proposals (no schema changes applied yet, per request).

---

## 1. Cleanups already shipped

| Area | Before | After |
|---|---|---|
| Session-reminder polling | `setInterval(..., 30 * 60_000)` inside `app.listen` callback | [jobs/index.js](jobs/index.js) registers it as a `node-cron` job alongside trial expiry |
| Trial expiry job | Self-scheduled its own cron inside `jobs/trialExpiry.job.js` | Pure functions; scheduling is centralized in [jobs/index.js](jobs/index.js) |
| Reminder cadence | Every 30 min (too sparse — the match window is only ±5 min) | Every 15 min |
| CORS | Exact whitelist of two origins | Regex matching for `localhost:*`, `127.0.0.1:*`, `192.168.*:*`, all `*.vercel.app`; explicit `app.options('*')` preflight |
| Rate limiter | Hit dev traffic, returning 429s without CORS headers (showed as CORS errors) | `skip` for `OPTIONS` and non-production environments |
| Server bootstrap | Two separate schedulers (cron for trials, setInterval for reminders) | Single `startAllJobs()` entry point — add jobs in one place |

**Note on webhooks:** the one webhook in the system (`POST /api/payments/webhook`) is the Razorpay payment confirmation callback. It is **authoritative** for payment status (see `controllers/payment.controller.js:313`) and must stay. There are no other inbound webhooks.

---

## 2. Current inventory

### 2.1 Models (Mongoose)

| Model | Purpose | Size | Indexes |
|---|---|---|---|
| `User` | All auth’d principals (student / tutor / admin) | 53 lines | `{ role, isActive }` |
| `TutorProfile` | Teaching-side data keyed 1:1 with a `User` | 73 lines | `{ approvalStatus, profileStatus }`, `{ subjects }`, `{ classes }`, `{ mode }` |
| `Booking` | Unified booking (trial / session / permanent / dedicated) | 158 lines | 6 indexes covering student/tutor/status/date |
| `Attendance` | Per-session attendance + parent verification | 68 lines | *none declared* |
| `SessionFeedback` | Post-session tutor notes & student rating | 57 lines | *none declared* |
| `ProgressReport` | Aggregate progress across sessions | 63 lines | *none declared* |
| `LearningGoal` | Student-set goals linked to a subject / tutor | 31 lines | *none declared* |
| `Review` | Public review on a completed booking | 34 lines | *none declared* |
| `Favorite` | Student ↔ tutor save list | 22 lines | unique `{ studentId, tutorId }` |
| `Message` | Direct chat between student & tutor | 38 lines | sender+recipient+date, recipient+read |
| `Notification` | In-app notifications with TTL | 93 lines | user+date, createdAt, TTL |
| `Payment` | Razorpay order + payout + refund state | 113 lines | 6 indexes (some redundant with inline) |
| `Escalation` | Disputes / complaints raised for admin review | 44 lines | *none declared* |
| `StudyMaterial` | Tutor-uploaded resources | 53 lines | *none declared* |
| `CurrentTutor` | "Active engagement" between a student and a tutor | 68 lines | partial-unique `{student, tutor, subject, isActive}` |

### 2.2 Routes (mounted on `/api`)

```
auth              tutors           favorites         bookings (legacy)
admin             reviews          progress-reports  trial-bookings
session-bookings  permanent-bookings  dedicated-bookings
demos             attendance       current-tutors    my-tutor
session-feedback  study-materials  messages          payments
escalations       incentives       jobs              goals
analytics         notifications
```

25 route groups. Most are thin CRUD; booking flows concentrate the complexity.

### 2.3 Background jobs

Defined in [jobs/index.js](jobs/index.js):

| Job | Schedule | What it does |
|---|---|---|
| `expiry` | `*/10 * * * *` | Cancels pending trials past their `trialExpiresAt`; cancels pending sessions whose `sessionDate` has passed |
| `reminders` | `*/15 * * * *` | Sends 24h and 1h in-app reminders for approved upcoming sessions |

No more ad-hoc `setInterval` timers (except one 5-min expiry sweep on the in-memory OAuth code map — that one is legitimate, tiny, and has no cron equivalent).

### 2.4 Webhooks

| Path | Source | Status |
|---|---|---|
| `POST /api/payments/webhook` | Razorpay | Authoritative. HMAC verified in `controllers/payment.controller.js`. **Keep.** |

No other webhooks. Nothing to remove.

---

## 3. Potential changes (NOT yet applied — requires migration)

Ordered by ROI × safety. Schema changes are deferred per instruction; these are the concrete targets when we're ready.

### 3.1 `TutorProfile` — collapse duplicate status fields ⭐ high value
`profileStatus` (`draft | pending | approved | rejected`) and `approvalStatus` (`pending | approved | rejected`) both model the review lifecycle. Every read path checks one or the other; some check both. Controllers accidentally diverge.

**Proposal:** single field `status: { type: String, enum: ['draft', 'pending', 'approved', 'rejected'], default: 'draft' }`. Migrate via a one-shot script that collapses the two. Index `{ status, subjects }` for the public listing.

### 3.2 `Notification.type` — decompose the 57-enum ⭐ high value
Currently one flat enum mixes concerns (`booking`, `booking_approved`, `booking_rejected`, `demo_accepted`, `demo_rejected`, `demo_booking_created`, …).

**Proposal:**
```
type:    { enum: ['booking', 'payment', 'message', 'tutor', 'review', 'system'] }
subtype: { type: String }   // free-form, validated per-type by the notification factory
```
The UI already groups notifications by the type prefix — this just formalises it. Adds one Mongo compound index `{ userId, type, createdAt }` to power the notification drawer tabs.

### 3.3 `Booking` — extract change/reschedule requests
`rescheduleRequest` and `tutorChangeRequest` nested objects are large, only used by a minority of bookings, and have their own state machines. They bloat every booking read.

**Proposal:** new collection `BookingChangeRequest { bookingId, kind: 'reschedule'|'tutor_change', requestedBy, payload, status, resolvedAt }`. Remove the two nested fields from `Booking`. Makes booking documents ~30% smaller on average and keeps audit history for each request instead of just the latest one.

### 3.4 `Booking.bookingType` — delete the deprecated field
Marked deprecated (lines 59–66 of [models/Booking.js](models/Booking.js)) in favor of `bookingCategory`. Still read by legacy controller paths.

**Proposal:** remove all reads first (grep `bookingType`, replace with `bookingCategory`). Ship. Then drop the field in a follow-up migration. Low risk after the first step.

### 3.5 `Attendance` — nest related flags
Currently flat: `parentVerificationStatus`, `parentVerificationNote`, `parentVerifiedAt`, `parentVerifiedBy`, plus `adminApproved`, `adminApprovedBy`, `adminApprovedAt`.

**Proposal:**
```
parentVerification: { status, note, verifiedAt, verifiedBy }
adminApproval:     { approved, by, at }
```
Zero runtime behavior change — just a data-shape tidy — but every handler that touches attendance becomes more readable. Also add indexes: `{ bookingId }`, `{ tutorId, sessionDate }`.

### 3.6 Missing indexes on hot read paths
All models below have no declared indexes beyond `_id`, yet are queried by foreign key constantly:

| Model | Suggested index |
|---|---|
| `Attendance` | `{ bookingId }`, `{ tutorId, sessionDate: -1 }`, `{ studentId, sessionDate: -1 }` |
| `SessionFeedback` | `{ studentId, createdAt: -1 }`, `{ tutorId, createdAt: -1 }` |
| `ProgressReport` | `{ studentId, subject }`, `{ bookingId }` |
| `Review` | `{ tutorId, createdAt: -1 }`, `{ studentId }` |
| `Escalation` | `{ status, createdAt: -1 }`, `{ againstUser }` |
| `LearningGoal` | `{ studentId, status }`, `{ tutorId }` |
| `StudyMaterial` | `{ subject, classGrade }`, `{ tutorId }` |

Each is one line; all are zero-risk to add.

### 3.7 `CurrentTutor` vs `Booking(category='dedicated')` — clarify source of truth
`CurrentTutor` maintains its own `totalSessionsBooked`, `sessionsCompleted`, etc. Those values are derivable from the `Booking` + `Attendance` collections. Dual-writes drift.

**Proposal:** make the counters virtuals (computed on read via aggregation) or populate them with a nightly job. Keep `CurrentTutor` as the *relationship* record, not the *metrics* record.

### 3.8 `SessionFeedback` + `ProgressReport` — define the boundary
- `SessionFeedback` = detail per session (tutor summary, understanding score, homework).
- `ProgressReport` = aggregate across N sessions (attendance %, performance trend).

Today, both store some overlapping data. The proposal is to *keep both* but enforce the boundary: `ProgressReport` should be regenerated from `SessionFeedback` + `Attendance` via an aggregation pipeline instead of being written directly. That lets us rebuild historical reports at any time.

### 3.9 `Payment` refund fields — nest them
Currently flat: `refundId`, `refundStatus`, `refundAmount`, `refundReason`, `refundedAt`.

**Proposal:**
```
refund: { id, status, amount, reason, refundedAt } | null
```
Makes `paymentDoc.refund?.status` a clean check. Also drop the inline `index: true` on `studentId` / `tutorId` / `bookingId` — they're already covered by later compound indexes (lines 9, 15, 20 in `models/Payment.js`).

### 3.10 Route consolidation — optional
`trial-bookings`, `session-bookings`, `permanent-bookings`, `dedicated-bookings` are four category-specific mounts that all delegate to the same controller under the hood (`controllers/scopedBooking.factory.js`). Plus the legacy `/api/bookings`.

**Proposal (low priority):** keep the category-specific mounts (they're a convenient surface for clients), but explicitly mark `/api/bookings` as legacy in OpenAPI once a spec exists, and remove uses from the client one by one. Delete the file once zero references remain.

### 3.11 Server bootstrap hardening
- `process.on('unhandledRejection')` and `process.on('uncaughtException')` handlers that log + exit gracefully (no wrapping `require`s in try/catch the way we do today in `server.js` — that masks real load-time errors).
- Move the 404 handler’s `methodMismatch` map into a route-aware 404 middleware that reads the mounted routers' actual methods instead of a hard-coded list (which is already out of date).

### 3.12 Observability gap
Today we only `console.log`. For any serious deployment add one of: pino + pino-pretty in dev, Sentry / OpenTelemetry in prod. Not urgent — but worth calling out, since every fix we make above will want log visibility to verify.

---

## Migration playbook

When we're ready to apply 3.1–3.10:

1. **Freeze** production writes on the affected collections.
2. **Run the migration script** from `scripts/` (one file per proposal, idempotent, with `--dry-run`).
3. **Deploy** the updated model + controller simultaneously. Double-writing intermediate states is not required for any proposal in this doc — each is a simple field collapse or extract.
4. **Verify** via `scripts/verify-*.js` counters (should match pre-migration totals).
5. **Unfreeze** writes.

Every proposal above is a single PR. None of them depend on each other. Pick by urgency.
