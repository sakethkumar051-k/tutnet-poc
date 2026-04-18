# TutNet Client-Side Audit

> Audit Date: 2026-04-10
> Scope: UX Flow, State Management, API Integration, Best Practices

---

## 1. UX FLOW AUDIT

### 1.1 Authentication Flow

| Step | Page | Status | Issues |
|------|------|--------|--------|
| Register | `/register` | Functional | Role selection (student/tutor) is clear |
| Login | `/login` | Functional | Google OAuth + email/password supported |
| OAuth Redirect | `/oauth-success` | Functional | One-time code exchange pattern is solid |
| Profile Completion | `/complete-profile` | Functional | Enforced via ProtectedRoute |

**Issues Found:**
- **No email verification flow.** Users can register with any email and immediately access the platform. This is a trust/safety gap for a tutoring marketplace.
- **OAuth users default to `student` role.** There's no role selection during Google OAuth signup — a tutor signing up via Google must change role later, but there's no clear UI path for this.
- **Password reset flow exists on server but no UI page** for `/forgot-password` or `/reset-password` on the client. Users who forget passwords have no recovery path in the UI.
- **No "remember me" option.** Token is always stored in localStorage with 30-day expiry, which is a fixed behavior.
- **Session expiry is silent.** When a token expires, the user is redirected to `/login` without a clear message explaining why they were logged out.

### 1.2 Tutor Finder Flow (Student-Facing)

| Step | Component | Status | Issues |
|------|-----------|--------|--------|
| Browse tutors | `FindTutors.jsx` → `TutorSearch.jsx` + `TutorList.jsx` | Functional | Multi-filter search |
| View tutor | `TutorProfilePage.jsx` | Functional | Shows reviews, subjects, availability |
| Book demo | `RequestDemoModal.jsx` | Functional | Max 3 demos enforced |
| Book session | `RegularBookingModal.jsx` | Functional | Single session booking |
| Book dedicated | `DedicatedTutorModal.jsx` | Functional | Recurring subscription |
| Add favorite | `TutorCard.jsx` | Functional | Heart toggle |

**Issues Found:**
- **No search debouncing.** Every filter change in `TutorSearch.jsx` triggers an immediate API call. Rapid filter changes (e.g., dragging a price slider) will flood the server.
- **Client-side sorting only.** `TutorList.jsx` sorts results client-side (lines 94-101), which won't scale beyond ~100 tutors. Server-side sorting with pagination is needed.
- **No pagination.** The tutor list loads all matching tutors at once. For a marketplace with thousands of tutors, this will cause performance and UX issues.
- **"Best Match" sort is basic.** The sorting algorithm doesn't account for student preferences, location proximity, or learning goals — it's just a label without real matching logic.
- **No URL-based filter state.** Filters are local state only. Refreshing the page or sharing a link loses all applied filters. Filters should be serialized to URL query params.
- **No tutor comparison feature.** Students browsing multiple tutors have no way to compare them side-by-side.
- **Empty state for no results is generic.** When no tutors match filters, there's no guidance on broadening the search.

### 1.3 Student Dashboard Flow

| Tab | Component | Status | Issues |
|-----|-----------|--------|--------|
| Dashboard | `DashboardStats.jsx` + `NextSessionCard.jsx` | Functional | Overview stats |
| Sessions | `SessionsPage.jsx` | Functional | Calendar + list views |
| My Tutors | `MyTutorsPage.jsx` | Functional | Current + favorites + recommended |
| Progress | `ProgressPage.jsx` | Functional | Analytics |
| Messages | `MessagingPanel.jsx` | Functional | Chat interface |
| Resources | `ResourcesPage.jsx` | Functional | Study materials |
| Safety | `SafetyPage.jsx` | Functional | Escalation reporting |
| Profile | `ProfilePage.jsx` | Functional | Edit profile |

**Issues Found:**
- **No onboarding walkthrough.** New students land on a dashboard with zero sessions, zero tutors, and no guidance. A first-time experience guiding them to "Find Tutors" is missing.
- **5-minute polling for sessions** (`SessionsPage.jsx`) is too infrequent for a live session platform. If a tutor approves a booking, the student won't see it for up to 5 minutes.
- **Calendar view doesn't show time slots visually.** Sessions appear as list items on calendar dates rather than a proper time-grid calendar (like Google Calendar).
- **No quick re-book flow.** After completing a session with a tutor, there's no "Book Again" shortcut — student must navigate back to `FindTutors` or the tutor profile.
- **Messages have no real-time updates.** Polling-based only, no WebSocket integration. Messages feel laggy.
- **No session join link/button.** For online sessions, there's no integration with video call tools (Zoom, Google Meet). Students don't know how to join.

