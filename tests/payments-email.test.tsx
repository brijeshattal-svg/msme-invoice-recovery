import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock("@/lib/ai/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/client")>()),
  MODEL: "test-model",
  getModels: () => ["test-model"],
  getClient: () => ({ models: { generateContent } }),
}));

import { POST } from "@/app/api/draft/route";
import { Confirm } from "@/components/Confirm";
import { Standing } from "@/components/Standing";
import { PAYMENTS } from "@/lib/copy";
import { checkEmail } from "@/lib/email/check";
import { PAYMENTS_INTEREST_NOTE, factsForTone } from "@/lib/email/facts";
import { payloadFromForm, templateDraft } from "@/lib/email/flow";
import { whatsappText } from "@/lib/email/followup";
import { buildTemplate } from "@/lib/email/template";
import { TONE_IDS } from "@/lib/email/tones";
import { addDays, compute } from "@/lib/engine";
import { toEngineInput } from "@/lib/standing";
import { todayIST } from "@/lib/today";
import { initialState, reducer, validateForm, validatePayments, type FormValues } from "@/lib/wizard";
import { FORM, TODAY, factsFor } from "./helpers";

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");
const row = (id: string, date: string, amount: string, tds = "") => ({ id, date, amount, tds });
// ₹2,36,000 invoice; ₹90,000 received on 16 Sep with ₹10,000 TDS deducted.
const PAID: FormValues = { ...FORM, payments: [row("a", "2026-09-16", "90000", "10000")] };

describe("email facts with part payments", () => {
  const facts = factsFor(PAID);

  it("one fixed sentence says what was received (with TDS) and what is unpaid, and it is required", () => {
    expect(facts.strings.paymentsLine).toBe("We have received ₹1,00,000.00 so far, including TDS of ₹10,000.00, so ₹1,36,000.00 of the invoice is still unpaid.");
    expect(facts.required).toContain("paymentsLine");
  });

  it("no payments: no sentence and nothing extra required (unchanged emails)", () => {
    const plain = factsFor(FORM);
    expect(plain.strings.paymentsLine).toBe("");
    expect(plain.required).not.toContain("paymentsLine");
  });

  it("without TDS the sentence leaves the TDS part out", () => {
    const f = factsFor({ ...FORM, payments: [row("a", "2026-09-16", "50000")] });
    expect(f.strings.paymentsLine).toBe("We have received ₹50,000.00 so far, so ₹1,86,000.00 of the invoice is still unpaid.");
  });

  it("tones that mention interest add that interest ran only on the unpaid part; the check-in does not", () => {
    expect(factsForTone(facts, "firm").strings.paymentsLine.endsWith(PAYMENTS_INTEREST_NOTE)).toBe(true);
    expect(factsForTone(facts, "checkin").strings.paymentsLine).not.toMatch(/interest/i);
  });

  it.each(TONE_IDS)("%s: the standard draft includes the sentence and passes the number check", (tone) => {
    const toned = factsForTone(facts, tone, { waiver: true });
    const email = buildTemplate(toned, tone);
    expect(email.body).toContain(toned.strings.paymentsLine);
    expect(checkEmail(email, toned)).toEqual({ ok: true, missing: [], strayNumbers: [], leakedNames: [], forbidden: [], misplaced: [] });
  });

  it("an AI draft that leaves the payments out, or invents its own figure for them, is rejected", () => {
    const toned = factsForTone(facts, "friendly");
    const email = buildTemplate(toned, "friendly");
    const dropped = { ...email, body: email.body.replace(toned.strings.paymentsLine, "") };
    expect(checkEmail(dropped, toned).missing).toContain("paymentsLine");
    const invented = { ...email, body: email.body.replace(toned.strings.paymentsLine, "We have received ₹95,000.00 so far.") };
    expect(checkEmail(invented, toned).ok).toBe(false);
  });

  it("the total now due is the unpaid part plus interest", () => {
    const r = compute(toEngineInput(PAID, TODAY));
    if (r.status !== "overdue") throw new Error(r.status);
    expect(r.totalDue).toBe(Math.round((136000 + r.totalInterest) * 100) / 100);
  });
});

