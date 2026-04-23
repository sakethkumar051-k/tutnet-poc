# West Hyderabad Tutoring Marketplace
## Business + Anti-Bypass Spec (Executable)
**Version:** 1.0 (Reworked)  
**Date:** March 2026  
**Scope:** Business operations, legal/compliance, anti-bypass controls, rollout plan aligned to current TutNet product.

---

## 1) Objective

Build a trusted tutoring marketplace in West Hyderabad that:
- grows GMV with healthy unit economics,
- keeps tutor/student activity on-platform,
- protects minors and parent trust,
- and is operationally feasible with the current codebase.

Primary success metric: **Bypass Rate** (confirmed off-platform cases / active tutor-student relationships) reduced month-over-month, targeting **<5% by Month 6**.

---

## 2) Market Focus and ICP

- **Demand ICP:** Parents of students in Classes 1-12 in West Hyderabad (Gachibowli, Kondapur, Narsingi, Tellapur, Miyapur).
- **Supply ICP:** College tutors from JNTU, CBIT, Vasavi, CVR, plus early-career graduates.
- **Initial wedge:** Math/Science/English for Classes 6-10 and Boards/JEE foundation.

Reason: these segments have frequent sessions, clearer outcomes, and stronger willingness to pay.

---

## 3) Corrected Business Model (Practical)

### 3.1 Pricing and Commission
- Keep class-based hourly guidance as a **rate card**, not a hard floor until supply stabilizes:
  - Classes 1-5: INR 200-350/hr
  - Classes 6-8: INR 400-600/hr
  - Classes 9-10: INR 600-900/hr
  - Classes 11-12: INR 900-1,500/hr
- Start with one default commission band for first 90 days to reduce complexity:
  - **Launch commission: 22%** (all tutors)
- Introduce tiered commission only after data quality is stable:
  - Bronze 25%, Silver 22%, Gold 18%, Platinum 15%

### 3.2 Payment Model (Reality Check)
- Current code supports payment records and earning summaries, but not true regulated escrow/subscription debit.
- Phase 1 should use:
  1. Parent pays platform invoice monthly upfront.
  2. Sessions are confirmed in-app (already supported by booking + attendance flows).
  3. Tutor payout is processed weekly/monthly based on confirmed sessions.
- Implement gateway automation (Razorpay Orders/Subscriptions/Route) in Phase 2.

### 3.3 Revenue Streams (Priority Order)
1. Commission on sessions (core)
2. Featured tutor placement (after search quality is reliable)
3. Group sessions (pilot with 1-2 tutors first)
4. Content library (only after stable retention and tutor QA)

Do not launch all streams at once.

---

## 4) Anti-Bypass Architecture (3 Layers)

## Layer A: Contract + Policy (must exist before scale)
- Tutor Service Agreement with:
  - non-circumvention,
  - non-solicitation,
  - communication on approved channels,
  - payout withholding for verified breach,
  - dispute process and evidence standards.
- Parent/student Terms including off-platform risk disclaimer.
- Fair enforcement policy:
  - warning -> suspension -> termination for policy violations.

**Important legal correction:** fixed monetary penalties may be contested if disproportionate. Keep enforceable remedies focused on account actions, withheld pending payouts (where contract permits), and documented evidence.

## Layer B: Product + Detection
- In-app messaging exists; add policy filters in phases:
  1. Regex block for direct phone/email/UPI/social handles.
  2. Keyword flags ("WhatsApp", "Telegram", "call me", etc.).
  3. Obfuscation detection (spaced digits, text-number patterns) with review queue.
- Add "Report Off-Platform Request" in student/parent and tutor UI.
- Add risk-scoring for each tutor based on:
  - flagged chat events,
  - confirmation mismatches,
  - sudden booking drop after active leads,
  - repeated complaints.

## Layer C: Incentives
- Tutors:
  - lower commission with reliable on-platform behavior,
  - faster payout windows for low-risk tutors,
  - verified profile/review portability within platform.
- Parents/students:
  - refund protection only for platform-confirmed sessions,
  - progress reports and history only for in-platform sessions,
  - loyalty credits for continuous platform payments.

---

## 5) What is Already in Current Code vs Gaps

### 5.1 Already Available (usable now)
- Booking lifecycle (request/approve/reject/reschedule/complete)
- Attendance flows and parent verification support
- Messaging endpoints and conversation lists
- Reviews/ratings
- Progress report APIs
- Incentive summary logic
- Notifications + admin analytics routes
- Escalation routes

### 5.2 Missing or Not Production-Grade
- Automated payment collection + subscription + settlement
- Strong anti-bypass chat moderation
- Evidence-grade bypass case management workflow
- Parent-friendly trust UX (clear guarantees, claims, and dispute timelines)
- Legal document execution and audit trail integration

---

## 6) Corrected Risk Register (Top 10)

1. **Tutor bypass attempts** -> contract + chat filters + risk scoring + staged enforcement  
2. **Parent direct payment preference** -> clear value framing: refund safety, records, support  
3. **Payment ops failure** -> manual fallback ledger and scheduled payout SOP  
4. **Low tutor quality/churn** -> onboarding test + demo QA + probation scorecards  
5. **False positive moderation** -> appeal workflow, manual review SLA  
6. **Minor safety/data compliance gaps** -> minimal data collection, guardian consent controls  
7. **Weak demand consistency** -> neighborhood campaigns + referral loops + school pilots  
8. **Supply concentration** -> diversify tutor sourcing beyond 4 colleges  
9. **Operational overload** -> strict weekly KPI review + automation backlog  
10. **Cash flow timing mismatch** -> collect monthly upfront, defer payouts to confirmed sessions

