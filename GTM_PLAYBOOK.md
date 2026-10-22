# GTM playbook: from hackathon demo to a real signal

Principle: your doc already says the hard question is not technical but behavioural (will a founder send an interest email to a client they depend on?). The GTM plan exists to **measure that honestly** and to tell the story without looking more finished than the product is.

## 1. Positioning

- **One-liner:** "Find out what a late-paying client legally owes you, and send one polite email that protects the relationship."
- **User:** founder of a Udyam-registered micro or small **service** business in Bengaluru (digital agency, IT services) who invoices larger companies.
- **Moment:** a big client's invoice is past due; the founder is deciding between chasing again and staying silent.
- **Gap (from your doc):** CredFlow nudges, TReDS finances, CalcGuru calculates for people who already decided to escalate, lawyers/ODR start after the fight is chosen. Nobody helps with *the decision to ask*, in words that keep the client.
- **Why now:** the Income-tax change that makes late payment a tax cost for the *buyer* (s.43B(h) of the 1961 Act, now s.37(2)(g) of the 2025 Act) gives the founder a non-threatening opening. The email leads with the client's own exposure, not the founder's anger.
- **Do not claim:** that you recover money, that the interest is certainly owed, or that the email will be paid. You claim: "we make asking easy, correct and polite".

### Market statistics (from your doc's sources; **re-read the articles before they go on a slide**)

| Stat | Your doc's source | Use as |
|---|---|---|
| SMEs take 73 days on average to pay invoices (about 1.1 lakh MSMEs studied) | Recordent 2026 report via Telangana Today | Problem slide; attribute by name |
| Economic Survey 2025-26: fear of losing future business stops MSMEs pursuing dues | Business Standard, Jan 2026 | Problem slide; paraphrase, attribute |
| Delayed payments figure of 8.1 trillion | Business Standard headline in your sources | Confirm the unit and wording from the article first |
| About 0.2% of MSMEs use TReDS | IMPRI | Competition slide; attribute |

## 2. Founder interviews (your doc says they "will confirm")

Goal: 8-10 conversations of 15 minutes. You cannot claim a segment finding from fewer than a handful; say the actual number in the pitch.

**Who:** service-business founders who invoice larger companies, ideally with an invoice currently overdue. Sources: your own network, hackathon cohort contacts, local founder communities. Do not invent sources of leads.

**Script (ask, do not pitch; write down their exact words):**
1. Walk me through the last invoice that was paid late. What happened, who did you speak to, how many days late?
2. How late is "late" for your biggest clients? What do you do on day 1, 15, 45, 90?
3. Have you ever **not** chased a client you were afraid to annoy? What stopped you, in your words?
4. Did you know the law lets you charge interest? Have you ever stated an interest amount to a client? What happened?
5. What do you use today (WhatsApp, email, accounts team, CA, lawyer, Tally/Zoho reminders)?
6. If you could see, in two minutes, exactly what a client owes including interest and a ready email, would you send it? What would make you hesitate?
7. Who in the client's company would receive it? Do you know the finance contact?
8. (Pricing, last, as hypotheses not offers) Would you pay for this: per use, monthly, or only when money is recovered? What feels fair?

**What changes the product:** if founders say they never know the finance contact, add "find who to send to" to the next steps; if they fear the interest line, test a "no interest, just reminder" variant; if they send to the accounts team over WhatsApp, a WhatsApp-ready text is a likely next feature.

## 3. Behaviour test (Param's question)

**Protocol**
1. Give each interviewee the live link and ask them to run **one real overdue invoice** through it, ideally while you watch (or screen-share).
2. Record: time to finish, where they hesitated, what they edited in the draft, extraction errors.
3. 48 hours later, message them one question: "Did you send the email (yes / sent a changed version / no)? If no, why not?"
4. Record: sent as-is, sent edited, not sent, and the reason in their words.

**Report honestly:** "N founders tried it, X sent within 48 hours, Y edited then sent, Z did not, top reasons: ..." With a small N, say so. Your doc commits that this result goes into the pitch whatever it shows; that candour is a strength with judges.

**Metrics (all measured by you, none by app analytics, because the app stores nothing):** completion without help (target: under 3 min), extraction correct on first read, % of drafts sent as-is vs edited, 48-hour send rate.

## 4. Demo script for the Loom (about 2:30)

| Time | Beat |
|---|---|
| 0:00-0:15 | The moment: "A big client is 57 days late. You want the money. You don't want to lose the client." |
| 0:15-0:40 | Upload a real-looking invoice (use the sample; show a phone photo if time) |
| 0:40-1:00 | Confirm screen: point at the amber "please check" field; add Udyam date; say "AI reads, you confirm" |
| 1:00-1:35 | Standing screen: due date, days overdue, interest, expand the month-by-month working; mention the 7 Oct 2026 rate change crossing |
| 1:35-2:05 | Pick a tone; show the email opening with the client's own tax cost; show the "numbers checked" chip |
| 2:05-2:20 | Show an edge case: invoice not yet due or Udyam-after-invoice (shows it knows when to stop) |
| 2:20-2:30 | The honest close: the behaviour-test result and "not legal advice" |