describe("WhatsApp text follows the tone", () => {
  it("gentle check-in: no interest and no total, even in the WhatsApp copy", () => {
    const toned = factsForTone(factsFor(FORM), "checkin");
    const t = whatsappText(toned);
    expect(t).not.toMatch(/interest/i);
    expect(t).not.toContain(toned.strings.totalDue);
    expect(checkEmail({ subject: "", body: t }, toned).strayNumbers).toEqual([]);
  });

  it("other tones keep the interest; part payments are included", () => {
    const toned = factsForTone(factsFor(PAID), "friendly");
    const t = whatsappText(toned);
    expect(t).toContain(toned.strings.interest);
    expect(t).toContain(toned.strings.paymentsLine);
    expect(checkEmail({ subject: "", body: t }, toned).strayNumbers).toEqual([]);
  });
});

describe("the form: entering part payments", () => {
  it("Yes opens a row; rows can be edited and removed; No clears them", () => {
    let s = reducer({ ...initialState, form: FORM }, { type: "addPayment", id: "x" });
    expect(s.form.payments).toEqual([row("x", "", "")]);
    s = reducer(s, { type: "editPayment", id: "x", field: "amount", value: "5000" });
    s = reducer(s, { type: "addPayment", id: "y" });
    s = reducer(s, { type: "removePayment", id: "x" });
    expect(s.form.payments).toEqual([row("y", "", "")]);
    expect(reducer(s, { type: "clearPayments" }).form.payments).toEqual([]);
  });

  it("validation: a date up to today (advances may predate the invoice), digits with paise, something paid, total under the invoice", () => {
    const v = (payments: FormValues["payments"]) => validatePayments({ ...FORM, payments }, TODAY);
    expect(v([row("a", "2026-09-16", "90000", "10000")])).toBeNull();
    expect(v([row("a", "", "100")])).toBe(PAYMENTS.errDate(1));
    expect(v([row("a", "2026-07-25", "50000")])).toBeNull(); // advance paid before the invoice date
    expect(v([row("a", "2026-10-23", "100")])).toBe(PAYMENTS.errFuture(1));
    expect(v([row("a", "2026-09-16", "1,000")])).toBe(PAYMENTS.errAmount(1));
    expect(v([row("a", "2026-09-16", "10.005")])).toBe(PAYMENTS.errAmount(1));
    expect(v([row("a", "2026-09-16", "", "")])).toBe(PAYMENTS.errZero(1));
    expect(v([row("a", "2026-09-16", "", "2000")])).toBeNull(); // TDS alone is a payment
    expect(v([row("a", "2026-09-16", "200000"), row("b", "2026-09-20", "30000", "6000")])).toBe(PAYMENTS.errTooMuch);
    expect(v([row("a", "2026-09-16", "235999.99")])).toBeNull();
    expect(validateForm({ ...FORM, payments: [row("a", "", "1")] }, TODAY).payments).toBe(PAYMENTS.errDate(1));
    expect(validateForm(FORM, TODAY)).toEqual({});
  });

  it("the payload carries payments only when there are some (inputs only, never figures)", () => {
    expect(payloadFromForm(FORM, "firm")).not.toHaveProperty("payments");
    expect(payloadFromForm({ ...FORM, payments: [] }, "firm")).not.toHaveProperty("payments");
    expect(payloadFromForm(PAID, "firm").payments).toEqual([{ date: "2026-09-16", amount: 90000, tds: 10000 }]);
  });

  it("the confirm screen asks, and shows labelled rows once Yes is chosen", () => {
    const off = text(renderToStaticMarkup(<Confirm state={{ ...initialState, form: FORM }} dispatch={() => {}} onSubmit={() => {}} />));
    expect(off).toContain(PAYMENTS.question);
    expect(off).not.toContain(PAYMENTS.dateLabel);
    const html = renderToStaticMarkup(<Confirm state={{ ...initialState, form: PAID }} dispatch={() => {}} onSubmit={() => {}} />);
    for (const l of [PAYMENTS.dateLabel, PAYMENTS.amountLabel, PAYMENTS.tdsLabel, PAYMENTS.row(1), PAYMENTS.fullNote]) expect(text(html)).toContain(l);
    expect(html).toMatch(/<label[^>]*for="f-pay-a-date"/);
  });

  it("the results screen shows received, unpaid and a Paid column in the working", () => {
    const r = compute(toEngineInput(PAID, TODAY));
    const t = text(renderToStaticMarkup(<Standing result={r} form={PAID} onBack={() => {}} onTone={() => {}} onReset={() => {}} />));
    expect(t).toContain(`${PAYMENTS.receivedLabel} ₹1,00,000.00 (including TDS of ₹10,000.00)`);
    expect(t).toContain(`${PAYMENTS.unpaidLabel} ₹1,36,000.00`);
    expect(t).toContain(`${PAYMENTS.paidColumn}`);
    expect(t).toContain("−₹1,00,000.00");
    expect(t).toContain(PAYMENTS.howPayments);
  });

  it("the standard draft from the form includes the payments sentence", () => {
    const d = templateDraft(PAID, "formal", TODAY)!;
    expect(d.body).toContain(d.facts.strings.paymentsLine);
    expect(checkEmail(d, d.facts).ok).toBe(true);
  });
});

