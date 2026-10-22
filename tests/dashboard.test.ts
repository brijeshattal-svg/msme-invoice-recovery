import { describe, expect, it } from "vitest";
import { ageingCsv, ageingReport, bucketOf, summarize } from "@/lib/intel/dashboard";
import { viewInvoice, type ToolkitInvoice } from "@/lib/intel/priority";

const TODAY = "2026-10-22";
let n = 0;
const inv = (over: Partial<ToolkitInvoice> = {}): ToolkitInvoice => ({
  id: `d${++n}`,
  client: "Harbourline Retail Pvt Ltd",
  number: `INV-${n}`,
  amount: 218300,
  invoiceDate: "2026-07-15",
  acceptanceDate: "2026-07-15",
  agreementDays: null,
  promisedDate: null,
  paid: false,
  ...over,
});

describe("summarize", () => {
  it("empty list: all zero, no top client", () => {
    expect(summarize([], TODAY)).toEqual({
      outstanding: 0,
      outstandingCount: 0,
      overdue: 0,
      overdueCount: 0,
      interestMayBeOwed: 0,
      dueSoonCount: 0,
      clientsOverdue: 0,
      missedPromises: 0,
      topClient: null,
    });
  });

  it("splits outstanding, overdue, due soon and paid, and sums interest from the engine", () => {
    const a = inv(); // 84 days overdue, ₹8,468.72
    const notSoon = inv({ amount: 100000, invoiceDate: "2026-10-15", acceptanceDate: "2026-10-15" }); // due 30 Oct
    const soon = inv({ client: "Acme", amount: 50000, invoiceDate: "2026-10-10", acceptanceDate: "2026-10-10" }); // due 25 Oct
    const paid = inv({ client: "Paid Co", amount: 99999, paid: true });
    const e = inv({ client: "Bluepeak", amount: 25000.5, invoiceDate: "2026-09-01", acceptanceDate: "2026-09-01", promisedDate: "2026-10-01" });
    const s = summarize([a, notSoon, soon, paid, e], TODAY);
    expect(s.outstanding).toBe(218300 + 100000 + 50000 + 25000.5);
    expect(s.outstandingCount).toBe(4);
    expect(s.overdue).toBe(218300 + 25000.5);
    expect(s.overdueCount).toBe(2);
    expect(s.interestMayBeOwed).toBe(Math.round((viewInvoice(a, TODAY).interest! + viewInvoice(e, TODAY).interest!) * 100) / 100);
    expect(viewInvoice(a, TODAY).interest).toBe(8468.72);
    expect(s.dueSoonCount).toBe(1);
    expect(s.clientsOverdue).toBe(2);
    expect(s.missedPromises).toBe(1);
    expect(s.topClient?.client).toBe("Harbourline Retail Pvt Ltd");
    expect(s.topClient?.reason).toContain("₹2,18,300.00 overdue");
  });

  it("an invoice whose last day to pay is today counts as due soon, not overdue", () => {
    const s = summarize([inv({ invoiceDate: "2026-10-07", acceptanceDate: "2026-10-07" })], TODAY);
    expect(s).toMatchObject({ dueSoonCount: 1, overdueCount: 0 });
  });
});

describe("ageing", () => {
  it("buckets by days overdue at 30 / 60 / 90 boundaries", () => {
    expect(bucketOf(0, false)).toBe("Not yet due");
    expect(bucketOf(1, true)).toBe("1-30 days");
    expect(bucketOf(30, true)).toBe("1-30 days");
    expect(bucketOf(31, true)).toBe("31-60 days");
    expect(bucketOf(60, true)).toBe("31-60 days");
    expect(bucketOf(61, true)).toBe("61-90 days");
    expect(bucketOf(90, true)).toBe("61-90 days");
    expect(bucketOf(91, true)).toBe("Over 90 days");
  });

  it("groups unpaid invoices per client, largest first, with exact totals", () => {
    const report = ageingReport(
      [
        inv(), // 84 days -> 61-90
        inv({ client: " harbourline  retail pvt ltd", amount: 0.1, invoiceDate: "2026-10-20", acceptanceDate: "2026-10-20" }), // not yet due
        inv({ client: "Acme", amount: 1000.2, invoiceDate: "2026-09-25", acceptanceDate: "2026-09-25" }), // 12 days -> 1-30
        inv({ client: "Acme", amount: 500, invoiceDate: "2026-06-01", acceptanceDate: "2026-06-01" }), // 128 days -> 90+
        inv({ client: "Paid Co", amount: 999, paid: true }),
      ],
      TODAY,
    );
    expect(report.rows.map((r) => r.client)).toEqual(["Harbourline Retail Pvt Ltd", "Acme"]);
    expect(report.rows[0].buckets).toEqual({ "Not yet due": 0.1, "1-30 days": 0, "31-60 days": 0, "61-90 days": 218300, "Over 90 days": 0 });
    expect(report.rows[0].total).toBe(218300.1);
    expect(report.rows[1]).toMatchObject({ total: 1500.2, buckets: { "1-30 days": 1000.2, "Over 90 days": 500 } });
    expect(report.totals).toMatchObject({ client: "Total", total: 219800.3 });
  });

  it("CSV: header, rows, totals; quotes escaped; formula-looking cells neutralised", () => {
    const report = ageingReport([inv({ client: '=HYPERLINK("http://x")' }), inv({ client: 'Say "hi" Ltd', amount: 10 })], TODAY);
    const csv = ageingCsv(report, TODAY);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe('"Ageing report as of 2026-10-22 (amounts in INR, unpaid invoices only)"');
    expect(lines[1]).toBe('"Client","Not yet due","1-30 days","31-60 days","61-90 days","Over 90 days","Total"');
    expect(csv).toContain(`"'=HYPERLINK(""http://x"")"`);
    expect(csv).toContain('"Say ""hi"" Ltd"');
    expect(lines.at(-1)).toBe('"Total",0.00,0.00,0.00,218310.00,0.00,218310.00');
  });
});
