import {
  DAYS_IN_YEAR,
  INCLUDE_AS_OF_DAY,
  MULTIPLIER,
  roundMoney,
} from "./config";
import { fromDayNum, monthKey, toDayNum } from "./dates";
import { bankRateOn } from "./rates";
import type { MonthRow } from "./types";

/**
 * CalcGuru day-wise method with monthly rests (docs/LEGAL_RULES_SPEC.md section 4).
 * Interest accrues day by day within a calendar month on that month's opening balance,
 * at 3 x the bank rate in force that day / 365; the rounded month total is then added
 * to the balance (compounding) before the next month starts.
 *
 * `credits` are part payments (cash plus TDS) dated inside the interest window (section 4a): from
 * its own date, a payment reduces the balance that interest runs on. With none, the result is
 * exactly the original method.
 */
export function computeInterest(
  amount: number,
  interestStartDate: string,
  asOf: string,
  credits: { date: string; credit: number }[] = [],
): { rows: MonthRow[]; totalInterest: number; totalDue: number } {
  const startN = toDayNum(interestStartDate);
  const endN = toDayNum(asOf) - (INCLUDE_AS_OF_DAY ? 0 : 1);
  const creditOn = new Map<string, number>();
  for (const c of credits) creditOn.set(c.date, (creditOn.get(c.date) ?? 0) + c.credit);

  const rows: MonthRow[] = [];
  let balance = amount;
  let credited = 0;
  // base = the balance interest runs on today: the month's opening balance less this month's payments.
  let cur: {
    month: string;
    openingBalance: number;
    base: number;
    paid: number;
    days: number;
    raw: number;
    segments: MonthRow["segments"];
  } | null = null;

  const flush = () => {
    if (!cur) return;
    const interest = roundMoney(cur.raw);
    const closingBalance = roundMoney(cur.base + interest);
    rows.push({
      month: cur.month,
      openingBalance: cur.openingBalance,
      days: cur.days,
      segments: cur.segments,
      ...(cur.paid > 0 ? { paid: roundMoney(cur.paid) } : {}),
      interest,
      closingBalance,
    });
    balance = closingBalance;
    cur = null;
  };

  for (let n = startN; n <= endN; n++) {
    const iso = fromDayNum(n);
    const mk = monthKey(iso);
    if (!cur || cur.month !== mk) {
      flush();
      cur = { month: mk, openingBalance: balance, base: balance, paid: 0, days: 0, raw: 0, segments: [] };
    }
    const c = creditOn.get(iso);
    if (c) {
      const applied = Math.min(c, cur.base); // never below zero; the form keeps payments under the amount
      cur.base = roundMoney(cur.base - applied);
      cur.paid += applied;
      credited += applied;
    }
    const r = bankRateOn(iso);
    if (r === null) throw new Error(`No bank rate loaded for ${iso}`); // gated earlier; defensive
    cur.raw += (cur.base * (MULTIPLIER * r)) / 100 / DAYS_IN_YEAR;
    cur.days += 1;
    const last = cur.segments[cur.segments.length - 1];
    if (last && last.bankRate === r) last.days += 1;
    else cur.segments.push({ bankRate: r, section16Rate: roundMoney(MULTIPLIER * r), days: 1 });
  }
  flush();

  const totalInterest = roundMoney(rows.reduce((s, r) => s + r.interest, 0));
  return { rows, totalInterest, totalDue: roundMoney(amount - credited + totalInterest) };
}
