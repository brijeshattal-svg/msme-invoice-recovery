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
 */
export function computeInterest(
  amount: number,
  interestStartDate: string,
  asOf: string,
): { rows: MonthRow[]; totalInterest: number; totalDue: number } {
  const startN = toDayNum(interestStartDate);
  const endN = toDayNum(asOf) - (INCLUDE_AS_OF_DAY ? 0 : 1);

  const rows: MonthRow[] = [];
  let balance = amount;
  let cur: { month: string; openingBalance: number; days: number; raw: number; segments: MonthRow["segments"] } | null = null;

  const flush = () => {
    if (!cur) return;
    const interest = roundMoney(cur.raw);
    const closingBalance = roundMoney(cur.openingBalance + interest);
    rows.push({
      month: cur.month,
      openingBalance: cur.openingBalance,
      days: cur.days,
      segments: cur.segments,
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
      cur = { month: mk, openingBalance: balance, days: 0, raw: 0, segments: [] };
    }
    const r = bankRateOn(iso);
    if (r === null) throw new Error(`No bank rate loaded for ${iso}`); // gated earlier; defensive
    cur.raw += (cur.openingBalance * (MULTIPLIER * r)) / 100 / DAYS_IN_YEAR;
    cur.days += 1;
    const last = cur.segments[cur.segments.length - 1];
    if (last && last.bankRate === r) last.days += 1;
    else cur.segments.push({ bankRate: r, section16Rate: roundMoney(MULTIPLIER * r), days: 1 });
  }
  flush();

  const totalInterest = roundMoney(rows.reduce((s, r) => s + r.interest, 0));
  return { rows, totalInterest, totalDue: roundMoney(amount + totalInterest) };
}
