# TutNet — Bypass & Retention Strategy

**Version:** 1.0
**Date:** April 2026
**Scope:** Strategy for retaining the tutor–parent relationship on-platform after month 1, plus an honest enumeration of how bad actors still beat this system and how we lose money.

---

## 1. The Core Problem

Hyderabad is a **money-only market** for this segment. Value-adds like guarantees, progress reports, and tax invoices do not move the needle on parent decisions. Parents save ₹500/month going direct, tutors earn ₹500/month more going direct, and our ₹2000 commission disappears.

Additionally, home tutoring is uniquely vulnerable to bypass because:
- The tutor physically enters the parent's home every week.
- Phone numbers, UPI IDs, and casual agreements are exchanged in person — invisible to the platform.
- The relationship is long-term and trust-based once established, which is exactly when bypass becomes attractive.

We cannot win this with policing (chat filters, non-circumvention clauses). We have to win it with **economics**.

---

## 2. Existing Payment Architecture

Already decided:

- **Parent pays upfront monthly** to TutNet (e.g., ₹4,800 for the month).
- **Tutor paid weekly in 4 parts** (their share, minus commission), over the course of that month.
- Trial is free; month 1 bypass is **structurally impossible** because the parent already paid TutNet and the tutor is only paid by TutNet.

The bypass window is therefore **end of month 1 → month 2 renewal**. Everything below is engineered around closing that window.

---

## 3. Core Principle

> **Do not try to keep the full ₹2000 commission. Spend half of it to make bypass mathematically worse for both sides. 50% of something beats 100% of nothing.**

Commission is not revenue to be protected. It is the **budget that buys retention** in a market where value-adds don't sell.

---

## 4. The Six Retention Levers

### Lever 1 — Renewal cashback to both sides

At end of each month, if the parent renews on-platform:
- **Parent:** ₹400 cashback credited to next month's fee.
- **Tutor:** ₹400 retention bonus paid with next weekly payout.

The bypass math:
| Side | Save by going direct | Lose in cashback | Net gain |
|---|---|---|---|
| Parent | ₹500 | ₹400 | **₹100** |
| Tutor | ₹500 | ₹400 | **₹100** |

Both sides barely break even on bypass — not worth the risk.

### Lever 2 — Tiered commission, communicated upfront

Show every tutor on day 1:
- Months 1–3: **25%** commission
- Months 4–6: **20%**
- Month 7+: **15%**

Make it a visible countdown on the dashboard. A tutor bypassing in month 2 is *leaving money on the table* — they were 2 months away from a discount. This reframes "waiting" as the profitable move.

**Must be tracked per tutor lifetime, not per student.** Otherwise tutors reset the clock with every new student.

### Lever 3 — Hard retention cliffs (cash, not features)

Per tutor–student pair:
- **3 consecutive months on-platform:** ₹1,500 bonus to tutor.
- **6 consecutive months:** ₹4,000 bonus.

Per tutor overall:
- **Volume bonus:** ₹2,000/month for tutors with 5+ active on-platform students. Drop to 4 = lose the ₹2,000. One student lost = ₹2,000 gone, dwarfing any single-relationship bypass gain.

All paid at month-end, not upfront. Cliffs tutors don't want to fall off.

### Lever 4 — Refundable tutor deposit

At approval: **₹1,000 deposit held in escrow.** Refunded only on clean exit after 6 months. **Forfeited on any verified bypass.**

Must be paid **upfront in cash**, not accrued from early earnings — otherwise tutors treat it as house money.

College-age tutors will not casually forfeit ₹1,000.

### Lever 5 — Parent cashback for reporting bypass

**₹500 TutNet credit** to any parent who reports a verified off-platform request from a tutor. Cash-equivalent, not a thank-you note.

The tutor asking for UPI doesn't know *which parent* will quietly take the ₹500. Every parent becomes a potential informer. Tutor behavior changes without any filter, any moderation, any admin work. Highest ROI lever by far.

### Lever 6 — Decoy audits

