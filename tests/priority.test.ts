import { describe, expect, it } from "vitest";
import {
  rankClients,
  reasonOf,
  scoreOf,
  toInvoice,
  validateInvoiceDraft,
  viewInvoice,
  type InvoiceDraft,
  type ToolkitInvoice,
} from "@/lib/intel/priority";

const TODAY = "2026-10-22";
let n = 0;
const inv = (over: Partial<ToolkitInvoice> = {}): ToolkitInvoice => ({
  id: `i${++n}`,
  client: "Harbourline Retail Pvt Ltd",
  number: "SPS/26-27/0087",
  amount: 218300,
  invoiceDate: "2026-07-15",
  acceptanceDate: "2026-07-15",
  agreementDays: null,
  promisedDate: null,
  paid: false,
  ...over,
});

describe("viewInvoice (due dates from lib/engine)", () => {
  it("the test invoice: due 30 Jul 2026, 84 days overdue, ₹8,468.72 interest (matches Quick Check)", () => {
    expect(viewInvoice(inv(), TODAY)).toMatchObject({ state: "overdue", dueDate: "2026-07-30", daysOverdue: 84, interest: 8468.72, missedPromise: false });
  });

  it("a written 30-day agreement moves the due date to 14 Aug 2026 (69 days)", () => {
    expect(viewInvoice(inv({ agreementDays: 30 }), TODAY)).toMatchObject({ dueDate: "2026-08-14", daysOverdue: 69, interest: 6951.57 });
  });

  it("not yet due, and today being the last day to pay, both count as not overdue", () => {
    expect(viewInvoice(inv({ invoiceDate: "2026-10-15", acceptanceDate: "2026-10-15" }), TODAY)).toMatchObject({ state: "not_yet_due", daysOverdue: 0, interest: null });
    expect(viewInvoice(inv({ invoiceDate: "2026-10-07", acceptanceDate: "2026-10-07" }), TODAY)).toMatchObject({ state: "not_yet_due", dueDate: "2026-10-22" });
  });

  it("paid invoices are never overdue, even with a past promise", () => {
    expect(viewInvoice(inv({ paid: true, promisedDate: "2026-09-01" }), TODAY)).toMatchObject({ state: "paid", daysOverdue: 0, missedPromise: false });
  });

  it("a promise in the past is missed; today or later is not", () => {
    expect(viewInvoice(inv({ promisedDate: "2026-10-21" }), TODAY).missedPromise).toBe(true);
    expect(viewInvoice(inv({ promisedDate: TODAY }), TODAY).missedPromise).toBe(false);
    expect(viewInvoice(inv({ promisedDate: "2026-10-30" }), TODAY).missedPromise).toBe(false);
  });

  it("an invoice older than the rate table is still overdue, without an interest figure", () => {
    expect(viewInvoice(inv({ invoiceDate: "2022-12-01", acceptanceDate: "2022-12-01" }), TODAY)).toMatchObject({
      state: "overdue",
      dueDate: "2022-12-16",
      daysOverdue: 1406,
      interest: null,
    });
  });
});

