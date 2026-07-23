# UI Review — Portfolio (Hanzala Qureshi)

**Date:** 2026-07-23
**Audit type:** Retroactive 6-pillar visual audit
**Design contract:** None — audited against abstract 6-pillar standards
**Viewport tested:** 1440×900 (desktop), 390×844 (mobile)

---

## Score Overview

| Pillar | Score | Rating |
|--------|:-----:|--------|
| Copywriting | 4/4 | Excellent |
| Visuals | 3/4 | Good |
| Color | 3/4 | Good |
| Typography | 3/4 | Good |
| Spacing | 3/4 | Good |
| Experience Design | 3/4 | Good |
| **Overall** | **19/24** | **Good** |

---

## Pillar 1: Copywriting — 4/4

**Clear, confident, consistent voice throughout.**

### Strengths
- **Distinctive tone:** "I build calm, capable software — the kind that quietly works" — positions the developer as reliable, not loud. Consistent across hero, about, experience, and footer.
- **Signal-to-noise ratio:** No filler. Every sentence carries weight. The experience section bullet points are specific ("10+ production web applications", "affiliate partnership with MSG91"), not vague resume-speak.
- **Work cards follow a tight structure:** Problem → Build → Outcome. Three lines each. No fluff. The reader can scan and immediately understand scope.
- **Social proof integrated naturally:** Proof pills ("10+ Production Applications", "Clients in 🇮🇳 🇦🇪 🇬🇧") sit below the CTA, not in a separate section.
- **Footer CTA is on-brand:** "Let's build something quiet and capable" echoes the hero's tone.

### Issues
- None.

---

## Pillar 2: Visuals — 3/4

**Strong visual system, held back by a few rough edges.**

### Strengths
- **Consistent card language:** Same 3-column grid, same body style, same image treatment across all work cards.
- **Good use of accent framing:** The `.about-photo::after` pseudo-element draws a subtle accent-colored frame around the profile photo offset — a nice detail.
- **Terminal window:** The code-terminal aesthetic for the skills section is a creative touch that aligns with the developer audience.
- **The iPhone 16 Pro mockup** (liquidframe CSS) is an impressive piece of CSS craftsmanship — pure CSS device frame with titanium bezel, physical buttons, Dynamic Island, and Safari chrome. Works well as a visual centerpiece.
- **Section transitions** via `reveal` class / GSAP ScrollTrigger provide smooth fade-in as user scrolls.

### Issues
- **3D robot mascot (`#botStage`) fails gracefully** — Three.js WebGL context error in headless, but no visible fallback. On devices without WebGL support, the area is just empty.
- **Work card images are PNG screenshots** — inconsistent aspect ratios. The Rifaah Dubai and Gottlich cards show full-width screenshots, but they get crushed into the fixed card layout. On a retina screen, PNG screenshots at this size can look soft.
- **The secondary work cards** (Akmal Creative Hub, Gulshan Trust) sit in a separate `.work-secondary` container below the grid with a different layout (stacked, not gridded). The visual break is intentional but the transition from the tight 3-column grid to full-width cards feels abrupt.
- **Mobile hero layout** stacks everything vertically (phone → copy) — functional but loses the visual impact of the phone mockup sitting next to the text.

---

## Pillar 3: Color — 3/4

**Pleasant warm palette, good contrast — some accessibility gaps.**

### Strengths
- **Warm, cohesive palette:** `--bg: #FAF7F1` (warm off-white) + `--ink: #211D18` (near-black) creates a paper-and-ink feel. The gold accent (`#8A6A34`, `#5F4A24`) adds warmth without being aggressive.
- **Good background alternation:** Alternating `.alt` sections with `--bg-alt: #F2EBDD` provide visual breathing room between sections.
- **Terminal section** uses a dark `--code-bg: #1D1A15` with `#8FBB99` green and `#EDE7D8` text — creates clear contrast against the light sections on either side.
- **Accent color is used sparingly** — only for the `//` prefix, `[]` brackets, bullet dots, and hover states. It draws attention without overwhelming.

### Issues
- **Gold-on-warm contrast is borderline for accessibility:**
  - `--accent: #8A6A34` on `--bg: #FAF7F1` → contrast ratio approximately 3.6:1. Fails WCAG AA for normal text (requires 4.5:1). The accent is only used for small decorative elements (brackets, bullet dots) so the practical impact is low, but worth noting.
  - `--accent-deep: #5F4A24` on `--bg: #FAF7F1` → approximately 5.2:1. Passes WCAG AA for normal text. Used for hover states — acceptable.
- **No dark mode support.** The palette is warm-light only. A user who prefers dark mode gets the full bright background.

---

## Pillar 4: Typography — 3/4

**Good hierarchy and font pairing — could be more intentional.**

### Strengths
- **Three-font system is well-chosen:**
  - `--serif` (Iowan Old Style / Palatino) — headings. Warm, humanist. Matches the "calm, capable" tone.
  - `--sans` (system stack) — body. Clean and readable at all sizes.
  - `--mono` (SF Mono / Menlo) — metadata, tags, labels. Signals "developer-made" without being obtrusive.
- **Size hierarchy is clean:** Name at 62px → section headings → 18px body → 11-13px labels. The 62px hero name is the biggest statement on the page, as it should be.
- **Letter-spacing used judiciously:** Navigation links at 0.08em, eyebrow at 0.02em — gives them a slightly elevated feel without looking spaced-out.

