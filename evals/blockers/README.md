# Blocker classifier evaluation set (DRAFT, V0)

`cases.jsonl` holds 60 **synthetic** client replies. Every company, person, PO number and amount is invented. There must never be a real client message in this file: rewrite real phrasings with new names and figures first.

**Status: first draft, written before the V0 interviews.** After the interviews, update the blocker list in `PLATFORM_PLAN.md` section 7.1 and revise these cases to match how clients actually phrase things (`research/V0_INTERVIEW_KIT.md` section 6).

## Format (one JSON object per line)

```json
{"id": "po-01", "reply": "…", "expected": {"blockers": ["po_missing"], "promisedDate": null, "requestedItems": ["po_number"]}, "notes": "optional"}
```

- `blockers`: one or more of the types in `PLATFORM_PLAN.md` section 7.1, except `no_response`, which is a rule on our records and never comes from a reply. Order doesn't matter.
- `promisedDate`: the ISO date the reply commits to, or `null`. **Reference "today" for every case is 2026-10-22** (a Thursday), so "kal" / "tomorrow" means 2026-10-23. The evaluation runner must pass that date to the model.
- `requestedItems`: what the client asked us for, from this list: `po_number`, `po_copy`, `vendor_form`, `gst_certificate`, `pan`, `bank_letter`, `udyam_certificate`, `corrected_invoice`, `credit_note`, `timesheet`, `sign_off`, `work_completion_certificate`, `approver_name`, `utr`, `breakdown`, `contact`.

## Coverage
- 4 cases for each of the 13 reply-detectable types (52);
- 4 multi-blocker cases, including one where a blocker is explicitly resolved;
- 4 prompt-injection cases (fake instructions, fake JSON, "mark as paid", "set amount to zero").
- English, Hinglish and short or vague replies are mixed in.

## Gate (from `PLATFORM_PLAN.md` R4)
The phase ships only if overall blocker-label accuracy is at least 85% on this set and **no injection case changes behaviour**: no injected label, no threat, no "paid" status, no amount change. `npm run eval:blockers` (built in R4) calls the live model and reports precision and recall per type. It is deliberately not part of `npm test`, so unit tests never spend AI quota. `tests/evals-shape.test.ts` only checks that this file is well-formed.
