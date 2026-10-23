import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Confirm } from "@/components/Confirm";
import { normalizeExtraction } from "@/lib/ai/normalize";
import type { ExtractedInvoice } from "@/lib/ai/schemas";
import { PAYMENTS } from "@/lib/copy";
import { checkEmail } from "@/lib/email/check";
import { buildFacts, factsForTone } from "@/lib/email/facts";
import { buildTemplate } from "@/lib/email/template";
import { TONE_IDS } from "@/lib/email/tones";
import { compute } from "@/lib/engine";
import { forecastCash } from "@/lib/forecast/cash";
import { ageingReport, summarize } from "@/lib/intel/dashboard";
import { rankClients, type ToolkitInvoice } from "@/lib/intel/priority";
import { toEngineInput } from "@/lib/standing";
import { initialState, reducer, validateForm, type FormValues } from "@/lib/wizard";

// test-invoices/pack (scripts/make-invoice-pack.mjs): ten invoices in real-world layouts and their
// correct values. Here every tool runs on the correct values; scripts/eval-extract.mjs checks the
// live AI reading them.
type Truth = {
  file: string;
  isInvoice: boolean;
  clientName: string;
  invoiceNumber: string;
  invoiceDate: string;
  amountTotal: number;
  currency: string;
  paymentTermsDays: number | null;
};
const PACK = JSON.parse(readFileSync("test-invoices/pack/truth.json", "utf8")) as Truth[];
const TODAY = "2026-10-23";
const UDYAM = "2024-01-15";
// The advance-paid invoice: ₹50,000 received on 25 Jul 2026, before the invoice date (5 Aug).
const ADVANCE = { id: "adv", date: "2026-07-25", amount: "50000", tds: "" };

const chaseable = PACK.filter((t) => t.isInvoice && t.currency === "INR");
const formOf = (t: Truth): FormValues => ({
  clientName: t.clientName,
  invoiceNumber: t.invoiceNumber,
  invoiceDate: t.invoiceDate,
  amount: String(t.amountTotal),
  udyamDate: UDYAM,
  hasAgreement: false, // terms printed on an invoice are not a written agreement
  agreementDays: "",
  acceptanceDate: t.invoiceDate,
  ...(t.file.includes("advance") ? { payments: [ADVANCE] } : {}),
});

describe("the invoice pack", () => {
  it("has ten files: seven chaseable rupee invoices, one in USD, a proforma and a credit note", () => {
    expect(PACK).toHaveLength(10);
    expect(chaseable).toHaveLength(7);
    expect(PACK.filter((t) => !t.isInvoice).map((t) => t.file)).toEqual([expect.stringMatching(/proforma/), expect.stringMatching(/credit-note/)]);
  });

  it("the demo invoice (Zoho-style, ₹3,54,000) on 23 Oct 2026: due 16 Aug, 68 days late, ₹11,115.82 may be owed", () => {
    const demo = chaseable[0];
    expect(demo).toMatchObject({ invoiceNumber: "INV-000142", amountTotal: 354000, invoiceDate: "2026-08-01" });
    const r = compute(toEngineInput(formOf(demo), TODAY));
    expect(r).toMatchObject({ status: "overdue", lastPayableDate: "2026-08-16", daysOverdue: 68, totalInterest: 11115.82, totalDue: 365115.82 });
  });
});

describe.each(chaseable.map((t) => [t.file, t] as const))("%s", (_file, t) => {
  const form = formOf(t);

  it("passes the confirm form and is overdue under the 15-day rule", () => {
    expect(validateForm(form, TODAY)).toEqual({});
    const r = compute(toEngineInput(form, TODAY));
    expect(r.status).toBe("overdue");
  });

  it.each(TONE_IDS)("the %s standard email passes the number check", (tone) => {
    const r = compute(toEngineInput(form, TODAY));
    if (r.status !== "overdue") throw new Error(r.status);
    const facts = factsForTone(buildFacts({ ...t, amount: t.amountTotal }, r, TODAY), tone, { waiver: tone === "firm" });
    const email = buildTemplate(facts, tone);
    expect(checkEmail(email, facts)).toEqual({ ok: true, missing: [], strayNumbers: [], leakedNames: [], forbidden: [], misplaced: [] });
    expect(email.body).toContain(t.invoiceNumber);
  });
});