Admin periodically creates fake parent accounts, books tutors, and tests whether the tutor tries to move it off-platform.

If caught: termination + deposit forfeited + (if campus-sourced) blacklist with their college placement cell.

Cheap to run. Creates permanent uncertainty — tutors can never be sure which parent is real.

---

## 5. Net Economics

Per active tutor–parent relationship, per month:

| Line item | Amount |
|---|---|
| Gross commission | ₹2,000 |
| Minus parent renewal cashback | –₹400 |
| Minus tutor renewal bonus | –₹400 |
| Minus amortized 3/6-month cliffs | ≈–₹200 |
| Amortized decoy/admin cost | ≈–₹50 |
| **Effective commission** | **≈₹950** |

Half of gross — but expected bypass rate drops from **40–50% at month 6** (without) to **10–15%** (with). More surviving relationships means more total revenue in absolute terms, even at half the per-unit margin.

---

## 6. How This Still Breaks — Adversarial Scenarios

This is where we have to be honest. Every lever above can be gamed. Here is the attack surface we inherit.

### A. Collusion Attacks (parent + tutor together)

| # | Attack | What happens | Loss |
|---|---|---|---|
| A1 | **Cashback farming → bypass** | Parent and tutor renew month 2 to collect ₹400 cashback each, then go off-platform from month 3. | ₹800 subsidized to people who bypass anyway + lost LTV |
| A2 | **Soft bypass / under-declared sessions** | Monthly plan says 16 sessions on platform. Tutor actually delivers 24 sessions; 8 are cash off-platform. Relationship *looks* healthy in data. | ~33% silent revenue leak that grows over time — harder to detect than full bypass |
| A3 | **Collusive attendance dispute** | Parent disputes attendance to trigger refund; tutor and parent split the refund off-platform. | ₹2000 refund + we've already paid the tutor weekly |
| A4 | **Hostage renegotiation** | Tutor threatens to leave mid-engagement unless parent goes direct to save "both of us money." Parent feels coerced mid-school-year. | Quiet attrition; hard to even detect as bypass |
| A5 | **Sibling/friend cascade** | Parent A uses TutNet, pays month 1, then refers neighbor Parent B directly to the same tutor off-platform. Never renews. | ₹200 CAC burned, lost 2+ future customers in same locality |

### B. Payment Fraud Against the Platform

| # | Attack | What happens | Loss |
|---|---|---|---|
| B1 | **Credit card chargeback** | Parent pays ₹4,800 upfront, receives month of tutoring, then raises a chargeback claiming unauthorized card use. Razorpay pulls funds. Tutor already received weekly payouts. | ₹4,800 + chargeback penalty + admin time |
| B2 | **Refund-harvest pattern** | Parent books tutor, completes 1–2 sessions, then fabricates "tutor no-show" escalations for remaining sessions to claw back most of month's payment. | Partial refund losses × many users if unchecked |
| B3 | **Stolen card / identity** | Payment made with stolen card, sessions delivered, chargeback hits 30–60 days later. | Full ₹4,800 + tutor already paid |
| B4 | **Payout duplication** | Tutor reports attendance on one account, colludes with fake parent account to report same session again. Both payout flows trigger. | Direct double-payment from platform |

### C. Gaming Each Individual Lever

