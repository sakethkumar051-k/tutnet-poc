# TutNet — Revenue Model, Pricing & Incentives

**Version:** 1.0
**Date:** April 2026
**Status:** Executable — these are the numbers that go into the product.
**Design constraint:** Zero marketing burn, zero rate subsidy. Commission must fund every incentive.

---

## 1. Hyderabad Tuition Market — Rate Reality

Before designing our pricing, here is what parents in West Hyderabad (Gachibowli, Kondapur, Madhapur, Narsingi, Tellapur, Miyapur, Kukatpally) are actually paying today.

### 1.1 Home tuition (cash, informal market)

| Grade | Low end (college tutor, cash) | Mid (experienced) | High (B.Ed/subject expert) |
|---|---|---|---|
| Classes 1–5 | ₹150–250/hr | ₹250–350/hr | ₹350–500/hr |
| Classes 6–8 | ₹250–400/hr | ₹400–550/hr | ₹550–750/hr |
| Classes 9–10 | ₹400–600/hr | ₹600–800/hr | ₹800–1,100/hr |
| Classes 11–12 (general) | ₹600–900/hr | ₹900–1,300/hr | ₹1,300–1,800/hr |
| Classes 11–12 (JEE/NEET) | ₹900–1,300/hr | ₹1,300–1,800/hr | ₹1,800–2,500/hr |

### 1.2 Coaching centres (batch pricing converted to per-hour equivalent)

| Provider | Class | ~₹/hour equivalent |
|---|---|---|
| Sri Chaitanya / Narayana | 9–10 | ₹300–600/hr (batch of 30+) |
| Sri Chaitanya / Narayana | 11–12 | ₹600–1,200/hr |
| Aakash / Allen / FIITJEE (JEE/NEET) | 11–12 | ₹1,200–2,500/hr equivalent |
| BYJU's Classes / Vedantu (online) | 6–12 | ₹400–900/hr |

### 1.3 Key takeaways that drive our pricing

1. **Home tuition commands a premium** over batch coaching because parents value 1:1.
2. **College-student supply is cheap** (₹250–500/hr for 1–8, ₹500–800 for 9–10) — this is our supply wedge.
3. **Experienced B.Ed/M.Ed teachers** are the premium tier and worth 2×.
4. **Online costs ~30% less** than home visits (no travel).
5. **Micro-locality premium** — Gachibowli / Madhapur addresses pay 20–30% more than Miyapur / Kukatpally.

---

## 2. Platform Rate Bands

These are the rates a tutor can list on TutNet. Bands are enforced (not suggestions). Below the floor = lowers tutor quality perception + competes on price with coaching batches. Above the ceiling = prices us out of the home-tuition market.

| Grade band | Subjects | Online floor | Online ceiling | Home floor | Home ceiling |
|---|---|---:|---:|---:|---:|
| Classes 1–5 | All | ₹250 | ₹400 | ₹300 | ₹500 |
| Classes 6–8 | Core (Math/Sci/Eng) | ₹350 | ₹600 | ₹400 | ₹700 |
| Classes 6–8 | Languages / SS | ₹300 | ₹500 | ₹350 | ₹600 |
| Classes 9–10 | Core | ₹500 | ₹800 | ₹600 | ₹950 |
| Classes 9–10 | Languages / SS | ₹450 | ₹700 | ₹550 | ₹850 |
| Classes 11–12 | General (CBSE/State) | ₹700 | ₹1,200 | ₹850 | ₹1,400 |
| Classes 11–12 | JEE/NEET foundation | ₹900 | ₹1,500 | ₹1,100 | ₹1,700 |

**Platform-suggested defaults** shown to newly-approved tutors (80th-percentile competitive rates):

| Grade band | Online suggested | Home suggested |
|---|---:|---:|
| Classes 1–5 | ₹300 | ₹350 |
| Classes 6–8 core | ₹450 | ₹500 |
| Classes 9–10 core | ₹650 | ₹750 |
| Classes 11–12 general | ₹950 | ₹1,100 |
| Classes 11–12 JEE/NEET | ₹1,200 | ₹1,400 |

Tutor can deviate inside the band; hovering shows competitive context ("75% of tutors in this grade charge ₹X–Y").

