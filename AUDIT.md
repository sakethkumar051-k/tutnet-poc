# TutNet Platform — Full-Stack Audit

> Audit Date: 2026-04-10
> Scope: End-to-end UX flows, client-server integration, architecture, best practices
> Detailed audits: [client/AUDIT.md](client/AUDIT.md) | [server/AUDIT.md](server/AUDIT.md)

---

## EXECUTIVE SUMMARY

TutNet is a tutoring marketplace with **3 user roles** (Student, Tutor, Admin), **4 booking types** (Trial, Session, Dedicated, Permanent), **Razorpay payments**, and **Google OAuth**. The codebase is functional and well-organized at a high level, but has significant gaps in **data consistency**, **real-time communication**, **scalability**, and **testing** that must be addressed before production launch.

### Scorecard

| Area | Score | Key Gap |
|------|-------|---------|
| UX Flow Completeness | 7/10 | Missing onboarding, password reset UI, real-time updates |
| API Design | 6/10 | No pagination, no versioning, no standard response envelope |
| State Management | 5/10 | No query caching, stale data across tabs, no optimistic updates |
| Security | 6/10 | JWT in localStorage, no refresh tokens, no input sanitization middleware |
| Performance | 5/10 | No code splitting, no compression, no lean queries, in-memory cache |
| Testing | 1/10 | Zero tests on both client and server |
| Error Handling | 5/10 | Generic 500s on server, inconsistent client-side extraction |
| Data Integrity | 5/10 | No transactions, denormalized counters can drift |
| Production Readiness | 4/10 | Missing health checks, graceful shutdown, monitoring, logging |

---

## 1. END-TO-END UX FLOW ANALYSIS

### 1.1 Student Journey: Discovery → Booking → Session → Review

```
┌─────────────┐    ┌──────────────┐    ┌───────────────┐    ┌──────────────┐
│  Register /  │───▶│  Complete    │───▶│  Find Tutors  │───▶│  View Tutor  │
│  Login       │    │  Profile     │    │  (Search/     │    │  Profile     │
│              │    │              │    │   Filter)     │    │              │
└─────────────┘    └──────────────┘    └───────────────┘    └──────┬───────┘
                                                                   │
                                          ┌────────────────────────┼────────────────────────┐
                                          ▼                        ▼                        ▼
                                   ┌──────────────┐    ┌───────────────┐    ┌───────────────────┐
                                   │  Book Trial   │    │  Book Session  │    │  Request Dedicated │
                                   │  (Free Demo)  │    │  (One-time)    │    │  Tutor             │
                                   └──────┬───────┘    └───────┬───────┘    └─────────┬─────────┘
                                          │                    │                      │
                                          ▼                    ▼                      ▼
                                   ┌─────────────────────────────────────────────────────────┐
                                   │                  TUTOR APPROVES / REJECTS               │
                                   └────────────────────────────┬────────────────────────────┘
                                                                │
                                                                ▼
                                   ┌──────────────┐    ┌───────────────┐    ┌──────────────┐
                                   │  Pay via      │───▶│  Attend       │───▶│  Leave       │
                                   │  Razorpay     │    │  Session      │    │  Review      │
                                   └──────────────┘    └───────────────┘    └──────────────┘
```

**Integration Gaps in This Flow:**

| Step | Client Action | Server Endpoint | Gap |
|------|---------------|-----------------|-----|
| Register | `POST /auth/register` | Creates User + TutorProfile (if tutor) | No email verification |
| Complete Profile | `PUT /auth/profile` | Updates User fields | No validation that all required fields are actually saved |
| Find Tutors | `GET /tutors?filters` | Returns filtered list | No pagination — all results at once |
| Book Trial | `POST /trial-bookings` | Creates Booking with `bookingCategory: 'trial'` | Client polls for status update (5min); tutor has no push notification |
| Tutor Approves | `PATCH /trial-bookings/:id/approve` | Updates status to `approved` | Student notification created, but only visible on next poll/page load |
| Payment | `POST /payments/create-order` → Razorpay → `POST /payments/verify` | Creates Payment record | Payment mock mode may mask issues in dev→prod transition |
| Attend Session | No explicit "join" action | No join link/URL support | **Missing feature:** no video call integration for online sessions |
| Leave Review | `POST /reviews` | Creates Review, updates tutor rating | One review per booking — no edit/delete capability |

