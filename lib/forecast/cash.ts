import { addDays, isValidISODate } from "@/lib/engine";
import { MAX_AMOUNT } from "@/lib/wizard";

// SPRINT_PLAN.md section 2.4: a 30-day cash forecast from manual inputs. Pure, deterministic,
// and computed in integer paise so totals never drift. Collections are expected, not guaranteed.

/** Day 1 is today; day 30 is today + 29. Anything dated later is "outside the window". */
export const WINDOW_DAYS = 30;
/** The late scenario moves each ticked collection this many days later. */
export const LATE_DAYS = 15;

export type CashItem = {
  id: string;
  label: string;
  amountPaise: number;
  /** ISO date the money is expected in (collection) or due out (expense). */
  date: string;
  /** Collections only: included in the late scenario. */
  mayBeLate: boolean;
};

export type ForecastInput = {
  today: string;
  startingCashPaise: number;
  collections: CashItem[];
  expenses: CashItem[];
};

export type Scenario = "expected" | "late";

export type DayRow = { date: string; inflowPaise: number; outflowPaise: number; balancePaise: number };

/** Where an item landed: `on` is the day it counts; `overdue` = dated before today (counted today). */
export type Placed = { kind: "collection" | "expense"; item: CashItem; on: string; overdue: boolean; delayed: boolean };

export type Forecast = {
  scenario: Scenario;
  rows: DayRow[];
  lowest: { date: string; balancePaise: number };
  /** First day the balance goes below zero, and by how much (a positive number of paise). */
  shortfall: { date: string; amountPaise: number } | null;
  inside: Placed[];
  outside: Placed[];
  totals: { inflowPaise: number; outflowPaise: number };
};

/**
 * Builds the daily cash curve. Items dated before today count today (flagged overdue). In the
 * late scenario, every collection ticked "may be late" moves LATE_DAYS after the day it would
 * otherwise count. A day's collections and payments are netted (order within a day is not modelled).
 */
export function forecastCash(input: ForecastInput, scenario: Scenario = "expected"): Forecast {
  const { today, startingCashPaise } = input;
  const end = addDays(today, WINDOW_DAYS - 1);

  const place = (kind: Placed["kind"], item: CashItem): Placed => {
    const overdue = item.date < today;
    const delayed = scenario === "late" && kind === "collection" && item.mayBeLate;
    const base = overdue ? today : item.date;
    return { kind, item, on: delayed ? addDays(base, LATE_DAYS) : base, overdue, delayed };
  };
  const all = [...input.collections.map((c) => place("collection", c)), ...input.expenses.map((e) => place("expense", e))];
  const inside = all.filter((p) => p.on <= end);
  const outside = all.filter((p) => p.on > end);

  const rows: DayRow[] = [];
  let balance = startingCashPaise;
  for (let d = 0; d < WINDOW_DAYS; d++) {
    const date = addDays(today, d);
    const sum = (kind: Placed["kind"]) => inside.filter((p) => p.kind === kind && p.on === date).reduce((s, p) => s + p.item.amountPaise, 0);
    const inflowPaise = sum("collection");
    const outflowPaise = sum("expense");
    balance += inflowPaise - outflowPaise;
    rows.push({ date, inflowPaise, outflowPaise, balancePaise: balance });
  }

  const lowestRow = rows.reduce((lo, r) => (r.balancePaise < lo.balancePaise ? r : lo), rows[0]);
  const first = rows.find((r) => r.balancePaise < 0);
  return {
    scenario,
    rows,
    lowest: { date: lowestRow.date, balancePaise: lowestRow.balancePaise },
    shortfall: first ? { date: first.date, amountPaise: -first.balancePaise } : null,
    inside,
    outside,
    totals: {
      inflowPaise: rows.reduce((s, r) => s + r.inflowPaise, 0),
      outflowPaise: rows.reduce((s, r) => s + r.outflowPaise, 0),
    },
  };
}

/** "1,000.50" style input is rejected; digits with up to 2 decimals become exact paise. */
export function parsePaise(s: string): number | null {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(s.trim());
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

export type CashDraft = { id: string; label: string; amount: string; date: string; mayBeLate: boolean };
export type CashDraftErrors = { amount?: string; date?: string };

/** An item needs a positive amount (at most 2 decimals, not absurdly large) and a real date. */
export function validateCashDraft(d: CashDraft): CashDraftErrors {
  const e: CashDraftErrors = {};
  const p = parsePaise(d.amount);
  if (p === null || p <= 0) e.amount = "Enter an amount above zero, in rupees, with at most 2 decimal places.";
  else if (p > MAX_AMOUNT * 100) e.amount = "That amount looks too large. Please check it.";
  if (!isValidISODate(d.date)) e.date = "Enter a valid date.";
  return e;
}

/** Starting cash may be zero, never negative. */
export function validateStartingCash(s: string): string | null {
  const p = parsePaise(s);
  if (p === null) return "Enter your current cash in rupees (0 or more), with at most 2 decimal places.";
  if (p > MAX_AMOUNT * 100) return "That amount looks too large. Please check it.";
  return null;
}

/** Valid drafts as items; invalid ones are left out (the screen marks them "not counted"). */
export function toCashItems(drafts: CashDraft[]): CashItem[] {
  return drafts
    .filter((d) => Object.keys(validateCashDraft(d)).length === 0)
    .map((d) => ({ id: d.id, label: d.label.trim(), amountPaise: parsePaise(d.amount)!, date: d.date, mayBeLate: d.mayBeLate }));
}
