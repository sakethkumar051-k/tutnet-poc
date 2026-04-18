# Tutnet — Design System

A living reference for building marketing and product UI that feels consistent with the Tutnet landing page. Treat this as the source of truth: new components and pages should look like they belong next to the landing.

---

## 1. Brand Personality

- **Warm, trustworthy, local.** Tutnet is a neighborhood-scale tutoring marketplace, not a corporate ed-tech giant.
- **Calm over clever.** Plenty of whitespace, generous type sizes, minimal chrome.
- **Accountable.** Every surface should feel verifiable — real photos, real numbers, real reviews.

If a design decision makes the product feel louder, busier, or more generic — reject it.

---

## 2. Color Palette

Defined in [tailwind.config.js](tailwind.config.js).

| Token | Hex | Role |
|---|---|---|
| `navy-950` | `#0a1120` | Primary text, dark sections, primary CTA background |
| `navy-900` | `#0d1530` | Dark section gradient secondary, hover state on navy |
| `royal` | `#1939e5` | Accent — highlights, subject chips, verified badge text, blue blobs |
| `royal.dark` | `#1530c4` | Royal hover |
| `royal.light` | `#2a4df0` | Royal on dark backgrounds |
| `lime` | `#c8ee44` | Primary accent — CTAs, pills, stat icons, "Soon" tags |
| `lime.dark` | `#b5d93d` | Numeric/stat accent on light backgrounds |
| `lime.light` | `#d4f45c` | Lime hover |
| `gray-500` | Tailwind | Body copy |
| `gray-400` | Tailwind | Secondary meta text |
| `gray-100` | Tailwind | Borders, dividers, skeletons |
| `#f7f7f7` | literal | Section wash (alternating section background) |

### Usage rules
- **Never put navy text on royal.** Contrast is too low.
- **Lime is the "click me" signal.** If there is more than one lime thing on a screen, demote one.
- **Royal = information.** Subject tags, info cards, rating stars are royal-tinted, not lime.
- **Black and pure white are rare.** Text defaults to `navy-950`; neutral surfaces use `#f7f7f7` or `white`.
- Tint patterns: `bg-royal/10` + `text-royal` for soft chips; `bg-lime/20` + `text-navy-950` for soft badges with the brand-hue.

---

## 3. Typography

- **Family:** DM Sans (loaded in `tailwind.config.js` as `sans` and `display`).
- **Weights used:** 400 (rare), 500, 600 (`font-semibold`), 700 (`font-bold`), 800 (`font-extrabold`).

### Scale

| Role | Size | Weight | Example |
|---|---|---|---|
| Display (hero H1) | `clamp(2.5rem, 5vw, 4rem)` | `font-extrabold` | Landing hero, About hero |
| Section H2 | `text-3xl sm:text-[2.5rem]` | `font-extrabold` | "Subjects We Cover" |
| Card / subsection H3 | `text-[15px]` – `text-lg` | `font-bold` | Tutor name, value card title |
| Body | `text-[15px]` – `text-[16px]` | `font-normal` | Paragraphs |
| Meta / caption | `text-xs` – `text-[13px]` | `font-medium` / `font-semibold` | Card footers, dot-separated meta |
| Eyebrow / label | `text-xs` `uppercase` `tracking-[0.15em]` or `tracking-wide` | `font-bold` | "Our Mission", "How It Works" |

### Rules
- **Headlines use `leading-[1.05]`–`leading-tight` and `tracking-tight`.** Never default leading on display type.
- **Numerals in stats are extrabold, one color (navy-950).** Let the label (`text-gray-400`) do the softening.
- **Do not underline links.** Use color change (`hover:text-royal` / `hover:text-white`) instead.

---

## 4. Spacing & Layout

