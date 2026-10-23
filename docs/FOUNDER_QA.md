# Founder Q&A: FortyFive (prepare before the founder meeting)

*Facts come from the repo and the build history. Anything not verified says so. Market statistics come from the scope document and have not been re-checked.*

## 1. What is the MVP? (one paragraph you can say out loud)
FortyFive helps a founder of a micro or small service business who has a late invoice from a bigger client. They upload the invoice. AI reads it. The founder confirms it. **Plain code, not AI,** works out the legal due date and the interest that **may be owed** under Sections 15-16 of the MSMED Act (three times the RBI Bank Rate, monthly rests). The founder picks a tone and gets a polite email. **Code checks every number in it.** The founder sends it from their own email or WhatsApp. Nothing is stored, nothing is sent for them, and there is no login. About two minutes, one invoice.

**Main product:** Quick Check at `/`. **Side tools** (More tools): Payment Blocker Assistant, Client Payment Priorities, Cash-flow Forecast, Ageing Report. They help once there is more than one late invoice. They are not the pitch.

## 2. Param's question: "Will founders actually send a 'you owe me interest' email to a client they depend on?"
**Honest answer: we don't know yet, and the product is built around that question.**

What we built to make sending easier and safer:
- **Interest is framed as "may be owed", never a threat,** and every email opens with the *client's* tax angle (as we understand it, Section 43B(h) of the Income-tax Act, 1961, now Section 37(2)(g) of the 2025 Act: a buyer may not be able to claim a deduction for dues to micro and small suppliers until paid). That is a helpful, non-adversarial reason to pay.
- **Seven tones**, including *Relationship-first* for retainer clients, a *Gentle check-in* that never mentions interest, and a *Last friendly reminder* with a reply-by date. An optional **interest-waiver offer** (the founder's choice, off by default) can be added to any tone that mentions interest.
- **The founder controls everything.** Nothing is sent automatically. The email is editable.
- **Blocker Assistant:** often the real reason for non-payment is a PO, vendor code or approval, not unwillingness. The app finds it from the client's reply and drafts a practical, polite response.

What we have **not** done: measure whether founders send. That is the behaviour test in `GTM_PLAYBOOK.md` section 3: give 5-10 founders a real overdue invoice, watch, and ask 48 hours later: sent as is, sent edited, or not sent, and why. **We should report the result honestly, whatever it is.**

## 3. How are we different from CredFlow and TReDS?
What we know about each:

| | What it is | What we know | Where it stops |
|---|---|---|---|
| **CalcGuru** | MSME interest calculator | We matched it on 3 cases (2 exact, 1 within ₹0.01) | A calculator: gives a number, doesn't help you ask |
| **CredFlow** | A receivables platform. Their site was down when we tried (503), so we only saw the owner's screenshots | Screenshots show an accounting-synced dashboard: receivables and payables, collections, follow-ups, reminders, CRM, campaigns, reports, an "Ask AI" button | Broad business-finance suite, needs accounting data connected. We have **not** used it, so don't claim more than the screenshots show |
| **TReDS** (RXIL, M1xchange, Invoicemart) | Regulated invoice-financing platforms | Sells an invoice for early cash; the scope document cites about 0.2% MSME usage (IMPRI, **unverified**) | Solves "I need cash now", not "my client is late and I don't know what to say" |
| **FortyFive** | A narrow tool for the moment of the ask | Photo to a checked, sendable message in about two minutes. No login, no integration, nothing stored | Handles one invoice at a time well; no accounting sync, no payments |

**The line:** CredFlow manages receivables, TReDS finances them, CalcGuru calculates. Nobody helps with the *decision to ask*, in words that keep the client. We are the narrow wedge, not a platform yet.

## 4. Business model: what we can and cannot say
Nothing below is validated. These are hypotheses to test in the customer interviews Param asked for.

| Model | Idea | Main question | Risk |
|---|---|---|---|
| **CA / accountant channel** | A CA runs checks for many clients, subscription per CA | Do CAs want this, and will they pay? | Depends on CA distribution, which we have not tested |
| **Founder SaaS** | Free Quick Check, paid workspace (tracker, follow-ups, reports) | Will agencies pay for tracking? | The app stores nothing today; a paid tier means storing data, consent and legal work (`PLATFORM_PLAN.md`) |
| **Financing referral** | When a client is very late, offer invoice discounting or TReDS through a licensed partner | Do founders want cash now? | Needs partnerships and compliance; we would never lend |
| **Success fee** | A cut of recovered money | Attractive in theory | We can't prove we caused a payment, and it conflicts with "not legal advice" |

### Escrow (Param's suggestion)
- **The idea:** payment held by a neutral party until the work is accepted, which reduces late payment at the source (for future projects), rather than chasing after the fact.
- **What it would take (our understanding, verify with a lawyer before saying anything firm):** holding client money in India generally needs a licensed entity, such as a bank-run escrow or an RBI-authorised payment intermediary. A startup would partner, not hold funds itself.
- **Our recommendation:** treat escrow as a **later, partner-led product** for new projects, and do **not** build it now. First learn from interviews how many invoices stall because of acceptance disputes versus slow payment. A partial step we can build: milestone and advance suggestions in the contract-terms advice (R9 in `PLATFORM_PLAN.md`).

## 5. Is there real AI/ML here? (be precise, founders grill on this)
- **AI is used for:** reading invoices (vision), classifying a client's reply into a blocker type with an exact quote, and writing the email.
- **AI is deliberately not used for:** dates, interest, rankings or forecasts. Those are plain, tested code, because they must be exactly right.
- **No machine learning model is trained.** We do not store data, so there is nothing to train on. Be upfront about it.
- **The honest ML roadmap:** with a user's consent, record anonymised outcomes (tone used, replied, paid, days). After enough examples, learn what works for which client type. That is the long-term moat, and it needs the storage rules in `PLATFORM_PLAN.md`, a privacy notice and DPDP compliance first.

## 6. Questions you should expect, and honest answers
| Question | Answer |
|---|---|
| Who pays you, and why? | Not validated yet. The hypotheses are above; the interviews decide |
| What if the interest is wrong? | The calculator matched CalcGuru (2 of 3 cases exactly, 1 within ₹0.01) and has 13 golden tests. It says "may be owed" and "Not legal advice" |
| Does the law apply to every client? | No. Micro and small suppliers only; the buyer must be in India; Udyam registration timing matters (the Supreme Court has referred it to a larger bench). The app asks and warns |
| Why would a founder trust it with an invoice? | Nothing is stored; the invoice goes to Google's AI only to be read, and the app says so. On Google's free tier, data may be used by the provider, so real invoices need a paid key |
| What if the AI makes up a number? | Code rejects any figure not in the approved list, number words, figures in the wrong place, and threats or legal words |
| What stops CredFlow copying you? | Nothing structural today. Our edge is focus, speed, trust and tone quality; the moat would be distribution through CAs and outcome data |
| How many users do you have? | None yet. Say so, and say the behaviour test is next |
| Can it send emails or collect money? | No, by design. The founder sends. We hold no money |

## 7. Known limits (say these before they ask)
- One invoice at a time in Quick Check; the side tools keep a list in memory only.
- RBI rates are updated by hand (next meeting 2-4 Dec 2026; the app warns when rates are over 75 days old).
- Founder-entered facts are not verified.
- Free AI quota is small (about 20 requests a day per model); billing should be on for any real use.
- No customer interviews or behaviour test results yet.
