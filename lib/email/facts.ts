import { cleanString } from "@/lib/ai/normalize";
import type { EngineResult } from "@/lib/engine";
import { formatDate, formatINR } from "@/lib/format";

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
  | "interestBasis";

export type Facts = { strings: Record<FactKey, string>; required: FactKey[] };

export type FactsInput = { clientName: string; invoiceNumber: string; invoiceDate: string; amount: number };
export type Overdue = Extract<EngineResult, { status: "overdue" }>;

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
 */
export function buildFacts(input: FactsInput, r: Overdue): Facts {
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
    },
    required: REQUIRED,
  };
}