Rehearse on the live link, incognito, to avoid surprises. Keep the sample invoice as the fallback.

## 5. Pitch deck (8 slides)

1. **Title + one-liner**
2. **The moment** (founder persona, fear of losing the client) with the sourced stats
3. **Why existing tools miss it** (your 4-row table, compressed)
4. **The product in 5 screens** (screenshots from the live link)
5. **What AI does vs what code does** (AI reads and writes; TypeScript does the law and checks every number; nothing is sent automatically)
6. **The rules, checked by hand** (formula, the rate table, CalcGuru comparison result)
7. **Behaviour test result** (the real numbers, whatever they are) + interview quotes
8. **Known limits and next steps** (your doc's two tables: not legal advice; founder facts unverified; registration test simplified and referred to a larger bench; method may differ from a council's; rates from Feb 2023 only; AI can misread; then roadmap: scheduled follow-ups, claim-ready evidence pack with a lawyer on revenue share, part payments, receivables dashboard, Tally/Zoho, Udyam verification, earlier rates, pricing tests)

## 6. LinkedIn post (template; fill only with true numbers)

> Small-business founders in India are often owed more than the invoice, and still stay silent because they're afraid to lose the client.
> I built a no-login tool in 2 days at <hackathon>: upload an overdue invoice, see whether it's legally late, what interest accrues under the MSMED Act, and get an email that opens with the client's own tax cost instead of a threat.
> AI reads the invoice and writes the email. Plain code does the law and checks every number. Nothing is sent automatically.
> <N> founders tried it on a real invoice; <X> sent the email within 48 hours. <one honest lesson>.
> Try it: <live link>. Not legal advice, and I'd love feedback from anyone who invoices big clients.

## 7. Judge Q&A (honest answers)

| Question | Answer |
|---|---|
| Why not just use CalcGuru? | It assumes you've decided to escalate and needs manual typing. We read the invoice and help with the decision and the wording. |
| Isn't this just a ChatGPT wrapper? | AI does two jobs; the legal maths is deterministic TypeScript with golden tests, and every number in the email is mechanically checked against it. |
| Can the AI invent an amount? | It never calculates; it receives pre-formatted figures, and the check rejects any digit that is not an approved value. Known gap: numbers written in words; we constrain by prompt and test for it. |
| Is the legal logic right? | It implements sections 15-16 per published sources and the CalcGuru method; a council could compute slightly differently; Udyam timing is simplified; a lawyer should review before a formal claim. |
| Will founders actually send it? | That's the open question; here is the measured 48-hour result. |
| What about data privacy? | The invoice is sent to the AI provider's API to be read; our app stores nothing; no login. |
| How do you make money? | Not decided before interviews. Hypotheses to test: success fee, subscription, escrow. |
| What if RBI changes the rate? | The rate table is one config file with a "loaded to" date on screen; scheduled update is a next step. |
| What breaks first at scale? | Rate limiting and abuse protection, Udyam verification, and extraction accuracy on messy photos. |

## 8. Prompts for the Day-3 collateral

**Deck outline to slides**
```
Using GTM_PLAYBOOK.md section 5 and these true facts: <paste behaviour-test results, CalcGuru comparison, interview count, screenshots list>, draft the text for each of the 8 slides: a headline of at most 10 words and at most 3 bullets of at most 12 words each. Do not add any statistic that is not in this input. Mark any claim that needs a source with [SOURCE?].
```

**Loom script**
```
Turn the section 4 table of GTM_PLAYBOOK.md into a word-for-word script of about 330 words, in a plain, calm founder's voice, no hype. Use only features that exist in the live app today: <paste final feature list>. End with the real behaviour-test result: <paste>.
```

**LinkedIn post**
```
Write the LinkedIn post from section 6 of GTM_PLAYBOOK.md using only these true numbers and learnings: <paste>. 120 words max, no hashtags beyond three, no claims about money recovered.
```

## 9. Roadmap order after the hackathon (from your doc, ordered by what the interviews will likely demand)

1. Finance-contact capture and WhatsApp-ready text (if interviews say so)
2. Scheduled follow-ups once founders trust the drafts
3. Part payments (apply to interest first, then principal)
4. Multiple invoices and a receivables view; Tally/Zoho connection
5. Udyam verification; rate history before Feb 2023
6. Claim-ready evidence pack with a lawyer on revenue share (needs a legal partner and the ODR portal's format)
7. Pricing experiments: success fee, subscription, escrow
