# Lean launch plan (written 22 Oct 2026, 15:20 IST; deadline: live link by 19:00, submit by 19:30)

Rule 1: **a working live link beats a prettier local app.** Do the launch first. Design comes second and stops at the cut line.

## Timeline

| Time | What | Who |
|---|---|---|
| 15:20-15:50 | **Launch** (steps below) | you |
| 15:50-16:00 | Optional L0: number-check fix (small) | Claude, one prompt |
| 16:00-17:00 | **L1**: header, logo, landing hero | Claude, one prompt |
| 17:00 | **Cut line**: if L1 is not working, stop designing and ship what is on Vercel | you |
| 17:00-17:40 | **L2**: result screen and email screen polish | Claude, one prompt |
| 17:40-18:40 | Test on your phone with 5 invoices you have not used, incognito; fix only real breaks | you + Claude, small fixes |
| 18:40 | **Freeze.** No new changes. Re-check the live link works on phone and laptop | you |
| 19:00 | Submit the live link (Submission 4). 30 min spare for upload trouble | you |

## Launch steps (do these before any more design)

1. **Gemini billing:** turn it on for your Google project. The free tier allows 20 requests/day per model; the app will stop reading invoices mid-demo without it.
2. **Vercel:** Add New > Project > import `brijeshattal-svg/msme-invoice-recovery` (private repos need you to authorise GitHub access).
3. **Environment variables** (Production and Preview): `GEMINI_API_KEY` = your key; `GEMINI_MODEL` = `gemini-3.5-flash`. No `NEXT_PUBLIC_` prefix.
4. Deploy. Open `https://<your-app>.vercel.app/api/health`: it must show `"hasKey": true`.
5. On your phone: open the link in a private tab, tap **Try a sample invoice**, finish the journey. Then try one real PDF.
6. If any step fails, paste the exact error to Claude. Do not start design work until this passes.

## Token rules (paste once at the start of every session)

```
Be economical. Do not take browser screenshots. Do not run `npm run build` until the very end of the task (use `npx tsc --noEmit` and the relevant tests while working). Do not re-read files already shown in this session. Do not write long summaries: finish with at most 8 lines (what changed, test result, anything not verified). Do not change lib/engine, lib/email check/facts/prompt/template, lib/ai or app/api. All user-facing strings go in lib/copy.ts. Keep all existing tests passing. Read REDESIGN.md only for sections 3 and 4 (name and tokens).
```

## L0 (optional, about 10 minutes): close the cheap number-check gaps

```
Extend lib/email/check.ts only, and add tests to tests/check.test.ts. (1) Treat any Unicode number character (\p{N}, not just \p{Nd}) as a digit, so circled digits, fractions and superscripts are caught. (2) After removing approved strings, also flag: Roman numerals of 2+ letters in capitals, and the words two..ninety, hundred, thousand, lakh, crore, million, percent, "per cent". Do NOT flag "one" or "half" (the approved legal text says "half-yearly"). Report them in a new `numberWords: string[]` field that makes `ok` false, and add them to the redraft feedback in lib/email/prompt.ts feedbackFrom. Update existing toEqual expectations for the new field. Tests: "within seven days", "within VII days", "about two lakh", "within ⑦ days", "accept ½" must fail; the 4 legitimate emails and all templates must still pass.
```

## L1 (one prompt, about 60 minutes): header, logo, landing

