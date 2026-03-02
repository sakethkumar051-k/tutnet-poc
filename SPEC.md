# TutNet – Project Specification

## 1. Overview

**TutNet** (Tutnet) is a tutoring platform that connects students with tutors. It supports one-off sessions, trial/demo sessions, and permanent tutor engagements, with role-based dashboards for students, tutors, and admins.

| Attribute | Detail |
|-----------|--------|
| **Project type** | Monorepo (single repo, multiple apps) |
| **Repository structure** | `client/` (frontend), `server/` (backend) |
| **Frontend** | React 18, Vite 7, React Router 6, Tailwind CSS, Axios |
| **Backend** | Node.js, Express 4, MongoDB (Mongoose 8), JWT, Passport (Google OAuth) |

---

## 2. User Roles & Access

| Role | Description | Main entry |
|------|--------------|------------|
| **Student** | Discovers tutors, books sessions/demos/permanent engagements, manages profile and sessions | `/student-dashboard`, `/find-tutors`, `/tutor/:id` |
| **Tutor** | Manages profile and availability, receives and approves/rejects booking requests, marks attendance, manages students | `/tutor-dashboard` |
| **Admin** | Platform oversight, tutor approval, analytics, escalations | `/admin-dashboard` (via `/admin-login`) |

- Auth: **JWT** (Bearer token in `Authorization` header); optional **Google OAuth**.
- Routes are protected by role; `ProtectedRoute` restricts pages by `allowedRoles`.

---

## 3. Core Features

### 3.1 Authentication & Profile

- **Register**: Email/password or Google; role selection (student/tutor). Tutors and students with incomplete data are sent to `/complete-profile`.
- **Login**: Email/password or Google; login response includes full user (e.g. `location`, `classGrade`, `emergencyContact` for students).
- **Profile**:
  - **Student**: Name, phone, class/grade, location (area, city, pincode), emergency contact. Stored via `PUT /api/auth/profile`; client updates form from response and calls `refreshUser()` so global state is up to date.
  - **Tutor**: Profile and availability managed via profile/onboarding and tutor-specific APIs (e.g. `TutorProfile`, availability).

### 3.2 Tutor Discovery & Booking

- **Find tutors**: Search/filter tutors; view tutor profile (`/tutor/:id`).
- **Booking types** (unified under `Booking` with `bookingCategory`):
  - **Trial/Demo**: Demo sessions; limited per student (e.g. demo limit).
  - **Session**: One-off or regular sessions with date/time.
  - **Permanent**: Long-term engagement; requires preferred start date, terms accepted; tutor approval; optional fields (subjects, frequency, learning goals, etc.). Recurring session generation after approval is optional/future.
- **Availability**: Students can book only within tutor-defined slots. Backend validates `sessionDate` against tutor `weeklyAvailability` or legacy `availableSlots`. Past dates are rejected (frontend and backend).

### 3.3 Requests & Approvals

- **Requests hub** (student and tutor dashboards): Central list of pending items.
  - **Student**: Demo requests, permanent requests, reschedule requests (tutor-requested changes); can approve/decline.
  - **Tutor**: Session requests, demo requests, permanent requests; can approve/reject; can approve/decline student reschedule requests.
- **Reschedule**: Student or tutor can request reschedule; other party approves/declines. Reschedule UI is shown only when a request exists, session is approved, and session is not completed.

### 3.4 Sessions & Attendance

- **Session lifecycle**: Pending → Approved/Rejected → Completed/Cancelled.
- **Attendance**:
  - Marked only during the session or up to **12 hours** after session end.
  - After 12 hours, tutor must raise an attendance request; admin approval required (model supports `requestedAfterWindow`, `adminApproved`; admin approval endpoint is optional/future).
  - Upcoming sessions do not show attendance marking.
  - States: Upcoming, Completed – Pending attendance, Present, Absent.
- **Session reminders**: Backend job runs periodically (e.g. every 30 minutes) to send reminders (e.g. 24h and 1h before session).

### 3.5 Other Capabilities

- **Current tutors / My students**: Linking of students to current tutors.
- **Reviews**: Students can leave reviews for tutors.
- **Favorites**: Students can favorite tutors.
- **Progress reports & session feedback**: Tutors/students can submit feedback; progress reports per student/tutor.
- **Study materials**: Materials associated with learning.
- **Messages**: Messaging between users (routes and controllers present).
- **Notifications**: In-app notifications (e.g. booking requests, reminders).
- **Payments, escalations, incentives, learning goals, platform analytics**: Routes and models exist; behavior is implementation-dependent.

---

## 4. API Overview

Base path: `/api`. All authenticated endpoints use `Authorization: Bearer <token>` unless stated otherwise.

