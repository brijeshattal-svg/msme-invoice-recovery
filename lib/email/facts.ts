import { cleanString } from "@/lib/ai/normalize";
import { addDays, type EngineResult } from "@/lib/engine";
import { formatDate, formatINR } from "@/lib/format";
import type { Tone } from "./tones";

// docs/LEGAL_RULES_SPEC.md section 7: the only digit-bearing phrases an email may contain
// besides the facts themselves.
export const LEGAL_REFERENCES = [
  "Section 15",
  "Section 16",
  "MSMED Act, 2006",
  "Section 43B(h)",
  "Income-tax Act, 1961",
  "Section 37(2)(g)",
  "Income-tax Act, 2025",
  "MSME Form-1",
] as const;

export const INTEREST_BASIS =
  "Interest is calculated at three times the RBI Bank Rate, with monthly rests, under Section 16 of the MSMED Act, 2006.";

export type FactKey =
  | "clientName"
  | "invoiceNumber"
  | "invoiceDate"
  | "amount"
  | "lastPayableDate"
  | "daysOverdue"
  | "interest"
  | "totalDue"
  | "interestBasis"
  | "replyByDate"
  | "waiverOffer"
  | "paymentsLine";

export type Facts = {
  strings: Record<FactKey, string>;
  required: FactKey[];
  /** Fact strings this email must NOT contain (e.g. the interest figure in a gentle check-in). */
  avoid?: FactKey[];
  /** Words this email must not contain, outside the approved strings (e.g. "waive" when no waiver was chosen). */
  avoidWords?: string[];
};

/** Suffix on every checker message about something this particular email must leave out. */
export const NOT_USED = "(not used in this email)";
export const AVOID_LABELS: Partial<Record<FactKey, string>> = {
  interest: "the interest figure",
  totalDue: "the total now due",
  interestBasis: "the interest basis sentence",
};

export type FactsInput = { clientName: string; invoiceNumber: string; invoiceDate: string; amount: number };
export type Overdue = Extract<EngineResult, { status: "overdue" }>;

/** Days after the send date that a "Last friendly reminder" asks for a reply by. */
export const REPLY_BY_DAYS = 7;

export const REQUIRED: FactKey[] = [
  "totalDue",
  "interest",
  "amount",
  "daysOverdue",
  "lastPayableDate",
  "invoiceNumber",
  "clientName",
];

/**
 * Pre-formatted strings the email must reuse verbatim. The model never formats a number.
 * Names are sanitised here so the browser and the server build identical facts.
 * `asOf` (today in India) adds the reply-by date, today plus REPLY_BY_DAYS; without it the
 * string is empty, and empty strings are never approved by checkEmail.
 */
export function buildFacts(input: FactsInput, r: Overdue, asOf?: string): Facts {
  const days = r.daysOverdue;
  const paymentsLine = paymentsSentence(r);
  return {
    strings: {
      clientName: cleanString(input.clientName) ?? "",
      invoiceNumber: cleanString(input.invoiceNumber) ?? "",
      invoiceDate: formatDate(input.invoiceDate),
      amount: formatINR(input.amount),
      lastPayableDate: formatDate(r.lastPayableDate),
      daysOverdue: `${days} ${days === 1 ? "day" : "days"}`,
      interest: formatINR(r.totalInterest),
      totalDue: formatINR(r.totalDue),
      interestBasis: INTEREST_BASIS,
      replyByDate: asOf ? formatDate(addDays(asOf, REPLY_BY_DAYS)) : "",
      waiverOffer: "",
      paymentsLine,
    },
    required: paymentsLine ? [...REQUIRED, "paymentsLine"] : REQUIRED,
  };
}

/**
 * When the client has paid part of the invoice: one fixed approved sentence (built here, never by
 * the AI) saying what was received, including any TDS, and what is still unpaid. Empty otherwise.
 */
export function paymentsSentence(r: Pick<Overdue, "paidSoFar" | "tdsSoFar" | "unpaidAmount">): string {
  if (r.paidSoFar === undefined || r.unpaidAmount === undefined) return "";
  const tds = r.tdsSoFar ? `, including TDS of ${formatINR(r.tdsSoFar)}` : "";
  return `We have received ${formatINR(r.paidSoFar)} so far${tds}, so ${formatINR(r.unpaidAmount)} of the invoice is still unpaid.`;
}

/** Added to the payments sentence in every tone that mentions interest (not the gentle check-in). */
export const PAYMENTS_INTEREST_NOTE = "Interest is worked out only on what was still unpaid on each day.";

export type ToneOptions = {
  /** The founder chose to offer waiving the interest if paid by the reply-by date. */
  waiver?: boolean;
};

/**
 * Per-tone rules on top of the base facts:
 * - "checkin" never mentions interest: the interest figure, total due and interest basis are not
 *   required and are rejected if they appear, and so is the word "interest";
 * - "lastReminder" must state the reply-by date;
 * - a waiver offer (founder's choice, never the AI's) adds one fixed approved sentence that must
 *   appear verbatim; when no waiver was chosen, any waiver wording is rejected, so a model cannot
 *   invent a concession.
 */
export function factsForTone(facts: Facts, tone: Tone, opts: ToneOptions = {}): Facts {
  const strings = { ...facts.strings };
  let required = [...facts.required];
  const avoid: FactKey[] = [];
  const avoidWords: string[] = [];

  if (tone === "checkin") {
    required = required.filter((k) => k !== "totalDue" && k !== "interest");
    avoid.push("interest", "totalDue", "interestBasis");
    avoidWords.push("interest");
  }
  if (tone !== "checkin" && opts.waiver && strings.replyByDate && strings.interest) {
    strings.waiverOffer = `If payment reaches us by ${strings.replyByDate}, I will gladly waive the interest accrued so far, ${strings.interest}.`;
    required.push("waiverOffer");
  } else {
    avoidWords.push("waive", "waived", "waiver", "waiving");
  }
  if (tone === "lastReminder" && strings.replyByDate) required.push("replyByDate");
  if (tone !== "checkin" && strings.paymentsLine) strings.paymentsLine = `${strings.paymentsLine} ${PAYMENTS_INTEREST_NOTE}`;

  return { strings, required, avoid, avoidWords };
}
