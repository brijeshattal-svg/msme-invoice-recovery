import { describe, expect, it } from "vitest";
import type { ExtractedInvoice } from "@/lib/ai/schemas";
import { rateLimit } from "@/lib/ratelimit";
import { fromExtraction, initialState, reducer, sampleExtraction, validateForm, type FormValues } from "@/lib/wizard";

const extracted: ExtractedInvoice = {
  isInvoice: true,
  clientName: "Acme",
  invoiceNumber: null,
  invoiceDate: "2026-08-01",
  amountTotal: 236000,
  currency: "INR",
  paymentTermsDays: 30,
  paymentTermsText: "Net 30",
  confidence: { clientName: "low", invoiceNumber: "low", invoiceDate: "high", amountTotal: "high", paymentTermsDays: "high" },
};

const validForm: FormValues = {
  clientName: "Acme",
  invoiceNumber: "INV-1",
  invoiceDate: "2026-08-01",
  amount: "236000",
  udyamDate: "2024-06-01",
  hasAgreement: false,
  agreementDays: "",
  acceptanceDate: "2026-08-01",
};
const TODAY = "2026-10-22";

describe("fromExtraction", () => {
  it("flags unread fields as missing and low-confidence ones as check", () => {
    const r = fromExtraction(extracted);
    expect(r.flagged).toEqual({ clientName: "check", invoiceNumber: "missing" });
    expect(r.form.acceptanceDate).toBe("2026-08-01"); // defaults to invoice date
    expect(r.form.amount).toBe("236000");
  });

  it("shows the invoice's terms as a hint but never turns on the written-agreement toggle", () => {
    const r = fromExtraction(extracted);
    expect(r.termsHint).toBe("Net 30");
    expect(r.form.hasAgreement).toBe(false);
    expect(r.form.agreementDays).toBe("");
  });
});

describe("reducer", () => {
  it("moves acceptance date with the invoice date until the founder edits it", () => {
    let s = reducer(initialState, { type: "extracted", data: extracted });
    s = reducer(s, { type: "edit", field: "invoiceDate", value: "2026-08-05" });
    expect(s.form.acceptanceDate).toBe("2026-08-05");
    s = reducer(s, { type: "edit", field: "acceptanceDate", value: "2026-08-10" });
    s = reducer(s, { type: "edit", field: "invoiceDate", value: "2026-08-07" });
    expect(s.form.acceptanceDate).toBe("2026-08-10");
  });

  it("clears a field's flag once it is edited, and keeps data on Back", () => {
    let s = reducer(initialState, { type: "extracted", data: extracted });
    s = reducer(s, { type: "edit", field: "invoiceNumber", value: "INV-9" });
    expect(s.flagged.invoiceNumber).toBeUndefined();
    s = reducer(s, { type: "go", step: "standing" });
    s = reducer(s, { type: "go", step: "check" });
    expect(s.form.invoiceNumber).toBe("INV-9");
  });

  it("manual entry opens an empty Check screen; a failure stays on Upload with the message", () => {
    expect(reducer(initialState, { type: "manual" })).toMatchObject({ step: "check", form: { clientName: "" } });
    expect(reducer(initialState, { type: "failed", message: "boom" })).toMatchObject({ step: "upload", upload: "error", error: "boom" });
  });
});

describe("validateForm", () => {
  it("accepts a complete form", () => {
    expect(validateForm(validForm, TODAY)).toEqual({});
  });

  it("requires every field and real dates", () => {
    const e = validateForm({ ...validForm, clientName: " ", invoiceNumber: "", invoiceDate: "2026-02-30", amount: "0", udyamDate: "", acceptanceDate: "nope" }, TODAY);
    expect(Object.keys(e).sort()).toEqual(["acceptanceDate", "amount", "clientName", "invoiceDate", "invoiceNumber", "udyamDate"]);
  });

  it("rejects future invoice and Udyam dates", () => {
    const e = validateForm({ ...validForm, invoiceDate: "2026-11-01", udyamDate: "2026-12-01" }, TODAY);
    expect(e.invoiceDate).toBeDefined();
    expect(e.udyamDate).toBeDefined();
  });

  it("validates agreement days only when an agreement exists, and allows 0", () => {
    expect(validateForm({ ...validForm, hasAgreement: false, agreementDays: "abc" }, TODAY)).toEqual({});
    expect(validateForm({ ...validForm, hasAgreement: true, agreementDays: "" }, TODAY).agreementDays).toBeDefined();
    expect(validateForm({ ...validForm, hasAgreement: true, agreementDays: "0" }, TODAY)).toEqual({});
    expect(validateForm({ ...validForm, hasAgreement: true, agreementDays: "60" }, TODAY)).toEqual({}); // capping happens in the engine
    expect(validateForm({ ...validForm, hasAgreement: true, agreementDays: "2.5" }, TODAY).agreementDays).toBeDefined();
  });
});

describe("sampleExtraction", () => {
  it("is a complete, fictional, valid-looking invoice dated 75 days back", () => {
    const s = sampleExtraction(TODAY);
    expect(s.invoiceDate).toBe("2026-08-08");
    expect(validateForm({ ...validForm, ...fromExtraction(s).form, udyamDate: "2024-06-01" }, TODAY)).toEqual({});
  });
});

describe("rateLimit", () => {
  it("allows 10 per 10 minutes per IP, then blocks, then recovers", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 10; i++) expect(rateLimit("1.1.1.1", t0 + i)).toBe(true);
    expect(rateLimit("1.1.1.1", t0 + 20)).toBe(false);
    expect(rateLimit("2.2.2.2", t0 + 20)).toBe(true); // other IPs unaffected
    expect(rateLimit("1.1.1.1", t0 + 10 * 60 * 1000 + 100)).toBe(true);
  });
});