---

## 7) Compliance and Legal Baseline (India)

This is business guidance, not legal advice. Final language must be drafted by counsel.

- Company registration and tax setup (Private Limited, GST when applicable)
- Tutor identity + background verification workflow
- DPDP-aligned privacy policy and consent records
- Minor safety policy and reporting protocol
- Standardized contract signing trail (timestamp, signer identity, document hash)
- Jurisdiction and dispute clause reviewed by Hyderabad counsel

---

## 8) KPIs and Operating Dashboard (Day 1)

Track weekly and monthly:
- GMV
- Net revenue (commission + add-ons)
- Active students and active tutors
- 30-day and 60-day retention
- Session confirmation rate
- Dispute rate per 100 sessions
- Bypass attempt rate (flagged + confirmed)
- Tutor risk-tier distribution
- CAC, payback period, LTV/CAC
- NPS (parents), tutor satisfaction score

Target guardrails (first 6 months):
- Retention >= 60% by Month 3
- Session confirmation >= 90%
- Confirmed bypass cases <= 5% of active relationships
- Disputes resolved within 72 hours median

---

## 9) 12-Week Action Plan (Executable)

## Weeks 1-2: Foundation (Critical)
- Finalize legal docs and enforcement SOP
- Define pricing, commission, payout calendar
- Publish trust policy: refunds, disputes, anti-bypass rules
- Build basic bypass event logging schema

Deliverables:
- Signed tutor agreement template
- Parent/student policy pages
- Ops runbook for disputes and suspensions

## Weeks 3-4: MVP Anti-Bypass Controls
- Implement message regex blocking + keyword flags
- Add report-bypass button + admin queue
- Add first tutor risk score version (rule based)

Deliverables:
- Message moderation v1 live
- Bypass incident dashboard v1
- Strike policy automation hooks

## Weeks 5-6: Payments and Trust UX
- Standardize invoice + payment collection workflow
- Add payout eligibility rules from confirmed sessions
- Parent dashboard improvements: session history + progress + dispute entry

Deliverables:
- Reliable monthly collection process
- Payout statement export
- Parent trust center page

## Weeks 7-8: GTM Validation
- Tutor campus drive (target 80 qualified tutors pipeline)
- Parent acquisition pilots by micro-locality
- Referral loop launch (parent + tutor)

Deliverables:
- 50 paid students target
- CAC benchmark by channel
- Tutor activation funnel baseline

## Weeks 9-10: Quality + Retention
- Tutor QA scorecards and probation actions
- Weekly parent check-ins and satisfaction capture
- Replace tutor guarantee workflow

Deliverables:
- Reduced early churn
- NPS baseline + action list

## Weeks 11-12: Scale Readiness
- Cohort retention analysis
- Unit economics validation
- Investor metrics sheet and operating narrative

Deliverables:
- Board-style monthly metrics pack
- Go/no-go plan for city-wide Hyderabad expansion

---

## 10) Enforcement Model (Workable and Defensible)

Use evidence-backed triage, not instant punitive action:
- **Strike 1:** Warning, policy re-acknowledgement, monitored status
- **Strike 2:** 14-30 day suspension and payout hold pending review
- **Strike 3:** Termination, permanent block, final settlement per contract

Evidence sources:
- Message flags and logs
- Session confirmation inconsistencies
- Parent/tutor reports
- Payment mismatch patterns

All enforcement decisions should be timestamped with reviewer notes for auditability.

---

## 11) Financial Plan (Conservative)

### Monthly milestone model
- Month 3: 50 students x INR 2,000 = INR 1,00,000 GMV
- Month 6: 200 students x INR 2,500 = INR 5,00,000 GMV
- Month 12: 800 students x INR 2,500 = INR 20,00,000 GMV

At 22% blended commission, expected commission revenue:
- Month 3: INR 22,000
- Month 6: INR 1,10,000
- Month 12: INR 4,40,000

Conservative planning note:
- Keep fixed team costs low until Month 6 metrics prove retention and payout reliability.

---

## 12) Decision Rules (So the Plan Stays Practical)

- Do not expand to new city before:
  - >= 500 active students in Hyderabad,
  - >= 60% retention at 60 days,
  - <= 5% confirmed bypass rate,
  - positive contribution margin in core tutoring line.
- Do not launch content library before:
  - tutor QA rubric finalized,
  - content review process staffed,
  - refund/dispute process stable.
- Do not increase paid ads significantly before:
  - referral conversion and onboarding funnel are reliable.

---

## 13) Immediate Next Steps (This Week)

1. Freeze policy wording and legal draft with counsel.
2. Implement message moderation v1 (regex + keyword + event logging).
3. Create bypass incident queue and strike tracking in admin.
4. Publish parent trust page (refund protection, evidence policy, response SLA).
5. Start weekly KPI review cadence with one owner per metric.

---

## 14) Final Positioning Statement

TutNet should position itself as:
**"The trusted, managed tutoring marketplace for Hyderabad families - where session quality, payment safety, and anti-bypass enforcement are built into the product."**

This version is intentionally execution-first: fewer assumptions, clearer sequencing, and aligned with what your current system can deliver now.
