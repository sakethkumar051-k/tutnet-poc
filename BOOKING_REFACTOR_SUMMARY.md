# Booking, Session, Attendance & Requests Refactor – Summary

This document summarizes what was implemented. Existing schemas were extended where needed; no breaking changes to existing APIs or data.

---

## 1. Availability & slot booking

**Backend**
- **Past date block:** `POST /api/bookings` returns `400` with code `PAST_DATE` if `sessionDate` is in the past.
- **Tutor availability check:** For student-created `session` or `trial` bookings with a `sessionDate`, the server checks that the date/time falls within the tutor’s `weeklyAvailability` or legacy `availableSlots`. If not, returns `400` with code `OUTSIDE_AVAILABILITY`.
- **Helper:** `isWithinTutorAvailability(tutorProfile, dateTime)` in `server/controllers/booking.controller.js` (uses `DAY_NAMES`, `weeklyAvailability`, and `availableSlots`).

**Frontend**
- **SessionCalendar:**
  - For students, fetches tutor availability via `GET /api/tutors/profile-by-user/:userId` and only shows time slots that match the tutor’s availability for the selected day.
  - Past dates are disabled in the calendar; past dates cannot be selected.
  - Before submit, validates that the chosen date/time is not in the past and shows an error if it is.

**New API**
- `GET /api/tutors/profile-by-user/:userId` – returns tutor profile (including `weeklyAvailability`, `availableSlots`) for use when booking. Used by the calendar to restrict bookable slots.

---

## 2. Permanent tutor booking (partial)

**Schema**
- **Booking model** extended with:
  - `bookingCategory: 'permanent'` (in addition to `trial`, `session`).
  - Optional: `preferredStartDate`, `subjects[]`, `frequency`, `durationCommitment`, `learningGoals`, `studyGoals`, `currentLevel`, `focusAreas`, `additionalNotes`, `termsAccepted`, `parentBookingId` (for future recurring-session linkage).

**Backend**
- **Create booking:** When `bookingCategory === 'permanent'`:
  - `preferredStartDate` is required and must be in the future.
  - `termsAccepted === true` is required.
  - Status is `pending`; tutor must approve.
- **Notifications:** Tutor gets “New Permanent Engagement Request!” when a student submits a permanent request.

**Not implemented (optional follow-up)**
- Dedicated “Permanent engagement” booking form in the UI (multi-subject, start date, frequency, goals, T&C checkbox).
- Auto-creation of recurring sessions after tutor approval (job or approval handler that creates child bookings from the permanent engagement).
- Visual distinction for permanent bookings in lists (e.g. badge or filter).

---

## 3. Session requests & approval hub

**Backend**
- **GET /api/bookings/requests** (protected):
  - **Student:** returns `demoRequests`, `permanentRequests`, `rescheduleRequests` (bookings where `tutorChangeRequest.status === 'pending'`), and `allPending`.
  - **Tutor:** returns `sessionRequests`, `demoRequests`, `permanentRequests`, and `allPending`.

**Frontend**
- **RequestsHub** (`client/src/components/RequestsHub.jsx`):
  - Calls `GET /api/bookings/requests` and shows a list of pending items with status badges and timestamps.
  - **Student:** Approve/Decline for tutor change (reschedule) requests.
  - **Tutor:** Approve/Reject for session, demo, and permanent requests; Approve/Decline for student reschedule requests.
- **Dashboards:** RequestsHub is rendered on both **Student** and **Tutor** dashboards (main tab) with a “View all sessions” link that switches to the Sessions tab.

---

## 4. Attendance system

**Backend**
- **Time window:** Attendance may be marked only:
  - During the session, or
  - Up to **12 hours** after the session end (`sessionDate + duration`).
- If the request is outside this window, the API returns `400` with code `ATTENDANCE_WINDOW_EXPIRED` and message asking the tutor to raise an attendance request for admin approval.
- **No auto-present:** The handler uses the `status` sent in the body (default `'present'` only when a status is not provided); no automatic “present” for past sessions.
- **Upcoming:** Mark attendance is rejected if `sessionDate` is in the future.
- **Attendance model** extended with: `markedAt`, `requestedAfterWindow`, `adminApproved`, `adminApprovedBy`, `adminApprovedAt` for a future “after 12h” flow (e.g. admin approval endpoint).

