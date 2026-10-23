import { describe, expect, it } from "vitest";
import { compute, type EngineInput, type EngineResult } from "@/lib/engine";

// Fictional invoice: ₹2,36,000 accepted 8 Aug 2026, no agreement: due 23 Aug, interest from 24 Aug.
// Bank Rate 5.50% (16.50% under s.16) until 6 Oct 2026, 5.75% (17.25%) from 7 Oct 2026.
const BASE: EngineInput = {
  amount: 236000,
  invoiceDate: "2026-08-08",
  acceptanceDate: "2026-08-08",
  agreementDays: null,
  udyamDate: "2024-01-15",
  asOf: "2026-10-22",
};

type Overdue = Extract<EngineResult, { status: "overdue" }>;
const overdue = (input: EngineInput): Overdue => {
  const r = compute(input);
  if (r.status !== "overdue") throw new Error(`expected overdue, got ${r.status}`);
  return r;
};
const daily = (balance: number, s16Rate: number) => (balance * s16Rate) / 100 / 365;
const r2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

describe("part payments and TDS (spec section 4a)", () => {
  it("with no payments the result is unchanged and carries no payment fields", () => {
    const none = overdue(BASE);
    expect(overdue({ ...BASE, payments: [] })).toEqual(none);
    expect(none).not.toHaveProperty("paidSoFar");
    expect(none.rows.every((row) => !("paid" in row))).toBe(true);
  });

  it("a payment before interest starts is the same as a smaller invoice", () => {
    const paidEarly = overdue({ ...BASE, payments: [{ date: "2026-08-20", amount: 90000, tds: 10000 }] });
    const smaller = overdue({ ...BASE, amount: 136000 });
    expect(paidEarly.rows).toEqual(smaller.rows);
    expect(paidEarly.totalInterest).toBe(smaller.totalInterest);
    expect(paidEarly.totalDue).toBe(smaller.totalDue);
    expect(paidEarly).toMatchObject({ paidSoFar: 100000, tdsSoFar: 10000, unpaidAmount: 136000 });
  });

  it("a payment on the first day of interest: same interest as the smaller invoice, and the month shows it", () => {
    const r = overdue({ ...BASE, payments: [{ date: "2026-08-24", amount: 100000, tds: 0 }] });
    const smaller = overdue({ ...BASE, amount: 136000 });
    expect(r.totalInterest).toBe(smaller.totalInterest);
    expect(r.totalDue).toBe(smaller.totalDue);
    expect(r.rows[0]).toMatchObject({ month: "2026-08", openingBalance: 236000, paid: 100000 });
    expect(r.rows[0].closingBalance).toBe(smaller.rows[0].closingBalance);
  });

  it("a mid-month payment: interest on the full balance before it, on the reduced balance from its date", () => {
    const none = overdue(BASE);
    const r = overdue({ ...BASE, payments: [{ date: "2026-09-16", amount: 100000, tds: 0 }] });
    // August is untouched.
    expect(r.rows[0]).toEqual(none.rows[0]);
    // September: 15 days (1-15) on the opening balance, 15 days (16-30) on it less ₹1,00,000, at 16.50%.
    const open = none.rows[0].closingBalance;
    const sep = r.rows[1];
    expect(sep).toMatchObject({ month: "2026-09", openingBalance: open, paid: 100000, days: 30 });
    expect(sep.interest).toBeCloseTo(r2(15 * daily(open, 16.5) + 15 * daily(open - 100000, 16.5)), 2);
    expect(sep.closingBalance).toBe(r2(open - 100000 + sep.interest));
    // From October on, interest runs on September's closing balance.
    expect(r.rows[2].openingBalance).toBe(sep.closingBalance);
    expect(r.totalInterest).toBeLessThan(none.totalInterest);
  });

  it("the total now due is the unpaid amount plus the interest", () => {
    const r = overdue({ ...BASE, payments: [{ date: "2026-09-16", amount: 90000, tds: 10000 }, { date: "2026-10-10", amount: 20000, tds: 0 }] });
    expect(r.paidSoFar).toBe(120000);
    expect(r.tdsSoFar).toBe(10000);
    expect(r.unpaidAmount).toBe(116000);
    expect(r.totalDue).toBe(r2(116000 + r.totalInterest));
    expect(r.totalDue).toBe(r.rows[r.rows.length - 1].closingBalance);
  });

  it("TDS deducted counts exactly like cash received", () => {
    const cash = overdue({ ...BASE, payments: [{ date: "2026-09-16", amount: 100000, tds: 0 }] });
    const withTds = overdue({ ...BASE, payments: [{ date: "2026-09-16", amount: 90000, tds: 10000 }] });
    expect(withTds.rows).toEqual(cash.rows);
    expect(withTds.totalDue).toBe(cash.totalDue);
    expect(withTds.tdsSoFar).toBe(10000);
  });

  it("two payments on the same day add up; order of entry does not matter", () => {
    const one = overdue({ ...BASE, payments: [{ date: "2026-09-16", amount: 100000, tds: 0 }] });
    const two = overdue({ ...BASE, payments: [{ date: "2026-09-16", amount: 60000, tds: 0 }, { date: "2026-09-16", amount: 40000, tds: 0 }] });
    expect(two.rows).toEqual(one.rows);
    const a = overdue({ ...BASE, payments: [{ date: "2026-10-10", amount: 1000, tds: 0 }, { date: "2026-09-01", amount: 5000, tds: 0 }] });
    const b = overdue({ ...BASE, payments: [{ date: "2026-09-01", amount: 5000, tds: 0 }, { date: "2026-10-10", amount: 1000, tds: 0 }] });
    expect(a).toEqual(b);
  });

  it("a payment dated after today is ignored (it hasn't happened yet)", () => {
    expect(compute({ ...BASE, payments: [{ date: "2026-10-30", amount: 50000, tds: 0 }] })).toEqual(compute(BASE));
  });

  it("more paid, earlier, means less interest", () => {
    const late = overdue({ ...BASE, payments: [{ date: "2026-10-15", amount: 100000, tds: 0 }] });
    const early = overdue({ ...BASE, payments: [{ date: "2026-09-01", amount: 100000, tds: 0 }] });
    const more = overdue({ ...BASE, payments: [{ date: "2026-09-01", amount: 150000, tds: 0 }] });
    expect(early.totalInterest).toBeLessThan(late.totalInterest);
    expect(more.totalInterest).toBeLessThan(early.totalInterest);
  });

  it("a not-yet-due invoice still reports what has been paid", () => {
    const r = compute({ ...BASE, asOf: "2026-08-15", payments: [{ date: "2026-08-10", amount: 50000, tds: 5000 }] });
    expect(r).toMatchObject({ status: "not_yet_due", paidSoFar: 55000, tdsSoFar: 5000, unpaidAmount: 181000 });
  });
});
