# TutNet — Targeted Audit: BE hygiene, FE↔BE integration, booking reloads & Zustand

> Date: 2026-04-18
> Scope: Fresh verification against the code today. Focused on polling anti-patterns, backend practices, missing UX data, FE↔BE contract gaps, and the booking-reload / Zustand problem.
> Complements the existing: [AUDIT.md](AUDIT.md), [client/AUDIT.md](client/AUDIT.md), [server/AUDIT.md](server/AUDIT.md).

---

## 1. Polling — the biggest concrete waste right now

Verified still-active polling in the client:

| File | Interval | Endpoint | Problem |
|------|----------|----------|---------|
| [SessionsPage.jsx:31](client/src/pages/SessionsPage.jsx#L31) | 5 min | `/bookings/mine` | Every student/tutor with the tab open refetches ALL their bookings every 5 min. Full document list, no `since=` param. |
| [TodaysSessions.jsx:20](client/src/components/TodaysSessions.jsx#L20) | 5 min | `/bookings/mine` (second copy) | Mounted alongside SessionsPage → 2× the traffic from one user. |
| [NotificationCenter.jsx:28](client/src/components/NotificationCenter.jsx#L28) | 30 s | `/notifications` | Fetches **full list** on each poll, not `/unread-count`. ~120 req/hour per logged-in user. |
| [MessagingPanel.jsx:71](client/src/components/MessagingPanel.jsx#L71) | **5 s** | `/messages/:userId` | Most expensive. 720 req/hour *per open chat*. Will cost real money at scale. |

### Fix priority (low effort → high return)

1. `NotificationCenter` → replace with the existing [notificationStore.js](client/src/stores/notificationStore.js) (it already exists and is unused here — dead duplication). Poll only `/unread-count`; fetch the full list only when the dropdown opens.
2. `MessagingPanel` 5 s → move to Socket.IO. Until then, 10–15 s with a `?since=<lastMessageTimestamp>` query param so the BE returns a delta, not the whole conversation.
3. `SessionsPage` + `TodaysSessions` both polling the same endpoint is the classic deduplication problem → solve via a shared Zustand booking store (see §4) or TanStack Query.

---

## 2. Backend — verified anti-patterns

### Critical / cheap to fix

- **Booking controller is 1,198 lines** ([booking.controller.js](server/controllers/booking.controller.js)). Single file handles all 4 categories × 12 actions. Split by lifecycle verb (create / transition / query), not by category.
- **No `compression`, no `helmet`** on [server.js](server/server.js). Literally two `app.use()` lines — 60–80% payload reduction and security headers for free.
- **No graceful shutdown.** `SIGTERM` kills in-flight DB writes. Add `process.on('SIGTERM', …)` to close mongoose + drain the HTTP server.
- **Rate limit is global only** and disabled in dev ([server.js:55](server/server.js#L55)). `/auth/login`, `/auth/register`, `/payments/*` need their own limiters (e.g. 10/15min).
- **`express.json()` has no body limit** → add `{ limit: '100kb' }` (payments webhook already uses raw, unaffected).

### Data integrity

- **No MongoDB transactions** on booking create. `createBooking` writes Booking + Notification + potentially increments `User.demosUsed` in separate calls — a mid-flow error drifts `demosUsed` forever. Wrap in `mongoose.startSession()` + `withTransaction()`.
- **[trialExpiry.job.js](server/jobs/trialExpiry.job.js) silently cancels** via `updateMany` with no notification to the user. If a student's trial auto-expires, the next poll just shows "cancelled" with no explanation. Replace with a per-doc loop that creates a notification, or run a second pass that notifies cancelled trials. Also no distributed lock → runs N times in a multi-instance deploy.
- **[sessionReminders.js](server/jobs/sessionReminders.js) only writes in-app notifications.** Zero value if the user isn't on the platform. Needs email (SendGrid/SES) or FCM push to actually be a "reminder."
- **Denormalized counters** (`TutorProfile.averageRating`, `User.demosUsed`, `CurrentTutor.sessionsCompleted`) — no reconciliation job. These *will* drift.

### Query hygiene

- Most controllers don't use `.lean()` for read-only queries (~50% memory reduction).
- No `.select()` projections — full documents, including fields the client doesn't use.
- `User` queries in multiple places don't consistently `.select('-password')` — rely on a `toJSON` transform on the model instead of per-query.

---

## 3. Additional data to capture for better UX

What's missing from the current schemas/responses that would unlock real UX wins:

| Gap | Capture | UX win |
|-----|---------|--------|
| No `lastSeenAt` on `User` | Add field, bump on any authed request | Show "Active now" / "Last seen 2h ago" on tutor cards & chat |
| No `typingStatus` or `messageReadAt` | Add `readAt` to Message | Chat read receipts — makes polling feel less stale |
| No `joinedSessionAt` / `leftSessionAt` on Booking | Two timestamps | Real attendance proof, auto-duration, dispute resolution |
| No `sessionJoinUrl` | Add field on Booking | Zoom/Meet deep link — currently no way to actually attend online sessions |
| No `cancellationReason` / `cancelledBy` | Add two fields | Show student *why* a trial auto-expired vs tutor rejection |
| No `viewedByTutorAt` on pending bookings | Timestamp | Student knows "tutor saw your request 10 min ago" vs "not yet viewed" |
| No `priceLockedAt` on Booking | Snapshot `hourlyRate` at booking time | Rate changes don't retroactively affect pending bookings |
| No `searchAppearances` on TutorProfile | Counter | Power the tutor-side "you appeared in 47 searches this week" analytics |
| Weak `emergencyContact` (bare string) | → `{name, phone, relationship}` | Safety feature for parents |
| No `preferences` on User | `{reminderChannels:[email,sms,push], reminderLeadTimes:[24h,1h]}` | Users control their reminder experience |
| No `timezone` on User | IANA string | Cross-timezone tutors — currently implicit IST |
| No `parentContact` linked to Student | Parent user link | Enables the already-planned parent-verification flow |
| No `deviceTokens` | Array on User | Push notifications |

---

---

## 6. Suggested execution order (2-week sprint shape)

### Week 1 — cheap wins

- Add `helmet`, `compression`, body limit, graceful shutdown. *(2 hrs)*
- Add `/unread-count` polling in `NotificationCenter`, kill full-list polling. *(1 hr)*
- Delete duplicate `NotificationCenter` logic → use `notificationStore`. *(2 hrs)*
- Create `bookingStore`, migrate `SessionsPage` + `TodaysSessions`. *(1 day)*
- Add `?since=` param to `/notifications` + `/messages`. *(4 hrs)*
- Wrap `createBooking` in a Mongoose transaction. *(3 hrs)*

### Week 2 — structural

- Migrate remaining 10 consumers of `/bookings/mine` to the store. *(2 days)*
- Standardize error envelope + client interceptor. *(1 day)*
- Add per-route rate limiting for auth & payments. *(2 hrs)*
- Introduce Socket.IO for booking status + new messages — replace `MessagingPanel` 5 s polling. *(2 days)*

### Later (bigger lifts)

- Schema additions for `lastSeenAt`, `readAt`, `joinedSessionAt`, `cancellationReason`, user `preferences`, `timezone`.
- Email + FCM for reminders (makes `sessionReminders.js` actually useful).
- Refresh tokens + move JWT off localStorage.

---

## 7. TL;DR

| # | Priority | Action |
|---|----------|--------|
| 1 | 🔴 | Kill `MessagingPanel` 5-second polling — replace with Socket.IO or 15s + `?since=` |
| 2 | 🔴 | Create `bookingStore`, collapse 12 duplicate fetches into one source of truth |
| 3 | 🔴 | Wrap `createBooking` in a Mongoose transaction |
| 4 | 🟡 | Delete the duplicate `NotificationCenter` — use existing `notificationStore` |
| 5 | 🟡 | Add `helmet` + `compression` + body limit + graceful shutdown |
| 6 | 🟡 | Standard error envelope end-to-end |
| 7 | 🟡 | Capture `cancellationReason`, `joinedSessionAt`, `sessionJoinUrl`, user `preferences`/`timezone` |
| 8 | 🟢 | Per-route rate limiting (auth, payments) |
| 9 | 🟢 | `?since=` deltas on list endpoints |
| 10 | 🟢 | Pagination on `/tutors` before it gets painful |