```
Lean phase L1 (replaces R2+R3 of REDESIGN.md). Product name: FortyFive, tagline "The 45-day rule, on your side." (add to lib/copy.ts; never imply every invoice gets 45 days: with no written agreement the deadline is 15 days).
1. Header (new components/Header.tsx): sticky, 64px, surface at 80% opacity with backdrop-blur; left a wordmark "FortyFive" plus a small inline SVG mark (white "45" in a brand-700 rounded square); right a "How it works" anchor link. Under it use components/ui/ProgressBar ("Step n of 5") and delete components/Stepper.tsx and its use in app/page.tsx. Footer: "Not legal advice" · "How your data is handled" · © year FortyFive.
2. Layout: max width 1100px, gutters 16px mobile / 32px desktop. Only step 1 gets a two-column hero at >= 1024px; steps 2-5 stay a single 640px centred column (skip the summary panel).
3. Step 1 hero. Left: H1 two-tone ("Your client is late." in brand-700, then "Here's what you're owed." in ink; mobile 34px, desktop 48px, tight tracking), one subcopy line, then the existing upload Card (large drop zone, "Choose file" primary Button, "Try a sample invoice" link) and the existing data-handling Disclosure. Right (hidden below 1024px, shown under the upload card on mobile): a static SampleResult card with a Badge "Sample" showing figures computed live from sampleExtraction() and compute() at todayIST() (never hard-coded): big interest figure (class num), "N days late" Badge, and a three-dot timeline (accepted, due, today) with dates.
4. Below the hero: "How it works" (id=how) three short steps, and a trust strip of four items (MSMED Act Sections 15-16; RBI rates loaded to {lastRateChangeDate()}; Nothing stored; You send it yourself). Use lucide-react icons, pinned to an exact version, imported individually. All text in lib/copy.ts.
5. Metadata title "FortyFive: The 45-day rule, on your side." keep robots noindex. Add app/icon.svg using the mark.
6. Tests: add tests/shell.test.tsx rendering Header, SampleResult and the landing trust strip (react-dom/server) asserting the wordmark, the progress bar label, that the SampleResult figures equal compute() output, and the rate date equals lastRateChangeDate().
Finish with: npx tsc --noEmit, npm test, npm run lint, then one npm run build. Commit (message "L1: shell and landing") and push.
```

## L2 (one prompt, about 45 minutes): the result and the email

```
Lean phase L2 (replaces R5+R6, without charts). Style only, no logic changes.
1. components/Standing.tsx overdue view: make the interest figure the hero. Display size (56px desktop / 40px mobile, weight 700, tight tracking, class num), inside a brand-50 Card with radius 28 (rounded-hero); a Badge "{n} days late" (n = result.daysOverdue); the total-now-due line beneath. Add a simple SVG timeline (accepted, due, today) above the summary list, with <title>/<desc> for screen readers; dates from the engine result only. Keep the summary list, the month-by-month Disclosure and the explanation paragraph exactly as they are (tests depend on their text).
2. The three other outcomes (not yet due, Udyam after invoice, rate history): keep the same copy, use Banner with a lucide icon, each with one clear primary action.
3. components/Send.tsx: wrap subject and body in a Card styled like an email composer: a muted "To: Your client's finance team" row (text from lib/copy.ts), then Subject, then the body. Keep the highlighted placeholders, the checks, copy and mailto behaviour. Sticky action bar on mobile (bottom, safe-area padding, bg surface, top border) with Copy email and Open in my email app; add bottom padding to the page so the bar never covers the last line. After a successful Copy show a short success Banner with the existing copied text plus a "Next: replace [Your name], send from your own email" line (new copy in lib/copy.ts).
4. Tests: update only selectors in tests/standing.test.tsx and tests/email-screens.test.tsx if needed; never change expected numbers. Add one test that the hero text equals formatINR(result.totalInterest) for golden vector rate-change-crossing-7-oct-2026.
Finish with: npx tsc --noEmit, npm test, npm run lint, then one npm run build. Commit ("L2: result and email polish") and push.
```

## What I removed from the old plan, and why

| Dropped | Reason |
|---|---|
| R4 (check-details restyle) | Already clean after R1; not worth the tokens before the deadline |
| R7 (Lighthouse, cross-browser, screenshots) | Do a 10-minute phone test instead |
| Summary side panel, Open Graph image, count-up animation, bar chart | Nice, not needed to win; each costs real tokens |
| Number-check Fix 2 (code-rendered figures block) | 45 minutes; instead state the limit in the pitch ("catches typos and invented figures, not swapped real figures") |
| Browser screenshot loops | The single biggest token cost so far |

## If you are short on usage

Order of value: **launch > L1 > L0 > L2 > anything else.** If you can only afford one design prompt, run L1: first impression decides how judges feel about the whole product.
