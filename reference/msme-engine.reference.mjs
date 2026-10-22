// Reference implementation of the MSMED Act s.15/s.16 maths used by the MVP.
// Purpose: (1) pin down every convention so the TypeScript build has one unambiguous target,
// (2) generate golden vectors (docs/golden-vectors.json) the real engine's tests must reproduce.
// Pure functions, no I/O, no "today" inside: asOf is always passed in.

export const RATE_HISTORY = [
  // effectiveFrom (inclusive), RBI Bank Rate %. Source: MVP scope doc rate table.
  // 2023-02-08 is the day-of-month ASSUMED for "Feb 2023" -> VERIFY against the RBI circular (see IMPLEMENTATION_PLAN.md, Open items).
  { from: '2023-02-08', bankRate: 6.75 },
  { from: '2025-02-07', bankRate: 6.5 },
  { from: '2025-04-09', bankRate: 6.25 },
  { from: '2025-06-06', bankRate: 5.75 },
  { from: '2025-12-05', bankRate: 5.5 },
  { from: '2026-10-07', bankRate: 5.75 },
];
export const RATE_HISTORY_START = RATE_HISTORY[0].from;
export const DEFAULT_TERMS_DAYS = 15;
export const MAX_AGREED_DAYS = 45;
export const DAYS_IN_YEAR = 365; // fixed by the CalcGuru method, even in leap years
export const MULTIPLIER = 3; // s.16: three times the bank rate

// ---- date helpers: ISO 'YYYY-MM-DD' <-> integer day number (UTC, no DST issues)
export const toDayNum = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
};
export const fromDayNum = (n) => new Date(n * 86400000).toISOString().slice(0, 10);
export const addDays = (iso, n) => fromDayNum(toDayNum(iso) + n);
const monthKey = (iso) => iso.slice(0, 7);
const round2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;

export function bankRateOn(iso) {
  let rate = null;
  for (const r of RATE_HISTORY) if (r.from <= iso) rate = r.bankRate;
  return rate; // null => before history
}

/**
 * input: { amount, acceptanceDate, agreementDays|null, invoiceDate, udyamDate, asOf }
 * returns { status, ... } where status is one of:
 *   'udyam_after_invoice' | 'rate_history_not_loaded' | 'not_yet_due' | 'overdue'
 */
export function compute(input) {
  const { amount, acceptanceDate, agreementDays, invoiceDate, udyamDate, asOf } = input;

  // 1) eligibility: Udyam registration must not be after the invoice
  if (udyamDate > invoiceDate) return { status: 'udyam_after_invoice' };

  // 2) due date
  let termDays = DEFAULT_TERMS_DAYS;
  let capped = false;
  if (agreementDays !== null && agreementDays !== undefined) {
    termDays = Math.min(agreementDays, MAX_AGREED_DAYS);
    capped = agreementDays > MAX_AGREED_DAYS;
  }
  const lastPayableDate = addDays(acceptanceDate, termDays); // pay on or before this day
  const interestStartDate = addDays(lastPayableDate, 1); // interest runs from the next day

  // 3) rate history gate (on the day interest would start, not on the acceptance date)
  if (interestStartDate < RATE_HISTORY_START) return { status: 'rate_history_not_loaded', lastPayableDate, interestStartDate };

  // 4) not yet late
  if (asOf <= lastPayableDate) {
    return {
      status: 'not_yet_due', termDays, capped, lastPayableDate, interestStartDate,
      daysLeft: toDayNum(lastPayableDate) - toDayNum(asOf), // 0 => last day to pay is today
    };
  }

  // 5) interest: day by day at 3*rate/365 on the month's opening balance, rests monthly
  const startN = toDayNum(interestStartDate);
  const endN = toDayNum(asOf); // inclusive
  const rows = [];
  let balance = amount;
  let cur = null;
  const flush = () => {
    if (!cur) return;
    cur.interest = round2(cur.raw);
    cur.closingBalance = round2(cur.openingBalance + cur.interest);
    delete cur.raw;
    rows.push(cur);
    balance = cur.closingBalance;
    cur = null;
  };
  for (let n = startN; n <= endN; n++) {
    const iso = fromDayNum(n);
    const mk = monthKey(iso);
    if (!cur || cur.month !== mk) {
      flush();
      cur = { month: mk, openingBalance: balance, days: 0, raw: 0, segments: [] };
    }
    const r = bankRateOn(iso);
    const daily = cur.openingBalance * (MULTIPLIER * r) / 100 / DAYS_IN_YEAR;
    cur.raw += daily;
    cur.days += 1;
    const last = cur.segments[cur.segments.length - 1];
    if (last && last.bankRate === r) last.days += 1;
    else cur.segments.push({ bankRate: r, section16Rate: round2(MULTIPLIER * r), days: 1 });
  }
  flush();

  const totalInterest = round2(rows.reduce((s, r) => s + r.interest, 0));
  return {
    status: 'overdue', termDays, capped, lastPayableDate, interestStartDate,
    daysOverdue: endN - startN + 1,
    rows, totalInterest, totalDue: round2(amount + totalInterest),
  };
}
