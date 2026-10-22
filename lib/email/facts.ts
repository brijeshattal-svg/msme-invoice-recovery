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
  | "replyByDate";

export type Facts = { strings: Record<FactKey, string>; required: FactKey[] };

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
    },
    required: REQUIRED,
  };
}

/** The tone decides whether the reply-by date must appear (only the last reminder states one). */
export function factsForTone(facts: Facts, tone: Tone): Facts {
  if (tone !== "lastReminder" || !facts.strings.replyByDate) return facts;
  return { ...facts, required: [...facts.required, "replyByDate"] };
}
