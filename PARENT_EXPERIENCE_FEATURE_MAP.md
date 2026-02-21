# Parent Experience – Feature Map & Plan

This document maps your TUTNET spreadsheet (parents experience) to the current app and lists what’s **already there**, **partially there**, and **missing** so you can plan what to add and where.

---

## Where parents see the product

There is no separate “Parent” role in the app. **Parents use the same account as the student** (Student Dashboard). So “parents experience” = everything visible under **Student** (Dashboard, Sessions, My Tutors, Progress, Messages, Resources, Safety, Profile).

---

## 1. Already in the app (and where to find them)

| Spreadsheet feature | Priority | Where it lives | How to see it |
|---------------------|----------|----------------|----------------|
| **Parent Dashboard** (learning time, tutors, subjects, upcoming, activity) | P0 | **Student Dashboard** tab | Dashboard: Next Class, Alerts, Attendance, Your Tutors, Learning Insights, Quick Actions |
| **Tutor profiles & reviews** | P0 | Find Tutors → tutor card → **Tutor Profile** page | Search tutors; open profile for ratings, reviews, full profile |
| **Notifications & alerts** | P0 | **Navbar** (bell icon) | Demo bookings, missed classes, schedule updates, booking approved/rejected; panel opens from bell |
| **Weekly progress & session summaries** | P1 | **Progress** tab | StudentProgressDashboard, WeeklyProgressReport, session-by-session log; session notes in **Sessions** → session details |
| **Tutor attendance verification by parent** | P0 | **Sessions** → open a session → **Session Details** modal; **Progress** tab banner | After tutor marks attendance, parent can “Yes, confirm” or “Dispute” with a note; Progress shows “X sessions awaiting your confirmation” |
| **Fee transparency** | P1 | **My Tutors** tab | FeeTransparency: cost per session, period filter (week/month/year), paid status |
| **Feedback, tutor change, escalation** | P1 | **My Tutors** tab (Share Feedback); **Safety** tab | ParentFeedbackPanel: rating + comment + “Request tutor change” (sends to admin); SafetyPanel: report/escalate to admin |
| **Safety & verification signals** | P0 | **Tutor Profile** (when searching); **Safety** tab | TutorProfilePage: “Trust & Safety” (Verified by TutNet, identity/qualifications); SafetyPanel: conduct rules + report |
| **Schedule / reschedule approval** | P1/P2 | **Sessions** (BookingList) | Parent/student can approve/decline tutor’s reschedule request on the booking |
| **Emergency contacts** | P2 | **Profile** tab | StudentProfileForm: Emergency Contact (name, relationship, phone) |

---

## 2. Partially there or not obvious on the dashboard

| Feature | Gap | Recommendation |
|---------|-----|----------------|
| **Parent Dashboard – “Learning time”** | No dedicated “learning time” (e.g. hours this week/month). | Add a small “Learning time” metric to the dashboard (e.g. from attendance duration or session count × session length). |
| **Parent Dashboard – “Recent activity highlights”** | No single “recent activity” feed (e.g. “Class completed with X”, “Attendance verified”, “New session booked”). | Add a “Recent activity” card on the dashboard (last 5–7 events from bookings + attendance + notifications). |
| **Notifications – “Low engagement” & “Admin alerts”** | Notification types exist for booking/session/schedule; “low engagement” and explicit “admin alert” may not be wired. | Confirm backend sends these; show them in existing NotificationPanel. |
| **Schedule / tutor management – “Parent approves subject additions, tutor assign”** | Reschedule approval is there; **subject additions** and **tutor assign** (e.g. admin assigns a new tutor) may have no approval flow. | Define: when can a subject be added / tutor assigned, and who approves? Add approval step (e.g. on Dashboard or Sessions) if needed. |
| **Weekly progress – “5 mins chat with parents”** | No in-app “parent chat” or reminder. | Keep as process for tutors; optionally add a short line in Weekly Progress or session summary: “We recommend a short check-in with the parent.” |
| **Safety – “Parents can view tutor ID, admin approval history”** | Tutor profile shows “Verified by TutNet” and “Identity confirmed”, not “View ID” or “Admin approval history”. | Optional: add “Verification details” (e.g. “ID verified on …”, “Last admin review …”) on TutorProfilePage for parents. |
| **Emergency contacts** | Data is in Profile only; not surfaced in Safety or dashboard. | Add a small “Emergency contact” block on Safety tab or dashboard so it’s easy to see/update. |

---

## 3. Not in the app (from the sheet)

