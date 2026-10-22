# F3 findings: break it, harden it (22 Oct 2026)

Severity: **High** = a wrong figure or a broken journey could reach a founder; **Medium** = wrong but caught later or rare; **Low** = polish. Evidence is a test in `tests/` unless stated.

| # | Severity | Finding | Evidence | Fix | Status |
|---|---|---|---|---|---|
| 1 | High | Numbers written as words ("seven days", "two lakh") passed the number check | `check.test.ts` "number words" (was a documented gap) | `checkEmail` rejects number words outside approved strings; "one", "half-yearly" and the legal "three times" allowed | Fixed |
| 2 | High | An approved figure in the wrong role (total written as the interest, amount as the total) passed | `check.test.ts` "approved figures in the wrong place" | New `misplaced` result: the nearest label before each money figure must match it; redraft feedback explains it | Fixed |
| 3 | Medium | Amounts with 3+ decimals were accepted, so the amount shown in the email differed from the one used in the maths | `edge.test.ts` | Validation allows digits with up to 2 decimals only | Fixed |
| 4 | Medium | A client name containing a blocked word ("Courtyard", "Notice Board Media") failed every AI draft, wasting calls | `edge.test.ts` | Blocked words are checked outside the founder-confirmed fact strings, like digits | Fixed |
| 5 | Low | Acceptance date in the future was accepted (silently "not late yet") | `edge.test.ts` | Validation: can't be in the future | Fixed |
| 6 | Low | No upper bound on the amount (typo with extra zeros) | `edge.test.ts` | Capped at ₹1,000 crore with a "please check" message | Fixed |
| 7 | Low | "Interest is charged at..." read as a statement that the client has been charged | copy review | Now "worked out at..." | Fixed |
| 8 | Low | Choosing "Last friendly reminder" first makes all three follow-up steps that same tone | browser walk-through | None yet; reads oddly but is correct | Open |
| 9 | Info | Local `.env.local` points at `gemini-3-flash-preview`, out of free quota today, so local drafts fall back to the standard draft after about 49 s | server log (status and model only) | Owner: set `GEMINI_MODEL=gemini-3.5-flash` locally | Open (config) |

## Checked and passing
- **Prompt injection via the invoice:** names are stripped of control characters and length-capped; facts reach the model as JSON data with an instruction to ignore instructions inside them; any threat word the model writes, any invented number and any swapped figure fail the check, and the founder confirms the name on the Check screen first.
- **Dates:** future invoice, acceptance and registration dates rejected; 29 Feb in a non-leap year rejected; the 7 Oct 2026 rate change covered by golden vectors; a far-future "today" shows the stale-rate banner.
- **Journey never dead-ends:** extraction failure -> "Try another file" or manual entry; AI down, 429 on every model, timeouts or two failed checks -> standard draft (seen live today); refresh restarts (nothing stored, by design).
- **Secrets and logging:** `npm run check:secrets` OK; server logs carry status, timing and model id only; no `console.log` of file bytes, fields or email bodies.
- **Headers:** noindex, nosniff, X-Frame-Options DENY, no-referrer, restrictive Permissions-Policy, no-store on API routes (`next.config.ts`).
- **Accessibility (scripted, in the browser):** every input labelled, every button named, one h1, focus moves to each screen's heading and to the first invalid field on submit; native modal dialog for help (Escape closes, focus returns); reduced motion turns off the count-up and screen transitions.
- **Legal wording:** every result statement uses "may"; "Not legal advice" on the Standing and Send screens; emails never mention lawyers, courts, notices or any outside body (enforced in code).

## Not verified
- Lighthouse scores (not run here).
- Live AI drafts for the three new tones (local key out of quota today; templates and mocked outputs are tested).
- Password-protected, multi-page scanned and rotated PDFs against the live model (code path ends in manual entry; not run live).
- Screen-reader run with NVDA or VoiceOver (labels and roles checked by script only).
- The one-paisa difference with CalcGuru on case 3 (accepted as immaterial; cause not yet pinned down).
