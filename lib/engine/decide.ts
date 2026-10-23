import {
  DEFAULT_TERMS_DAYS,
  MAX_AGREED_DAYS,
  RATE_HISTORY_START,
  roundMoney,
} from "./config";
import { addDays, daysBetween } from "./dates";
import { computeInterest } from "./interest";
import type { EngineInput, EngineResult, PaidSoFar, Payment } from "./types";

const creditOf = (p: Payment): number => roundMoney(p.amount + p.tds);

/** Payments up to asOf, summed; empty when none were entered (keeps old results identical). */
function paidSummary(amount: number, counted: Payment[]): PaidSoFar | Record<string, never> {
  if (counted.length === 0) return {};
  const paidSoFar = roundMoney(counted.reduce((s, p) => s + creditOf(p), 0));
  const tdsSoFar = roundMoney(counted.reduce((s, p) => s + p.tds, 0));
  return { paidSoFar, tdsSoFar, unpaidAmount: roundMoney(amount - paidSoFar) };
}

/** Decision order per docs/LEGAL_RULES_SPEC.md section 2; first match wins. */
export function compute(input: EngineInput): EngineResult {
  const { amount, invoiceDate, acceptanceDate, agreementDays, udyamDate, asOf } = input;
  // Payments dated after today have not happened yet: ignored.
  const counted = (input.payments ?? []).filter((p) => p.date <= asOf);
  const paid = paidSummary(amount, counted);

  // 1) Udyam registration must not come after the invoice.
  if (udyamDate > invoiceDate) return { status: "udyam_after_invoice" };

  // 2) Due date (spec section 3). agreementDays 0 is a real agreement, not "none".
  const termDays =
    agreementDays === null ? DEFAULT_TERMS_DAYS : Math.min(agreementDays, MAX_AGREED_DAYS);
  const capped = agreementDays !== null && agreementDays > MAX_AGREED_DAYS;
  const lastPayableDate = addDays(acceptanceDate, termDays);
  const interestStartDate = addDays(lastPayableDate, 1);

  // 3) Gate on the day interest would start, not on the acceptance date.
  if (interestStartDate < RATE_HISTORY_START) {
    return { status: "rate_history_not_loaded", lastPayableDate, interestStartDate };
  }

  // 4) Not late yet.
  if (asOf <= lastPayableDate) {
    return {
      status: "not_yet_due",
      termDays,
      capped,
      lastPayableDate,
      interestStartDate,
      daysLeft: daysBetween(asOf, lastPayableDate),
      ...paid,
    };
  }

  // 5) Overdue: interest to asOf. Payments made before interest starts simply reduce the amount it
  // starts on; later ones reduce the balance from their own date (spec section 4a).
  const early = counted.filter((p) => p.date < interestStartDate).reduce((s, p) => s + creditOf(p), 0);
  const later = counted.filter((p) => p.date >= interestStartDate).map((p) => ({ date: p.date, credit: creditOf(p) }));
  const { rows, totalInterest, totalDue } = computeInterest(roundMoney(amount - early), interestStartDate, asOf, later);
  return {
    status: "overdue",
    termDays,
    capped,
    lastPayableDate,
    interestStartDate,
    daysOverdue: daysBetween(lastPayableDate, asOf),
    rows,
    totalInterest,
    totalDue,
    ...paid,
  };
}