---

## 3. Parent Subscription Plans

Four plans. Subscriptions make commission invisible and eliminate the per-session arbitrage that enables soft bypass (§10 of BYPASS_STRATEGY.md).

### 3.1 Plan matrix

| Plan | Commitment | Sessions/month | Discount vs Flex | Purpose |
|---|---|---|---|---|
| **Flex** | None — per session | 1–unlimited | — (highest price per session) | Trial conversion path, sporadic users |
| **Monthly** | 1 month prepaid | Up to 20 (16 target) | 0% | Main volume product |
| **Committed** | 3 months, monthly billing | Up to 20 | 5% off Monthly | Retained parents, higher LTV |
| **Intensive** | 3 months, monthly billing | Up to 28 (24 target) | 7% off Monthly | Board-exam / JEE / NEET parents |

### 3.2 Example pricing at a Class 9 home rate of ₹750/hr

| Plan | Parent pays/month | Sessions available | Effective ₹/session |
|---|---:|---:|---:|
| Flex (per session) | ₹825/session (750 + 10% flex surcharge) | As booked | ₹825 |
| Monthly | ₹12,000 | 16 | ₹750 |
| Committed (5% off) | ₹11,400 | 16 | ₹712 |
| Intensive (7% off, 24 sessions) | ₹16,740 | 24 | ₹697 |

Parent visibly saves by committing. The "surcharge" on Flex is what funds the optionality.

### 3.3 Soft-cap architecture

*"Up to 20 sessions"* on Monthly means the tutor delivers what's scheduled, up to 20 — extra sessions (21–24) are free at tutor's discretion. This eliminates the soft-bypass arbitrage: parents have no reason to buy extra sessions in cash because the platform already covers them. Sessions beyond the cap require explicit plan upgrade.

---

## 4. Tutor Commission Tiers

Tiered by **lifetime sessions + rolling-12-month rating**. Tier is platform-wide per tutor, not per-student. Shown as a progress countdown on the tutor dashboard — visibility is the retention lever.

| Tier | Lifetime sessions | Min avg rating | Commission | Label shown to tutor |
|---|---:|---:|---:|---|
| **Starter** | 0–20 | — | **25%** | "New Tutor" |
| **Silver** | 21–75 | 4.0+ | **22%** | "Silver Tutor" |
| **Gold** | 76–200 | 4.4+ | **18%** | "Gold Tutor" |
| **Platinum** | 201+ | 4.7+ | **15%** | "Platinum Tutor" |

### 4.1 Tier demotion rules

- Rating falls below tier floor for 2 consecutive months → drop one tier.
- 3+ verified complaints in 90 days → drop one tier and flag for review.
- Confirmed breach of TSA §3 (non-circumvention) or §6 (session reporting) → reset to Starter + penalties per BYPASS_STRATEGY.md §10.5.

### 4.2 Tutor take-home example (Class 9, ₹750/hr, 16 sessions/month Monthly plan)

| Tier | Gross (₹) | Commission | Tutor take-home | Annual impact at this volume |
|---|---:|---:|---:|---:|
| Starter | 12,000 | ₹3,000 | ₹9,000 | — |
| Silver | 12,000 | ₹2,640 | ₹9,360 | +₹4,320/student/year |
| Gold | 12,000 | ₹2,160 | ₹9,840 | +₹10,080/student/year |
| Platinum | 12,000 | ₹1,800 | ₹10,200 | +₹14,400/student/year |

A Platinum tutor with 5 retained students earns **₹72,000/year more** than the same tutor at Starter on the same book of business. This is real money — comparable to a salary hike.

---

## 5. Incentive Schedule (all cash amounts final)

Every ₹ paid out below is earned, not upfront. This is the hard constraint: no signing bonuses, no subsidies. Incentives fund themselves from commission collected on delivered sessions.

### 5.1 Tutor incentives

