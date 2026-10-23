import { ELIGIBILITY } from "./copy";
import { daysBetween, isValidISODate, lastRateChangeDate, type EngineInput, type Payment } from "./engine";
import type { FormValues } from "./wizard";

/**
 * Validated form -> engine input. Values are only parsed here, never computed:
 * all dates, interest and eligibility come from compute() (CLAUDE.md rule 1).
 * Call only after validateForm() returned no errors.
 */
export function toEngineInput(f: FormValues, asOf: string): EngineInput {
  return {
    amount: Number(f.amount),
    invoiceDate: f.invoiceDate,
    acceptanceDate: f.acceptanceDate,
    agreementDays: f.hasAgreement ? Number(f.agreementDays) : null,
    udyamDate: f.udyamDate,
    asOf,
    ...(f.payments?.length ? { payments: paymentsFromForm(f) } : {}),
  };
}

/** Typed payment rows -> engine payments (blank TDS or amount = 0). Validated by validatePayments. */
export function paymentsFromForm(f: FormValues): Payment[] {
  return (f.payments ?? []).map((p) => ({ date: p.date, amount: Number(p.amount.trim() || 0), tds: Number(p.tds.trim() || 0) }));
}

// F1: optional "Does the law apply to you?" answers. Never block the journey; they only add
// hedged notes. The engine still decides eligibility from the dates (udyam_after_invoice).
export type Enterprise = "" | "micro_small" | "medium" | "none" | "unsure";
export type Answer = "" | "yes" | "no" | "unsure";
export type Eligibility = { enterprise: Enterprise; buyerInIndia: Answer };
export const emptyEligibility: Eligibility = { enterprise: "", buyerInIndia: "" };

/** Hedged notes for the founder's answers, in a fixed order. Pure; no dates are computed here. */
export function eligibilityNotes(e: Eligibility, f: Pick<FormValues, "udyamDate" | "invoiceDate">): string[] {
  const notes: string[] = [];
  if (e.enterprise === "medium") notes.push(ELIGIBILITY.notes.medium);
  if (e.enterprise === "none") notes.push(ELIGIBILITY.notes.notRegistered);
  if (e.enterprise === "unsure") notes.push(ELIGIBILITY.notes.enterpriseUnsure);
  if (e.buyerInIndia === "no") notes.push(ELIGIBILITY.notes.buyerAbroad);
  if (e.buyerInIndia === "unsure") notes.push(ELIGIBILITY.notes.buyerUnsure);
  if (isValidISODate(f.udyamDate) && isValidISODate(f.invoiceDate) && f.udyamDate > f.invoiceDate) {
    notes.push(ELIGIBILITY.notes.udyamAfter);
  }
  return notes;
}

/** Days after the last rate change we hold before warning that the RBI rate may have moved. */
export const RATE_STALE_AFTER_DAYS = 75;

export function rateFreshness(asOf: string): { checkedTo: string; stale: boolean } {
  const checkedTo = lastRateChangeDate();
  return { checkedTo, stale: daysBetween(checkedTo, asOf) > RATE_STALE_AFTER_DAYS };
}