- **Page container:** `max-w-[1300px] mx-auto px-6 lg:px-10`. This is the standard outer shell for every public page.
- **Section vertical rhythm:** `py-20` for major sections. Hero sections use `min-h-[calc(100vh-72px)] flex items-center` to fill the viewport under the 72px navbar.
- **Alternating backgrounds:** sections alternate between `bg-white` and `bg-[#f7f7f7]` to create rhythm. Dark sections (`bg-navy-950`) are used sparingly — once per page max, usually the final CTA.
- **Grids:** 12-col mental model. Common ratios:
  - Hero: `grid-cols-1 lg:grid-cols-2`
  - Feature cards: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` with `gap-5`
  - Tutor/course grid: `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 auto-rows-fr`
- **Card padding:** `p-6` (feature cards) or `p-8`–`p-10` (hero/CTA cards).

---

## 5. Radius

We use **large, friendly radii**. Sharp corners feel wrong in this brand.

| Radius | Token | Use |
|---|---|---|
| Pills / buttons | `rounded-full` | All primary and secondary CTAs, chips, badges, pagination, sort selects |
| Cards | `rounded-2xl` or `rounded-3xl` | Content cards, stat cards, floating UI |
| Dark feature blocks | `rounded-3xl` | Royal mission card, navy CTA blocks |
| Inputs | `rounded-xl` (inside cards) / `rounded-full` (search bars on dark sections) | Form fields |
| Avatars / icon tiles | `rounded-xl` – `rounded-2xl` | Never circular avatars — we use soft-square |

**Rule:** never mix `rounded-lg` with `rounded-2xl` in the same card. Pick one scale per component.

---

## 6. Buttons & CTAs

Three tiers, always with `rounded-full`.

### Primary — Lime (on light backgrounds)
```
inline-flex items-center px-7 py-3.5 text-[15px] font-bold
text-navy-950 bg-lime rounded-full hover:bg-lime-light
transition-colors shadow-sm
```

### Primary — Lime (on dark backgrounds)
Same as above. Lime works on both; it's the main "yes click me".

### Secondary — Navy solid
```
inline-flex items-center px-7 py-3.5 text-[15px] font-bold
text-white bg-navy-950 rounded-full hover:bg-navy-900
```

### Tertiary — Ghost outline (on dark only)
```
border border-white/20 text-white hover:bg-white/5 rounded-full
```

### Small buttons (cards, dense UI)
Use `py-2.5 px-4 text-[12px] font-bold rounded-full`. Same color rules.

**Don't:**
- Don't use `rounded-lg` on CTAs.
- Don't use gray-900 for primary buttons. Use `bg-navy-950`.
- Don't stack three CTAs in a row — max two per decision point.

---

## 7. Cards

Every content card follows the same anatomy:

```jsx
<div className="bg-white rounded-3xl border border-gray-100
                hover:shadow-[0_12px_40px_-10px_rgba(30,58,138,0.18)]
                hover:border-gray-200 hover:-translate-y-0.5
                transition-all duration-300">
   {/* body */}
</div>
```

- **Border** is always `border-gray-100` at rest.
- **Shadow** appears on hover, colored by a subtle royal tint — never pure black.
- **Lift** of `-translate-y-0.5` on hover is the only motion.
- **Interior padding** scales with importance: `p-5` dense, `p-6` default, `p-8`+ hero cards.

### Feature icon tile (inside a card)
```
w-12 h-12 rounded-xl bg-royal/10 flex items-center justify-center
```
Icon inside is `w-6 h-6 text-royal stroke-[1.5]`. On hover-card groups, swap to `bg-royal text-white`.

---

## 8. Forms & Inputs

- Inputs live in a white wrapper card — never floating on `#f7f7f7`.
- Field style:
  ```
  py-2.5 text-sm bg-white border border-gray-200 rounded-xl
  focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal/40
  placeholder:text-gray-400
  ```
- **Focus state** is `royal` — never blue-500 or teal.
- Segmented controls (`All / Online / Home`) use `rounded-full` pill backgrounds with the active pill as `bg-navy-950 text-white`.

---

## 9. Badges & Pills

Three reusable recipes:

| Variant | Classes | When |
|---|---|---|
| Eyebrow (above H1) | `inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-lime/20 text-navy-950 text-xs font-bold tracking-wide` + 2px pulsing lime dot | Top of heroes |
| Subject chip | `px-2.5 py-1 text-[11px] font-semibold text-royal bg-royal/10 rounded-full` | Tutor subjects, taxonomy |
| "Soon" tag | `text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-lime/20 text-lime` | Nav items, feature flags |

Status pills on tutor cards use the same style: `bg-lime/20 text-navy-950 border border-lime/40` (pending), `bg-royal/10 text-royal border border-royal/20` (booked).

---

## 10. Decorative Elements

Used sparingly to add life to otherwise flat sections.

