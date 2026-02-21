# Parent Features – Done & Visible Checklist

This document maps each of your parent-experience requirements to the app and states whether it’s **done and visible**, **partial**, or **not done**.

---

## 1. "A simple visual dashboard that shows Learning time, tutors and current subjects, upcoming sessions, recent activity highlights"

| Item | Status | Where it’s visible |
|------|--------|--------------------|
| **Learning time** | Done | **Student Dashboard** – under the welcome text: “Learning time: X hrs total” (or minutes). Shown when the student has at least one attendance record. |
| **Tutors and current subjects** | Done | **Student Dashboard** – “Your tutors” section (cards with tutor name, subject, grade). **My Tutors** tab has the full list. |
| **Upcoming sessions** | Done | **Student Dashboard** – “Next class” card (tutor, subject, date/time, View/Join). Action required and recent activity also reference upcoming. |
| **Recent activity highlights** | Done | **Student Dashboard** – “Recent activity” section (up to 7 items: upcoming, action needed, verify attendance, pending requests, last completed). |

**Verdict: Done and visible.**

---

## 2. "Searching for right tutor – parent should have access to view the tutors ratings and reviews, basically the whole profile of the tutor"

| Item | Status | Where it’s visible |
|------|--------|--------------------|
| **Find tutors** | Done | **Find Tutors** page (search/browse). |
| **Ratings and reviews** | Done | **Tutor Profile** page – rating stars, “(X reviews)”, and a reviews list with rating, comment, and date. |
| **Whole profile** | Done | **Tutor Profile** page – bio, subjects, classes, experience, rate, Trust & Safety (verification), About, Expertise, full reviews. |

**Verdict: Done and visible.**

---

## 3. "Notifications and alerts – Demo bookings, Missed classes, Low engagement, Schedule updates, Admin alerts"

| Item | Status | Where it’s visible |
|------|--------|--------------------|
| **Demo bookings** | Done | **Navbar bell** – types `demo_booking_created`, `demo_accepted`, `demo_rejected` are in the model and shown in NotificationPanel. |
| **Missed classes** | Done | **Navbar bell** – type `session_missed` is sent (e.g. from session feedback) and has an icon in the panel. |
| **Low engagement** | Partial | **Not implemented.** `low_engagement` is not in the Notification model enum. Backend would need to define when to send it and add the type; then it would show in the same bell panel. |
| **Schedule updates** | Done | **Navbar bell** – type `schedule_updated` is in the model and has an icon in NotificationPanel. |
| **Admin alerts** | Done | **Navbar bell** – type `admin_alert` is sent from admin and attendance flows; panel has an icon for it. |

**Verdict: Done except “Low engagement” (needs backend + type).**

---

## 4. "Parents must approve schedule changes, subject additions, tutor Assign."

| Item | Status | Where it’s visible |
|------|--------|--------------------|
| **Schedule changes (reschedule)** | Done | **Sessions** tab → **BookingList** – when tutor sends a reschedule request, parent/student sees “Reschedule request …” and **Approve / Decline**. Same for **tutor change request** (schedule/subject/both). |
| **Subject additions** | Done | **Sessions** tab – tutor can propose a “subject” or “both” change via TutorChangeRequest; parent sees “New subject: …” and **Approve / Decline**. |
| **Tutor assign** | Partial | **Not a dedicated flow.** “Tutor assign” (e.g. admin assigning a tutor to a student) is not a separate approval step in the app. Schedule and subject changes are approved on existing bookings. If “tutor assign” means something else (e.g. first-time assign), that would need a new flow. |

**Verdict: Schedule and subject approval done and visible; “tutor assign” approval not implemented as a separate feature.**

---

## 5. "Weekly progress reports – Topics covered, Child engagement, Tutor comments (5 mins chat with parents…), improvement areas. Class summary after every session if parents are interested."

| Item | Status | Where it’s visible |
|------|--------|--------------------|
| **Topics covered** | Done | **Progress** tab → **Weekly Progress Report** – session cards show “Topics covered” in expanded view. **Session details** modal also shows topics from session feedback. |
| **Child engagement / understanding** | Done | **Weekly Progress Report** – “Understanding” score (1–5) and label (e.g. “Good”, “Excellent”). Session details show understanding score. |
| **Tutor comments / summary** | Done | **Weekly Progress Report** – “Session Summary” (tutor’s summary). Session details modal shows tutor summary and notes. |
| **Improvement areas** | Done | **Weekly Progress Report** – “Next steps” in expanded session card. Session feedback has `nextSteps`. |
| **5 mins chat with parents** | Process only | Not an in-app feature; can be part of tutor/parent process. Optional: add a short line in UI (e.g. “We recommend a brief check-in with the parent.”). |
| **Class summary after every session** | Done | **Session details** modal and **Weekly Progress Report** both show per-session summary (tutor summary, topics, next steps). Tutor submits this after the session. |

