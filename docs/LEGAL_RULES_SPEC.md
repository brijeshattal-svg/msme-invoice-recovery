# Legal rules spec (the contract for `lib/engine`)

Source of truth for the maths: *MVP Scope: Overdue Invoice Recovery for Service MSEs* (21 Oct 2026), rules table + CalcGuru method.
Where the scope doc left something ambiguous, the decision made here is marked **[DECISION]** so you can overrule it.
Executable twin of this file: `reference/msme-engine.reference.mjs`. Expected outputs: `docs/golden-vectors.json`.

> Not legal advice. The product calculates and drafts; the founder decides.

## 1. Inputs

| Name | Type | Notes |
|---|---|---|
| `amount` | number, INR | Invoice total as confirmed by the founder. **[DECISION]** Interest is computed on exactly this number (founder can edit it, e.g. to exclude GST). The results screen says "on the amount you confirmed". |
| `invoiceDate` | `YYYY-MM-DD` | |
| `acceptanceDate` | `YYYY-MM-DD` | Defaults to `invoiceDate`; editable. Deemed acceptance = delivery date if no written objection within 15 days. |
| `agreementDays` | integer or `null` | `null` = no written agreement. |
| `udyamDate` | `YYYY-MM-DD` | Founder-entered, not verified. |
| `asOf` | `YYYY-MM-DD` | "Today" in **Asia/Kolkata**, never the server's UTC date. Engine never calls `new Date()`. |

All dates are ISO strings converted to integer day numbers (UTC) for arithmetic. No local-time `Date` maths anywhere.

## 2. Decision order (first match wins)

1. `udyamDate > invoiceDate` -> status `udyam_after_invoice`. Stop. Message: invoice may not be covered because registration came after the invoice; add the Supreme Court caveat (the test is stricter and was referred to a larger bench), tell founder to check with a lawyer. No interest, no email.
2. Compute due date (section 3).
3. `interestStartDate < RATE_HISTORY_START` -> `rate_history_not_loaded`. **[DECISION]** The gate is on the day interest *would start*, not on the acceptance date, so an invoice accepted 31 Jan 2023 still works (interest starts 16 Feb 2023, rates known). Test case "accepted before Feb 2023" still passes.
4. `asOf <= lastPayableDate` -> `not_yet_due` with `daysLeft = lastPayableDate - asOf` (0 means today is the last day to pay).
5. Otherwise `overdue`: compute interest (section 4).

## 3. Due date

```
termDays        = agreementDays == null ? 15 : min(agreementDays, 45)
capped          = agreementDays != null && agreementDays > 45
lastPayableDate = acceptanceDate + termDays        # pay on or before this day
interestStart   = lastPayableDate + 1              # interest runs from the next day
daysOverdue     = asOf - lastPayableDate           # == number of interest days
```

No agreement -> the "appointed day" is the day after 15 days from acceptance, i.e. `acceptanceDate + 16`, which equals `interestStart`. One formula serves both branches. **[DECISION]** UI shows two lines: "Payment was due by {lastPayableDate}" and "Interest runs from {interestStart}".

## 4. Interest (CalcGuru day-wise method with monthly rests)

```
for each calendar day d in [interestStart, asOf]   # both inclusive  [DECISION - verify vs CalcGuru]
    r_d      = bank rate in force on d (last RATE_HISTORY row with from <= d)
    interest = openingBalanceOfMonth * (3 * r_d) / 100 / 365      # 365 even in leap years
month total  = round2( sum of daily interest in that calendar month )
at month end: closingBalance = openingBalance + month total       # rests monthly (compounding)
last partial month is shown but not compounded further
totalInterest = sum of rounded month totals
totalDue      = amount + totalInterest
```

**[DECISION]** Rounding: round to 2 dp **once per calendar month** (when adding to the balance), not per day. If the Day-2 CalcGuru comparison differs by paise, adjust `ROUNDING` in one place (`lib/engine/config.ts`) rather than rewriting.

Month rows to display: `month`, `days`, `openingBalance`, `segments[] {bankRate, section16Rate, days}` (more than one segment when the rate changed inside the month), `interest`, `closingBalance`.

## 4a. Part payments and TDS (added 23 Oct 2026)

Optional input `payments: { date, amount, tds }[]`. Absent or empty = exactly section 4 (the golden vectors do not use it and are unchanged).

```
credit(p)        = p.amount + p.tds                 # TDS deducted by the buyer counts as paid  [DECISION]
counted          = payments with date <= asOf       # later dates have not happened yet: ignored
early            = credits dated before interestStart  -> reduce the amount interest starts on
later            = credits dated on/after interestStart -> on that day, before that day's interest,
                   reduce the balance interest runs on (base = month opening balance - payments so far this month)
month interest   = round2( sum over days of base_d * 3r_d / 100 / 365 )
closingBalance   = base_at_month_end + month interest
totalDue         = amount - all counted credits + totalInterest   (== last closing balance)
paidSoFar, tdsSoFar, unpaidAmount = amount - paidSoFar   (only present when a payment was counted)
```