**Frontend**
- **SessionDetailsModal:**
  - Post-session checklist (Mark Attendance, Write Summary, etc.) is shown only when the session is **not** upcoming (`session.sessionDate <= now`).
  - “Mark Attendance” form is shown only when the session is not upcoming (`session.sessionDate <= new Date()`).

---

## 5. Reschedule logic

**Frontend (BookingList)**
- **Student:** Reschedule button is shown only when the booking is **approved**, **not completed**, and there is no pending reschedule (or the previous one was declined). “Reschedule pending” is shown only when a request exists and is pending.
- **Tutor change (student side):** The “Your tutor requested a change” block and Approve/Decline are shown only when the booking is approved, not completed, and `tutorChangeRequest.status === 'pending'`.
- **Tutor:** Reschedule response (Approve/Decline for student’s request) is shown only when a reschedule request exists. “Request Change” and “Change pending” are shown only for approved, not completed, sessions. Completed sessions show only “View Session”.

---

## 6. Registration & profile

**Registration**
- **Success state:** After a successful register call, the UI shows a short success screen (“Account created successfully”, “Redirecting you…”) and then redirects after 1.2s to `/complete-profile` or `/student-dashboard`. This avoids redirect loops and gives clear feedback.
- **Redirect logic:** Tutor → `/complete-profile`; student → `/complete-profile` if missing phone or location, else `/student-dashboard`.

**Emergency contact**
- Schema and API were already in place: `User.emergencyContact` (name, relationship, phone), and `PUT /api/auth/profile` updates it. No change required; SafetyPanel and StudentProfileForm already display and edit it.

---

## 7. Messaging access (not implemented)

- “Demo → limited chat; approved sessions → full chat; permanent → always enabled” was not implemented. Messaging remains as before. Can be added later by checking engagement type in the messaging route or component.

---

## 8. Booking form enhancement (not implemented)

- A single booking form was not refactored to include subject multi-select, preferred start date, study goals, current level, focus areas, T&C checkbox, or file upload. The existing SessionCalendar and other booking entry points are unchanged except for availability and past-date validation. Permanent booking fields exist in the API and can be used by a future “Permanent engagement” form.

---

## Files touched (summary)

**Server**
- `server/models/Booking.js` – `bookingCategory: 'permanent'`, permanent fields, `parentBookingId`.
- `server/models/Attendance.js` – `markedAt`, `requestedAfterWindow`, `adminApproved`, etc.
- `server/controllers/booking.controller.js` – availability helper, past-date and availability validation, permanent validation and create payload, `getBookingRequests`.
- `server/controllers/attendance.controller.js` – 12h window, no mark for upcoming, `requestedAfterWindow` handling.
- `server/controllers/tutor.controller.js` – `getTutorProfileByUserId`.
- `server/routes/booking.routes.js` – `GET /requests`, `getBookingRequests`.
- `server/routes/tutor.routes.js` – `GET /profile-by-user/:userId`, `getTutorProfileByUserId`.

**Client**
- `client/src/components/SessionCalendar.jsx` – tutor availability fetch, past dates disabled, slots filtered by availability, past-date validation on submit.
- `client/src/components/BookingList.jsx` – reschedule and tutor-change UI only when request exists and session is approved and not completed.
- `client/src/components/SessionDetailsModal.jsx` – Mark Attendance and post-session checklist only when session is not upcoming.
- `client/src/components/RequestsHub.jsx` – new component; uses `GET /api/bookings/requests`, status badges, approve/reject/decline.
- `client/src/pages/StudentDashboard.jsx` – RequestsHub added.
- `client/src/pages/TutorDashboard.jsx` – RequestsHub added.
- `client/src/pages/Register.jsx` – success state and delayed redirect.

Existing behavior is preserved except where explicitly overridden above (e.g. attendance window, reschedule visibility, registration redirect).
