# FortyFive redesign: research, design system and phase prompts

Phases 0-5 made the product **correct** (legal engine, extraction, number check, 239 tests). This document makes it **feel** like a product a founder trusts with money. Paste the phases below one at a time, exactly like `PROMPTS.md`.

> Rule for every phase: **look changes, logic does not.** The engine, the number check, the API routes and the tests stay as they are. If a design idea needs a logic change, stop and ask.

---

## 1. Honest diagnosis of the current UI (screenshotted 22 Oct 2026, 1280px, light mode)

| Problem | Why it hurts |
|---|---|
| **Everything renders in Arial.** Geist is loaded in `app/layout.tsx`, but `app/globals.css` sets `body { font-family: Arial }`, which overrides it. | Looks like an unstyled form, not a product |
| On desktop, a 576px column floats in a sea of white | Feels empty and unfinished; wastes the screen where judges will see it |
| No name, logo, header or footer | Nothing tells you what this is or who made it; no trust |
| Default Tailwind indigo, flat white, no depth | Generic "AI-made app" look |
| Upload screen is a heading plus a dashed box | Doesn't sell the value ("you may be owed ₹X") before asking for a file |
| Five numbered circles for progress | Heavy for a 3-minute task; reads like a government form |
| The result, the most important moment, looks like the form before it | The "aha" (₹ owed) has no emotional weight |
| The email screen is a textarea | Doesn't feel like an email you'd actually send |

## 2. What the best sites do (visited 22 Oct 2026)

| Site | Pattern worth taking | Take / leave |
|---|---|---|
| **Chaser** (chaserhq.com, AR automation, direct competitor) | Warm tinted hero, two-line promise, ONE primary button, proof line right under it (rating, security cert) | Take the single CTA and proof line |
| **Upflow** (upflow.io, AR automation, direct competitor) | Product-as-hero: floating cards showing amounts and invoice rows; value visible before reading | Take: show a sample result card in the hero |
| **Mercury** (mercury.com, best-in-class fintech design) | Calm, emotional, very little text; one input + one button; "Launch demo" beside it | Take the calm and the demo-beside-CTA |
| **Stripe Invoicing** (stripe.com/invoicing) | Left-aligned two-line headline, generous white space, pill buttons, product shown on the right | Take the two-column hero and spacing discipline |
| **Razorpay** (razorpay.com, Indian fintech leader) | Two-tone headline (accent line + ink line); "Looking for…?" intent chips | Take the two-tone headline; skip the chips (one journey) |
| **CredFlow** (credflow.in, Indian competitor) | Site returned 503 on 22 Oct 2026; not reviewed | – |
| **Vyapar, Refrens** (Indian invoicing apps) | Already send WhatsApp/email payment reminders | Positioning: reminders are not your edge; the legal + tax framing is |