### 1.2 Tutor Journey: Onboarding → Approval → Teaching → Earnings

```
┌──────────────┐    ┌──────────────┐    ┌───────────────┐    ┌──────────────┐
│  Register    │───▶│  Complete    │───▶│  Submit for   │───▶│  ADMIN       │
│  as Tutor    │    │  Profile     │    │  Approval     │    │  REVIEWS     │
└──────────────┘    └──────────────┘    └───────────────┘    └──────┬───────┘
                                                                    │
                            ┌───────────────────────────────────────┤
                            ▼                                       ▼
                     ┌──────────────┐                        ┌──────────────┐
                     │  REJECTED    │                        │  APPROVED    │
                     │  (Fix & Re-  │                        │  (tutorCode  │
                     │   submit)    │                        │   assigned)  │
                     └──────────────┘                        └──────┬───────┘
                                                                    │
                                                                    ▼
                     ┌──────────────┐    ┌───────────────┐    ┌──────────────┐
                     │  Set Weekly  │───▶│  Receive &    │───▶│  Conduct     │
                     │  Availability│    │  Approve      │    │  Session     │
                     └──────────────┘    │  Bookings     │    └──────┬───────┘
                                         └───────────────┘           │
                                                                     ▼
                                         ┌───────────────┐    ┌──────────────┐
                                         │  Mark         │───▶│  View        │
                                         │  Attendance   │    │  Earnings    │
                                         └───────────────┘    └──────────────┘
```

**Integration Gaps:**

| Step | Gap |
|------|-----|
| Profile Completion | `profileCompletionScore` is computed on server but not clearly surfaced to tutor as a progress indicator on client |
| Approval Wait | No estimated wait time, no queue position, no notification when approved (notification is created but no email/push) |
| Set Availability | `WeeklySchedulePlanner` doesn't overlay existing bookings — tutor can't see conflicts |
| Receive Bookings | No push notification — tutor must check dashboard manually |
| Mark Attendance | 12-hour window after session; late marking needs admin approval, but admin has no UI alert for pending approvals |
| Earnings | Shows amount earned but no payout schedule, no bank account setup, no withdrawal flow |

### 1.3 Admin Journey: Oversight & Management

```
┌──────────────┐    ┌──────────────────────────────────────────────┐
│  Admin Login │───▶│  Admin Dashboard                             │
│  (Separate)  │    │  ├── Approve/Reject Tutors                   │
└──────────────┘    │  ├── Approve/Reject Bookings                 │
                    │  ├── View Analytics                          │
                    │  ├── Manage Users                            │
                    │  ├── Cross-check Attendance                  │
                    │  ├── Identify At-Risk Patterns               │
                    │  ├── Mass Communication                      │
                    │  └── Send Alerts                             │
                    └──────────────────────────────────────────────┘
```

**Integration Gaps:**

| Feature | Gap |
|---------|-----|
| Tutor Approval | No bulk approve/reject — admin processes one at a time |
| Booking Approval | Admin can approve bookings, but it's unclear when this is needed vs. tutor approval |
| Analytics | Server endpoints exist but limited client UI for data visualization |
| At-Risk Patterns | Server computes patterns but no automated alerts to admin |
| Mass Communication | Creates notifications only — no email delivery |

---

## 2. CLIENT-SERVER INTEGRATION AUDIT

### 2.1 State Synchronization Issues

| Scenario | Problem | Impact |
|----------|---------|--------|
| Booking approved by tutor | Student's dashboard shows stale data until 5-min poll | Student misses time-sensitive session confirmations |
| New message sent | Recipient doesn't see it until they open Messages tab and it polls | Messages feel broken — users expect instant delivery |
| Trial expired by cron job | Student's booking list still shows it as "pending" until next fetch | Confusing UX — student thinks they have an active booking |
| Tutor updates availability | Student viewing tutor profile sees old availability | Could book a slot that no longer exists |
| Payment completed via Razorpay | Booking `isPaid` flag updated via webhook, but client doesn't know | Student may not see payment confirmation immediately |

**Root Cause:** No real-time communication layer. The entire app relies on polling and manual refresh.

