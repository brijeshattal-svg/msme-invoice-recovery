# V0 interview kit: why do invoices get stuck?

**Goal:** before building anything in `PLATFORM_PLAN.md` R1-R6, learn from 10-15 founders what *actually* blocks their payments, what they do about it, and whether they would pay for help. This phase writes no app code.

**Who to talk to:** founders, finance heads or account managers at Indian B2B service businesses that invoice larger companies:
- digital, creative and marketing agencies;
- IT services and software development firms;
- staffing and contract-hiring firms.

Aim for a mix: 4-5 of each type if possible, with some Udyam-registered micro or small enterprises.

**Rules for every interview:**
- Ask about **past behaviour, not opinions about our idea**. "Tell me about the last time…" beats "Would you use…?".
- **Don't pitch** until the last 5 minutes. Don't correct them or explain the law while they talk.
- **Don't collect client names, invoice copies or exact amounts.** Bands are enough ("₹1-5 lakh"). If they read out a client's message, write it down paraphrased, with names removed.
- Ask permission before taking notes or recording; recording is optional.
- Write the notes within an hour, using the template in section 4.

---

## 1. Recruiting message (WhatsApp / LinkedIn / email)

> Hi <first name>, I'm building a tool for service businesses that deal with clients paying late. I'm not selling anything yet: I'd like to learn how you handle delayed invoices today. Would you have 20 minutes this week for a quick call? I'll ask about your last few late payments (no client names or invoice copies needed). Happy to share what I learn from talking to other founders. Thanks, <your name>

Follow-up if no reply after 3 days (once only):

> Hi <first name>, just bumping this in case it got buried. Even 15 minutes would help a lot. If now isn't a good time, no problem at all.

---

## 2. Interview script (20 minutes)

### Opening (2 min)
- Thank them. "I'm trying to understand how businesses like yours deal with late payments. There are no right answers, and I'm not pitching anything today."
- "Is it OK if I take notes? I won't record client names or exact amounts."

### Context (3 min)
1. What does your business do, and who are your typical clients (size, industry)?
2. Roughly how many invoices do you raise in a month? Typical size band: under ₹1 lakh, ₹1-5 lakh, ₹5-25 lakh, over ₹25 lakh.
3. Who in your team follows up on payments, and how much of their week does it take?

### The last three delayed invoices (10 min, the core)
For **each** of the last three invoices that were paid late (or are still unpaid):

4. Roughly how late was it, and how big was it (band)?
5. What did the client say when you followed up? *(Ask them to read or paraphrase the actual reply, with names removed.)*
6. What do you think was **really** holding the payment up?
   - *If they hesitate, offer examples **after** they've answered or got stuck:* a PO, vendor registration, an invoice error, a missing timesheet or sign-off, approval, the client's payment cycle, a dispute, or the client's cash.
7. What did you do about it, step by step? How long did that take?
8. What finally got it paid (or where is it now)?
9. Looking back, what would have got it paid sooner?

### Today's tools and cost (3 min)
10. How do you track who owes what today (Excel, Tally, Zoho, memory)?
11. Has a late payment ever caused a cash crunch, such as salaries, rent or a vendor payment? What happened?
12. Have you ever claimed interest on a late payment, or used MSME Samadhaan? Why or why not?

### Willingness to pay and the pilot (2 min; only now, a short description)
13. *Describe in one sentence:* "A tool that reads your clients' replies, tells you what's blocking each payment and what to do next, ranks who to chase first, and warns you before a cash shortfall." What part of that matters most to you? What part doesn't?
14. Do you pay for any software for finance or collections today? Roughly how much a month?
15. Would you try a free 30-day pilot with your own (anonymised if you prefer) data, and give feedback every week?

### Close
- "Who else should I talk to?" (ask for one or two introductions)
- Thank them. Write the notes within an hour.

---

## 3. What we're listening for (fill in after each interview, not during)

| Signal | Why it matters to the plan |
|---|---|
| The blocker types they describe, in their words | Confirms or changes the list in `PLATFORM_PLAN.md` section 7.1 |
| How the client actually phrased it | Seeds the synthetic evaluation replies (rewritten, never copied with names) |
| Time spent per blocker and per week | Pricing and the value story |
| Whether late payment ever hit payroll or cash | Validates the cash-forecast feature (R6) |
| Whether they know or use their MSME rights | Validates how prominent the MSME checker should be |
| Current tools and spend | Integration needs (CSV, Tally, Zoho) and price anchors |
| Yes or no to the pilot | Pilot list (target: at least 5) |

---

## 4. Note template (one per interview)

Copy into `research/notes/<date>-<id>.md` (use an id like `I-01`, no company or person names).

```
# Interview I-__   date: ____   segment: agency / IT services / staffing / other: ____
Team size: __   Invoices per month: __   Typical size band: ____   Udyam registered: yes / no / unsure
Who chases payments: ____   Hours per week on it: __

## Delayed invoice 1
How late: __ days   Size band: ____
What the client said (paraphrased, no names): "____"
Real blocker (their words): ____
Blocker type (our list, 7.1): ____   (or NEW: ____)
What they did / how long: ____
What got it paid: ____
What would have helped: ____

## Delayed invoice 2
(same fields)

## Delayed invoice 3
(same fields)

## Tools and cost
Tracking today: ____   Paid software and spend: ____
Cash crunch from a late payment? ____
Claimed interest / used MSME Samadhaan? ____

## Reaction to the one-sentence description
Most valuable part: ____   Least valuable: ____
Pilot: yes / no / maybe   Introductions offered: ____

## Surprises (anything that contradicts our plan)
____
```

---

## 5. Tracker

Keep one row per interview in `research/V0_TRACKER.csv` (created alongside this file): id, date, segment, team size, invoices per month, size band, blocker types seen (semicolon-separated), cash crunch (y/n), knows MSME rights (y/n), pilot (y/n/maybe), notes file.

---

## 6. When V0 is done

1. Count how often each blocker type came up across all delayed invoices; update `PLATFORM_PLAN.md` section 7.1 (add, merge or drop types, with the counts).
2. Rewrite real phrasings as **synthetic** replies (new fictional companies, names and amounts) and update `evals/blockers/cases.jsonl` so the evaluation set reflects reality.
3. List the pilots (ids only in the repo; contact details stay outside git).
4. Write a one-page summary: top blockers, time cost, cash-crunch frequency, willingness to pay, and anything that should change the plan.

**Done when:** at least 10 interviews are summarised, section 7.1 is confirmed or changed, the evaluation set is updated, and at least 5 pilots have agreed.