| Incentive | Amount | Trigger | Paid when | Eligibility |
|---|---:|---|---|---|
| **Demo → paid conversion bonus** | ₹150 | Trial converts to paid within 48h | Next weekly payout | All tiers |
| **First-session milestone** | ₹100 | First session completed | With session payout | Starter only (already in code) |
| **10-session milestone** | ₹200 | 10 lifetime sessions | With session payout | All tiers |
| **3-month retention (per student)** | ₹1,000 | 3 consecutive months with same paying parent | End of month 3 | Silver+ only |
| **6-month retention (per student)** | ₹2,500 | 6 consecutive months with same paying parent | End of month 6 | Silver+ only |
| **Volume bonus** | ₹1,500/month | 5+ active on-platform paying students | End of each calendar month | Silver+ only |
| **Perfect month** | ₹300 | 0 missed sessions + avg rating ≥4.8 in a month | End of month | Silver+ only |
| **Tier upgrade bonus** | ₹500 | On promotion to next tier | Immediately | Silver/Gold/Platinum |
| **Referral** | ₹500 | Referred tutor completes 5 sessions | When referee hits 5 sessions | All tiers |

**Maximum theoretical monthly earning from incentives** (Gold tutor, 5 retained students, perfect month): ₹1,500 + ₹300 + amortized ₹1,250 (avg of 3mo/6mo cliffs across 5 students) = **~₹3,050/month in pure incentive**, on top of session earnings.

### 5.2 Parent incentives

| Incentive | Amount | Trigger | Paid how | Eligibility |
|---|---:|---|---|---|
| **Trial → paid conversion** | ₹200 off month 1 | Book month 1 within 24h of demo completion | Applied to first invoice | New parents |
| **Committed plan signup** | 5% off | Choose Committed (3-mo) at signup | Lower monthly bill | All parents |
| **Referral credit** | ₹300 credit | Referred parent completes month 1 | Applied to next month | All parents |
| **Sibling discount** | 10% off 2nd child | Same parent enrols 2nd student | Lower bill | All parents |
| **Long-loyalty credit** | ₹500 credit | Same tutor–parent pair crosses 6 months on-platform | Applied to month 7 bill | All parents |
| **Off-platform report bounty** | ₹500 credit | Verified report per TSA §8 | Applied to next invoice | Capped 1/quarter |

### 5.3 What is NOT offered (to preserve margin)

- No paid signup bonus for tutors or parents.
- No zero-commission promotional periods.
- No free months for parents.
- No subsidized rates — platform rate = tutor's listed rate, commission layered into parent price.
- No paid acquisition channel funded by the platform in months 1–6.

---

## 6. Unit Economics — Per-Student Monthly P&L

Baseline: Class 9 student, ₹750/hr × 16 sessions = **₹12,000 parent spend/month** (Monthly plan). Tutor cost allocation below assumes steady-state retention.

### 6.1 By tutor tier (per student, per month)

| Line item | Starter 25% | Silver 22% | Gold 18% | Platinum 15% |
|---|---:|---:|---:|---:|
| Parent payment | ₹12,000 | ₹12,000 | ₹12,000 | ₹12,000 |
| Tutor gross share | ₹9,000 | ₹9,360 | ₹9,840 | ₹10,200 |
| **Platform commission (gross)** | **₹3,000** | **₹2,640** | **₹2,160** | **₹1,800** |
| Razorpay + UPI mandate fee (~2%) | –₹240 | –₹240 | –₹240 | –₹240 |
| Proxy phone + FCM + infra amortized | –₹80 | –₹80 | –₹80 | –₹80 |
| Admin + support amortized | –₹150 | –₹150 | –₹150 | –₹150 |
| **Subtotal after ops** | **₹2,530** | **₹2,170** | **₹1,690** | **₹1,330** |
| 3-mo cliff amortized (₹1,000 ÷ 3) | — | –₹333 | –₹333 | –₹333 |
| 6-mo cliff amortized (₹2,500 ÷ 6) | — | –₹417 | –₹417 | –₹417 |
| Volume bonus amortized (₹1,500 ÷ 5 students) | — | –₹300 | –₹300 | –₹300 |
| Perfect month amortized (expected value) | — | –₹100 | –₹100 | –₹100 |
| Parent cashback / referral / sibling amortized | –₹50 | –₹100 | –₹100 | –₹100 |
| Parent bounty amortized (rare) | –₹20 | –₹20 | –₹20 | –₹20 |
| **Net platform margin per student** | **₹2,460** | **₹900** | **₹420** | **₹60** |

