# CYC Survey Platform — Frontend Overhaul (codecats aesthetic)

> **Handoff note:** This doc is a self-contained implementation brief. It can be executed by
> an agent (e.g. Antigravity) with **no prior context**. Read the whole thing once, then work
> the **Task Checklist** at the bottom in order. Every path, token value, and constraint you
> need is inline.

---

## Context — what & why

The CYC Survey Platform (`/Users/zishine/VSCODE/CYC/survey_plat`) is a functional but plainly
styled Next.js survey app. The owner wants a **massive frontend overhaul** to make it look and
feel like a sibling project, **codecats** (`/Users/zishine/VSCODE/codecats`) — a polished,
animated, "premium indie" marketing/app aesthetic.

**Crucial constraint: keep CYC's brand.** The overhaul adopts codecats' _design system,
motion language, layout patterns, and signature set-pieces_ — but **keeps CYC's existing
colors and logos**. We are NOT importing codecats' coral/cream palette; we map CYC's
teal/navy/gold into codecats' token architecture.

Both apps are the **same stack** (Next.js 16, React 19, Tailwind v4 CSS-first, framer-motion),
so this is a clean port, not a rewrite.

### Decisions locked in (from the owner)

| Decision         | Choice                                                                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Scope**        | **Everything, including admin** (dashboard, builder, edit, results)                                                                                                                               |
| **Dark mode**    | **Yes** — add codecats' two-layer token system + `next-themes` toggle w/ View-Transitions cross-fade. Derive a CYC dark palette.                                                                  |
| **Typography**   | **Adopt the display stack** — big bold display headings + italic-serif accent word (the "sans + italic serif" contrast).                                                                          |
| **Landing hero** | **Codecats-style hero** — replace the 3D spinning carousel + 2s logo intro with an aurora-gradient hero + flip-words headline + scroll-reveal sections; rebuild survey cards as bloom/tilt cards. |

### CYC brand assets — KEEP EXACTLY

- **Colors:** teal `#0CB7C4` (primary), navy `#04377E` (headings/secondary), gold `#F5C518` (CTA).
  Supporting: teal-dark `#0A8A85`/`#0CA7A1`, teal-tint `#e6f8f9`, near-black `#1a1a1a` (text on gold).
- **Logos (do not replace):** `public/logo.png` (wordmark — header/footer), `public/CYC_Logo.png`
  (emblem — landing hero), `public/icon.png` (favicon). Also `src/app/icon.png`.

---

## Source of truth: the codecats design system

Both projects: Next.js 16 App Router, React 19, **Tailwind v4 CSS-first** (tokens live in
`globals.css` `@theme` blocks — **no `tailwind.config.js`**), framer-motion.

**codecats extra deps we need:** `clsx`, `tailwind-merge`, `next-themes`, `motion` (the
`motion/react` package — codecats components import from it). Optional: `@phosphor-icons/react`
(duotone step icons; lucide is otherwise fine). `three`/`@react-three/*` are in codecats'
package.json but **unused** — the aurora is pure CSS. **Do not add three.js.**

### The two-layer token trick (the heart of the port)

Raw palette values are `--c-*` vars on `:root` / `.dark`. Tailwind color utilities are mapped to
them via `@theme inline`, so utilities like `bg-cream text-ink text-teal` resolve **at use-site**
and auto-swap in dark mode. Dark mode is class-based:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

### Signature look & feel to replicate

- One accent family + soft supporting tints; everything theme-swappable; dark = same brand on near-black.
- Playful softness: rounded everything (`rounded-2xl` → `rounded-[2.5rem]`, pills `rounded-full`),
  warm blurred shadows (`shadow-cute`), blurred color blobs behind hero/CTA/pricing, backdrop-blur glass navbar.
- Big confident typography: bold display up to `text-8xl`, `leading-[1.05] tracking-tight`, plus a
  single italic-serif accent word in the brand accent color.
- Cohesive motion: expo-out ease `[0.16, 1, 0.3, 1]` everywhere, `whileInView` + `once:true` scroll
  reveals, springs for pops, **every animated component honors `prefers-reduced-motion`**.
- Set-pieces: CSS aurora bg, 3D `rotateX` scroll reveal, grayscale→color blooming skewed card stacks,
  kinetic word-by-word mask reveals, letter-by-letter flip-words, animated number/price reveals.
