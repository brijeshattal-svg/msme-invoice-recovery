import { RATE_HISTORY } from "./config";

/** RBI Bank Rate in force on `iso`, or null if the date precedes the loaded history. */
export function bankRateOn(iso: string): number | null {
  let rate: number | null = null;
  for (const row of RATE_HISTORY) if (row.from <= iso) rate = row.bankRate;
  return rate;
}

/** Effective date of the most recent rate change loaded ("RBI rates loaded up to ..."). */
export function lastRateChangeDate(): string {
  return RATE_HISTORY[RATE_HISTORY.length - 1].from;
}
