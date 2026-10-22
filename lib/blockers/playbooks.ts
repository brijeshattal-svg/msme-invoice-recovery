import { formatDate, formatINR } from "@/lib/format";
import type { BlockerType } from "./types";

// SPRINT_PLAN.md section 2.1: a next action and a polite-but-firm reply per blocker type.
// Pure and deterministic. Every fact in a reply comes from what the founder typed or from a
// promised date that passed validation; nothing is invented, and there are no legal claims.

export type InvoiceDetails = {
  clientName?: string;
  invoiceNumber?: string;
  /** Rupees, as entered by the founder (validated before it gets here). */
  amount?: number;
  /** ISO date the founder says payment was due. */
  dueDate?: string;
};

export type Playbook = { nextAction: string; subject: string; body: string };

const SIGN_OFF = "[Your name]\n[Your business]";

/** "invoice INV-7 (₹2,18,300.00), due on 30 Jul 2026" built only from the parts that were entered. */
function invoiceRef(d: InvoiceDetails): { short: string; full: string } {
  const short = d.invoiceNumber ? `invoice ${d.invoiceNumber}` : "our invoice";
  const extras = [d.amount !== undefined ? formatINR(d.amount) : null].filter(Boolean);
  const amountPart = extras.length ? ` (${extras.join(", ")})` : "";
  const duePart = d.dueDate ? `, which was due on ${formatDate(d.dueDate)}` : "";
  return { short, full: `${short}${amountPart}${duePart}` };
}

const greeting = (d: InvoiceDetails) => (d.clientName ? `Hi ${d.clientName} team,` : "Hi,");
const subjectFor = (d: InvoiceDetails, what: string) =>
  d.invoiceNumber ? `Invoice ${d.invoiceNumber}: ${what}` : `Our invoice: ${what}`;

export const NEXT_ACTIONS: Record<BlockerType, string> = {
  po_missing: "Ask for the PO number (or a copy of the PO), and who is raising it if it doesn't exist yet.",
  approval_pending: "Ask who is approving it and by when, so you know whom to follow up with.",
  missing_documents: "Send the document they need, or ask exactly which document and in what format.",
  invoice_mismatch: "Confirm the exact correction they need, then reissue the invoice or a credit note if it's right.",
  payment_scheduled: "Note the date they gave and confirm it politely. Follow up the day after if it doesn't arrive.",
  payment_processing: "Wait 2-3 working days, then ask for the payment reference (UTR) if it hasn't arrived.",
  deliverable_dispute: "Propose a short call and ask them to list the open items, so payment isn't held for the whole invoice.",
  unclear: "Ask one clear question: what is the status of the payment, and when can you expect it?",
};

export function playbook(type: BlockerType, d: InvoiceDetails, promisedDate: string | null = null): Playbook {
  const ref = invoiceRef(d);
  const hi = greeting(d);
  const body = (...paras: string[]) => [hi, ...paras, `Thank you,\n${SIGN_OFF}`].join("\n\n");

  switch (type) {
    case "po_missing":
      return {
        nextAction: NEXT_ACTIONS.po_missing,
        subject: subjectFor(d, "PO details needed"),
        body: body(
          `Thanks for the update on ${ref.full}.`,
          "Could you please share the PO number, or a copy of the PO, for this work? If the PO hasn't been raised yet, could you let me know who is raising it and when we can expect it?",
          "Once I have it, I'll make sure the invoice references it so payment isn't held up any further.",
        ),
      };
    case "approval_pending":
      return {
        nextAction: NEXT_ACTIONS.approval_pending,
        subject: subjectFor(d, "approval status"),
        body: body(
          `Thanks for letting me know that ${ref.full} is pending approval.`,
          "Could you tell me who is approving it and when you expect the approval? If anything is needed from our side to help the approver, I'm happy to send it today.",
        ),
      };
    case "missing_documents":
      return {
        nextAction: NEXT_ACTIONS.missing_documents,
        subject: subjectFor(d, "documents for processing"),
        body: body(
          `Thanks for the update on ${ref.full}.`,
          "Could you confirm exactly which document your team needs, and in what format? I'll send it as soon as I hear from you so the invoice can be processed.",
        ),
      };
    case "invoice_mismatch":
      return {
        nextAction: NEXT_ACTIONS.invoice_mismatch,
        subject: subjectFor(d, "correction needed"),
        body: body(
          `Thanks for flagging the issue with ${ref.full}.`,
          "Could you confirm the exact details that need to change? Once confirmed, I'll send a corrected invoice promptly so it can go through without further delay.",
        ),
      };
    case "payment_scheduled":
      return {
        nextAction: NEXT_ACTIONS.payment_scheduled,
        subject: subjectFor(d, "payment date confirmation"),
        body: body(
          promisedDate
            ? `Thanks for confirming that payment for ${ref.full} is scheduled for ${formatDate(promisedDate)}.`
            : `Thanks for letting me know that payment for ${ref.full} is scheduled.`,
          promisedDate
            ? "I've noted that date. Could you share the payment reference once it has been released?"
            : "Could you confirm the date it will be released, and share the payment reference once it has gone out?",
        ),
      };
    case "payment_processing":
      return {
        nextAction: NEXT_ACTIONS.payment_processing,
        subject: subjectFor(d, "payment reference"),
        body: body(
          `Thanks for letting me know that payment for ${ref.full} has been processed.`,
          "Could you share the payment reference (UTR) so I can match it on our side when it arrives?",
        ),
      };
    case "deliverable_dispute":
      return {
        nextAction: NEXT_ACTIONS.deliverable_dispute,
        subject: subjectFor(d, "open items"),
        body: body(
          `Thanks for your feedback on the work covered by ${ref.full}.`,
          "Could you list the specific open items? I'd like to resolve them quickly. Could we also have a short call this week to agree the next steps and the timeline for payment?",
        ),
      };
    case "unclear":
      return {
        nextAction: NEXT_ACTIONS.unclear,
        subject: subjectFor(d, "payment status"),
        body: body(
          `Thanks for your reply about ${ref.full}.`,
          "Could you let me know the current status of the payment and the date we can expect it? If anything is needed from our side to process it, please tell me and I'll send it right away.",
        ),
      };
  }
}