### 1.4 Tutor Dashboard Flow

| Tab | Component | Status | Issues |
|-----|-----------|--------|--------|
| Dashboard | `DashboardStats.jsx` | Functional | Overview |
| Sessions | `SessionsPage.jsx` | Functional | Manage classes |
| My Students | `MyStudentsPage.jsx` | Functional | Track relationships |
| Progress | `ProgressPage.jsx` | Functional | Student analytics |
| Schedule | `WeeklySchedulePlanner.jsx` | Functional | Availability slots |
| History & Earnings | `ClassHistoryTracker.jsx` + `EarningsDashboard.jsx` | Functional | Financial tracking |
| Messages | `MessagingPanel.jsx` | Functional | Chat |
| Resources | `ResourcesPage.jsx` | Functional | Upload materials |
| Safety | `SafetyPage.jsx` | Functional | Report issues |
| Profile | `ProfilePage.jsx` | Functional | Edit profile |

**Issues Found:**
- **Profile approval is a black box.** After submitting for approval, the tutor has no visibility into where they are in the queue, estimated wait time, or what might need fixing.
- **No notification sound or browser notification.** New booking requests are easy to miss — tutors rely on checking the dashboard.
- **Earnings dashboard lacks payout information.** Tutors can see what they've earned but there's no information about when/how they'll be paid.
- **Schedule planner doesn't show booked sessions overlaid.** When setting availability, the tutor can't see existing bookings, risking double-booking.
- **No "vacation mode" or temporary unavailability.** Tutors can't mark themselves as unavailable for a period without manually removing all availability slots.

### 1.5 Admin Dashboard Flow

**Issues Found:**
- **Separate login page** (`/admin-login`) creates friction and is discoverable. Consider a single login with role-based redirect.
- **No bulk actions.** Admin must approve/reject tutors one at a time. For a growing platform, bulk approve/reject is essential.
- **No audit trail UI.** While tutor approval history exists in the DB, there's limited UI to view the full audit trail.

---

## 2. STATE MANAGEMENT AUDIT

### 2.1 Context Architecture

| Context | Purpose | Verdict |
|---------|---------|---------|
| `AuthContext` | User auth state, login/logout | Adequate for current scale |
| `ToastContext` | Toast notifications | Functional but duplicated notification system |
| `NotificationContext` | In-app notifications | Disabled in Phase 1, placeholder |

**Issues Found:**
- **No global booking state.** Each component fetches bookings independently, leading to stale data across tabs. When a booking is approved on the Sessions tab, the Dashboard tab still shows the old count until refreshed.
- **No optimistic updates.** Actions like "Add to Favorites" wait for the server response before updating the UI. This makes the app feel slow on poor connections.
- **AuthContext stores user in both state AND localStorage.** On refresh, the decoded JWT is used briefly before `/auth/me` completes, causing a flash of potentially stale data.
- **Two notification systems coexist.** `ToastContext` has both "legacy simple toasts" and "rich notification toasts" — this should be unified.
- **No query caching or deduplication.** Multiple components may fetch the same endpoint simultaneously (e.g., tutor profile data). A library like React Query/TanStack Query would solve this.
- **NotificationContext is imported but disabled.** Dead code paths increase bundle size and confusion.

### 2.2 Data Fetching Patterns

**Current Pattern:** Raw `useEffect` + `useState` + `api.get/post`

**Problems:**
- No automatic retry on failure
- No stale-while-revalidate
- No request deduplication
- Loading/error states manually managed per component (boilerplate)
- No cache invalidation strategy

**Recommendation:** Migrate to TanStack Query (React Query) for:
- Automatic caching and background refetching
- Optimistic updates
- Request deduplication
- Built-in loading/error states
- Cache invalidation on mutations

---

## 3. API INTEGRATION AUDIT

### 3.1 Axios Configuration (`utils/api.js`)