| Area | Prefix | Purpose |
|------|--------|---------|
| Auth | `/auth` | Register, login, `GET /me`, `PUT /profile`, Google OAuth, forgot/reset password, admin verify |
| Admin | `/admin` | Admin-only actions, tutor approval, analytics |
| Tutors | `/tutors` | List/search tutors, tutor profile, `GET /profile-by-user/:userId` for availability |
| Bookings | `/bookings` | CRUD bookings, `GET /requests` for request hub |
| Reviews | `/reviews` | Create/list reviews |
| Favorites | `/favorites` | Student favorites |
| Progress reports | `/progress-reports` | Progress report CRUD |
| Attendance | `/attendance` | Mark attendance (within 12h window rules) |
| Current tutors | `/current-tutors` | Student’s tutors, tutor’s students |
| Session feedback | `/session-feedback` | Tutor/student feedback for bookings |
| Study materials | `/study-materials` | Study material CRUD |
| Messages | `/messages` | Messaging |
| Notifications | `/notifications` | Notifications |
| Payments | `/payments` | Payment-related |
| Escalations | `/escalations` | Escalation handling |
| Incentives | `/incentives` | Incentives |
| Jobs | `/jobs` | Job triggers (e.g. reminders) |
| Learning goals | `/goals` | Learning goals |
| Platform analytics | `/analytics` | Analytics |

- **Health**: `GET /api/health` (no auth) returns status and DB connection state.

---

## 5. Data Models (summary)

| Model | Purpose |
|-------|--------|
| **User** | All users; role (student/tutor/admin); auth (local/Google); location; classGrade, emergencyContact (students); demosUsed, demoLimit (students). |
| **TutorProfile** | Linked to User; subjects, classes, hourlyRate, experienceYears, bio, mode, languages, availableSlots, weeklyAvailability, education, qualifications, approvalStatus. |
| **Booking** | studentId, tutorId, subject, preferredSchedule, sessionDate, bookingCategory (trial/session/permanent), status, attendanceStatus; trial fields; rescheduleRequest; tutorChangeRequest; permanent fields (preferredStartDate, subjects, frequency, learningGoals, termsAccepted, etc.). |
| **Attendance** | Booking-linked; status (present/absent); markedAt; requestedAfterWindow, adminApproved for late marking. |
| **CurrentTutor** | Student–tutor current relationship. |
| **Review** | Student reviews for tutors. |
| **Favorite** | Student favorite tutors. |
| **SessionFeedback** | Feedback for a booking (tutor/student). |
| **ProgressReport** | Progress reports. |
| **StudyMaterial** | Study materials. |
| **Message** | Messaging. |
| **Notification** | In-app notifications. |
| **Payment** | Payments. |
| **Escalation** | Escalation records. |
| **LearningGoal** | Learning goals. |

---

## 6. Frontend Structure

- **Router**: React Router 6; public routes (Home, Login, Register, About, Contact, Admin Login, OAuth success, Complete profile); protected routes by role (student, tutor, admin).
- **Context**: Auth (user, login, register, logout, refreshUser), Toast, Notifications.
- **Key pages**: Home, Login, Register, CompleteProfile, StudentDashboard, TutorDashboard, AdminDashboard, FindTutors, TutorProfilePage, SessionsPage, OAuthSuccess, About, Contact.
- **Key components**: SessionCalendar (availability-aware booking), BookingList, RequestsHub, SessionDetailsModal, StudentProfileForm, TutorProfileForm, RescheduleModal, TutorChangeRequestModal, Navbar, Sidebar, ProtectedRoute, etc.
- **API client**: Axios instance with base URL from `VITE_API_URL` (default `http://localhost:5001/api`); token attached in request interceptor.

---

## 7. Backend Structure

- **Server**: Express; CORS, JSON body, morgan; session + Passport for OAuth; JWT for API auth.
- **DB**: MongoDB via Mongoose; connection non-blocking (server starts even if DB fails).
- **Auth middleware**: Protects routes; attaches `req.user` from JWT.
- **Routes**: Mounted under `/api/*`; 404 handler returns JSON with hints; central error handler (error middleware).
- **Jobs**: Session reminders run on an interval (e.g. every 30 minutes).

---

## 8. Security & Validation

- **Secrets**: JWT secret, DB URI, session secret, OAuth credentials, admin secret come from environment variables (e.g. `.env`); not committed.
- **Auth**: Protected routes require valid JWT and correct role where applicable.
- **Booking**: Past dates rejected; session/trial booking validated against tutor availability.
- **Attendance**: Only within allowed time window; no auto-present for future sessions.
- **Profile**: Full user returned on login and from `GET /auth/me`; profile update returns full user (minus password) and new token when applicable.

---

## 9. Deployment & Run

- **Frontend**: Build with `vite build` (in `client/`); can be served statically (e.g. Vercel). Default dev: Vite dev server (e.g. port 5173).
- **Backend**: `node server.js` or `nodemon server.js` in `server/`; default port 5000 (or `PORT` env).
- **Env**: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, `SESSION_SECRET`, Google OAuth client ID/secret, `ADMIN_SECRET` (if used), etc.
- **CORS**: Configured for localhost, Vercel app, and Vercel preview patterns.

---

## 10. References

- **Booking & attendance refactor**: `BOOKING_REFACTOR_SUMMARY.md`
- **Admin login**: `ADMIN_LOGIN_FIX.md` (if present)
- **API collection**: `Tutnet_API_Collection.postman_collection.json` (if present)

This spec reflects the codebase as of the last review. For exact request/response shapes and error codes, refer to the route files and controllers under `server/routes/` and `server/controllers/`.
