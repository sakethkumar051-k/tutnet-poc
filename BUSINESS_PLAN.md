# TutNet — Business Plan & Strategy

**Version:** 1.0
**Date:** April 2026
**Owner:** Founding team
**Scope:** Grounded business plan synthesized from the actual TutNet codebase. Complements [BUSINESS_PLAN_SPEC.md](BUSINESS_PLAN_SPEC.md) (the forward-looking spec) with a reality-check: what is built, what monetizes today, and the strategy to turn built features into revenue.

---

## 1. Executive Summary

TutNet is a home + online tutoring marketplace targeting parents of Classes 1–12 students in **West Hyderabad** (Gachibowli, Kondapur, Narsingi, Tellapur, Miyapur, Kukatpally, Miyapur). Supply is sourced from nearby engineering colleges (JNTU, CBIT, Vasavi, CVR) and early-career educators.

**One-line pitch:** A verified, reviewed, and safety-first alternative to WhatsApp-group tutor referrals — with real attendance, real receipts, and a path to refunds when things go wrong.

**Business model:** Marketplace take rate of **22%** commission on tutor hourly fees, with a free trial-class funnel that converts into paid **single sessions** or long-term **dedicated** tutor engagements. Parents pay the platform; tutors are paid out on a weekly/monthly cadence.

**Why now:**
- Home tutoring in Hyderabad remains fragmented across WhatsApp groups, Justdial listings, and informal referrals — no one owns trust, receipts, or dispute resolution.
- Parents increasingly expect digital receipts, attendance visibility, and refund recourse (behaviors reinforced by food delivery and ride-hailing norms).
- Engineering college students near the target localities are a cheap, reliable supply pool that converts cash tutoring into a formal, reviewable engagement.

**Status today (what the product actually does):**
- Full student/tutor/admin roles, tutor approval workflow, 4 booking categories (trial, session, permanent, dedicated), Razorpay checkout, attendance, reviews, messaging, notifications, tutor incentives, escalation workflow — all working end-to-end in code.
- Gaps: anti-bypass chat moderation, automated tutor payouts, a deployed parent-verification flow, and GTM at any meaningful scale. These are the near-term bottlenecks, not product features.

**12-month plan:** grow from a cold start to ~800 active students at ₹20L/month GMV (~₹4.4L commission) by end of Year 1 via neighbourhood-led acquisition, campus tutor sourcing, and a tight anti-bypass playbook.

---

## 2. Product — What's Actually Built

This section maps the business plan to the codebase so execution, legal, and marketing decisions can be made with confidence that the capability already exists.

### 2.1 Roles

| Role | Capabilities | Key files |
|---|---|---|
| **Student / Parent** | Search tutors, request free trial, book paid single sessions, book dedicated tutors, pay via Razorpay, mark/dispute attendance, leave reviews, message tutors, track learning goals & homework, raise escalations | [client/src/pages/StudentDashboard.jsx](client/src/pages/StudentDashboard.jsx), [client/src/pages/SessionsPage.jsx](client/src/pages/SessionsPage.jsx), [client/src/components/FeeTransparency.jsx](client/src/components/FeeTransparency.jsx) |
| **Tutor** | Profile with admin approval, subjects/classes/rate/availability, approve-reject bookings, post-session feedback (summary, topics, homework, materials), incentives dashboard with tier + milestone bonuses | [client/src/pages/TutorDashboard.jsx](client/src/pages/TutorDashboard.jsx), [client/src/components/TutorProfileForm.jsx](client/src/components/TutorProfileForm.jsx), [server/controllers/incentive.controller.js](server/controllers/incentive.controller.js) |
| **Admin** | Approve/reject tutors (with audit trail + auto-generated `TUT-XXXX` code), handle escalations, view analytics | [server/controllers/admin.controller.js](server/controllers/admin.controller.js), [client/src/pages/AdminDashboard.jsx](client/src/pages/AdminDashboard.jsx) |

### 2.2 Booking model (the core SKU)