**Recommendation:** Implement Socket.IO or Server-Sent Events for:
- Booking status changes (approved, rejected, cancelled)
- New messages
- Payment confirmations
- Session reminders (15min, 5min before)
- Tutor availability changes

### 2.2 API Contract Mismatches

| Client Expects | Server Returns | Issue |
|----------------|----------------|-------|
| Consistent error shape | Varies: `{ message }`, `{ error }`, `{ message, code }` | Client has multiple error extraction patterns |
| Paginated tutor list | All tutors at once | Client does client-side sorting as a workaround |
| Notification polling | `NotificationContext` exists but disabled | Dead code on client, unused endpoints on server |
| `checkTutorProfileComplete()` | Returns completion status | Client utility function duplicates server-side logic — should trust server response |

### 2.3 Missing Client-Server Connections

| Feature | Server Endpoint | Client Implementation | Status |
|---------|----------------|----------------------|--------|
| Password Reset | `POST /auth/forgot-password`, `POST /auth/reset-password` | No UI pages | **Not connected** |
| Incentives | `GET /api/incentives/summary` | No visible UI | **Not connected** |
| Platform Analytics | `GET /api/analytics/platform` | Limited admin UI | **Partial** |
| Study Material Upload | `POST /api/study-materials` | Resources page exists | **Partial** |
| Learning Goals CRUD | Full CRUD at `/api/goals/*` | Progress page may not use all endpoints | **Partial** |
| Escalation Management | Full CRUD at `/api/escalations/*` | Safety page connects | **Connected** |
| Parent Attendance Verification | `PATCH /api/attendance/:id/parent-verify` | No parent role/UI | **Not connected** |
| Session Feedback Homework | Full CRUD in session-feedback | Limited UI exposure | **Partial** |

---

## 3. DATA FLOW INTEGRITY

### 3.1 Critical Data Flows

**Booking Creation Flow:**
```
Client                          Server                         Database
──────                          ──────                         ────────
POST /bookings                → Validate inputs              → Check trial limits
  { tutorId, subject,         → Check time conflicts         → Check existing bookings
    bookingCategory,          → Apply category rules         → Create Booking doc
    sessionDate, ... }        → Create notification          → Create Notification doc
                              → Return booking               → Update User.demosUsed (trial)
                              ←────────────────────────────────
```

**Issue:** No MongoDB transaction wraps this flow. If notification creation fails, the booking exists but the tutor isn't notified. If `demosUsed` increment fails, the counter drifts.

**Payment Flow:**
```
Client                    Server                    Razorpay              Database
──────                    ──────                    ────────              ────────
POST /payments/           → Create Razorpay order                       → Save Payment (status: created)
  create-order            ←──────────────────────
                          
Open Razorpay widget ────────────────────────────→ Process payment
                    ←────────────────────────────  Webhook to server
                                                   POST /payments/webhook
                          → Verify HMAC signature                       → Update Payment (completed)
                          → Update booking isPaid                       → Update Booking.isPaid
POST /payments/verify     → Verify signature
                          ←──────────────────────
```

**Issue:** The webhook and client verification can race. If the webhook arrives before the client calls `/verify`, the payment is already confirmed. If the client calls `/verify` first but the webhook fails, there's a discrepancy. Need to handle both paths idempotently.

### 3.2 Denormalized Data Risks

| Field | Source | Risk |
|-------|--------|------|
| `User.demosUsed` | Incremented on trial booking creation | Can drift if booking is cancelled but counter isn't decremented |
| `TutorProfile.averageRating` | Updated on review creation | Stale if reviews could be edited/deleted (no API for this currently) |
| `TutorProfile.totalReviews` | Updated on review creation | Same as above |
| `CurrentTutor.totalSessionsBooked` | Updated on booking creation | Can drift if booking is cancelled |
| `CurrentTutor.sessionsCompleted` | Updated on booking completion | Depends on tutor remembering to mark complete |
| `Notification.unreadCount` | Computed on fetch | Not stored — recomputed every time (this is actually fine) |

**Recommendation:** For counters that can drift, either:
1. Use MongoDB transactions to ensure atomicity, OR
2. Derive counts from source records (`Booking.countDocuments()`) instead of storing them, OR
3. Run a periodic reconciliation job to fix drifted counters

---

