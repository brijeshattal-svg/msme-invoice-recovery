import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Help } from "@/components/Help";
import { Standing } from "@/components/Standing";
import { Upload } from "@/components/Upload";
import { ELIGIBILITY, HELP, PROCESS, RATES } from "@/lib/copy";
import { addDays, compute, lastRateChangeDate } from "@/lib/engine";
import { emptyEligibility, eligibilityNotes, rateFreshness, RATE_STALE_AFTER_DAYS, toEngineInput } from "@/lib/standing";
import { initialState, reducer, type FormValues } from "@/lib/wizard";

const form: FormValues = {
  clientName: "Acme",
  invoiceNumber: "INV-1",
  invoiceDate: "2026-08-08",
  amount: "236000",
  udyamDate: "2024-01-01",
  hasAgreement: false,
  agreementDays: "",
  acceptanceDate: "2026-08-08",
};
const N = ELIGIBILITY.notes;
const noop = () => {};

describe("eligibilityNotes", () => {
  it("adds nothing when unanswered or clearly covered", () => {
    expect(eligibilityNotes(emptyEligibility, form)).toEqual([]);
    expect(eligibilityNotes({ enterprise: "micro_small", buyerInIndia: "yes" }, form)).toEqual([]);
  });

  it("maps each answer to its hedged note, in a fixed order", () => {
    expect(eligibilityNotes({ enterprise: "medium", buyerInIndia: "no" }, form)).toEqual([N.medium, N.buyerAbroad]);
    expect(eligibilityNotes({ enterprise: "none", buyerInIndia: "unsure" }, form)).toEqual([N.notRegistered, N.buyerUnsure]);
    expect(eligibilityNotes({ enterprise: "unsure", buyerInIndia: "" }, form)).toEqual([N.enterpriseUnsure]);
  });

  it("warns when Udyam registration is after the invoice date, only for valid dates", () => {
    expect(eligibilityNotes(emptyEligibility, { ...form, udyamDate: "2026-09-01" })).toEqual([N.udyamAfter]);
    expect(eligibilityNotes(emptyEligibility, { ...form, udyamDate: "2026-08-08" })).toEqual([]);
    expect(eligibilityNotes(emptyEligibility, { ...form, udyamDate: "" })).toEqual([]);
  });

  it("every note is hedged and never threatens", () => {
    for (const n of Object.values(N)) {
      expect(n).toMatch(/\bmay\b|Check|Your Udyam certificate/);
      expect(n).not.toMatch(/\bwill\b|guarantee|lawyer|court/i);
    }
  });
});

describe("eligibility answers in the wizard", () => {
  it("are stored, never block, and are cleared by reset", () => {
    const s = reducer(initialState, { type: "eligibility", field: "enterprise", value: "medium" });
    expect(s.eligibility).toEqual({ enterprise: "medium", buyerInIndia: "" });
    expect(reducer(s, { type: "reset" }).eligibility).toEqual(emptyEligibility);
  });
});

describe("rateFreshness", () => {
  const last = lastRateChangeDate();
  it("is fresh up to the limit and stale after it", () => {
    expect(rateFreshness(addDays(last, RATE_STALE_AFTER_DAYS))).toEqual({ checkedTo: last, stale: false });
    expect(rateFreshness(addDays(last, RATE_STALE_AFTER_DAYS + 1)).stale).toBe(true);
  });

  it("shows the stale banner on the Standing screen only when stale", () => {
    const asOfStale = addDays(last, RATE_STALE_AFTER_DAYS + 1);
    const render = (asOf: string) =>
      renderToStaticMarkup(
        <Standing result={compute(toEngineInput(form, asOf))} form={form} asOf={asOf} onBack={noop} onTone={noop} onReset={noop} />,
      );
    expect(render(asOfStale)).toContain(RATES.staleTitle);
    expect(render(addDays(last, 1))).not.toContain(RATES.staleTitle);
  });
});

describe("Standing shows eligibility notes", () => {
  it("lists the founder's notes but skips the Udyam note the engine already explains", () => {
    const html = renderToStaticMarkup(
      <Standing
        result={compute(toEngineInput(form, "2026-10-22"))}
        form={form}
        notes={[N.medium, N.udyamAfter]}
        asOf="2026-10-22"
        onBack={noop}
        onTone={noop}
        onReset={noop}
      />,
    );
    expect(html).toContain(N.medium.replace(/'/g, "&#x27;"));
    expect(html).not.toContain(N.udyamAfter);
  });
});

describe("landing process strip and help", () => {
  it("shows the three steps and the have-ready list", () => {
    const html = renderToStaticMarkup(<Upload upload="idle" error={null} onFile={noop} onSample={noop} onManual={noop} />);
    for (const s of PROCESS.steps) expect(html).toContain(s.title);
    for (const h of PROCESS.haveReady) expect(html).toContain(h);
  });

  it("help is a labelled static dialog with every answer and the not-advice line", () => {
    const html = renderToStaticMarkup(<Help />);
    expect(html).toContain('aria-labelledby="help-h"');
    for (const i of HELP.items) expect(html).toContain(i.q);
    expect(HELP.items.map((i) => i.a).join(" ")).toContain("Talk to a professional before any formal step");
  });
});
