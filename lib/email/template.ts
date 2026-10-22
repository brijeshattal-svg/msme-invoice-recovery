import type { Email } from "./check";
import type { Facts } from "./facts";
import type { Tone } from "./tones";

// Deterministic fallback drafts (CLAUDE.md rule 8). Every digit comes from facts.strings or the
// approved legal phrases, so each one passes checkEmail by construction (tests/template.test.ts).

const HEADS_UP =
  "as we understand it, under Section 43B(h) of the Income-tax Act, 1961 (now Section 37(2)(g) of the Income-tax Act, 2025), a buyer may not be able to claim a tax deduction for amounts owed to micro and small suppliers until they are paid, and companies report such overdue dues half-yearly in MSME Form-1.";

const SIGN_OFF = "[Your name]\n[Your business]";

export function buildTemplate(facts: Facts, tone: Tone): Email {
  const f = facts.strings;

  if (tone === "friendly") {
    return {
      subject: `Invoice ${f.invoiceNumber}: a quick reminder`,
      body: [
        `Hi ${f.clientName} team,`,
        `A quick heads-up that may be useful on your side: ${HEADS_UP}`,
        `Our invoice ${f.invoiceNumber} dated ${f.invoiceDate} for ${f.amount} was due for payment by ${f.lastPayableDate} and is now ${f.daysOverdue} overdue. ${f.interestBasis} Interest so far comes to ${f.interest}, so the total now due is ${f.totalDue}.`,
        `Could you let us know when we can expect the payment? A reply this week would really help us plan.`,
        `Thank you, and thanks for working with us.`,
        SIGN_OFF,
      ].join("\n\n"),
    };
  }

  if (tone === "firm") {
    return {
      subject: `Follow-up: invoice ${f.invoiceNumber} is overdue`,
      body: [
        `Dear ${f.clientName} team,`,
        `I'm following up on my earlier reminder. Before the details, one point that may matter for you: ${HEADS_UP}`,
        `Invoice ${f.invoiceNumber} dated ${f.invoiceDate} for ${f.amount} was due by ${f.lastPayableDate}. It is now ${f.daysOverdue} overdue. ${f.interestBasis} Interest so far is ${f.interest}, and the total now due is ${f.totalDue}.`,
        `Please confirm a payment date by the end of this week.`,
        `Regards,`,
        SIGN_OFF,
      ].join("\n\n"),
    };
  }

  return {
    subject: `Overdue payment: invoice ${f.invoiceNumber}`,
    body: [
      `Dear Accounts Payable team, ${f.clientName},`,
      `For your information, ${HEADS_UP}`,
      [
        `Invoice number: ${f.invoiceNumber}`,
        `Invoice date: ${f.invoiceDate}`,
        `Invoice amount: ${f.amount}`,
        `Payment was due by: ${f.lastPayableDate}`,
        `Days overdue: ${f.daysOverdue}`,
        `Interest to date: ${f.interest}`,
        `Total now due: ${f.totalDue}`,
      ].join("\n"),
      f.interestBasis,
      `We would be grateful if you could arrange payment, or confirm the expected payment date, by the end of next week.`,
      `Yours faithfully,`,
      SIGN_OFF,
    ].join("\n\n"),
  };
}