## 4. CROSS-CUTTING CONCERNS

### 4.1 Real-Time Communication (Critical Gap)

**Current State:** Polling only (5-min intervals for sessions, notifications disabled)

**Impact on User Experience:**
- Students don't know when a booking is approved until they check
- Messages feel non-interactive — more like email than chat
- Tutors miss booking requests — can't respond promptly
- Session reminders only work if the user is on the platform

**Recommendation:** Implement in phases:
1. **Phase 1:** Socket.IO for booking status changes + new messages
2. **Phase 2:** Push notifications (Firebase Cloud Messaging) for mobile/desktop
3. **Phase 3:** Email notifications for critical events (booking approved, payment received, session reminder)

### 4.2 Error Handling (End-to-End)

**Current Flow:**
```
Server error → Express error middleware → { message: 'Server error', status: 500 }
                                          ↓
Client receives → try/catch → err.response?.data?.message || 'Something went wrong'
                              ↓
User sees → Toast notification with generic error message
```

**Problems:**
1. Server collapses all errors to 500 — client can't distinguish validation errors from server crashes
2. Client has 3+ different error extraction patterns
3. No error correlation — can't trace a client error back to a server log entry
4. No user-actionable error messages (e.g., "Your session expired, please log in again")

**Recommended Architecture:**
```
Server:
- Custom error classes (ValidationError, NotFoundError, etc.)
- Error middleware maps class → HTTP status + structured response
- Every error gets a correlation ID
- Structured logging with correlation ID

Client:
- Axios interceptor extracts standard error shape
- Error class maps to user-facing message
- Correlation ID shown in error UI for support debugging
```

### 4.3 Authentication (End-to-End)

**Current Flow:**
```
Login → JWT (30-day) → localStorage → Axios interceptor adds to headers
                                       ↓
                        Token expires → 401 → Redirect to /login (data lost)
```

**Problems:**
1. 30-day token is too long — if stolen, attacker has month-long access
2. No refresh token — user loses session without warning
3. JWT in localStorage is accessible via XSS
4. No active session management — user can't see/revoke sessions
5. OAuth in-memory codes break in clustered deployments

**Recommended Architecture:**
```
Login → Access token (15min) + Refresh token (7-day, httpOnly cookie)
         ↓
Access token expires → Axios interceptor calls /auth/refresh
                       ↓
                       New access token returned → Retry original request
                       ↓
Refresh token expires → Redirect to login with clear message
```

### 4.4 Testing Strategy (Critical Gap)

**Current State:** Zero tests on either client or server.

**Risk:** Every deployment is a leap of faith. Booking lifecycle transitions, payment flows, and auth are complex enough that manual testing will miss edge cases.

**Recommended Test Pyramid:**

```
                    ┌───────────┐
                    │  E2E (5%) │  Cypress/Playwright: critical happy paths
                    ├───────────┤
                 ┌──┤ Integ    ││  Supertest: API endpoint contracts
                 │  │ (25%)    ││  React Testing Library: component integration
                 │  ├──────────┤│
              ┌──┤  │ Unit     │┤  Jest: services, utils, state transitions
              │  │  │ (70%)    ││  Vitest: React hooks, context providers
              │  │  └──────────┘│
              └──┴──────────────┘
```

**Priority Test Coverage:**
1. Booking state machine (all valid/invalid transitions)
2. Payment create → verify → webhook flow
3. Auth: register → login → token refresh → protected route access
4. Trial limits (max 3, max 2 per tutor, 48h expiry)
5. Role-based endpoint access (student vs tutor vs admin)

---

## 5. ARCHITECTURE RECOMMENDATIONS

### 5.1 Immediate (Before Launch)

| # | Action | Client | Server | Effort |
|---|--------|--------|--------|--------|
| 1 | Add pagination to all list endpoints | Implement infinite scroll / page controls | Add `skip`, `limit`, `total` to queries | Medium |
| 2 | Add input validation middleware | — | Joi/Zod schemas on all routes | Medium |
| 3 | Add error boundaries + structured errors | Error boundary component | Custom error classes | Medium |
| 4 | Add health check | — | `GET /api/health` | Small |
| 5 | Add Helmet.js + compression | — | Two middleware additions | Small |
| 6 | Fix JWT in localStorage | Move to httpOnly cookie | Set cookie on login response | Medium |
| 7 | Add MongoDB transactions | — | Wrap booking + payment flows | Medium |
| 8 | Add code splitting | `React.lazy()` on routes | — | Small |
| 9 | Add password reset UI | New pages | Endpoints exist | Small |
| 10 | Add search debouncing | `useDebouncedCallback` | — | Small |