**Verdict: All report/summary features are done and visible; “5 mins chat” is a process point, not a built feature.**

---

## 6. "Tutors attendance verification by the parent"

| Item | Status | Where it’s visible |
|------|--------|--------------------|
| **Parent verifies attendance** | Done | **Sessions** tab → open a session → **Session details** modal – after tutor marks attendance, parent sees “Confirm attendance” with **Yes, confirm** and **Dispute** (with note). |
| **Visibility of unverified** | Done | **Progress** tab – banner: “X sessions awaiting your confirmation” with **Review now** → Sessions. **Dashboard** – “Action required” shows “X sessions need your verification” and **Verify now**. |

**Verdict: Done and visible.**

---

## 7. "Fee transparency – cost per class, monthly payments, weekly"

| Item | Status | Where it’s visible |
|------|--------|--------------------|
| **Cost per class** | Done | **My Tutors** tab → **Fee Transparency** – sessions listed with tutor rate; “Estimated Cost” uses tutor hourly rate; per-session cost is clear from rate and list. |
| **Weekly / monthly (and more)** | Done | **Fee Transparency** – period filter: **This Week**, **This Month**, **This Year**, **All Time**. Total classes and estimated cost for selected period. |
| **Payment status** | Done | Same section – paid/unpaid (e.g. “Paid” count and session-level status where applicable). |

**Verdict: Done and visible.**

---

## 8. "Parents can provide structured feedback, request tutor change, escalate issues to admin"

| Item | Status | Where it’s visible |
|------|--------|--------------------|
| **Structured feedback** | Done | **My Tutors** tab → **Share Feedback** – category (Teaching quality, Punctuality, Communication, Child engagement, Progress), star rating, comment. Submits as review and can optionally request tutor change. |
| **Request tutor change** | Done | **Share Feedback** – “Request tutor change” checkbox and reason; sends notification to admin. |
| **Escalate to admin** | Done | **Safety** tab – **Report Issue** (escalation): type (e.g. no-show, payment dispute, misconduct, safety concern), description. Submissions go to admin. |

**Verdict: Done and visible.**

---

## 9. "Safety and verification signals – parents can view tutors ID, admin approval history"

| Item | Status | Where it’s visible |
|------|--------|--------------------|
| **Verification signals** | Done | **Tutor Profile** (when searching) – “Trust & Safety”: “Verified by TutNet”, “Identity confirmed”, “Qualifications reviewed”, “Profile completeness checked”, “Safe to book”. “Last reviewed &lt;date&gt;” (admin review). |
| **Tutor reference ID** | Done | **Tutor Profile** – “Reference ID” (e.g. tutorCode) when approved. |
| **View tutor ID (document)** | Partial | **Not implemented.** Profile shows “Identity confirmed” and “Last reviewed” but no actual ID document view. Adding “View verification details” or “ID verified on &lt;date&gt;” would meet this fully. |
| **Admin approval history** | Partial | **Done in spirit** – “Last reviewed &lt;date&gt;” and “Verification in progress” show admin involvement. A full “approval history” list is not implemented. |

**Verdict: Verification and approval signals are visible; explicit “view ID” and full “approval history” are not.**

---

## 10. "Emergency contacts"

| Item | Status | Where it’s visible |
|------|--------|--------------------|
| **Store emergency contact** | Done | **Profile** tab – **StudentProfileForm**: Emergency Contact (name, relationship, phone). |
| **See on Safety** | Done | **Safety** tab – **Emergency contact** block (read-only) with **Edit in Profile** / **Add in Profile** so it’s visible in a safety context. |

**Verdict: Done and visible.**

---

## Summary

| # | Feature | Status |
|---|---------|--------|
| 1 | Dashboard (learning time, tutors, subjects, upcoming, recent activity) | Done and visible |
| 2 | Tutor search + full profile + ratings & reviews | Done and visible |
| 3 | Notifications (demo, missed, schedule, admin) | Done; **Low engagement** not implemented |
| 4 | Parent approves schedule & subject changes | Done; **Tutor assign** approval not a separate flow |
| 5 | Weekly progress (topics, engagement, tutor comments, improvement, class summary) | Done and visible |
| 6 | Parent attendance verification | Done and visible |
| 7 | Fee transparency (per class, weekly/monthly) | Done and visible |
| 8 | Structured feedback, tutor change request, escalate to admin | Done and visible |
| 9 | Safety & verification (signals, reference ID, last reviewed) | Done; **View ID document** and full **approval history** not implemented |
| 10 | Emergency contacts | Done and visible |

**Overall:** Most features are **done and visible**. Gaps: (1) **Low engagement** notification type, (2) **Tutor assign** approval flow (if you mean a dedicated “assign tutor” step), (3) **View tutor ID** (document) and full **admin approval history** on the tutor profile.