| # | Attack | Lever gamed | Loss |
|---|---|---|---|
| C1 | **Wait-then-bypass** | Tutor stays clean until month 7 (15% tier + ₹4,000 cliff paid). Then bypasses all students at once. | 6 months of subsidies paid; relationship lost at peak-LTV moment |
| C2 | **Ghost students for volume bonus** | Tutor recruits 5 friends/cousins as "parents," books minimal sessions to stay "active," collects ₹2,000/month volume bonus while real teaching happens off-platform elsewhere. | ₹2,000/month × duration — pure extraction |
| C3 | **Minimum-session gaming** | Tutor keeps 5 real students at 1 session/month each to stay above volume threshold; puts real effort into off-platform students. | Volume bonus paid on hollow pipeline |
| C4 | **Bounty farming (parent)** | Parent reports every tutor they trial as "bypass attempt," even falsely, to collect ₹500 each time. | ₹500 × N trials + wrongful tutor terminations |
| C5 | **Weaponized reports** | Parent and a competitor tutor collude to falsely report a rival tutor for bypass, get them terminated, pick up their students. | Loss of a good tutor + deposit forfeited unfairly + reputational damage |
| C6 | **Sibling swap clock reset** | Parent switches from kid A to kid B mid-engagement to "reset" the retention clock. Tutor restarts month 1 bonuses. | Re-paying onboarding incentives on same relationship |
| C7 | **Decoy pattern recognition** | Tutors learn decoy signatures (no child photo, generic name, weird timing) and behave only around decoys. Real parents still get bypass pitches. | Decoy program stops deterring real bypass |
| C8 | **Deposit as cost-of-doing-business** | Tutor with 10 high-paying off-platform students treats ₹1,000 deposit as a rounding error on their extraction. | Deposit fails to deter high-volume bad actors |
| C9 | **Tutor impersonation / login sharing** | One highly-rated tutor shares login with 4 friends who teach under their name. Reviews accrue to one profile; quality varies. | Silent quality erosion; when caught, 5 tutors leave together |

### D. Silent Revenue Leaks (hardest to detect)

| # | Attack | Why it's dangerous |
|---|---|---|
| D1 | **Price gaming** | Tutor lists ₹800/hr on platform, charges parents ₹500/hr in cash privately. The platform price is *literally* higher than the bypass price — bypass becomes the obvious choice. |
| D2 | **Fake review inflation** | Tutor creates fake parent accounts to leave 5-star reviews, rises in search ranking, gets real leads, bypasses them. Platform is used as marketing amplifier. |
| D3 | **Campus mafia rotation** | All tutors from one hostel collude. One is "on-platform" this semester; the rest take bypass referrals routed through that one. Rotate each semester. We see one active tutor; five are operating. |
| D4 | **Scheduled attrition** | Tutor takes every relationship to exactly month 6, collects ₹4,000 cliff bonus, then bypasses cleanly. We optimized for retention; they optimized for bonus extraction. |

### E. External / Reputation Attacks

| # | Attack | Impact |
|---|---|---|
| E1 | **Competitor scraping** | Competitor scrapes verified tutor list, contacts them directly with better offers or poaches to their platform. |
| E2 | **Fake horror reviews** | Competitor creates fake parent accounts posting safety/misconduct stories on Google/social. Reputation tanks. |
| E3 | **Regulatory report** | Someone reports TutNet for GST non-compliance, unregistered coaching operation, or minor-safety gaps. Not fraud, but a strategic attack vector. |
| E4 | **Admin corruption** | Internal admin uses escalation/decoy powers to harass tutors they dislike, or accepts bribes to approve low-quality tutors. Hard to detect without audit trails. |

---

## 7. Priority Defense List

Not every attack above is equally likely or equally damaging. In order of priority:

### Existential (fix before scaling past 100 students)

1. **Chargeback shield (B1, B3):** Move upfront payment to UPI autopay / net-banking only — or mandate mandates via NACH. Credit cards to be added only once fraud rate is measurable. Weekly tutor payout should have a 1-week lag after parent payment clears the disputable window.

2. **Soft bypass detection (A2):** Parent is sent a monthly "did you receive 16 sessions this month?" check via SMS/WhatsApp with one-tap response. Under-declared sessions surface a discrepancy we can price into the next renewal (or flag for audit). Key insight: **use the parent as a cross-check on the tutor's reported schedule.**

3. **Refund abuse cap (B2):** Max 1 refund dispute per parent per quarter without admin review. Escalation rate tracking per parent as well as per tutor. Parent with 3+ disputes in a year goes on a watchlist.

### High (address in first 6 months of operation)