One `Booking` schema drives four productized SKUs, each with distinct pricing, commitment, and funnel behavior:

| SKU | `bookingCategory` | Price to parent | Purpose in funnel |
|---|---|---|---|
| **Free trial** | `trial` | ₹0 | Top-of-funnel. Auto-expires in 48h if tutor doesn't approve. Outcome tracked: `converted` / `not_interested` / `no_show`. Cap: 3 per student (`User.demoLimit`). |
| **Single session** | `session` | Tutor's hourly rate × duration (via Razorpay) | Low-commitment paid try. |
| **Dedicated / Permanent** | `dedicated` / `permanent` | Tutor hourly rate × schedule × months | High-LTV long-term engagement. Weekly schedule, multi-month commitment, terms acceptance required. |

See [server/models/Booking.js](server/models/Booking.js) and the booking controller split under [server/controllers/booking/](server/controllers/booking/).

**Why this matters commercially:** trial → session → dedicated is a genuine funnel, not just three unrelated products. The 48h trial expiry and the 3-per-student demo cap force users out of tire-kicking into a paid decision — this is the conversion lever, and it's already wired.

### 2.3 Trust & safety primitives (built)

- **Tutor approval workflow** with status (`draft → pending → approved/rejected`) and full audit trail of admin reviewer + timestamp + note ([server/models/TutorProfile.js](server/models/TutorProfile.js)).
- **Parent / student attendance verification**: tutor marks attendance, parent can dispute within a window, admin reviews disputes ([server/controllers/attendance.controller.js](server/controllers/attendance.controller.js)).
- **Escalation system** with typed complaints: `misconduct, payment_dispute, no_show, harassment, safety_concern, other` ([server/controllers/escalation.controller.js](server/controllers/escalation.controller.js)).
- **Review system** per booking (1–5 stars + comments, averaged onto tutor profile).
- **Free trial before any payment** — a critical trust primitive for first-time parents.

### 2.4 Monetization primitives (built)

- **Razorpay** orders + webhook signature verification + mock mode for dev ([server/controllers/payment.controller.js](server/controllers/payment.controller.js)).
- **Locked hourly rate** on every booking (`Booking.lockedHourlyRate`) — prevents mid-engagement rate disputes.
- **FeeTransparency** dashboard showing paid/pending/refunded sessions, tutor-wise breakdown, and period filters ([client/src/components/FeeTransparency.jsx](client/src/components/FeeTransparency.jsx)).
- **Tutor incentive tiers** (Bronze/Silver/Gold/Elite) and **milestone bonuses** (first session ₹100, 10 sessions ₹250, 50 sessions ₹500, perfect rating ₹200, 30-day streak ₹175, etc.) — a retention lever for supply side.

### 2.5 Operational automation (built)