- **[DECISION] Appropriation does not matter here.** Section 16 interest compounds with monthly rests, so interest is part of the balance and a payment reduces the same balance whether it is said to pay principal or interest first. The only judgement is *when*: from the day it is received.
- **[DECISION] TDS counts as paid** ("as we understand it": the buyer deposits it against the supplier's PAN). Hedged in the UI.
- **Out of scope for now:** invoices paid in full (interest on a paid-late invoice). The form and `/api/draft` reject payments that add up to the invoice amount or more; payments must be dated on or before today (an advance may predate the invoice).
- Emails: one fixed approved sentence (`paymentsLine`, built in code) states the amount received, any TDS, and the unpaid part; tones that mention interest add "Interest is worked out only on what was still unpaid on each day." It is required verbatim; any other payment figure fails the digit check.

## 5. RBI Bank Rate table (as given in the scope doc)

| In force from | Bank rate | Section 16 rate (3x) |
|---|---|---|
| 2023-02-08 (*) | 6.75% | 20.25% |
| 2025-02-07 | 6.50% | 19.50% |
| 2025-04-09 | 6.25% | 18.75% |
| 2025-06-06 | 5.75% | 17.25% |
| 2025-12-05 | 5.50% | 16.50% |
| 2026-10-07 | 5.75% | 17.25% |

(*) The scope doc says "Feb 2023" without a day. 8 Feb 2023 is **assumed**. Verify against the RBI circular before the demo (Open item O1). It only matters for invoices whose interest window touches 1-7 Feb 2023.

Checked on 22 Oct 2026 via web search: RBI raised repo to 5.50% on 7 Oct 2026 and the MSF rate to 5.75% with immediate effect; the Bank Rate is reported at 5.75% (secondary sources, RBI circular reproduced on taxguru.in). The next MPC meeting is reported as 2-4 Dec 2026, so the table **will go stale after that**: the UI must show "RBI rates loaded up to {last change date}" and the footer must say how to update.

## 6. Eligibility messages (exact copy lives in `lib/copy.ts`)

| Status | Must say |
|---|---|
| `udyam_after_invoice` | Why it may not be covered; lawyer caveat; no calculation shown |
| `rate_history_not_loaded` | Rate history in this version starts 8 Feb 2023; interest for this invoice would start earlier, so it is not calculated |
| `not_yet_due` | "Not late yet. Last day to pay: X. N days left." (N = 0 -> "today is the last day") |
| `overdue` + `capped` | "Your agreement says N days. The law caps this at 45, so we used 45." |
| Enterprise not micro/small (if the O4 field is added) | Law's protection does not cover this; stop |

## 7. Number check contract (used by `/api/draft`)

The model never formats numbers. Code builds a `facts` object of **pre-formatted strings** (INR in en-IN grouping, dates as `22 Oct 2026`, day counts), the model must reuse them verbatim.

Check = purely mechanical:

1. **Required strings present**: total due, interest, principal amount, days overdue, last payable date, invoice number, client name.
2. **No stray numbers**: delete every occurrence of every allowed string (the `facts` values plus a fixed list of legal references: `Section 15`, `Section 16`, `MSMED Act, 2006`, `Section 43B(h)`, `Income-tax Act, 1961`, `Section 37(2)(g)`, `Income-tax Act, 2025`, `MSME Form-1`), longest first. If any digit remains in the body or subject, fail and report the leftovers.
3. Failure -> redraft with the failure list, max 2 redrafts, then fall back to the deterministic template (`lib/email/template.ts`) which always passes. The founder is never blocked.

Because step 2 rejects any digit that is not an approved string, a hallucinated amount, a rounded "about 1.2 lakh", or a wrong date all fail.

**Known gap:** numbers written in words ("seven days", "ten percent") contain no digits and pass the mechanical check. The prompt forbids them and the Phase 4 review prompt probes for them. If it shows up in testing, extend the check with a small word-number deny list (one..ninety, hundred, thousand, lakh, crore, percent) applied after the approved strings are removed. Call this out in the pitch's known limits rather than claiming the check is airtight.

## 8. Email content rules

- Open with the **client's own** tax cost as a heads-up: under Section 43B(h) of the Income-tax Act, 1961 (now Section 37(2)(g) of the Income-tax Act, 2025) a buyer may not be able to claim a deduction for dues to micro and small suppliers until they are paid; and companies report overdue dues to micro and small suppliers half-yearly in MSME Form-1. Wording hedged: "may", "as we understand it".
- Then the facts: invoice number, amount, due date, days overdue, interest to date, total.
- Then a clear, polite ask with a reply-by line expressed **without digits** ("this week", "by the end of the week").
- Three tones: friendly / firm / formal. No threats, no mention of lawyers, courts, or the ODR portal.
- Sign-off uses placeholders `[Your name]` and `[Your business]`; the UI highlights unreplaced placeholders and warns before copy.
- Never invents facts, contact names, bank details or payment links.
- **Verify before the demo (O3):** the 43B(h) -> 37(2)(g) mapping is confirmed by a Rajya Sabha reply dated 21 Jul 2026 and commentary, but the enacted text itself was not retrieved; read the section once.

## 9. Open items to close before submitting

| ID | Item | How to close | Owner |
|---|---|---|---|
| O1 | Exact effective date of the 6.75% rate (8 Feb 2023 assumed) | RBI press release / circular | you |
| O2 | CalcGuru inclusivity of the end date and rounding | Run 3 golden inputs through CalcGuru; compare; flip `INCLUDE_AS_OF_DAY` / `ROUNDING` | you, Day 2 3:30 PM |
| O3 | Read the enacted s.37(2)(g) text | Income-tax Act 2025 | you |
| O4 | Enterprise category (micro/small vs medium/trader) | The scope doc says the app "tells them why" but gives no field for it. Recommended: one extra select in the three-facts block. Skipping it makes that out-of-scope row unreachable | you decide |
| O5 | Interest on GST-inclusive total is arguable | Keep amount editable; known-limits slide | pitch |

## Updating the RBI rate (after each MPC meeting, next: 2-4 Dec 2026)
If the Bank Rate changes, add one row `{ from: "<effective date YYYY-MM-DD>", bankRate: <new rate> }` to the end of `RATE_HISTORY` in `lib/engine/config.ts`, add a golden vector that crosses the new date in a separate labelled commit, and run `npm test`. The Standing screen warns users when the last row is more than 75 days old (`RATE_STALE_AFTER_DAYS` in `lib/standing.ts`).