4. **Bounty fraud controls on Lever 5 (C4, C5):** ₹500 parent reward only paid after admin verification + tutor response period + cannot be collected more than once per quarter per parent. Cap total bounty payouts at a budget line.

5. **Volume-bonus integrity (C2, C3):** Minimum session floor per student per month (e.g., 4 sessions) to count toward volume bonus. Random session audits via parent check-in calls.

6. **Deposit for high-risk profiles (C8):** For tutors sourced from outside campus partnerships, deposit is ₹2,500 not ₹1,000. Deposit waived/reduced for campus-referred tutors whose college is on the hook.

7. **Sibling/cascade tracking (A5):** When a tutor's student churns without renewing, admin calls the parent within 3 days to find out why. Cheap, effective signal for both quality and bypass.

### Medium (watch and react)

8. **Price floor parity clause (D1):** Tutor Service Agreement requires off-platform rate ≥ on-platform rate. Enforced via decoy audits and parent reports. Won't hold up in court, but enforceable via termination and deposit forfeit.

9. **Review authenticity (D2):** Reviews can only be left after a paid session is marked complete. Only 1 review per parent per tutor per month. Platform-side anomaly detection on review clustering.

10. **Identity verification (C9):** Aadhaar or live-selfie verification for tutors. Periodic liveness check before payouts.

11. **Admin audit trail (E4):** Every admin action (approval, decoy run, escalation resolution, deposit forfeit) is logged with admin ID + reason. Founder-level review monthly.

### Low (tolerate early, fix when material)

12. **Wait-then-bypass (C1), scheduled attrition (D4):** These are expensive to prevent — the right answer is to accept them as a cost of retention and model them into unit economics. If bypass rate at month 7+ is <15%, the levers are working.

13. **Campus mafia (D3):** Mostly mitigates itself via volume and diversity of sources. If one college becomes >40% of supply, force diversification.

14. **External attacks (E1–E3):** Generally hard to prevent pre-emptively. Monitor and respond.

---

## 8. The Hard Truths

1. **Steady-state bypass rate will never be zero.** Target <10%. Below that and you're over-policing; above 20% and the economics break. Our job is to live in the middle band.

2. **The single biggest predictor of bypass is tutor income concentration.** A tutor with 1 TutNet student and 10 cash students will bypass. A tutor with 8 TutNet students and 0 cash students will not. **Supply-side loading is the real anti-bypass strategy** — the levers in §4 only work on top of a saturated tutor pipeline.

3. **The single biggest predictor of parent retention is session consistency in month 1.** A parent whose tutor shows up on time for 14 of 16 sessions will renew almost automatically. All cashbacks and cliffs are secondary to baseline delivery reliability.

4. **Do not over-engineer detection before volume exists.** At 50 active relationships, a founder can eyeball every anomaly in a weekly spreadsheet. Build automated detection at 500+ relationships, not at 50. Human-operated admin is fine — in fact, *better* — at small scale.

5. **The levers compound. Individually, each is gameable. Together, the combinatorial cost of defeating all of them is high enough that most bad actors find it easier to just deliver a legitimate service and get paid.** That's the actual goal.

---

---

## 9. Deep Dive — Chargebacks ("Free Month of Tutoring" attack)

### 9.1 Mechanics

Razorpay accepts multiple payment rails; dispute windows and reversibility differ drastically.

| Method | Dispute window | Effort to reverse |
|---|---|---|
| Credit card | Up to **120 days** (Visa/Mastercard) | Trivial — one call to card issuer |
| Debit card | 60–90 days | Moderate |
| Netbanking | Reversible via bank intervention | Hard |
| UPI (standard) | No real chargeback; NPCI dispute only | Very hard |
| **UPI AutoPay / e-NACH mandate** | Effectively irreversible post-auth | **Very hard** |

### 9.2 The attack