| Feature | Priority | Suggestion |
|--------|----------|------------|
| **Dedicated “Parent view” or role** | — | Optional. Right now parent = student account. If you want a separate parent login (e.g. multiple children), that would be a larger change (roles, linking child accounts). |
| **Explicit “Admin alerts” to parent** | P0 (under Notifications) | Ensure backend creates notifications for admin-initiated alerts and that they appear in NotificationPanel. |
| **Approval flows for “tutor assign” and “subject addition”** | P1/P2 | Design: who triggers (admin/tutor), then add a “Pending your approval” section (e.g. on Dashboard or My Tutors) with Approve/Decline. |

---

## 4. How to plan: what to do first

### Option A – Minimal change (everything discoverable)

- **Don’t add new pages.** Keep current structure.
- **Add a “Parent guide” or “Where to find things”** (e.g. Help in sidebar, or a one-time tooltip):  
  “Attendance verification → Sessions → open a session → Confirm or dispute. Feedback & tutor change → My Tutors → Share Feedback. Reports → Progress.”
- **Optional:** Add “Learning time” and “Recent activity” to the **Dashboard** so it matches the sheet’s “simple visual dashboard” more closely.

### Option B – Make parent features obvious on the dashboard

1. **Dashboard**
   - Add **Learning time** (e.g. “X hours this month” from attendance/sessions).
   - Add **Recent activity** (last 5–7 items: session completed, attendance verified, booking approved, etc.).
   - Keep or slightly rename sections so “Attendance” and “Verify attendance” are clearly for parents (e.g. “Attendance & your verification”).

2. **Alerts**
   - Ensure **Pending approvals** (reschedule, and later tutor assign / subject add) are visible on the dashboard (you already have pending bookings).
   - Add a single **“Action required”** block: “Reschedule request from [Tutor]” or “Confirm attendance for [Session]” with primary CTA.

3. **Safety**
   - Surface **Emergency contact** on the Safety tab (read-only + link to Profile to edit).
   - Optional: “Verification details” for current tutors (e.g. “ID verified”, “Last reviewed”) from tutor profile data.

4. **My Tutors**
   - No structural change; keep Fee Transparency and Share Feedback here. Optionally add a line: “Request tutor change or escalate in Safety.”

### Option C – Backend-first for missing behaviour

1. **Notifications**
   - Implement or confirm **low_engagement** and **admin_alert** notification types; show them in the existing panel.

2. **Approvals**
   - Implement **tutor assign** and **subject addition** approval (backend + “Pending approval” on Dashboard or My Tutors).

3. **Learning time**
   - Expose duration (or session count) from attendance/bookings so the dashboard can show “Learning time”.

---

## 5. Suggested order of work

| Order | Task | Effort | Impact |
|-------|------|--------|--------|
| 1 | Add **Recent activity** (and optionally **Learning time**) to Student Dashboard | Small | High – dashboard matches “parent dashboard” from sheet |
| 2 | Add **“Action required”** block: reschedule + attendance verification links | Small | High – parents see what needs approval |
| 3 | Surface **Emergency contact** on Safety tab | Small | Medium – safety positioning |
| 4 | Confirm **admin alerts** and **low engagement** notifications in backend + UI | Medium | High for trust |
| 5 | Add **tutor assign / subject addition** approval flow (if needed) | Medium | Depends on product need |
| 6 | Optional: **Verification details** (ID / admin review) on tutor profile | Small | Nice-to-have for trust |

---

## 6. Quick reference: where each feature is

| Parent need | Tab / place | Component / page |
|-------------|-------------|-------------------|
| See overview, next class, attendance | Dashboard | StudentDashboard (refactored) |
| Approve/decline reschedule | Sessions | BookingList, RescheduleModal |
| Verify or dispute attendance | Sessions → session details | SessionDetailsModal (parent verify) |
| See unverified attendance | Progress | StudentProgressDashboard (banner) |
| Fee and payment status | My Tutors | FeeTransparency |
| Give feedback / request tutor change | My Tutors | ParentFeedbackPanel |
| Report / escalate | Safety | SafetyPanel |
| Weekly progress & session log | Progress | StudentProgressDashboard, WeeklyProgressReport |
| Emergency contact | Profile | StudentProfileForm |
| Notifications | Navbar (bell) | NotificationPanel |
| Tutor verification & safety | Find Tutors → tutor profile | TutorProfilePage (Trust & Safety) |

---

You already have most parent-facing features; they’re just spread across **Dashboard**, **Sessions**, **My Tutors**, **Progress**, **Safety**, and **Profile**. The biggest wins are: (1) making “action required” (reschedule + attendance) obvious on the dashboard, and (2) adding a small “Recent activity” (and optionally “Learning time”) so the dashboard feels like the “simple visual dashboard” from your sheet without changing routing or business logic.