describe("the advance-paid invoice", () => {
  const t = PACK.find((x) => x.file.includes("advance"))!;

  it("an advance dated before the invoice is accepted and cuts what is owed", () => {
    const withAdvance = compute(toEngineInput(formOf(t), TODAY));
    const without = compute(toEngineInput({ ...formOf(t), payments: [] }, TODAY));
    if (withAdvance.status !== "overdue" || without.status !== "overdue") throw new Error("not overdue");
    expect(withAdvance).toMatchObject({ paidSoFar: 50000, unpaidAmount: 186000 });
    expect(withAdvance.totalInterest).toBeLessThan(without.totalInterest);
    // Same as an invoice for ₹1,86,000: the advance came before interest could start.
    const smaller = compute(toEngineInput({ ...formOf(t), amount: "186000", payments: [] }, TODAY));
    if (smaller.status !== "overdue") throw new Error("not overdue");
    expect(withAdvance.totalInterest).toBe(smaller.totalInterest);
  });

  it("when the AI reads 'Payment Made', the payment is pre-filled and the founder is told to check it", () => {
    const read: ExtractedInvoice = {
      isInvoice: true,
      clientName: t.clientName,
      invoiceNumber: t.invoiceNumber,
      invoiceDate: t.invoiceDate,
      amountTotal: t.amountTotal,
      currency: "INR",
      paymentTermsDays: null,
      paymentTermsText: "Due on Receipt",
      amountPaid: 50000,
      amountPaidDate: null,
      confidence: { clientName: "high", invoiceNumber: "high", invoiceDate: "high", amountTotal: "high", paymentTermsDays: "low" },
    };
    const s = reducer(initialState, { type: "extracted", data: read });
    expect(s.paidHint).toBe(50000);
    expect(s.form.payments).toEqual([{ id: "from-invoice", date: "", amount: "50000", tds: "" }]);
    // The date isn't printed, so the founder must enter it before continuing.
    expect(validateForm({ ...s.form, udyamDate: UDYAM }, TODAY).payments).toBe(PAYMENTS.errDate(1));
    const html = renderToStaticMarkup(<Confirm state={s} dispatch={() => {}} onSubmit={() => {}} />);
    expect(html).toContain("Your invoice shows ₹50,000.00 already paid");
  });
});

describe("cleaning what the AI reads", () => {
  const base: ExtractedInvoice = {
    isInvoice: true,
    clientName: "Brightpath Edtech Pvt Ltd",
    invoiceNumber: "#TCC/26-27/031",
    invoiceDate: "2026-08-12",
    amountTotal: 224200,
    currency: "inr",
    paymentTermsDays: null,
    paymentTermsText: null,
    confidence: { clientName: "high", invoiceNumber: "high", invoiceDate: "high", amountTotal: "high", paymentTermsDays: "low" },
  };

  it("drops a leading '#' or 'No.' from the invoice number (seen live), but keeps real numbers intact", () => {
    expect(normalizeExtraction(base).invoiceNumber).toBe("TCC/26-27/031");
    expect(normalizeExtraction({ ...base, invoiceNumber: "No. 451" }).invoiceNumber).toBe("451");
    expect(normalizeExtraction({ ...base, invoiceNumber: "INV-000142" }).invoiceNumber).toBe("INV-000142");
    expect(normalizeExtraction({ ...base, invoiceNumber: "NOV-2026-7" }).invoiceNumber).toBe("NOV-2026-7");
  });

  it("keeps a paid amount only if it is positive and below the total; a bad date is dropped", () => {
    expect(normalizeExtraction({ ...base, amountPaid: 50000, amountPaidDate: "2026-07-25" })).toMatchObject({ amountPaid: 50000, amountPaidDate: "2026-07-25" });
    expect(normalizeExtraction({ ...base, amountPaid: 224200 }).amountPaid).toBeNull();
    expect(normalizeExtraction({ ...base, amountPaid: -5 }).amountPaid).toBeNull();
    expect(normalizeExtraction({ ...base, amountPaid: 1000, amountPaidDate: "25/07/2026" }).amountPaidDate).toBeNull();
    expect(normalizeExtraction(base).amountPaid).toBeNull();
  });
});

