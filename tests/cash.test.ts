import { describe, expect, it } from "vitest";
import {
  forecastCash,
  LATE_DAYS,
  parsePaise,
  toCashItems,
  validateCashDraft,
  validateStartingCash,
  WINDOW_DAYS,
  type CashItem,
  type ForecastInput,
} from "@/lib/forecast/cash";

const TODAY = "2026-10-22"; // day 1; day 30 = 2026-11-20; day 31 = 2026-11-21
let n = 0;
const item = (rupees: number, date: string, mayBeLate = false, label = "x"): CashItem => ({ id: `c${++n}`, label, amountPaise: Math.round(rupees * 100), date, mayBeLate });
const input = (over: Partial<ForecastInput> = {}): ForecastInput => ({ today: TODAY, startingCashPaise: 0, collections: [], expenses: [], ...over });
const bal = (f: ReturnType<typeof forecastCash>, date: string) => f.rows.find((r) => r.date === date)!.balancePaise;

describe("forecastCash", () => {
  it("empty inputs: 30 days from today, flat at zero, no shortfall", () => {
    const f = forecastCash(input());
    expect(f.rows).toHaveLength(WINDOW_DAYS);
    expect(f.rows[0].date).toBe(TODAY);
    expect(f.rows[29].date).toBe("2026-11-20");
    expect(f.rows.every((r) => r.balancePaise === 0 && r.inflowPaise === 0 && r.outflowPaise === 0)).toBe(true);
    expect(f.lowest).toEqual({ date: TODAY, balancePaise: 0 });
    expect(f.shortfall).toBeNull();
    expect(f.inside).toEqual([]);
    expect(f.outside).toEqual([]);
  });

  it("no shortfall: the lowest point is the earliest day at the minimum", () => {
    const f = forecastCash(input({ startingCashPaise: 100000_00, expenses: [item(40000, "2026-10-25")], collections: [item(25000, "2026-10-30")] }));
    expect(bal(f, "2026-10-24")).toBe(100000_00);
    expect(bal(f, "2026-10-25")).toBe(60000_00);
    expect(bal(f, "2026-10-30")).toBe(85000_00);
    expect(f.lowest).toEqual({ date: "2026-10-25", balancePaise: 60000_00 });
    expect(f.shortfall).toBeNull();
    expect(f.totals).toEqual({ inflowPaise: 25000_00, outflowPaise: 40000_00 });
  });

  it("shortfall on an expense day: date and amount below zero", () => {
    const f = forecastCash(input({ startingCashPaise: 50000_00, expenses: [item(80000, "2026-11-01", false, "Salaries")], collections: [item(40000, "2026-11-05")] }));
    expect(f.shortfall).toEqual({ date: "2026-11-01", amountPaise: 30000_00 });
    expect(f.lowest).toEqual({ date: "2026-11-01", balancePaise: -30000_00 });
    expect(bal(f, "2026-11-05")).toBe(10000_00);
  });

  it("late scenario: a ticked collection 15 days late creates a shortfall the expected view doesn't have", () => {
    const base = input({
      startingCashPaise: 50000_00,
      collections: [item(60000, "2026-10-28", true), item(5000, "2026-10-28", false)],
      expenses: [item(80000, "2026-11-01")],
    });
    const expected = forecastCash(base, "expected");
    expect(expected.shortfall).toBeNull();
    expect(bal(expected, "2026-11-01")).toBe(35000_00);

    const late = forecastCash(base, "late");
    expect(late.scenario).toBe("late");
    expect(late.inside.find((p) => p.item.amountPaise === 60000_00)).toMatchObject({ on: "2026-11-12", delayed: true });
    expect(late.inside.find((p) => p.item.amountPaise === 5000_00)).toMatchObject({ on: "2026-10-28", delayed: false }); // not ticked
    expect(late.shortfall).toEqual({ date: "2026-11-01", amountPaise: 25000_00 });
    expect(bal(late, "2026-11-12")).toBe(35000_00);
    expect(LATE_DAYS).toBe(15);
  });

  it("expenses are never delayed, even if ticked", () => {
    const f = forecastCash(input({ startingCashPaise: 10_00, expenses: [item(5, "2026-10-23", true)] }), "late");
    expect(f.inside[0]).toMatchObject({ on: "2026-10-23", delayed: false });
  });

  it("day 30 is inside the window, day 31 is listed outside, and late can push items out", () => {
    const f = forecastCash(input({ collections: [item(100, "2026-11-20"), item(200, "2026-11-21")] }));
    expect(f.rows[29]).toMatchObject({ date: "2026-11-20", inflowPaise: 100_00, balancePaise: 100_00 });
    expect(f.outside.map((p) => p.item.amountPaise)).toEqual([200_00]);

    const late = forecastCash(input({ collections: [item(300, "2026-11-10", true)] }), "late");
    expect(late.outside).toHaveLength(1);
    expect(late.outside[0]).toMatchObject({ on: "2026-11-25", delayed: true });
    expect(late.totals.inflowPaise).toBe(0);
  });

  it("overdue items count today and are flagged; late moves an overdue collection to today + 15", () => {
    const base = input({ startingCashPaise: 0, collections: [item(1000, "2026-10-01", true)], expenses: [item(400, "2026-10-15")] });
    const f = forecastCash(base);
    expect(f.rows[0]).toMatchObject({ date: TODAY, inflowPaise: 1000_00, outflowPaise: 400_00, balancePaise: 600_00 });
    expect(f.inside.every((p) => p.overdue && p.on === TODAY)).toBe(true);
    const late = forecastCash(base, "late");
    expect(late.inside.find((p) => p.kind === "collection")).toMatchObject({ on: "2026-11-06", overdue: true, delayed: true });
    expect(late.shortfall).toEqual({ date: TODAY, amountPaise: 400_00 });
  });

  it("paise add up exactly", () => {
    const f = forecastCash(
      input({ startingCashPaise: parsePaise("0.10")!, collections: toCashItems([{ id: "a", label: "", amount: "0.20", date: TODAY, mayBeLate: false }, { id: "b", label: "", amount: "1000.35", date: TODAY, mayBeLate: false }]) }),
    );
    expect(f.rows[0].balancePaise).toBe(100065);
  });
});