**Good:**
- Request interceptor for auth token injection
- Response interceptor for 401 handling
- Environment-based base URL

**Issues:**
- **No request timeout configured.** If the server hangs, the client waits indefinitely. Add `timeout: 15000` (15s).
- **No retry logic.** Network blips cause immediate failure. Add retry for idempotent GET requests.
- **401 handler clears token on ANY 401**, including intentional unauthorized requests. This is overly aggressive.
- **No request cancellation.** When a component unmounts mid-request, the response callback still runs, potentially causing state updates on unmounted components (React warnings).
- **No offline detection.** The app doesn't inform users when they're offline — requests just fail silently.

### 3.2 Endpoint Usage Patterns

| Pattern | Count | Example |
|---------|-------|---------|
| GET requests | ~75 | `api.get('/bookings/mine')` |
| POST requests | ~32 | `api.post('/bookings', data)` |
| PATCH requests | ~23 | `api.patch('/bookings/:id/approve')` |
| PUT requests | ~4 | `api.put('/auth/profile', data)` |
| DELETE requests | ~4 | `api.delete('/favorites/:id')` |

**Issues:**
- **Inconsistent error message extraction.** Some components use `err.response?.data?.message`, others use `err.message`, and some use hardcoded fallbacks. Standardize this.
- **No API versioning on client side.** All calls go to `/api/*` without version prefix. When the API evolves, old clients will break.
- **Some endpoints are called but not consumed.** E.g., notification endpoints are wired up in `NotificationContext` but the context is disabled.

### 3.3 Authentication Token Handling

**Issues:**
- **JWT stored in localStorage is vulnerable to XSS.** If any script injection occurs, the token is exposed. Consider httpOnly cookies for token storage.
- **Token decode function** (AuthContext:8-20) manually parses JWT payload. Use a library like `jwt-decode` for reliability.
- **60-second early expiry buffer** is too short. If a request is in-flight when the token expires, it will get a 401 mid-operation.
- **No refresh token mechanism.** When the access token expires, the user must log in again. A refresh token flow would provide seamless re-authentication.

---

## 4. BEST PRACTICES AUDIT

### 4.1 Performance

| Issue | Severity | Location |
|-------|----------|----------|
| No code splitting / lazy loading | High | `App.jsx` — all pages imported eagerly |
| No image optimization | Medium | Tutor profile pictures loaded at full size |
| No virtual scrolling for long lists | Medium | `TutorList.jsx`, `BookingList.jsx` |
| Bundle includes disabled features | Low | NotificationContext, unused components |
| No service worker / PWA support | Low | Entire app |

**Recommendations:**
- Use `React.lazy()` + `Suspense` for route-level code splitting
- Implement image lazy loading with `loading="lazy"` or `IntersectionObserver`
- Add virtual scrolling for lists that can grow beyond 50 items
- Tree-shake disabled features behind build flags

### 4.2 Accessibility (a11y)

| Issue | Severity | Location |
|-------|----------|----------|
| Modal focus trapping may be incomplete | High | Custom modals (booking modals) |
| No skip navigation link | Medium | `AppLayout.jsx` |
| Color contrast not verified | Medium | Custom Tailwind theme |
| No ARIA labels on icon-only buttons | Medium | Sidebar icons, action buttons |
| No keyboard navigation for tutor cards | Medium | `TutorCard.jsx` |
| No screen reader announcements for toasts | Medium | `ToastContext.jsx` |

**Recommendations:**
- Use Radix UI Dialog (already in dependencies) for all modals to get focus trapping
- Add `aria-label` to all icon-only buttons
- Add `role="alert"` to toast containers
- Test with screen reader and keyboard-only navigation

### 4.3 Security

| Issue | Severity | Location |
|-------|----------|----------|
| JWT in localStorage (XSS risk) | High | `AuthContext.jsx` |
| No CSP headers configured | Medium | Vite config |
| No input sanitization on client | Medium | Form components |
| Google OAuth client ID may be in bundle | Low | Environment variable |

### 4.4 Code Quality

| Issue | Severity | Location |
|-------|----------|----------|
| No TypeScript — all `.jsx` files | Medium | Entire codebase |
| No unit tests | High | No test files found |
| No E2E tests | High | No test config found |
| Inconsistent component patterns | Low | Mix of named/default exports |
| Large components (300+ lines) | Low | `TutorCard.jsx`, `CompleteProfile.jsx` |
| No error boundaries | Medium | `App.jsx` |