- **Cron jobs** every 10–15 min: auto-cancel expired trials (48h rule), auto-cancel pending sessions whose date has passed, send 24h + 1h session reminders via in-app + email + FCM ([server/jobs/](server/jobs/)).
- **Weekly counter reconciliation** (Monday 04:00) to rebuild denormalized ratings / demo counts / session counters — important for data integrity as volumes grow.
- **Socket.IO** for booking-state sync (JWT-auth'd, user-scoped rooms).

### 2.6 What is NOT built (and blocks monetization at scale)

These are not product wishlist items — they are the next-quarter execution list:

1. **Anti-bypass controls in chat** — no regex/keyword filtering for phone numbers, UPI IDs, WhatsApp / Telegram handles, or obfuscated digits. No "Report Off-Platform Request" button. No tutor risk score. This is the single biggest revenue leak.
2. **Automated tutor payouts** — today a manual process. At >50 tutors this breaks without a scheduled payout + ledger SOP.
3. **Parent-linked accounts** — schema allows parent verification of attendance, but there is no `parentContact` linkage from student → guardian record. Until this is wired, "parent verification" is effectively student self-verification.
4. **Session join URL** — online sessions have no `sessionJoinUrl` field on Booking. Online mode is bookable but the platform does not host or track the actual session.
5. **Real-time messaging** — chat is implemented as 5s polling. Fine at ≤50 concurrent users; becomes expensive and laggy fast.
6. **KPI dashboard for founders** — analytics routes exist but no GMV / retention / bypass-rate / CAC view is surfaced anywhere.

See [AUDIT_FOCUSED.md](AUDIT_FOCUSED.md) and [FINDINGS.md](FINDINGS.md) for the full engineering audit.

---

## 3. Market

### 3.1 Geography & ICP

- **Primary market:** West Hyderabad — Gachibowli, Kondapur, Narsingi, Tellapur, Miyapur, Kukatpally. Dense, middle/upper-middle-income, high concentration of IT-sector families with salaried income and stated willingness to pay for education.
- **Demand ICP:** parents of Classes 1–12 students. Within that, the **wedge is Classes 6–10 Math/Science/English + Class 11–12 Boards/JEE foundation**. This segment has the highest session frequency, clearest measurable outcomes (exam scores), and strongest willingness to pay.
- **Supply ICP:** engineering / post-grad students at JNTU, CBIT, Vasavi, CVR; early-career educators looking for flexible income. Cost-effective, reasonably skilled, reachable via campus channels.

### 3.2 Why West Hyderabad first

- Short tutor commute radius (tutor `travelRadius` field in profile) keeps home-tutoring economically viable.
- Dense enough for referrals to compound; small enough to keep admin + escalation workload manageable pre-product-market-fit.
- Expansion sequence (post Month 9–12): East Hyderabad / Madhapur → Bangalore South.

### 3.3 Competition

| Competitor | Positioning | Where TutNet wins |
|---|---|---|
| **WhatsApp groups / word-of-mouth** | Free but opaque; no receipts, no vetting, no recourse | Verified profiles, receipts, refund path |
| **Justdial / Sulekha** | High reach, low trust; tutor contact sold, no accountability post-intro | Platform stays in the loop — payments, attendance, reviews, disputes |
| **UrbanPro** | National, broad, thin on any one geography | Neighbourhood density and local admin operations |
| **Byju's / Vedantu (online)** | Polished product, scripted pedagogy | Home tutors, chosen by the parent, affordable rate cards, personal relationship |
| **Local coaching centres** | Batch-based, fixed schedule, no personalization | 1:1 at home on the parent's schedule |

The defensible moat is not tech — it is a **verified supply pool + local trust + dispute recourse**, accrued one neighbourhood at a time.

---

## 4. Business Model & Unit Economics

### 4.1 Revenue streams

**Phase 1 (now → Month 6): Take-rate only.**
- Commission: **22% of tutor hourly fees** on completed, paid sessions.
- Free trials generate no revenue directly; they exist to convert into paid sessions.
- Refunds processed via Razorpay (full or partial, currently manual review).

**Phase 2 (Month 6 → Month 12):** add monetization surface area without breaking trust:
- **Featured placement** for tutors in search results (flat monthly fee).
- **Tiered commission** by quality score: Bronze 25% / Silver 22% / Gold 18% / Platinum 15% — paying tutors less commission for being lower-risk and higher-rated. Aligns incentives with staying on-platform.
- **Small-group sessions** (2–4 students) as a pilot — higher margin per hour.

**Phase 3 (Year 2+):** content library, test prep cohorts, B2B school partnerships. Only after retention and tutor quality metrics are stable.

### 4.2 Rate-card reference (informational, not enforced in code today)

| Grade | ₹/hour |
|---|---|
| Classes 1–5 | 200–350 |
| Classes 6–8 | 400–600 |
| Classes 9–10 | 600–900 |
| Classes 11–12 | 900–1,500 |

Tutors currently set their own rate on profile. A moderated range (soft cap + warn-if-outside) is a near-term product task; it should not be enforced rigidly before there is enough supply to afford pricing discipline.

### 4.3 Unit economics (base case)

| Metric | Assumption |
|---|---|
| Avg session price to parent | ₹600 |
| Avg sessions per student per month | 8 |
| Avg monthly parent spend | ₹4,800 |
| TutNet take (22%) | ₹1,056 / student / month |
| Avg student lifetime | 6 months (conservative) |
| **LTV (gross margin)** | **~₹6,300** |
| Target CAC (blended) | ₹1,500 |
| **LTV : CAC** | **~4.2 : 1** |
| Payback period | ~1.5 months |

CAC target is driven by the GTM mix in §5 — referrals and neighbourhood canvassing are intentionally weighted heavily because they keep CAC < ₹1,500.

### 4.4 Revenue trajectory (conservative)

| Month | Active students | Avg monthly parent spend | GMV | Commission revenue |
|---|---|---|---|---|
| 3 | 50 | ₹2,000 | ₹1.0 L | ₹22 K |
| 6 | 200 | ₹2,500 | ₹5.0 L | ₹1.1 L |
| 12 | 800 | ₹2,500 | ₹20.0 L | ₹4.4 L |

"Avg monthly spend" in early months is intentionally lower than the unit-economics base case because early users skew toward trials + single sessions, not dedicated long engagements. The transition from session-heavy to dedicated-heavy revenue mix is the core Year-1 execution story.

---

## 5. Customer Acquisition Strategy

### 5.1 Demand side (parents / students)

**Channel mix for the first 200 students:**

1. **Neighbourhood micro-campaigns (40%)** — WhatsApp community outreach, apartment-gate flyering, RWA (Resident Welfare Association) partnerships in Gachibowli / Kondapur / Narsingi. One locality at a time, own it, move on.
2. **Referral loop (25%)** — ₹500 credit to referrer + ₹500 discount to referred student on first paid session after a trial completes. Referral mechanics need to be wired into the product (currently a gap — referrals are not coded, only the incentive structure generally exists). **Ship before Month 2.**
3. **School partnerships (15%)** — 3–5 mid-tier private schools in the target area; offer free diagnostic sessions in exchange for trial access to their parent body.
4. **Paid digital (10%)** — Meta + Google on intent keywords ("home tutor Gachibowli", "class 10 maths tutor Hyderabad"). Keep under ₹30K/month until CAC signal is clear.
5. **Content / SEO (10%)** — blog posts and YouTube shorts on board-exam topics from top-rated tutors. Slow burn; invested in because it's cheap supply-side content and doubles as tutor marketing.

### 5.2 Supply side (tutors)

1. **Campus drives** at JNTU, CBIT, Vasavi, CVR — placement-cell tie-ups, booth on campus at start of semester.
2. **Tutor referral bonus** — ₹500 to existing tutor per approved tutor they bring in, paid only after the referred tutor completes 5 sessions (align bonus with quality retention, not just signup).
3. **LinkedIn + Instagram** for early-career educators — specifically target B.Ed / M.Ed graduates actively looking for flexible work.

### 5.3 Balancing supply/demand

Do not over-acquire on one side. Target a working ratio of **~1 tutor : 4 students** during ramp-up. If students sit in a search with <3 results in their area/class, demand bounces and does not return. If tutors sit idle for 2+ weeks after approval, they go off-platform. Both are death spirals; the admin team should watch the ratio weekly.

---

## 6. Operations Plan

### 6.1 Team (Year 1)

| Role | Count | Purpose |
|---|---|---|
| Founders / operators | 2 | Product, GTM, admin queue |
| Full-stack engineer | 1 | Anti-bypass, payouts, reliability |
| Community + ops | 1 | Neighbourhood campaigns, RWA outreach, tutor onboarding calls |
| Part-time admin reviewers | 1–2 | Tutor approvals, escalations — can be remote/contract |

Scale operators before engineering. The product works; the operational muscle around it does not yet exist.

### 6.2 Admin SOPs to codify before Month 3

1. **Tutor approval SLA: <24h** median from submission to approve/reject decision. Approval history is already audited in the model; turn it into a weekly review.
2. **Escalation resolution SLA: <72h** median. Escalation types are already categorised; route `harassment` and `safety_concern` to founder-level review instantly.
3. **Weekly payout cadence** — every Friday, export confirmed-completed sessions from the last 7 days, minus commission, minus any pending escalations involving the tutor, pay out. Until automated, one operator + a spreadsheet + bank transfer.
4. **Monthly parent statement** — auto-generated PDF of sessions + payments, emailed on the 1st. Drives trust and also surfaces billing disputes early, before they become escalations.

### 6.3 Tech execution priorities (next 90 days)

In priority order, per the audit:

1. **Anti-bypass v1**: message regex/keyword filters, "Report Off-Platform Request" button, obfuscation detection, flagged-event counter feeding a tutor risk score. Revenue-critical.
2. **Automated payouts + ledger**: even if payout execution is manual, the ledger of "owed to tutor" must be automated and auditable.
3. **Parent-account linkage + real parent verification** of attendance. Core trust story to parents.
4. **Session join URL + attendance timestamps** (`joinedSessionAt`, `leftSessionAt` on Booking) — required for online-mode bookings to be meaningful.
5. **Move chat + notifications from polling to Socket.IO push**. Already have the infrastructure, just not wired through.
6. **Helmet, compression, MongoDB transactions on booking creation, distributed job locks** — reliability hygiene. See [AUDIT_FOCUSED.md](AUDIT_FOCUSED.md).

### 6.4 Legal & compliance (not in code — must ship)

- Company registration (Private Limited).
- GST registration (will trigger on commission revenue).
- DPDP-aligned privacy policy + minor-safety policy + reporting SLA.
- **Tutor Service Agreement** with non-circumvention clause, fair-use enforcement ladder, and Hyderabad jurisdiction. Record signing timestamp + signer hash on the tutor record.
- **Parent / Student Terms** including off-platform risk disclaimer.
- Clear refund policy, dispute-resolution process, and minor-safeguarding commitments — published and linked from checkout.

These are blockers for scale and for any serious advertising. Target: done by end of Month 2.

---

## 7. Risks & Mitigation

Prioritised from highest business impact:

| # | Risk | Mitigation |
|---|---|---|
| 1 | **Tutor bypass** (tutor + parent go off-platform after trial/first session) | Contractual non-circumvention + chat detection + tiered commission reward for staying on + escalation flow for reporting |
| 2 | **Parent preference for direct cash payment** | Value-frame upfront: refund safety, receipts, reviews, dispute resolution. Monthly statements. Introduce UPI autopay on dedicated engagements. |
| 3 | **Payment operations failure** at scale | Manual ledger from Day 1; weekly payout SOP; Razorpay reconciliation Fridays; automate before Month 6 |
| 4 | **Low tutor quality / churn** | Screening call + demo-class QA + 3-session probation scorecard + incentive tiers + rapid off-boarding for repeat 2-star reviews |
| 5 | **Minor-safety incident** | Verification levels (`none/phone/id/full`), mandatory reporting, escalation types for harassment/safety, admin SLA <24h, parent-verified attendance |
| 6 | **Demand inconsistency** in a single locality | Neighbourhood-by-neighbourhood expansion with >3 tutors/class before opening a pincode publicly |
| 7 | **Supply concentration risk** (one college dominates) | Diversify campus sourcing; target non-engineering sources (B.Ed graduates, working professionals) in Year 2 |
| 8 | **Regulatory / tax surprises** | Consult a CA early; build GST-compliant invoicing from Day 1 |
| 9 | **Cash-flow timing** | Collect monthly upfront on dedicated engagements; defer payouts to weekly; keep a 2-week buffer in the ledger |
| 10 | **Founder bandwidth** | Don't build Phase 2 features before Phase 1 anti-bypass + payouts are solid |

---

## 8. KPIs & Targets

Track weekly. If a KPI isn't instrumented, build it before the next cohort launches.

### 8.1 Growth
- Weekly active students / tutors
- New signups by channel (referral / paid / RWA / campus)
- Trial → first paid session conversion rate (**target: >40%**)
- Session → dedicated conversion rate (**target: >20% by Month 6**)

### 8.2 Revenue
- GMV (weekly / monthly)
- Net commission revenue
- Average revenue per active student (ARPU)
- Dedicated-booking share of GMV (**target: >50% by Month 9**)

### 8.3 Trust & quality
- Session confirmation rate (completed / scheduled) — **target: >85%**
- Disputes per 100 sessions — **target: <3**
- **Bypass rate** (confirmed off-platform / active tutor-student pairs) — **target: <5% by Month 6**
- Tutor average rating — **target: >4.5**
- Student NPS — **target: >40**

### 8.4 Unit economics
- CAC by channel
- LTV (6-month cohort)
- LTV:CAC (**target: >3:1**)
- Payback (**target: <3 months**)

### 8.5 Operations
- Tutor approval turnaround (**target: <24h median**)
- Escalation resolution time (**target: <72h median**, <12h for safety)
- Tutor payout accuracy (zero disputes per month)

---

## 9. Roadmap — 12 Months

### Q1 (Months 1–3): Foundations
- Legal / GST / contracts live.
- Anti-bypass v1 shipped (chat filters + report button + basic risk score).
- 50 active students in Gachibowli + Kondapur.
- Admin SOPs written and running weekly.
- KPI dashboard (internal, simple) live.

### Q2 (Months 4–6): Validate unit economics
- 200 active students across 4 localities.
- Automated payout ledger live; manual execution acceptable.
- Parent-account linkage + real parent verification live.
- First iteration of tiered commission (pilot with top 10 tutors).
- Referral loop live with measurable CAC improvement.

### Q3 (Months 7–9): Scale GTM
- 400 active students; expand into Narsingi / Tellapur / Miyapur.
- Featured tutor placement revenue launched.
- Small-group sessions pilot (2 tutors, 4 cohorts).
- School partnerships live with 3 schools.
- Move chat + notifications to push; deprecate polling.

### Q4 (Months 10–12): Prepare for expansion
- 800 active students, ₹20L+ GMV, ₹4.4L+ monthly commission.
- Tiered commission fully rolled out.
- Begin East Hyderabad exploration (1 pilot pincode only).
- Series-Seed-ready: 12 months of clean financials, bypass rate <5%, LTV:CAC >3:1, sustainable ops playbook.

---

## 10. Funding & Capital Plan

**Bootstrap + friends-and-family round** for Year 1 is sufficient if the team is disciplined. Assume ₹40–60L raised:

- Team (4–5 people, mostly operators) — ~60%
- Marketing + neighbourhood campaigns + paid ads — ~20%
- Tutor incentive bonuses + referral payouts — ~10%
- Infra (Razorpay fees, hosting, email/SMS, MongoDB Atlas, FCM) — ~5%
- Legal / compliance / accounting — ~5%

**Seed round (Month 12–15):** target ₹3–5 Cr to fund Bangalore expansion, engineering hires, and a content/SEO team. Only raise if unit economics are clean and bypass rate is demonstrably declining.

---

## 11. Success Criteria

TutNet succeeds if, by end of Year 1:

1. **800+ active students** in West Hyderabad with >50% revenue from dedicated engagements, proving LTV.
2. **Bypass rate <5%** — proving the core marketplace hypothesis that trust + features beat the WhatsApp-group alternative.
3. **LTV:CAC > 3:1** with <3-month payback — proving the economics.
4. **NPS > 40** from parents and >4.5 average tutor rating — proving the quality story.
5. **Zero safety incidents** handled later than the <24h founder-review SLA.

If any two of these miss materially, the plan needs a hard re-think before raising outside capital.

---

## References

- [BUSINESS_PLAN_SPEC.md](BUSINESS_PLAN_SPEC.md) — the forward-looking spec this plan operationalizes.
- [AUDIT_FOCUSED.md](AUDIT_FOCUSED.md) — engineering reliability backlog.
- [FINDINGS.md](FINDINGS.md) — known UX/product gaps.
- [CLAUDE.md](CLAUDE.md) — architecture overview.
