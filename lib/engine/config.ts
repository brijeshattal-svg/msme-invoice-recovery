// Every tunable of the legal engine lives here (see docs/LEGAL_RULES_SPEC.md).
// Adjust these after comparing with CalcGuru; do not change engine code for that.

export type RateRow = { from: string; bankRate: number };

// effective-from (inclusive, ISO) and RBI Bank Rate %. Source: MVP scope doc rate table.
// 2023-02-08 is the ASSUMED day for "Feb 2023" (open item O1: verify against the RBI circular).
export const RATE_HISTORY: readonly RateRow[] = [
  { from: "2023-02-08", bankRate: 6.75 },
  { from: "2025-02-07", bankRate: 6.5 },
  { from: "2025-04-09", bankRate: 6.25 },
  { from: "2025-06-06", bankRate: 5.75 },
  { from: "2025-12-05", bankRate: 5.5 },
  { from: "2026-10-07", bankRate: 5.75 },
];

export const RATE_HISTORY_START = RATE_HISTORY[0].from;
export const DEFAULT_TERMS_DAYS = 15;
export const MAX_AGREED_DAYS = 45;
export const DAYS_IN_YEAR = 365; // fixed by the CalcGuru method, even in leap years
export const MULTIPLIER = 3; // s.16: three times the bank rate

// Open item O2: does CalcGuru count the "calculate to" day? Flip if the comparison says no.
export const INCLUDE_AS_OF_DAY = true;

// Money is rounded to 2 dp once per calendar month, when the month's interest is added to the balance.
export const roundMoney = (x: number): number =>
  Math.round((x + Number.EPSILON) * 100) / 100;