describe("/api/draft with part payments", () => {
  const today = todayIST();
  const invoiceDate = addDays(today, -75);
  const body = {
    clientName: "Northwind Test Industries Pvt Ltd",
    invoiceNumber: "BDS/2026/0142",
    invoiceDate,
    amount: 236000,
    acceptanceDate: invoiceDate,
    agreementDays: null,
    udyamDate: "2024-06-01",
    tone: "friendly",
    payments: [{ date: addDays(today, -20), amount: 90000, tds: 10000 }],
  };
  const form: FormValues = {
    ...FORM,
    invoiceDate,
    acceptanceDate: invoiceDate,
    payments: [row("a", addDays(today, -20), "90000", "10000")],
  };
  let ip = 0;
  const post = (b: unknown) =>
    POST(new Request("http://localhost/api/draft", { method: "POST", body: JSON.stringify(b), headers: { "content-type": "application/json", "x-forwarded-for": `10.9.0.${++ip}` } }));

  beforeEach(() => {
    generateContent.mockReset();
    const toned = factsForTone(factsFor(form, today), "friendly");
    generateContent.mockImplementation(async () => ({ text: JSON.stringify(buildTemplate(toned, "friendly")), candidates: [{ finishReason: "STOP" }] }));
  });

  it("works the email out on the unpaid part: the model is given the payments sentence", async () => {
    const res = await post(body);
    expect(res.status).toBe(200);
    const prompt = JSON.stringify(generateContent.mock.calls[0][0]);
    expect(prompt).toContain("We have received ₹1,00,000.00 so far, including TDS of ₹10,000.00");
    expect(((await res.json()) as { source: string }).source).toBe("ai");
  });

  it("rejects payments that add up to the whole invoice, are dated in the future, or are zero", async () => {
    for (const payments of [
      [{ date: addDays(today, -20), amount: 236000, tds: 0 }],
      [{ date: addDays(today, 1), amount: 1000, tds: 0 }],
      [{ date: addDays(today, -20), amount: 0, tds: 0 }],
      [{ date: addDays(today, -20), amount: -5, tds: 0 }],
    ]) {
      const res = await post({ ...body, payments });
      expect(res.status, JSON.stringify(payments)).toBe(400);
    }
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("accepts an advance dated before the invoice", async () => {
    const res = await post({ ...body, payments: [{ date: addDays(invoiceDate, -10), amount: 50000, tds: 0 }] });
    expect(res.status).toBe(200);
  });
});