- Hover vocab: lift `hover:-translate-y-0.5`, press `active:scale-[0.97]`, shift to accent on hover.
  Navbar transitions transparent→glass on scroll.

---

## 1. New design tokens — replace `src/app/globals.css`

The current file (short) defines CYC tokens and **disables dark mode** via
`@variant dark (&:where(.never-use-dark-mode))`. Replace it with the codecats architecture,
skinned to CYC. **Full replacement below** — this is the single most important artifact.

```css
@import 'tailwindcss';

/* Class-based dark mode (next-themes sets .dark on <html>) */
@custom-variant dark (&:where(.dark, .dark *));

/* Map Tailwind color utilities to swappable CSS variables.
   `inline` makes utilities reference the var at use-site so .dark overrides apply. */
@theme inline {
  --color-cream: var(--c-bg);
  --color-cream-deep: var(--c-bg-2);
  --color-card: var(--c-surface);
  --color-border: var(--c-border);

  --color-teal: var(--c-teal);
  --color-teal-deep: var(--c-teal-deep);
  --color-teal-soft: var(--c-teal-soft);

  --color-gold: var(--c-gold);
  --color-gold-deep: var(--c-gold-deep);
  --color-gold-soft: var(--c-gold-soft);

  --color-navy: var(--c-navy);
  --color-navy-soft: var(--c-navy-soft);

  --color-ink: var(--c-ink);
  --color-ink-soft: var(--c-ink-soft);

  /* Back-compat aliases so existing var(--color-cyc-*) usages keep working
     AND now inherit dark-mode swapping for free. */
  --color-cyc-primary: var(--c-teal);
  --color-cyc-secondary: var(--c-navy);
  --color-cyc-accent: var(--c-gold);
  --color-cyc-bg: var(--c-bg);
  --color-cyc-divider: var(--c-border);
  --color-cyc-text-heading: var(--c-ink);
  --color-cyc-text-body: var(--c-ink-soft);
}

@theme {
  --font-display: var(--font-outfit), system-ui, sans-serif;
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-script: var(--font-newsreader), ui-serif, serif;

  --shadow-cute: 0 22px 48px -20px rgba(4, 55, 126, 0.18);
  --shadow-cute-sm: 0 12px 26px -14px rgba(4, 55, 126, 0.12);

  --animate-float: float 6s ease-in-out infinite;
  --animate-drift-a: drift-a 24s ease-in-out infinite;
  --animate-drift-b: drift-b 30s ease-in-out infinite;
  --animate-drift-c: drift-c 36s ease-in-out infinite;
  --animate-aurora: aurora 60s linear infinite;
}

@keyframes aurora {
  from {
    background-position:
      50% 50%,
      50% 50%;
  }
  to {
    background-position:
      350% 50%,
      350% 50%;
  }
}

/* ── Light theme (default) — CYC teal/navy/gold on cool white ── */
:root {
  --c-bg: #f7fafc;
  --c-bg-2: #eef4f7;
  --c-surface: #ffffff;
  --c-border: #e3eaf1;

  --c-teal: #0cb7c4;
  --c-teal-deep: #0a8a85;
  --c-teal-soft: #e6f8f9;

  --c-gold: #f5c518;
  --c-gold-deep: #e0af00;
  --c-gold-soft: #fef6d5;

  --c-navy: #04377e;
  --c-navy-soft: #e8eef6;

  --c-ink: #062a5e;
  --c-ink-soft: #5b6b82;

  color-scheme: light;
}

/* ── Dark theme — teal/gold on deep navy-black ── */
.dark {
  --c-bg: #0b1220;
  --c-bg-2: #0f1829;
  --c-surface: #141f33;
  --c-border: #26334a;

  --c-teal: #22c9d6;
  --c-teal-deep: #4fd9e4;
  --c-teal-soft: #0e2a2e;

  --c-gold: #f7ce3a;
  --c-gold-deep: #ffd84d;
  --c-gold-soft: #33290a;

  --c-navy: #9db6d8;
  --c-navy-soft: #1a2740;

  --c-ink: #eaf1fa;
  --c-ink-soft: #9fb0c6;

  color-scheme: dark;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}
@keyframes drift-a {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  50% {
    transform: translate3d(50px, -28px, 0) scale(1.12);
  }
}
@keyframes drift-b {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1.05);
  }
  50% {
    transform: translate3d(-44px, 24px, 0) scale(1);
  }
}
@keyframes drift-c {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  50% {
    transform: translate3d(28px, 32px, 0) scale(1.15);
  }
}

html {
  scroll-behavior: smooth;
  overflow-x: hidden;
}
body {
  background: var(--c-bg);
  color: var(--c-ink);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  overflow-x: hidden;
}
::selection {
  background: var(--c-teal);
  color: #fff;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Keep** the existing utility classes from the old globals.css (`.btn-primary`, `.btn-secondary`,
`.card`, `.wavy-underline`) but **re-point them to the new tokens** (e.g. `.btn-primary` uses
`bg-gold text-[#1a1a1a]`; `.card` uses `bg-card border-border shadow-cute-sm rounded-2xl`;
`.wavy-underline` stays teal). `.wavy-underline` is used by the survey glossary tooltips — do not
remove it.

