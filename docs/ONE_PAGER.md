# FortyFive: one page

**Live:** https://msme-invoice-recovery.vercel.app · no login · nothing stored · not legal advice

## Problem
Small Indian service businesses (agencies, consultants, IT and design studios) wait months to be paid by bigger clients. The law already sides with them: under the MSMED Act, 2006, a buyer should pay a micro or small supplier within 15 days of acceptance, or within the agreed days up to 45 (Section 15), and late payments may attract compound interest at three times the RBI Bank Rate (Section 16). Most founders don't use this because:
- they don't know the rule or how to work the interest out (monthly rests, rate changes);
- they fear damaging the client relationship;
- writing a firm-but-polite email with exact figures takes time they don't have.

## What we built
Photo or PDF of an overdue invoice → AI reads it → the founder confirms → plain code works out the legal due date, days overdue and interest, month by month → founder picks one of seven tones written for Indian services businesses → AI drafts the email → **code checks every number** → founder copies it, opens it in their own mail app, or copies a short WhatsApp version. A follow-up plan suggests day 7 and day 15 reminders. About two minutes end to end.

## Why it's different
| | Interest calculators | Invoice-financing platforms | FortyFive |
|---|---|---|---|
| Works out the interest | Yes | No | Yes, matched against CalcGuru on 3 cases (one paisa apart on a 7-month case) |
| Reads the invoice for you | No | Onboarding needed | Yes (AI, founder confirms) |
| Writes the message | No | No | Seven relationship-aware tones (one with no interest at all), an optional waiver offer, email and WhatsApp |
| Stops the AI inventing figures | n/a | n/a | Every digit, number word and figure placement is checked in code |
| Signup | Varies | KYC, login | None; nothing stored |

**The line for the pitch:** calculators tell you the number. FortyFive gets you from the number to a sent message, without making you the bad guy.

## Why now
- As we understand it, since 2024 (Section 43B(h) of the Income-tax Act, 1961, now Section 37(2)(g) of the Income-tax Act, 2025) a buyer may not be able to claim a tax deduction for dues to micro and small suppliers until they are paid. That gives the founder a helpful, non-threatening reason the client should care, and every email opens with it.
- LLMs can now read messy invoices well enough, but they can't be trusted with arithmetic. We use them only for reading and writing; code does the maths and checks the output.

## Trust and safety by design
No database, no accounts, no analytics on invoice content; server logs carry status and model only. "Not legal advice" on every result screen. Emails never threaten or mention lawyers, courts or any outside body. If the AI is down or a draft fails the check twice, a standard draft is used, so the journey never dead-ends.

## Honest limits
Founder-entered facts are not verified. Legal positions are hedged and not a substitute for advice (the Supreme Court has referred the registration-timing question to a larger bench). The rate table needs a manual update after each RBI change; the app warns when it is more than 75 days old. On the free AI tier, prompts may be used by the provider, so real invoices need a paid key.

## Ask
Feedback from founders who chase payments, and introductions to CA firms and MSME associations as a distribution channel.