- **Blurred blobs:** `absolute w-80 h-80 bg-royal/10 rounded-full blur-[100px]`. Pair with `overflow-hidden` on the section.
- **Lime dot grid:** 4×4 grid of `w-2 h-2 rounded-full bg-lime` — reserved for the landing hero's right illustration.
- **Soft circles:** `absolute w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2` — sits on royal/navy cards.

Never add more than two decorative elements per section.

---

## 11. Iconography

- **Source:** inline Heroicons (outline preferred, `strokeWidth={1.5}` or `{2}`).
- **Sizing:** `w-5 h-5` (small/inline), `w-6 h-6` (feature tile), `w-8 h-8` (empty states).
- **Color:** matches parent text color. Never introduce a custom icon color.
- A check inside a lime pill is the universal "success / verified" marker: `text-navy-950 stroke-[3]` on `bg-lime`.

---

## 12. Motion

- **Hover transitions:** `transition-colors` or `transition-all duration-300`. Avoid 150ms — too snappy.
- **Card lift:** `hover:-translate-y-0.5` only. Don't scale.
- **Fade-in on list items:** stagger `animationDelay: Math.min(i * 60, 400)ms` with a `fade-in-up` keyframe.
- **Pulses:** reserved for a live/soon indicator. Never on CTAs.

---

## 13. Navbar & Global Shell

- **Height:** 72px. Do not change.
- **Public variant:** `bg-navy-950`, logo inverted to white (`brightness-0 invert`) at `h-9`, link hover `text-white`.
- **Join Now CTA:** always lime, always right-aligned.
- **Nav link count:** 4 maximum. Current set: Home · About Us · Courses (Soon) · Find Tutors.

---

## 14. Page Patterns (reusable skeletons)

### Marketing hero
1. Eyebrow pill (lime-tinted) — one line.
2. H1 with one color accent (split on royal or lime-dark) — max 2 lines.
3. Body paragraph — max 2 lines, `max-w-md`.
4. Two CTAs — primary lime + secondary navy.
5. Stats row or illustrated device panel on the right.
6. `min-h-[calc(100vh-72px)]` to lock to viewport.

### Feature grid section
- Centered H2 + supporting paragraph (`mt-3 text-gray-500 max-w-xl mx-auto`).
- 4-col card grid, each card with icon tile + title + 1-sentence description.

### Dark CTA (final section)
- `bg-navy-950`, blurred royal/lime blobs behind content.
- Huge H2 (`text-5xl lg:text-6xl`) with one lime-accented word.
- Two CTAs: lime primary + ghost outline secondary.

### Coming soon / placeholder page
See [src/pages/Courses.jsx](src/pages/Courses.jsx) — a full viewport section with an eyebrow "Coming Soon" pill, headline with 2 color accents, bullet list with lime checks, a mock product card on the right with a rotated "Launching Soon" ribbon.

---

## 15. What to avoid

- Teal, emerald, amber, rose accents. The palette is fixed: navy / royal / lime / grays only. Status colors are rendered via lime/royal tints.
- Soft drop shadows on every element. Shadows are a hover signal, not a resting state.
- Rounded `md` or `lg` corners. We round big.
- Full-width gray backgrounds without a headline. Every `#f7f7f7` section must have content that justifies the break.
- Multiple competing CTAs on one screen. One primary action per viewport.

---

## 16. Where the palette lives in code

- Tailwind tokens: [tailwind.config.js](tailwind.config.js) (`navy`, `royal`, `lime`)
- Global styles: [src/index.css](src/index.css)
- Canonical examples:
  - Landing — [src/pages/Home.jsx](src/pages/Home.jsx)
  - About — [src/pages/About.jsx](src/pages/About.jsx)
  - Coming soon — [src/pages/Courses.jsx](src/pages/Courses.jsx)
  - Listing page — [src/pages/FindTutors.jsx](src/pages/FindTutors.jsx)
  - Card component — [src/components/TutorCard.jsx](src/components/TutorCard.jsx)
  - Filter bar — [src/components/TutorSearch.jsx](src/components/TutorSearch.jsx)
  - Navbar — [src/components/Navbar.jsx](src/components/Navbar.jsx)

When in doubt, open [Home.jsx](src/pages/Home.jsx) and match what's already there.