1. Parent pays ₹4,800 upfront via **credit card** on day 1.
2. Tutor delivers full month. Attendance logged; reviews given; all looks healthy.
3. Tutor receives ₹3,800 in 4 weekly payouts (₹4,800 − ₹1,000 commission).
4. On day 35, parent files chargeback: *"services not as described"* or *"fraudulent transaction."*
5. Razorpay claws back ₹4,800 + ₹1,000–1,500 penalty.
6. **Net loss per incident: ~₹6,000 on a ₹4,800 transaction.** Worse than full bypass.

### 9.3 The Razorpay cliff

If chargeback ratio exceeds **1%** of transactions, Razorpay raises rolling reserves (5–10% of earnings held for 6 months) or can close the merchant account. At 1000 monthly transactions, just 10 bad actors can put the entire merchant account on a watchlist.

### 9.4 The fix is at the payment-rail layer, not the dispute layer

Fighting chargebacks after the fact wins only 40–60% of cases even with perfect evidence. The real defense is routing parents away from charge-backable methods for the upfront monthly:

| Priority | Method | Action |
|---|---|---|
| 1 (default) | **UPI AutoPay / e-NACH mandate** | Offer as the only default option. ₹100 discount for choosing it. |
| 2 | Netbanking | Allow freely. |
| 3 | Debit card with 3D Secure | Allow; monitor fraud rates. |
| 4 | Credit card | Disallow for month 1. Enable only after 3 months of clean history. |

### 9.5 Payout holdback (secondary net)

Under the current plan tutor is paid weekly in 4 parts. Change to:
- Weeks 1–3 paid fully.
- **Hold 15–20% of week 4 in a chargeback reserve for 60 days.**
- Release after the dispute window closes.

This caps exposure per incident from ~₹6,000 to ~₹4,200 and keeps the tutor motivated to help contest a chargeback.

### 9.6 Early fraud signals (cheap, high-signal)

Flag at signup and auto-downgrade to UPI-only:

- Card name ≠ parent account name
- Billing address outside Hyderabad for a West Hyderabad booking
- 3+ failed payment attempts before success (card-tester pattern)
- Card used within 30 days on 3+ other merchants' signup flows
- Device/IP mismatch with stated location

### 9.7 Target outcome

- Chargeback rate below **0.3%** of transactions.
- At 800 active parents, ~2.4 chargebacks/month → ~₹12K loss (absorbable).
- Without these controls: ~1%+ → ₹50K+/month + merchant-account risk.

---

## 10. Deep Dive — Soft Bypass ("Extra Sessions in Cash")

### 10.1 Mechanics

- Monthly plan: "₹4,800 for 16 sessions."
- Tutor delivers **16 on-platform + 6–8 off-platform in cash.**
- Platform sees: full month, 5-star review, renewal. All green.
- Reality: tutor nets ₹500 × 7 = **₹3,500/month extra per student** in untracked cash.
- A tutor with 5 such students extracts **₹17,500/month off-platform** while appearing as a Gold-tier model citizen.

### 10.2 Why every lever in §4 fails against this

| Lever | Why it fails |
|---|---|
| Renewal cashback | Relationship IS on-platform at renewal. Paid anyway. |
| Retention cliffs | Tutor hits 6 months clean on platform; collects ₹4,000 × 5 = ₹20,000 in cliff bonuses. We pay them to keep doing it. |
| Parent bounty | Parent is a co-beneficiary of the arrangement. Won't report. |
| Deposit forfeit | Requires detection — which is the whole problem. |
| Decoy audits | Doesn't help — tutor IS behaving correctly with decoy parents. |

### 10.3 Detection via triangulation

No single signal proves soft bypass. Multiple weak signals compounding across a quarter do.

**Signal 1: Parent-side session count confirmation**
- Weekly WhatsApp to 10–15% random sample of parents: *"Quick check — how many sessions did [child] have with [tutor] this week? Reply 1/2/3/4/5+"*
- If parent reports 5, platform logged 4 → smoking gun.
- Tutor can't predict which parent will be asked.

**Signal 2: Topic coverage vs session count**
- Tutor post-session feedback already logs topics covered.
- If claimed 16 sessions covered content requiring ~24 hours of teaching → anomaly flag.