describe("a deadline only where the founder chose one", () => {
  const t = chaseable[0];
  const r = compute(toEngineInput(formOf(t), TODAY));
  if (r.status !== "overdue") throw new Error(r.status);
  const base = buildFacts({ ...t, amount: t.amountTotal }, r, TODAY);

  it("friendly tones can't write the reply-by date (seen live); the last reminder and the waiver keep it", () => {
    const friendly = factsForTone(base, "friendly");
    expect(friendly.strings.replyByDate).toBe("");
    const email = buildTemplate(friendly, "friendly");
    const withDate = { ...email, body: email.body.replace("A reply this week", "A reply by 30 Oct 2026") };
    expect(checkEmail(withDate, friendly).ok).toBe(false);
    expect(factsForTone(base, "lastReminder").strings.replyByDate).toBe("30 Oct 2026");
    const waiver = factsForTone(base, "firm", { waiver: true });
    expect(waiver.strings.replyByDate).toBe("30 Oct 2026");
    expect(waiver.strings.waiverOffer).toContain("30 Oct 2026");
  });
});

describe("the side tools with the pack", () => {
  const invoices: ToolkitInvoice[] = chaseable.map((t, i) => ({
    id: `p${i}`,
    client: t.clientName,
    number: t.invoiceNumber,
    // Priorities tracks what is still unpaid.
    amount: t.file.includes("advance") ? t.amountTotal - 50000 : t.amountTotal,
    invoiceDate: t.invoiceDate,
    acceptanceDate: t.invoiceDate,
    agreementDays: null,
    promisedDate: t.file.includes("razorpay") ? "2026-10-01" : null, // one missed promise
    paid: false,
  }));
  const unpaidTotal = invoices.reduce((s, i) => s + i.amount, 0);

  it("Priorities ranks all seven clients by score, highest first, and counts the missed promise", () => {
    const { ranked } = rankClients(invoices, TODAY);
    expect(ranked).toHaveLength(7);
    for (let i = 1; i < ranked.length; i++) expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
    expect(ranked.find((c) => c.client === "Brightpath Edtech Pvt Ltd")?.missedPromises).toBe(1);
  });

  it("the Dashboard and the Ageing Report add up to the same rupee total", () => {
    const s = summarize(invoices, TODAY);
    const report = ageingReport(invoices, TODAY);
    expect(report.totals.total).toBe(unpaidTotal);
    expect(report.rows).toHaveLength(7);
    expect(s.overdueCount).toBe(7);
  });

  it("the Cash forecast: on time there is no shortfall; if they all pay 15 days late, salaries can't be met", () => {
    const collections = invoices.map((i) => ({ id: i.id, label: i.client, amountPaise: Math.round(i.amount * 100), date: TODAY, mayBeLate: true }));
    const input = { today: TODAY, startingCashPaise: 1_00_000_00, collections, expenses: [{ id: "sal", label: "Salaries", amountPaise: 3_00_000_00, date: "2026-10-31", mayBeLate: false }] };
    expect(forecastCash(input, "expected").shortfall).toBeNull();
    expect(forecastCash(input, "late").shortfall).toEqual({ date: "2026-10-31", amountPaise: 2_00_000_00 });
  });
});
