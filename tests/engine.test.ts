import { describe, expect, it } from "vitest";
import { compute, isValidISODate, addDays, fromDayNum, toDayNum } from "@/lib/engine";
import type { EngineInput } from "@/lib/engine";
import { formatDate, formatINR, formatPercent } from "@/lib/format";
import { todayIST } from "@/lib/today";

const base: EngineInput = {
  amount: 100000,
  invoiceDate: "2026-01-01",
  acceptanceDate: "2026-01-01",
  agreementDays: null,
  udyamDate: "2024-06-01",
  asOf: "2026-06-01",
};

describe("dates", () => {
  it("validates real calendar dates only", () => {
    expect(isValidISODate("2026-02-30")).toBe(false);
    expect(isValidISODate("2026-13-01")).toBe(false);
    expect(isValidISODate("26-1-1")).toBe(false);
    expect(isValidISODate("2028-02-29")).toBe(true);
    expect(isValidISODate("2026-02-29")).toBe(false);
  });

  it("round-trips day numbers and matches the Unix epoch", () => {
    expect(toDayNum("1970-01-01")).toBe(0);
    expect(toDayNum("2026-10-22")).toBe(20748);
    for (const iso of ["2023-02-08", "2024-02-29", "2026-12-31", "2100-03-01"]) {
      expect(fromDayNum(toDayNum(iso))).toBe(iso);
    }
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("engine edge cases", () => {
  it("divides by 365 even in a leap year", () => {
    // accepted 13 Feb 2028 -> last payable 28 Feb, interest starts on the leap day 29 Feb.
    const r = compute({ ...base, invoiceDate: "2028-02-13", acceptanceDate: "2028-02-13", asOf: "2028-02-29" });
    expect(r.status).toBe("overdue");
    if (r.status !== "overdue") return;
    expect(r.interestStartDate).toBe("2028-02-29");
    expect(r.daysOverdue).toBe(1);
    expect(r.totalInterest).toBe(47.26); // 100000 * 0.1725 / 365 = 47.2603; /366 would give 47.13
  });

  it("totalDue equals amount plus totalInterest to the paisa", () => {
    const r = compute({ ...base, amount: 123456.78, asOf: "2026-10-22" });
    expect(r.status).toBe("overdue");
    if (r.status !== "overdue") return;
    expect(Math.round(r.totalDue * 100)).toBe(Math.round((123456.78 + r.totalInterest) * 100));
    expect(Math.round(r.totalInterest * 100)).toBe(
      Math.round(r.rows.reduce((s, x) => s + x.interest, 0) * 100),
    );
  });

  it("interest never decreases as asOf moves forward a day", () => {
    let prev = 0;
    let n = toDayNum("2026-01-17");
    for (let i = 0; i < 400; i++, n++) {
      const r = compute({ ...base, asOf: fromDayNum(n) });
      expect(r.status).toBe("overdue");
      if (r.status !== "overdue") return;
      expect(r.totalInterest).toBeGreaterThanOrEqual(prev);
      prev = r.totalInterest;
    }
  });

  it("asOf == lastPayableDate is not yet due with 0 days left; one day later is overdue by 1 day", () => {
    const a = compute({ ...base, asOf: "2026-01-16" });
    expect(a).toMatchObject({ status: "not_yet_due", daysLeft: 0 });
    const b = compute({ ...base, asOf: "2026-01-17" });
    expect(b).toMatchObject({ status: "overdue", daysOverdue: 1 });
  });

  it("treats agreementDays 0 as a real agreement, not as no agreement", () => {
    const r = compute({ ...base, agreementDays: 0, asOf: "2026-01-02" });
    expect(r).toMatchObject({
      status: "overdue",
      termDays: 0,
      capped: false,
      lastPayableDate: "2026-01-01",
      interestStartDate: "2026-01-02",
      daysOverdue: 1,
    });
  });

  it("caps agreements above 45 days but not at 45", () => {
    expect(compute({ ...base, agreementDays: 45 })).toMatchObject({ termDays: 45, capped: false });
    expect(compute({ ...base, agreementDays: 46 })).toMatchObject({ termDays: 45, capped: true });
  });
});

describe("todayIST", () => {
  it("rolls over at midnight IST, not UTC", () => {
    expect(todayIST(new Date("2026-10-21T19:00:00Z"))).toBe("2026-10-22"); // 00:30 IST
    expect(todayIST(new Date("2026-10-21T17:00:00Z"))).toBe("2026-10-21"); // 22:30 IST
  });
});

describe("format", () => {
  it("formats rupees with Indian grouping and 2 decimals", () => {
    expect(formatINR(100045.21)).toBe("₹1,00,045.21");
    expect(formatINR(1234567.5)).toBe("₹12,34,567.50");
    expect(formatINR(236000)).toBe("₹2,36,000.00");
  });

  it("formats dates and percentages", () => {
    expect(formatDate("2026-10-22")).toBe("22 Oct 2026");
    expect(formatDate("2023-02-08")).toBe("8 Feb 2023");
    expect(formatPercent(16.5)).toBe("16.50%");
  });
});