describe("parsePaise and validation", () => {
  it.each([
    ["1000", 100000],
    ["1000.5", 100050],
    ["1000.05", 100005],
    ["0", 0],
    [" 12.34 ", 1234],
  ])("parses %j as %i paise", (s, p) => {
    expect(parsePaise(s)).toBe(p);
  });

  it.each(["1,000", "1e5", "-5", ".5", "10.555", "", "abc", "₹500"])("rejects %j", (s) => {
    expect(parsePaise(s)).toBeNull();
  });

  const d = (amount: string, date = TODAY) => ({ id: "x", label: "", amount, date, mayBeLate: false });
  it("rejects zero and negative item amounts, bad dates, and absurd amounts", () => {
    expect(validateCashDraft(d("0")).amount).toBeTruthy();
    expect(validateCashDraft(d("0.00")).amount).toBeTruthy();
    expect(validateCashDraft(d("-10")).amount).toBeTruthy();
    expect(validateCashDraft(d("99999999999")).amount).toMatch(/too large/);
    expect(validateCashDraft(d("100", "2026-02-30")).date).toBeTruthy();
    expect(validateCashDraft(d("100", "2025-01-01"))).toEqual({}); // a past date is fine: it counts today
  });

  it("starting cash may be zero but not negative", () => {
    expect(validateStartingCash("0")).toBeNull();
    expect(validateStartingCash("250000.50")).toBeNull();
    expect(validateStartingCash("-1")).toBeTruthy();
    expect(validateStartingCash("")).toBeTruthy();
  });

  it("only valid drafts are counted", () => {
    expect(toCashItems([d("100"), d("0"), d("abc"), d("50", "nope")]).map((i) => i.amountPaise)).toEqual([10000]);
  });
});