describe("rankClients", () => {
  it("empty list, all paid, and nothing yet due", () => {
    expect(rankClients([], TODAY)).toEqual({ ranked: [], clear: [] });
    expect(rankClients([inv({ paid: true })], TODAY)).toEqual({ ranked: [], clear: ["Harbourline Retail Pvt Ltd"] });
    expect(rankClients([inv({ invoiceDate: "2026-10-20", acceptanceDate: "2026-10-20" })], TODAY).ranked).toEqual([]);
  });

  it("one overdue invoice: score, reason and invoice list", () => {
    const { ranked } = rankClients([inv()], TODAY);
    expect(ranked).toHaveLength(1);
    expect(ranked[0]).toMatchObject({ overdueAmount: 218300, overdueCount: 1, oldestDaysOverdue: 84, missedPromises: 0 });
    expect(ranked[0].score).toBeCloseTo(Math.log10(218301) * (1 + 84 / 30), 10);
    expect(ranked[0].reason).toBe("₹2,18,300.00 overdue across 1 invoice, oldest 84 days");
  });

  it("several clients: groups by name (case and spaces ignored), sums only overdue unpaid invoices", () => {
    const list = [
      inv({ client: "Acme Corp", amount: 50000, invoiceDate: "2026-09-01", acceptanceDate: "2026-09-01" }), // 36 days
      inv({ client: "  acme   corp ", amount: 25000, invoiceDate: "2026-08-01", acceptanceDate: "2026-08-01" }), // 67 days
      inv({ client: "ACME CORP", amount: 99999, paid: true }),
      inv({ client: "Acme Corp", amount: 10000, invoiceDate: "2026-10-20", acceptanceDate: "2026-10-20" }), // not yet due
      inv({ client: "Big Bank", amount: 500000, invoiceDate: "2026-10-01", acceptanceDate: "2026-10-01" }), // 6 days
    ];
    const { ranked } = rankClients(list, TODAY);
    const acme = ranked.find((c) => c.client === "Acme Corp")!;
    expect(acme).toMatchObject({ overdueAmount: 75000, overdueCount: 2, oldestDaysOverdue: 67 });
    expect(acme.invoices.map((v) => v.daysOverdue)).toEqual([67, 36, 0, 0]);
    // Old moderate debt outranks a large but fresh one: 4.875 × 3.233 vs 5.699 × 1.2
    expect(ranked.map((c) => c.client)).toEqual(["Acme Corp", "Big Bank"]);
  });

  it("a missed promise lifts a client above an otherwise equal one", () => {
    const list = [inv({ client: "B Ltd", amount: 100000 }), inv({ client: "A Ltd", amount: 100000, promisedDate: "2026-10-01" })];
    const { ranked } = rankClients(list, TODAY);
    expect(ranked.map((c) => c.client)).toEqual(["A Ltd", "B Ltd"]);
    expect(ranked[0].reason).toBe("₹1,00,000.00 overdue across 1 invoice, oldest 84 days, 1 missed promise");
    expect(ranked[0].score / ranked[1].score).toBeCloseTo(1.5, 10);
  });

  it("a promise not yet due does not count as missed", () => {
    expect(rankClients([inv({ promisedDate: "2026-11-01" })], TODAY).ranked[0].missedPromises).toBe(0);
  });

  it("ties: equal scores break by larger overdue amount, then by name", () => {
    const same = { amount: 100000, invoiceDate: "2026-07-15", acceptanceDate: "2026-07-15" };
    const { ranked } = rankClients([inv({ client: "Zeta", ...same }), inv({ client: "Alpha", ...same })], TODAY);
    expect(ranked.map((c) => c.client)).toEqual(["Alpha", "Zeta"]);
  });

  it("amounts with paise add up exactly", () => {
    const list = [inv({ client: "P", amount: 0.1 }), inv({ client: "P", amount: 0.2 }), inv({ client: "P", amount: 1000.35 })];
    expect(rankClients(list, TODAY).ranked[0].overdueAmount).toBe(1000.65);
  });

  it("score and reason are the documented formula", () => {
    expect(scoreOf(0, 0, 0)).toBe(0);
    expect(scoreOf(999, 30, 2)).toBeCloseTo(3 * 2 * 2, 10);
    expect(reasonOf({ overdueAmount: 1, overdueCount: 2, oldestDaysOverdue: 1, missedPromises: 2 })).toBe(
      "₹1.00 overdue across 2 invoices, oldest 1 day, 2 missed promises",
    );
  });
});

describe("validateInvoiceDraft", () => {
  const ok: InvoiceDraft = { client: "Acme", number: "INV-1", amount: "1000.50", invoiceDate: "2026-09-01", acceptanceDate: "", agreementDays: "", promisedDate: "" };

  it("accepts a minimal valid invoice and fills acceptance from the invoice date", () => {
    expect(validateInvoiceDraft(ok, TODAY)).toEqual({});
    expect(toInvoice(ok, "x")).toMatchObject({ amount: 1000.5, acceptanceDate: "2026-09-01", agreementDays: null, promisedDate: null, paid: false });
  });

  it.each([
    ["client", { client: " " }],
    ["number", { number: "" }],
    ["amount", { amount: "0" }],
    ["amount", { amount: "10.555" }],
    ["amount", { amount: "1,000" }],
    ["amount", { amount: "99999999999" }],
    ["invoiceDate", { invoiceDate: "2026-02-30" }],
    ["invoiceDate", { invoiceDate: "2026-12-01" }],
    ["acceptanceDate", { acceptanceDate: "2026-12-01" }],
    ["agreementDays", { agreementDays: "30.5" }],
    ["agreementDays", { agreementDays: "400" }],
    ["promisedDate", { promisedDate: "2026-13-01" }],
  ])("rejects a bad %s", (field, over) => {
    expect(Object.keys(validateInvoiceDraft({ ...ok, ...over }, TODAY))).toContain(field);
  });

  it("a promised date may be in the past (that is what makes it missed)", () => {
    expect(validateInvoiceDraft({ ...ok, promisedDate: "2026-10-01" }, TODAY)).toEqual({});
  });
});