**Apple design principles translated for a web app** (from Apple's Human Interface Guidelines: clarity, deference, depth):
- **Clarity:** one idea per screen, one primary action, numbers big and exact, plain words.
- **Deference:** the content (the ₹ figure, the email) is the hero; chrome is quiet, neutral and thin.
- **Depth:** soft layered shadows, translucent sticky header with blur, gentle motion that explains where you are.
- **Font note:** SF Pro is licensed for designing for Apple platforms, not for websites. Use **Geist** (already installed, free, very close in feel). All money uses **tabular numerals** so digits line up.

## 3. Name

**Chosen: FortyFive** (chosen by the project owner on 22 Oct 2026).
- Named after the MSME 45-day payment rule (s.43B(h) of the Income-tax Act, 1961, in force since 1 April 2024; now s.37(2)(g) of the 2025 Act), which most Indian founders and CAs have heard of. Judges and founders understand it in one second.
- Tagline: **"The 45-day rule, on your side."**
- **Accuracy guardrail for all copy:** 45 days is the *maximum* agreed period. With no written agreement the deadline is **15 days** from acceptance (MSMED Act s.15). Never write "your client had 45 days" or imply every invoice gets 45 days; the engine already applies the right rule.
- Wordmark: "FortyFive" (one word, capital F twice). The mark: "45" set in a rounded square in brand-700, white digits. Never "Forty Five" or "45ive".
- Quick web search on 22 Oct 2026 found no product called FortyFive. **This is not a trademark or domain check.** Check the domains and the trademark register before using it outside the hackathon.

Other options considered: Chukta ("settled, paid in full"), Haq ("rightfully yours"), Kindly (polite Indian office English), Duly, PaidUp. Avoid Hisaab/Hisab: several Indian billing apps already use it.

## 4. Design system (tokens)

All 19 colour pairs below were contrast-checked on 22 Oct 2026 (WCAG AA: 4.5:1 text, 3:1 borders and focus). Do not change a colour without re-checking.

**Colour, light (default)**
| Token | Hex | Use | Check |
|---|---|---|---|
| canvas | #FAFAF7 | page background (warm off-white) | – |
| surface | #FFFFFF | cards | – |
| ink | #14151A | main text | 17.4:1 |
| muted | #5D5F68 | secondary text | 6.1:1 |
| line | #E4E2DC | dividers (decorative only) | – |
| control | #8A8C94 | input/card borders that matter | 3.4:1 |
| brand-700 | #0B6B57 | primary button (white text), links | 6.5:1 / 6.2:1 |
| brand-600 | #0E7C66 | focus ring | 4.9:1 |
| brand-50 / brand-800 | #E7F4EF / #08503F | success chip | 8.3:1 |
| warn-bg / warn-ink | #FFF6E5 / #7A4A00 | "please check", notes | 7.0:1 |
| danger | #B42318 | errors | 6.6:1 |

**Colour, dark** (follows the system setting)
| Token | Hex | Check |
|---|---|---|
| canvas / surface | #0C0D10 / #16181C | – |
| ink / muted | #F3F3F1 / #A3A5AD | 17.5:1 / 7.2:1 |
| brand-400 button (dark text #0C0D10) | #2EC79C | 9.0:1 |
| brand-300 links and focus | #5EDBB8 | 11.4:1 |
| brand-950 / brand-100 chip | #06291F / #C8F1E3 | 12.8:1 |
| warn | #2B1E06 / #FFD58A | 11.7:1 |
| danger text | #FF9C91 | 8.8:1 |
| control border | #6B6E77 | 3.5:1 |
| line (decorative dividers) | #2A2D33 | no minimum (added in R1; decorative only) |

Why green: the product's end state is *paid*. Green says money and settled, not alarm. Red is reserved for errors only, never for the amount owed.

**Type** (Geist; money in tabular numerals)
| Role | Size / line height / weight |
|---|---|
| Display (the ₹ owed) | 56 / 60 / 700, mobile 40 / 44, letter-spacing -0.02em |
| H1 (hero) | 48 / 52 / 650, mobile 34 / 38, -0.02em |
| H2 (step title) | 28 / 34 / 600, mobile 24 / 30 |
| Body | 17 / 26 / 400 (16 / 24 on mobile) |
| Small | 14 / 20 / 450 |
| Label | 15 / 20 / 550 |

**Space, shape, depth, motion**
- Spacing on a 4px grid: 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Radius: 10 (inputs), 14 (buttons), 20 (cards), 28 (hero card). Buttons are full pills only for the primary CTA.
- Shadow, card: `0 1px 2px rgb(0 0 0 / .04), 0 8px 24px rgb(0 0 0 / .06)`. Raised: add `0 24px 48px rgb(0 0 0 / .08)`. In dark mode, use a 1px `line` border instead of shadows.
- Motion: 180ms ease-out (`cubic-bezier(.2,.8,.2,1)`) for state changes, 320ms for step transitions, number count-up 700ms. Everything off under `prefers-reduced-motion`.
- Layout widths: shell max 1200px; reading column 640px; desktop two-column = content 1fr + summary panel 360px.

## 5. Screen-by-screen target

1. **Shell:** translucent sticky header (wordmark "FortyFive", a thin progress bar with "Step 2 of 5", a "How it works" link); quiet footer (Not legal advice · How your data is handled · © year). On desktop from step 2, a **sticky summary panel** on the right fills in as you go (client, invoice, amount, then due date and interest).
2. **Upload / landing:** two-column hero. Left: two-tone headline ("Your client is late." / "Here's what you're owed."), one line of subcopy, the upload card as the CTA, "Try a sample invoice" beside it. Right: a **sample result card** (clearly labelled "Sample") showing ₹ owed, days late and a mini timeline. Below: 3-step "How it works", a trust strip (MSMED Act Sections 15-16 · RBI rates to 7 Oct 2026 · nothing stored · you send it yourself), and the data-handling panel.
3. **Check details:** two cards: "From your invoice" (fields with confidence chips, the file name with a Replace link) and "Only you know these" (Udyam date, agreement, acceptance), each with a "Why we ask" disclosure. Sticky continue bar on mobile.
4. **Where you stand:** the hero number with count-up, a status pill (e.g. "60 days late"), a **timeline** (accepted → due → today) in SVG, a **monthly interest bar chart** in SVG (the existing table stays as the accessible fallback), and a "How this is worked out" disclosure. The other three outcomes are calm full cards with a clear next step.
5. **Tone:** three cards, each with a one-line preview of how that tone opens.
6. **Send:** an email-client-style composer card (To: "Finance team", Subject, body) with highlighted placeholders, a trust badge ("Numbers checked against your calculation", with a tooltip saying what was and wasn't checked), and a sticky action bar (Copy · Open in email). A success state after copying.

---

## 6. Phase prompts

Paste the **PREAMBLE** from `PROMPTS.md` first in a new session, then add this line once:
```
Also read REDESIGN.md. It is the design spec for this and the next phases and wins over your own taste. Do not change lib/engine, lib/email (check, facts, prompt, template), lib/ai or app/api unless the phase says so. All user-facing strings stay in lib/copy.ts. Keep every existing test passing and add render tests for new components.
```

### R1: Foundation (design tokens, fonts, UI primitives) - do first, about 1.5 h
```
Phase R1 of REDESIGN.md: foundation only. No screen should change layout yet.
1. Fix the font bug: remove the Arial font-family from app/globals.css so Geist (already loaded in app/layout.tsx) applies. Add `font-feature-settings` / `font-variant-numeric: tabular-nums` for a `.num` utility used on all money, dates and day counts.
2. Implement the tokens from REDESIGN.md section 4 as CSS variables in app/globals.css (light under :root, dark under prefers-color-scheme: dark) and map them in the Tailwind v4 `@theme` block so classes like bg-canvas, text-ink, text-muted, border-control, bg-brand-700 exist. Use exactly the hex values in the tables. Replace the old focus-ring colours with brand-600 / brand-300.
3. Create components/ui/ primitives, each small, typed, accessible, using only the tokens: Button (variants primary, secondary, ghost, link; sizes md, lg; loading state with spinner; min 44px target), Card (surface, radius 20, shadow per spec, border in dark mode), Field (label, hint, error with aria-describedby, the amber "Please check" / "We couldn't read this" flag), Badge (neutral, success, warn), Banner (info, warn, danger; title plus body plus optional action), Disclosure (details/summary styled, 44px summary), Spinner and Skeleton (respect prefers-reduced-motion), ProgressBar (value, max, label "Step n of 5", role=progressbar with aria-valuenow).
4. Refactor the existing screens to use these primitives and tokens WITHOUT changing their structure or copy. Remove all hard-coded zinc/indigo/amber classes from components/.
5. Add tests/ui.test.tsx: render each primitive (react-dom/server) and assert roles, labels, the 44px min classes, and that Button loading shows aria-busy.
Gate: npm run build, npm test, npm run lint and npm run check:secrets all pass; `grep -rn "zinc-\|indigo-" components` returns nothing; screenshots at 360 and 1280 in light and dark show Geist (verify with getComputedStyle(document.body).fontFamily) and every screen still works end to end.
```
**Review R1:**
```
Open the app at 1280px light and dark. Report the computed font family, list any colour in components/ not coming from a token, and re-run the contrast table from REDESIGN.md section 4 against the CSS variables actually shipped. Change nothing.
```

### R2: App shell, brand and progress, about 1.5 h
```
Phase R2 of REDESIGN.md: the shell around the steps. Name: FortyFive, tagline "The 45-day rule, on your side." (put both in lib/copy.ts; follow the accuracy guardrail in section 3: never imply every invoice gets 45 days).
1. Header: sticky, translucent (surface at 80% with backdrop-blur), 64px; left a simple wordmark "FortyFive" (text plus a small SVG mark: the digits "45" in white inside a rounded square in brand-700); right a "How it works" link that scrolls to the section on step 1. Under the header, the ProgressBar from R1 with "Step n of 5", replacing the 5-circle Stepper (delete components/Stepper.tsx and its usage).
2. Layout: max width 1200px with 16px gutters on mobile, 24px on tablet, 32px on desktop. From step 2 onward, at >= 1024px, use two columns: step content (max 640px) plus a 360px sticky Summary panel. Below 1024px the panel becomes a collapsible "Invoice summary" card at the top of the step.
3. Summary panel (components/Summary.tsx): reads only from wizard state and compute(); shows client, invoice number, amount (num), invoice date; after the standing step also due date, days late and interest so far. No new calculations; values come from the same functions the screens use.
4. Footer: Not legal advice · How your data is handled (opens the existing panel) · © year FortyFive.
5. Brand assets: app/icon.svg (the mark), apple icon, and an Open Graph image (check node_modules/next/dist/docs for the Next 16 way, opengraph-image or metadata) with the wordmark and tagline. Update metadata title to "FortyFive: The 45-day rule, on your side." and keep robots noindex.
6. Focus management: when the step changes, move focus to the new step's h2 (already done per screen; keep it working with the new layout).
Gate: build, tests, lint, check:secrets pass; no horizontal scroll at 360/390/768/1024/1440; header does not cover focused elements (scroll-padding-top); summary panel values match the standing screen exactly for golden vector rate-change-crossing-7-oct-2026 entered manually.
```

### R3: Landing and upload, about 2 h
```
Phase R3 of REDESIGN.md: step 1 becomes the landing.
1. Hero, two columns at >= 1024px (stacked on mobile, upload card first). Left: H1 two-tone ("Your client is late." in brand-700, then "Here's what you're owed." in ink), one subcopy line, then the upload Card as the main CTA: a large drop zone with a document icon, "Upload invoice", "PDF, JPG or PNG up to 4 MB", primary Button "Choose file", and a secondary Button "Try a sample invoice". Right: a static SampleResult card labelled with a Badge "Sample" showing the sample invoice's real computed figures (compute it from sampleExtraction() and the engine at today's date; never hard-code numbers), a "60 days late"-style pill and a mini timeline.
2. Upload states: drag-over (brand outline, slight scale 1.01), reading (staged progress text "Uploading…", "Reading the invoice…", "Finding amounts and dates…", driven by elapsed time, honest, plus Skeleton), error (Banner danger with the existing copy and two actions: "Try another file" and "Enter details by hand").
3. "How it works": three steps with icons: Upload → Check → Send. One sentence each.
4. Trust strip: four short items (MSMED Act Sections 15-16 · RBI rates loaded to {lastRateChangeDate} · Nothing stored · You send it yourself). The date comes from lastRateChangeDate(), never hard-coded.
5. The data-handling Disclosure moves into the trust area with the same copy.
6. Icons: install lucide-react (check the current version on npm; pin it exactly), import icons individually.
Gate: build, tests, lint, check:secrets pass; LCP element is text (not an image); the sample figures on the hero equal what the standing screen shows for the sample; keyboard: Tab reaches Choose file, Try a sample, How it works, then the data disclosure, in that order.
```

### R4: Check details, about 1.5 h
```
Phase R4 of REDESIGN.md: step 2.
1. Two Cards: "From your invoice" (client, invoice number, invoice date, amount with a ₹ prefix inside the field) with the file name and a "Replace file" link (back to step 1), and "Only you know these" (Udyam date, written agreement as an Apple-style segmented control Yes/No that is still a radiogroup, agreed days, acceptance date).
2. Each field in the second card gets a "Why we ask" Disclosure with one plain sentence (in lib/copy.ts), e.g. Udyam date: "The law protects micro and small businesses registered under Udyam; the date matters."
3. Confidence: fields the AI was unsure about show the warn Badge and a soft warn background; once edited, the badge animates away.
4. Error summary Banner at the top (existing logic) and inline errors (existing), restyled.
5. Mobile: a sticky bottom bar with the primary Button "See what I'm owed" (safe-area padding for iPhone).
6. Date inputs: check iOS Safari rendering (min height, font size >= 16px to avoid zoom).
Gate: build, tests, lint, check:secrets; all existing validation tests pass unchanged; at 360px the sticky bar never covers the focused field.
```

### R5: Where you stand (the hero moment), about 2 h
```
Phase R5 of REDESIGN.md: step 3.
1. Hero Card: Display-size ₹ interest owed (num) with a count-up from 0 (700ms, disabled under prefers-reduced-motion, final value always the exact formatINR string), the suffix line, "Total now due ₹…" and a status Badge ("{n} days late").
2. Timeline (components/Timeline.tsx, pure SVG, responsive): three points (work accepted, payment due, today) with dates under each; the late stretch drawn in warn colour. Proper <title>/<desc> for screen readers.
3. Monthly interest chart (components/InterestChart.tsx, pure SVG bars, one per month from result.rows, values from the engine only). Under it, the existing month-by-month table stays as the accessible fallback inside "Show the working".
4. The other three outcomes (not yet due, Udyam after invoice, rate history) become calm full Cards with an icon, the existing copy and one clear next action.
5. "How this is worked out" as a Disclosure; the legal one-liner and "Not legal advice · based on the details you entered" stay visible.
Gate: build, tests, lint, check:secrets; tests/standing.test.tsx still passes for all 13 golden vectors (update selectors only, never expected numbers); the count-up's final rendered text equals formatINR(totalInterest); chart bars equal row count; 360px has no overflow.
```

### R6: Tone and Send (the email moment), about 2 h
Decide the number-check **Fix 2** first (see the Phase 4 attack report). If you approve it, the email becomes model-written prose plus a code-rendered figures block, and this screen should show that block as a neat "Details" panel inside the email.
```
Phase R6 of REDESIGN.md: steps 4 and 5.
1. Tone cards: icon, name, the "when to use" line and a one-line preview of how that tone opens (new copy in lib/copy.ts, no digits). Selected card: brand border plus check icon. Keep the radiogroup semantics.
2. Composer Card styled like an email client: a "To" row ("Your client's finance team", muted, not editable), Subject input, body editor with the existing placeholder highlighting, and a footer with the trust Badge. The badge has a Disclosure or tooltip: "Every amount and date was checked against your calculation. Wording was not checked. Read it before sending."
3. Sticky action bar (mobile bottom, desktop under the card): primary "Copy email", secondary "Open in email app", ghost "Change tone". After a successful copy: a short success state (check icon plus "Copied. Paste it into your email.") and a "Next steps" Card: replace [Your name], send from your own address, note the date you sent it.
4. Loading: a Skeleton that looks like the composer, with the existing "Writing your email..." text.
5. Keep every existing behaviour: re-check after edits, the stray-number warning, the mailto length fallback, the execCommand copy fallback.
Gate: build, tests, lint, check:secrets; tests/email-screens.test.tsx passes (update selectors only); a real click on Copy succeeds in Chrome; at 360px the action bar does not cover the editor's last line (bottom padding equals the bar height).
```

### R7: Motion, dark mode, performance and final QA, about 2 h
```
Phase R7 of REDESIGN.md: polish and proof. No new features.
1. Step transitions: 320ms fade plus 8px slide between steps; none under prefers-reduced-motion. No layout shift (CLS < 0.05).
2. Dark mode: review every screen in dark; only tokens; charts and timeline readable in both.
3. Responsive pass at 360, 390, 768, 1024, 1280, 1440: no overflow, 44px targets, the sticky bars correct with iPhone safe areas.
4. Performance: run Lighthouse (Chrome DevTools, mobile preset) on the production build: Performance >= 90, Accessibility >= 95, Best Practices >= 95. Fix what it reports. Fonts via next/font only; no layout-shifting images.
5. Keyboard and screen reader: full journey with Tab/Enter/Space only; NVDA or VoiceOver smoke test of the standing and send screens.
6. Cross-browser: Chrome, Edge, Firefox, Safari (or iOS Safari on a real phone).
7. Save a screenshot set for the pitch deck in docs/screens/ (light and dark, 390px and 1280px, every step) using the sample invoice only.
8. Update README.md: what FortyFive is, how to run, env vars, how to test, known limits.
Gate: everything above done and reported as a table with numbers; build, tests, lint, check:secrets pass; then commit and push.
```

---

## 7. Order, time and the cut line

| Order | Phase | Must-have for the demo? |
|---|---|---|
| 1 | R1 Foundation | Yes (fixes Arial and makes the rest consistent) |
| 2 | R2 Shell and brand | Yes |
| 3 | R3 Landing and upload | Yes (first impression) |
| 4 | R5 Where you stand | Yes (the "aha" moment) |
| 5 | R6 Tone and send | Yes |
| 6 | R4 Check details | Nice to have (works today) |
| 7 | R7 Polish and QA | Do at least the responsive pass and Lighthouse |

If time runs out, ship R1, R2, R3, R5. A consistent product with a great landing and a great result screen beats seven half-done phases.