**Signal 3: Tutor time-budget anomaly**
- Profile declares 30 hours/week available.
- Only 12 hours logged, yet marked "at capacity."
- Where are the other 18 hours?

**Signal 4: Parent satisfaction vs session count**
- Monthly survey: "Satisfied with progress?"
- 5/5 satisfaction on only 12 logged sessions — either miracle teacher or unreported extras.

**Signal 5: Earnings floor vs profile**
- Silver-tier tutor, 5 students, 3 months in, earnings are 60% of statistical expected.
- Flag for manual review.

A tutor who trips **2+ signals across a quarter** gets audited.

### 10.4 The structural fix (the only thing that really works)

**Change the pricing unit from per-session to monthly subscription with a soft cap.**

- Current: *"₹4,800 for 16 sessions."* Extra sessions have off-platform value.
- Better: *"₹4,800/month, up to 20 sessions; tutor commits to Mon/Wed/Fri availability."*

The arbitrage collapses:
- Parent's marginal cost of an extra session on-platform = ₹0.
- Why pay ₹500 cash for what the subscription already covers?
- Tutor can no longer sell "extra attention" as a cash add-on.

**Tutor counter-attack:** under-delivery under subscription — show up late, cut sessions short. 
**Counter-counter:** parent satisfaction survey tied directly to retention cliff payments. No satisfaction, no cliff bonus.

### 10.5 Enforcement with teeth

When soft bypass is confirmed (even one student):
1. **Deposit forfeit.**
2. **Tier reset to Bronze** (lose all commission-discount progress).
3. **Clawback** any retention cliff bonuses paid in last 6 months.
4. 90-day suspension. Second offense = termination.
5. If campus-sourced, notify placement coordinator.

For a tutor extracting ₹17,500/month × 4 months caught = ₹70,000 of gain. Enforcement penalty must exceed this. Stacked deposit + tier reset + clawback + future earnings lost → the math breaks for the bad actor.

### 10.6 Target outcome

- Soft bypass detection rate via triangulation: 60–70% of perpetrators caught within a quarter.
- Structural pricing change reduces attempts by an estimated 70% (arbitrage eliminated).
- Residual soft bypass leak: <5% of GMV.

---

## 11. Translating Strategy into the App (discreetly)

Most of the defensive architecture above lives in terms and conditions + payment routing + silent telemetry — NOT in user-facing messaging. Key integration points:

| Strategy | Where it lives in the product |
|---|---|
| Non-circumvention | Tutor Service Agreement §3 (off-platform prohibition) |
| Tutor deposit + forfeit | TSA §5 (security deposit) + §9 (termination) |
| Commission tier | TSA §4 (fee structure) |
| Retention cliffs | TSA §4.3 (performance incentives) |
| Off-platform rate parity | TSA §3.4 (rate consistency) |
| Soft-bypass enforcement | TSA §6 (session reporting accuracy) |
| Decoy audits | TSA §7 (quality assurance) — worded as "quality reviews" |
| Parent bounty for reporting | Parent T&C §8 (reporting incentives) |
| Chargeback routing | Parent T&C §4 (preferred payment methods) + default UPI AutoPay |
| Session subscription model | Parent T&C §2 (service scope) |
| Attendance verification | Parent T&C §5 (verification) |

The user-facing marketing never mentions penalties, decoys, or bypass. It is all framed as "quality," "reliability," "verification," and "incentives." The teeth are in the contract.

---

## References

- [BUSINESS_PLAN.md](BUSINESS_PLAN.md) — full business plan; this document is the deep-dive on §7 (risks).
- [BUSINESS_PLAN_SPEC.md](BUSINESS_PLAN_SPEC.md) — original forward-looking spec.
- [client/src/pages/Terms.jsx](client/src/pages/Terms.jsx) — parent/student T&C (enforcement embedded).
- [client/src/pages/TutorAgreement.jsx](client/src/pages/TutorAgreement.jsx) — tutor service agreement (enforcement embedded).