### 4.5 Mobile Responsiveness

| Issue | Severity | Location |
|-------|----------|----------|
| Dashboard sidebar not collapsible on mobile | High | `Sidebar.jsx` |
| Tutor search filters take too much screen space on mobile | Medium | `TutorSearch.jsx` |
| Modal sizing not optimized for mobile | Medium | Booking modals |
| No bottom navigation for mobile dashboards | Medium | Dashboard layout |

---

## 5. PRIORITY RECOMMENDATIONS

### Critical (Do First)
1. **Add React Query / TanStack Query** — eliminates stale data, manual loading states, and request duplication across the app
2. **Implement route-level code splitting** — `React.lazy()` for all page components
3. **Add error boundaries** — prevent white screen crashes
4. **Fix search debouncing** in TutorSearch to prevent API flooding
5. **Add pagination** to tutor list and booking lists

### High Priority
6. **Add password reset UI** (pages exist on server but not client)
7. **Implement first-time onboarding flow** for new students
8. **Add WebSocket support** for messages and notifications (or at minimum reduce polling interval)
9. **Unify toast notification system** — remove legacy toast, keep rich notifications
10. **Add request timeout and cancellation** to Axios config

### Medium Priority
11. **Persist tutor search filters to URL params** for shareability
12. **Add optimistic updates** for favorites, booking actions
13. **Implement proper calendar view** with time grid for sessions
14. **Add "Book Again" shortcut** after completed sessions
15. **Add tutor availability overlay** on schedule planner

### Nice to Have
16. **Migrate to TypeScript** for type safety
17. **Add comprehensive test suite** (unit + E2E)
18. **Implement PWA** with offline support
19. **Add video call integration** for online sessions
20. **Add tutor comparison feature**

---

## 6. COMPONENT DEPENDENCY MAP

```
App.jsx
├── AppLayout (Navbar + Footer)
│   ├── Home.jsx
│   ├── FindTutors.jsx
│   │   ├── TutorSearch.jsx (filters)
│   │   └── TutorList.jsx
│   │       └── TutorCard.jsx
│   │           ├── RequestDemoModal
│   │           ├── RegularBookingModal
│   │           └── DedicatedTutorModal
│   ├── TutorProfilePage.jsx
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── OAuthSuccess.jsx
│   ├── CompleteProfile.jsx
│   ├── About.jsx
│   └── Contact.jsx
│
├── DashboardLayout
│   ├── StudentDashboard.jsx
│   │   ├── Sidebar.jsx (student tabs)
│   │   ├── DashboardStats.jsx
│   │   ├── SessionsPage.jsx
│   │   │   ├── SessionTile.jsx
│   │   │   ├── SessionDetailsModal
│   │   │   └── NextSessionCard.jsx
│   │   ├── MyTutorsPage.jsx
│   │   ├── ProgressPage.jsx
│   │   ├── MessagingPanel.jsx
│   │   ├── ResourcesPage.jsx
│   │   ├── SafetyPage.jsx
│   │   └── ProfilePage.jsx
│   │
│   ├── TutorDashboard.jsx
│   │   ├── Sidebar.jsx (tutor tabs)
│   │   ├── DashboardStats.jsx
│   │   ├── SessionsPage.jsx
│   │   ├── MyStudentsPage.jsx
│   │   ├── ProgressPage.jsx
│   │   ├── WeeklySchedulePlanner.jsx
│   │   ├── ClassHistoryTracker.jsx
│   │   ├── EarningsDashboard.jsx
│   │   ├── MessagingPanel.jsx
│   │   ├── ResourcesPage.jsx
│   │   ├── SafetyPage.jsx
│   │   └── ProfilePage.jsx
│   │
│   └── AdminDashboard.jsx
│
├── Contexts
│   ├── AuthContext (user state, login/logout)
│   ├── ToastContext (notifications UI)
│   └── NotificationContext (disabled)
│
└── Shared
    ├── ProtectedRoute.jsx
    ├── LoadingSpinner.jsx
    ├── LoadingSkeleton.jsx
    ├── EmptyState.jsx
    └── ui/* (Radix wrappers)
```
