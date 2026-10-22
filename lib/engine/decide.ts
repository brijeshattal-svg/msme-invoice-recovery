import {
  DEFAULT_TERMS_DAYS,
  MAX_AGREED_DAYS,
  RATE_HISTORY_START,
} from "./config";
import { addDays, daysBetween } from "./dates";
import { computeInterest } from "./interest";
import type { EngineInput, EngineResult } from "./types";

/** Decision order per docs/LEGAL_RULES_SPEC.md section 2; first match wins. */
export function compute(input: EngineInput): EngineResult {
  const { amount, invoiceDate, acceptanceDate, agreementDays, udyamDate, asOf } = input;

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
    };
  }

  // 5) Overdue: interest to asOf.
  const { rows, totalInterest, totalDue } = computeInterest(amount, interestStartDate, asOf);
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
  };
}