### Issues
- **System font stack for body:** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ...` is safe but generic. A portfolio aiming for a bespoke feel should consider a custom typeface pairing (e.g., a distinct sans for body that complements Palatino for headings).
- **Line length on hero subhead:** The subhead "I build calm, capable software — the kind that quietly works — for clients across India, the UAE, and the UK" runs approximately 75 characters at 18px on desktop — slightly above the 65-character ideal for reading comfort.
- **Font sizes are all hardcoded in px** (62px, 42px mobile, 34px, 24px, 18px, etc.). A `clamp()` or `rem`-based scale would make the typography scale more gracefully across intermediate viewport widths.

---

## Pillar 5: Spacing — 3/4

**Generally well-spaced — some inconsistency at section boundaries.**

### Strengths
- **Consistent section padding:** Sections use `padding: 64px 0` (and `80px 0` on hero). Creates a steady rhythm.
- **Wrap constraint:** `max-width: 1040px` with `padding: 0 32px` gives good readability across viewports.
- **Card gaps:** The `gap: 24px` on work-grid and about-grid is generous without wasting space.
- **The `.proof-strip`** uses a tightly spaced `gap: 10px` with 9px/16px pill padding — dense but legible.

### Issues
- **Section top padding is inconsistent:**
  - `.hero` uses `padding: 110px 0 40px` — the 110px accounts for the fixed nav.
  - Other sections use `padding: 64px 0` — which means the hero has ~46px more top space than any other section. This is intentional (hero needs breathing room) but creates a visual jump.
  - `.terminal-section` uses `padding: 64px 0` with an added 40px gradient overlay at the top — spatial rhythm maintained.
- **Section transition gap:** Sections with `.alt` class (alternating background) have no gap between them — the `padding: 64px 0` touches. This is fine, but the white-space band between non-alt sections is the same 64px of padding. The rhythm is consistent, just worth noting.
- **The "also built" section** below the work grid uses a narrower `.label` + bullet-list layout — the spacing `gap: 8px` between items feels tighter than the work cards above.

---

## Pillar 6: Experience Design — 3/4

**Functional, fast, the right interactions — some polish gaps.**

### Strengths
- **Zero-dependency page setup:** Open `index.html` directly and it works. No build step, no npm install needed. The ideal developer portfolio deployment.
- **Smooth scroll behavior:** `html{ scroll-behavior: smooth }` makes anchor navigation (nav links) feel fluid.
- **GSAP scroll reveals:** The `.reveal` sections fade/translate in as the user scrolls. Subtle, not distracting. Sets the right pace.
- **Click-to-scroll CTA:** "See the work" arrow scrolls the user to the iPhone visual — a nice guided tour mechanism.
- **Proxy site switching:** The iPhone mockup acts as a live preview of client sites. Clicking a `.site-btn` loads a different proxied site in the iframe. This is the portfolio's standout interactive feature.
- **Favicon exists:** After earlier QA fixes, a proper favicon is served.
- **Mobile responsive:** Grid collapses to single-column below 860px. The phone mockup repositions above the text. Navigation links are preserved.

### Issues
- **No loading state for proxy iframes:** When switching between proxy sites, the iframe shows a white flash while the new page loads. A skeleton loader or a simple fade transition would smooth this.
- **No 404/content fallback for proxies:** If a proxied site fails to load (server down, URL changed), the iframe shows a browser error page. A custom fallback would be more polished.
- **Mobile nav is the same as desktop nav:** No hamburger menu or collapsed nav on mobile. At 390px viewport width, the nav links (Services, Experience, Work, Skills, Contact) are cramped and overflow the viewport.
- **CTA scroll targets `hero-visual`** — on mobile (where the phone is stacked above the copy), the scrollTo jumps up, which may be disorienting. Should target `#work` on mobile or use a different scroll target.
- **No `:focus-visible` styles** — keyboard navigation (tabbing through links) has no visible focus ring. Users navigating without a mouse get no visual feedback.

---

## Key Findings Summary

### Top 3 Fixes

| # | Issue | Pillar | Impact | Suggested Fix |
|---|-------|--------|--------|---------------|
| 1 | **No focus-visible styles** | Experience | Users navigating without a mouse (keyboard / screen reader) get zero visual feedback on focused elements. | Add `:focus-visible{ outline: 2px solid var(--accent); outline-offset: 2px; }` globally. |
| 2 | **Mobile nav overflow** | Experience | Nav links overflow the viewport on phones <400px. No hamburger menu. | Collapse nav into hamburger menu below 720px, or reduce nav link count / spacing. |
| 3 | **Generic body font stack** | Typography | System font stack is safe but doesn't reinforce the brand's distinctive tone. | Pair a characterful sans (e.g., Inter, Space Grotesk, or DM Sans) with the existing serif headings. |

### Bonus Polish Items

| # | Issue | Suggested Fix |
|---|-------|---------------|
| 4 | No proxy iframe loading state | Add `<div class="iframe-loader">` that shows while iframe content loads |
| 5 | Image aspect ratio on work cards | Constrain card images to a fixed ratio (e.g., `aspect-ratio: 16/10`) |
| 6 | No dark mode | Add `prefers-color-scheme: dark` overrides for the warm palette |
| 7 | Hardcoded font sizes | Convert to `clamp()` for fluid typography across viewports |

---

## Screenshots

| Viewport | Screenshot |
|----------|-----------|
| Desktop (1440×900) — hero | `/tmp/ui-fullpage.png` |
| Desktop — terminal section | `/tmp/ui-terminal.png` |
| Desktop — about section | `/tmp/ui-about.png` |
| Desktop — work section | `/tmp/ui-work.png` |
| Desktop — footer | `/tmp/ui-footer.png` |
| Mobile (390×844) | `/tmp/ui-mobile2.png` |

---

*Audit generated by gsd-ui-review — 6-pillar visual audit.*