> **Utility-name mapping when porting codecats components** (codecats → CYC):
> `blush → teal`, `blush-deep → teal-deep`, `blush-soft → teal-soft`,
> `butter → gold`, `butter-soft → gold-soft`,
> `grape → navy`, `grape-soft → navy-soft`,
> `mint/mint-soft → teal/teal-soft`.
> `cream`, `cream-deep`, `card`, `border`, `ink`, `ink-soft` keep the same names.

---

## 2. Fonts + providers — `src/app/layout.tsx`

Current: Inter only; wraps everything in `<LanguageProvider>` → `<Header/>` → `<main class="min-h-screen w-full max-w-7xl mx-auto ...">` → `<Footer/>`; sets `<html style={{fontSize:'85%'}}>`; body `bg-slate-50 text-slate-800`.

**Changes:**

1. Add fonts via `next/font/google`: **Outfit** (`--font-outfit`, weights 400–800, display/headings),
   **Newsreader** (`--font-newsreader`, italic, weights 400/500/600, accent word). Keep **Inter**
   (`--font-inter`) as body. Apply all three CSS vars to `<html>` className.
2. `<html lang="en" suppressHydrationWarning>` (required for next-themes).
3. Wrap the tree in `<ThemeProvider attribute="class" defaultTheme="system" enableSystem
disableTransitionOnChange>` (from the ported `components/theme-provider.tsx`). Keep
   `<LanguageProvider>` inside/around it (order doesn't matter, but **do not remove it** — i18n).
4. **Remove `fontSize: 85%`** — the display type is designed at 100%. (Global change: sanity-check a
   few screens after.) Body → `bg-cream text-ink` (was `bg-slate-50 text-slate-800`).
5. **Container restructure:** the aurora hero and full-bleed sections must break out of
   `max-w-7xl mx-auto`. Move the width clamp OUT of the root `<main>`. Let each page own its width
   (public marketing pages = full-bleed sections with inner `max-w-6xl px-5` wrappers; app/admin
   pages wrap their own content in `max-w-7xl mx-auto`). Simplest: root `<main>` becomes
   `className="flex-1 w-full"` and every page adds its own container.

---

## 3. Files to port from codecats (copy, then apply the color-name mapping)

Create these in survey_plat. They are self-contained (depend only on `cn`, `motion`, tokens):

| New file (survey_plat)                             | From codecats      | Notes                                                                                                                                                                                                      |
| -------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/utils.ts`                                 | `src/lib/utils.ts` | the `cn()` helper (clsx + tailwind-merge).                                                                                                                                                                 |
| `src/components/theme-provider.tsx`                | same               | next-themes wrapper (+ its React-19 console.error suppression).                                                                                                                                            |
| `src/components/ui/aurora-background.tsx`          | same               | CSS aurora bg. Recolor gradient stops to teal/navy/gold.                                                                                                                                                   |
| `src/components/ui/flip-words.tsx`                 | same               | rotating headline word (letter-by-letter).                                                                                                                                                                 |
| `src/components/ui/kinetic-text-reveal.tsx`        | same               | word-by-word mask reveal for headings.                                                                                                                                                                     |
| `src/components/ui/display-cards.tsx`              | same               | skewed grayscale→color bloom card stack.                                                                                                                                                                   |
| `src/components/ui/container-scroll-animation.tsx` | same               | 3D rotateX scroll reveal (optional; use for a "peek" section).                                                                                                                                             |
| `src/components/Reveal.tsx`                        | same               | **the workhorse** scroll fade-up wrapper. Use everywhere.                                                                                                                                                  |
| `src/components/Button.tsx`                        | same               | pill button. **Adapt variants to CYC:** `primary` = gold (`bg-gold text-[#1a1a1a] shadow-cute hover:bg-gold-deep`), `ghost` = `bg-card ring-2 ring-border hover:ring-teal`, `teal` = `bg-teal text-white`. |
| `src/components/ThemeToggle.tsx`                   | same               | sun/moon, uses View Transitions API. Add into Header.                                                                                                                                                      |

Import note: codecats components `import { motion } from "motion/react"`. Either **add the `motion`
package** (recommended — verbatim port) or find/replace imports to `"framer-motion"` (already
installed). Pick one and be consistent.

---

## 4. New shared UI primitives (create these — reduces inline-class sprawl)

survey_plat currently has **no** shared Button/Card/Input/Modal — styling is inline across huge
pages (survey 1062 lines, admin builder 988, edit 1269). To restyle admin sanely, create a small
primitives set and swap inline usages progressively:

- `src/components/ui/Card.tsx` — `rounded-3xl border border-border bg-card shadow-cute-sm` shell.
- `src/components/ui/Input.tsx`, `Textarea.tsx`, `Select.tsx` — themed form controls
  (`bg-card border-border focus:ring-2 focus:ring-teal rounded-xl`).
- `src/components/ui/Modal.tsx` — codecats glass dialog (`bg-card/95 backdrop-blur-md
rounded-3xl shadow-cute`, `AnimatePresence` scale/opacity).
- `src/components/ui/SectionHeading.tsx` — eyebrow (`uppercase tracking-[0.18em] text-teal`) +
  big display heading, wrapped in `Reveal`.
- Reuse the ported `Button.tsx` everywhere instead of `.btn-primary`/inline.

---

## 5. Page-by-page overhaul

> **Golden rule for every page:** restyle markup only. **Do not touch** state bindings, `t()` i18n
> calls, API calls, localStorage keys, or logic branches. See the Do-Not-Break list (§6).

### Public

- **`src/components/layout/HeaderFooter.tsx` (Header)** — rebuild as codecats `Navbar`: fixed,
  `z-50`, transparent → glass on scroll (`useScroll`+`useMotionValueEvent`, >48px →
  `bg-card/90 shadow-cute-sm backdrop-blur-md`). Keep `/logo.png`, keep the EN/Français/中文
  language switcher (wire to `useLanguage`), **add `<ThemeToggle/>`**. Keep the landing-only 2s
  fade-in behavior (mirrors the intro).
- **`src/components/layout/Footer.tsx`** — restyle to codecats footer: `border-t border-border
bg-card`, brand column (`/logo.png` + blurb), Instagram (`@thecyc_`) + mailing-list links,
  `hover:text-teal`. Keep `thecyc.org` links. Stays hidden on `/admin/*`.
- **`/` `src/app/page.tsx`** — **replace** the 3D carousel + 2s CYC_Logo intro with:
  `AuroraBackground` hero → headline "MAKE YOUR VOICE" + `FlipWords`/Newsreader-italic accent
  ("heard" in teal) → gold `Button` "START NOW" + ghost "Browse surveys". Below: `Reveal`ed
  sections; rebuild the survey list as `DisplayCards`/tilt-bloom cards. Restyle the raffle box
  ("1 Survey = 1 Entry / Win $100") as a codecats floating card with tooltip. **Keep**:
  `/api/surveys` + per-survey `/translation` fetches, `localStorage['cyc_completed_surveys']`
  tracking, all `t()` strings. (`CYC_Logo.png` can still appear as a hero mascot if desired.)
- **`/surveys` `src/app/surveys/page.tsx`** — codecats card grid: `Reveal` + tilt/bloom cards,
  gold top-accent, time estimate, `Button` Start. Keep links/data.
- **`/thank-you` `src/app/thank-you/page.tsx`** — codecats success `Card` + "Keep Your Voice Heard"
  cross-promo grid as bloom cards. Its existing (currently inert) `dark:` classes will now activate
  — rewrite them intentionally.

### Survey-taking flow — `src/app/survey/[id]/page.tsx` (1062 lines — HIGH CARE)

This is the core. **Preserve every branch and binding**; restyle wrappers only.

- Welcome screen → aurora-lite header + rich description + gold `Button` "Start Survey" + est. time.
- Progress bar → teal fill; keep it driven by `visibleQuestionIndices`.
- Per-question screen → codecats surface `Card` (`rounded-3xl shadow-cute`); keep the existing
  `AnimatePresence` slide (`pageVariants`/`pageTransition`), retune to expo ease `[0.16,1,0.3,1]`.
- Restyle each of the **8 question types** without changing logic:
  `multiple_choice` (radio → pill/card selects, teal selected), `checkboxes` (+ `max_selections`
  cap + "Other:"), `dropdown` (themed `Select`), `rating_scale` (0–100 teal slider + optional
  calculator/reference), `likert_scale` (1–5 circle scale), `ranking` (**framer `Reorder`** drag
  cards — restyle the card, keep Reorder), `short_answer` (textarea/validated input),
  `section_header` (info/attachments; keep the 2s auto-advance).
- Email step + submit → keep validation, duplicate check, POST, redirect to `/thank-you`.
- Keep `RichTextRenderer` (`html-react-parser`) + `.wavy-underline` glossary tooltips.

### Admin (full scope)

- **`/admin/login`** — restyle password gate as a centered codecats `Card`. Keep the
  `cyc_admin_auth` localStorage flow.
- **`src/app/admin/layout.tsx`** — keep the auth guard (redirect if `cyc_admin_auth !== 'true'`);
  restyle the scroll wrapper; wrap content in `max-w-7xl mx-auto`.
- **`/admin` dashboard** — restyle list rows/cards, buttons (`Button`), share-link + raffle-export
  modals (`Modal`). Keep activate/lock/delete/share/raffle-export logic + API calls.
- **`/admin/create` + `/admin/edit/[id]`** — restyle the builder: `Input`/`Textarea`/`Select`,
  the `RichTextEditor` (TipTap) toolbar chrome, question-type add buttons, thumbnail upload.
  Keep all TipTap extensions + state. These are the largest files — lean on the primitives.
- **`/admin/results/[id]` + `src/components/AiInsightsTab.tsx`** — restyle chart containers, tabs,
  response browser; theme charts to teal/navy/gold. Keep chart data + the `ai-*` POST calls.

---

## 6. Do-NOT-break list (reskin safety)

- **i18n:** every visible string flows through `t()` from `src/contexts/LanguageContext.tsx`
  (`en`/`fr`/`zh`). Keep all `t()` calls; keep `<LanguageProvider>` mounted. Questions have
  `_fr`/`_zh` variants from `/api/surveys/{id}/translation`.
- **Survey engine:** keep `answers[currentQuestion.id]` bindings, the `type === ...` branches,
  question **gating** (`getNextVisibleStep`, `options.logic_gates`, `logic_gate_match_type`,
  `is_conditional`, `visibleQuestionIndices/Ids`), **attention checks** (`attn-fixed-1/2`,
  `attn-inact-1` after 60s idle → POST `/api/sessions/{id}/attention-failure`), and
  `short_answer` validation (`postal_code_prefix`/`regex`/`max_length`/`normalize_uppercase`).
- **Persistence:** localStorage keys `cyc_session_{id}`, `cyc_global_email`,
  `cyc_completed_surveys`, `cyc_admin_auth`; debounced autosave `PUT /api/sessions/{id}/answers`;
  per-question time tracking.
- **APIs (all relative `/api/*`, proxied to FastAPI):** `/api/surveys`, `/api/surveys/{id}`,
  `/translation`, `check-status`, `POST /responses`, sessions endpoints, admin share/raffle/`ai-*`.
  Do not change endpoints. `next.config.ts` rewrite → `http://localhost:8000/api/*` in dev.
- **framer `Reorder`** (ranking) and `AnimatePresence` (page slides) must survive.
- **Raw-hex sweep:** brand colors are hardcoded as arbitrary values in many places, not just tokens.
  Grep and replace with utilities so dark mode works:
  `grep -rnE '#0CB7C4|#04377E|#F5C518|#1a1a1a|#0CA7A1|#0A8A85|#e6f8f9' src/` →
  `#0CB7C4`→`teal`, `#04377E`→`navy`/`ink`, `#F5C518`→`gold`, `#1a1a1a`→keep (text on gold).
- **Dark-mode landmine:** the code is littered with **currently-inert `dark:` classes** (thank-you,
  survey, RichTextEditor). Enabling dark mode **activates all of them** — audit each and rewrite
  intentionally, don't assume they look right.
- **Ignore/leave:** `/frontend` (dead legacy globals.css), `/graphify-out` (analysis dump),
  boilerplate SVGs in `public/` (`file/globe/next/vercel/window.svg`), Python backend + root
  `*.py` scripts.
- **lucide-react is `^1.16.0`** (unusual old major) — verify any _new_ icon name exists before use.

---

## 7. Verification (run end-to-end after implementing)

1. `npm install` (after adding `clsx tailwind-merge next-themes motion` and optionally
   `@phosphor-icons/react`), then `npm run dev`. App proxies to the FastAPI backend on `:8000`
   (start it if you need live data; otherwise the landing/`/api/surveys` call will error — that's
   backend, not the reskin).
2. **Build check:** `npm run build` must pass (catches token/util typos + SSR issues from motion).
3. **Theme:** toggle light/dark on every public page + admin; confirm no unreadable inert `dark:`
   remnants; confirm the View-Transitions cross-fade.
4. **i18n:** switch EN → Français → 中文; strings still swap; no layout breakage from the new fonts.
5. **Survey flow (critical):** open a survey → answer each of the 8 question types → verify gating
   skips conditional questions → trigger an attention check → drag-rank a ranking question →
   refresh mid-survey (session resumes) → submit → land on `/thank-you`. Nothing above should
   regress.
6. **Admin:** log in, create a survey (TipTap toolbar works, thumbnail upload), edit it, view
   results + AI tabs. Save round-trips intact.
7. Confirm `logo.png`, `CYC_Logo.png`, favicon all still render.

---

## 8. Task Checklist (execute in this order)

- [ ] **0. Deps:** add `clsx`, `tailwind-merge`, `next-themes`, `motion` (+ optional
      `@phosphor-icons/react`) to `package.json`; `npm install`.
- [ ] **1. Tokens:** replace `src/app/globals.css` with §1 (new tokens, dark variant, keyframes;
      re-point `.btn-*`/`.card`/`.wavy-underline`).
- [ ] **2. Foundation:** port `src/lib/utils.ts` + `src/components/theme-provider.tsx`; update
      `src/app/layout.tsx` (fonts, `ThemeProvider`, `suppressHydrationWarning`, remove 85% scale,
      container restructure, keep `LanguageProvider`).
- [ ] **3. Effect components:** port `Reveal`, `Button` (CYC variants), `ThemeToggle`, and
      `ui/{aurora-background, flip-words, kinetic-text-reveal, display-cards,
    container-scroll-animation}` — apply the color-name mapping (blush→teal, butter→gold,
      grape→navy, mint→teal).
- [ ] **4. Primitives:** create `ui/{Card, Input, Textarea, Select, Modal, SectionHeading}`.
- [ ] **5. Public chrome:** rebuild Header (glass navbar + ThemeToggle) and Footer.
- [ ] **6. Landing + lists:** overhaul `/` (aurora hero + flip-words + bloom cards, replacing the
      carousel), `/surveys`, `/thank-you`.
- [ ] **7. Survey flow:** carefully reskin `/survey/[id]` per §5 (markup only).
- [ ] **8. Admin:** reskin `/admin`, `/admin/login`, `/admin/layout`, `/admin/create`,
      `/admin/edit/[id]`, `/admin/results/[id]`, `AiInsightsTab`.
- [ ] **9. Raw-hex sweep** (§6) so dark mode is consistent.
- [ ] **10. Verify** (§7): `npm run build`, then walk every flow in both themes + all 3 languages.

---

## Appendix — quick reference

- **Target aesthetic source:** `/Users/zishine/VSCODE/codecats/src` (read its `globals.css`,
  `layout.tsx`, `components/ui/*`, `Reveal.tsx`, `Navbar.tsx`, `Hero.tsx`, `Button.tsx`,
  `ThemeToggle.tsx` for verbatim reference implementations).
- **App to overhaul:** `/Users/zishine/VSCODE/CYC/survey_plat/src`.
- **Stack:** Next 16, React 19, Tailwind v4 (CSS-first, no config file), framer-motion.
- **Motion signature:** ease `[0.16, 1, 0.3, 1]`, `whileInView`+`once:true`, springs for pops,
  always guard `useReducedMotion`.

```

```