### 6.2 Why Platinum is nearly break-even — and why that's fine

Platinum tutors (top ~5% of the base) are low-cost to retain (no churn) and carry **outsized brand value** — reviews, referrals, quality signal to new parents. Treating them as a ~break-even category and making the margin on Silver + Gold is deliberate.

### 6.3 Blended monthly margin expectation (at steady state)

Assumed tier distribution after 12 months:

| Tier | % of active students | Net/student/month |
|---|---:|---:|
| Starter | 20% | ₹2,460 |
| Silver | 40% | ₹900 |
| Gold | 30% | ₹420 |
| Platinum | 10% | ₹60 |

**Weighted avg platform margin: ₹1,062/student/month.**

---

## 7. Zero-Burn Growth Engine

Because we're not spending on paid acquisition, all growth must be incentive-triggered and **paid after revenue is received**:

| Channel | Cost per acquired parent | Cost paid when | Breakeven session |
|---|---:|---|---:|
| Parent→parent referral | ₹600 (₹300 each side) | After referred parent completes month 1 | Session 1 (we've already collected ₹12,000) |
| Tutor→tutor referral | ₹500 | After referee completes 5 sessions | Session ~2 |
| Campus drives (founder time) | ~₹0 cash | — | Immediate |
| RWA / WhatsApp community (founder time) | ~₹0 cash | — | Immediate |
| Organic (search, reviews, word-of-mouth) | ₹0 | — | Immediate |

**Every paid incentive is triggered AFTER platform revenue is collected from the acquired user.** Zero cash float required for acquisition.

---

## 8. Platform P&L Projection — Year 1

Conservative, assuming no paid acquisition, ramp via campus drives + referrals.

| Month | Active students | Avg parent spend | Monthly GMV | Blended margin | Platform revenue |
|---:|---:|---:|---:|---:|---:|
| 1 | 15 | ₹6,000 | ₹90,000 | ₹1,500 (Starter-heavy) | ₹22,500 |
| 2 | 35 | ₹7,000 | ₹2.45L | ₹1,400 | ₹49,000 |
| 3 | 60 | ₹8,500 | ₹5.1L | ₹1,300 | ₹78,000 |
| 4 | 90 | ₹9,500 | ₹8.55L | ₹1,200 | ₹1.08L |
| 5 | 130 | ₹10,000 | ₹13.0L | ₹1,150 | ₹1.50L |
| 6 | 180 | ₹10,500 | ₹18.9L | ₹1,100 | ₹1.98L |
| 7 | 240 | ₹11,000 | ₹26.4L | ₹1,080 | ₹2.59L |
| 8 | 310 | ₹11,000 | ₹34.1L | ₹1,070 | ₹3.32L |
| 9 | 400 | ₹11,500 | ₹46.0L | ₹1,065 | ₹4.26L |
| 10 | 510 | ₹11,500 | ₹58.6L | ₹1,062 | ₹5.42L |
| 11 | 640 | ₹11,500 | ₹73.6L | ₹1,062 | ₹6.80L |
| 12 | 800 | ₹12,000 | ₹96.0L | ₹1,062 | ₹8.50L |

**Year 1 totals:** ~₹3.8 Cr GMV, **~₹36 L platform revenue** (net of incentives, before tax).

### 8.1 Fixed-cost absorption

With ~₹36L Year 1 revenue, after supporting:
- 2 founders at ₹0 until month 8, then ₹50K/mo × 5 = ₹5L
- 1 full-stack engineer from month 4 at ₹70K/mo × 9 = ₹6.3L
- 1 community/ops hire from month 6 at ₹30K/mo × 7 = ₹2.1L
- Hosting + tools + legal + misc: ~₹3L

**Total Year 1 fixed costs ≈ ₹16.4L.**
**Year 1 operating profit ≈ ₹19.6L** — enough to fund Year 2 expansion without outside capital.

---

## 9. Product Implementation Checklist

These numbers need to be put into specific places in the codebase and admin panel:

| # | What | Where |
|---|---|---|
| 1 | Rate-band enforcement per grade | [server/constants/tutorProfile.constants.js](server/constants/tutorProfile.constants.js) — add `rateBands` export |
| 2 | Commission tier calculation | [server/controllers/payment.controller.js](server/controllers/payment.controller.js) — replace fixed 22% with tier lookup on tutor |
| 3 | Tier logic | New [server/services/commissionTier.service.js](server/services/commissionTier.service.js) — read `TutorProfile.totalSessions` + `averageRating` → tier |
| 4 | Subscription plans | [server/models/Booking.js](server/models/Booking.js) — add `plan` enum: `flex / monthly / committed / intensive` + `sessionAllowance` field |
| 5 | Plan surcharge / discount | Pricing computation at booking creation |
| 6 | Incentive ledger | New [server/models/IncentiveLedger.js](server/models/IncentiveLedger.js) — every bonus earned is a row; prevents double-payment |
| 7 | Incentive jobs | [server/jobs/](server/jobs/) — monthly rollup for volume bonuses, 3/6-month cliffs |
| 8 | Parent cashback credits | [server/models/User.js](server/models/User.js) — add `platformCredits` field (₹); apply at invoice |
| 9 | Tier display on tutor dashboard | [client/src/components/IncentiveDashboard.jsx](client/src/components/IncentiveDashboard.jsx) — show current tier + progress to next |
| 10 | Soft-cap session enforcement | Booking controller — warn tutor/parent at session 21, require upgrade at 25 |
| 11 | Referral code system | New routes + UI; credit applied when referee completes month 1 / 5 sessions |
| 12 | Rate-parity audit surface | Admin view flagging tutors who list substantially below their average realized rate |

---

## 10. Sanity Checks Before Launch

- [ ] **Razorpay chargeback + rolling-reserve assumption:** budget 0.5% chargeback rate; if it spikes, payout holdback in §9.5 of BYPASS_STRATEGY.md absorbs the hit.
- [ ] **Parent-facing price is always a round number in the invoice.** Avoid ₹11,736 — round to ₹11,750. Commission is computed on the tutor-rate × sessions line, not on the final parent figure.
- [ ] **Incentives are always paid after revenue is collected.** No upfront payouts that aren't backed by realized session income.
- [ ] **Tier transitions are one-way-per-tutor except for violations.** Earning a higher tier takes time; losing it should only happen on quality or TSA breach.
- [ ] **No tier progress for off-platform sessions.** Only confirmed-delivered on-platform sessions count toward lifetime total.
- [ ] **Parent cashback is a credit, not a refund.** Applied to next invoice, not paid to bank. Keeps cash on platform.
- [ ] **Referral bonus is paid to earner's TutNet credit, not cash.** Cheaper to issue and compounds platform stickiness.

---

## 11. Headline Numbers (memorize these)

- Parent pays **₹600–₹1,400/hr** depending on class and mode.
- Tutor commission tiers: **25% / 22% / 18% / 15%** (Starter / Silver / Gold / Platinum).
- Plan discounts: **0% / 5% / 7%** (Monthly / Committed / Intensive).
- Primary tutor incentives: **₹1,000 at 3 months + ₹2,500 at 6 months per student + ₹1,500/month volume bonus at 5+ active students**.
- Primary parent incentives: **₹200 trial→paid + ₹300 referral each side + 10% sibling + ₹500 long-loyalty**.
- Zero paid marketing in Year 1 — growth is referrals + campus drives + RWA + organic.
- Blended platform margin at steady state: **~₹1,062/student/month** (8.9% of GMV).
- Year 1 target: **800 active students, ₹3.8 Cr GMV, ₹36L platform revenue, ₹20L operating profit.**

---

## References

- [BUSINESS_PLAN.md](BUSINESS_PLAN.md) — full business plan and GTM.
- [BYPASS_STRATEGY.md](BYPASS_STRATEGY.md) — retention levers and adversarial scenarios.
- [BUSINESS_PLAN_SPEC.md](BUSINESS_PLAN_SPEC.md) — original forward-looking spec.
- [client/src/pages/TutorAgreement.jsx](client/src/pages/TutorAgreement.jsx) — §4 (Fees, Tiers, Incentives) maps directly to §4 of this document.