### 5.2 Short-Term (Post-Launch Sprint)

| # | Action | Details | Effort |
|---|--------|---------|--------|
| 11 | Implement Socket.IO | Real-time booking updates + messages | Large |
| 12 | Add TanStack Query | Replace raw useEffect fetching with cached queries | Large |
| 13 | Add refresh tokens | Short-lived access + long-lived refresh | Medium |
| 14 | Add test suite | Jest + Supertest + Vitest + RTL | Large |
| 15 | Add structured logging | Winston/Pino on server | Medium |
| 16 | Consolidate booking routes | Merge 4 files into 1 | Medium |
| 17 | Add email notifications | SendGrid/SES for reminders + status updates | Medium |
| 18 | Add API versioning | `/api/v1/` prefix | Small |
| 19 | Standardize response envelope | `{ success, data, meta, error }` | Medium |
| 20 | Move cache to Redis | Replace in-memory Map + OAuth codes | Medium |

### 5.3 Long-Term (Platform Maturity)

| # | Action | Details |
|---|--------|---------|
| 21 | Migrate to TypeScript | Both client and server |
| 22 | Add video call integration | Zoom/Google Meet/Daily.co for online sessions |
| 23 | Add push notifications | Firebase Cloud Messaging |
| 24 | Add Swagger/OpenAPI docs | Auto-generated from route schemas |
| 25 | Add monitoring + alerting | Sentry + Datadog/New Relic |
| 26 | Add data archival | Move old bookings to archive collection |
| 27 | Add CI/CD pipeline | GitHub Actions: lint + test + deploy |
| 28 | Add rate limiting per route | Stricter for auth, relaxed for reads |
| 29 | Add A/B testing infra | For tutor matching algorithm |
| 30 | Add analytics events | Track user behavior for UX optimization |

---

## 6. RISK MATRIX

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Data inconsistency (no transactions) | High | High | Add MongoDB transactions to critical flows |
| Token theft (XSS + localStorage) | Medium | Critical | Move to httpOnly cookies |
| Missed bookings (no real-time) | High | High | Add Socket.IO / push notifications |
| Performance degradation (no pagination) | High | Medium | Add server-side pagination |
| Deployment breaks (no tests) | High | High | Add test suite + CI |
| Payment discrepancy (race conditions) | Low | Critical | Idempotent webhook processing |
| Admin secret leaked | Medium | Critical | Replace with invite-based admin creation |
| Server crash (no error boundaries) | Medium | High | Add error boundaries (client) + uncaughtException handler (server) |
| Memory leak (in-memory cache + cron) | Medium | Medium | Move to Redis, separate worker process |

---

## 7. SUMMARY

TutNet has a **solid functional foundation** — the core booking, payment, and matching flows work end-to-end. The MVC architecture is clean, the component hierarchy is logical, and the role-based system covers the three user types well.

The **critical gaps** are:

1. **No real-time communication** — the #1 UX blocker. A tutoring platform where messages and booking updates are delayed by 5+ minutes will frustrate both students and tutors.

2. **No data integrity guarantees** — multi-document operations without transactions mean edge cases will cause inconsistent state.

3. **No testing** — the booking state machine alone has enough complexity to warrant automated tests. Manual testing will miss edge cases.

4. **Security basics missing** — JWT in localStorage, no refresh tokens, no input sanitization middleware, no Helmet.js.

5. **No pagination** — will cause performance issues as soon as the user base grows beyond a few hundred.

Addressing items 1-5 should be the priority before any feature work. The platform's value proposition (connecting students with quality tutors) depends on trust, which requires reliability, security, and responsiveness.

---

*Detailed breakdowns available in:*
- **Client audit:** [client/AUDIT.md](client/AUDIT.md) — UX flows, state management, component architecture
- **Server audit:** [server/AUDIT.md](server/AUDIT.md) — API design, database schemas, security, performance
