import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import vectors from "@/docs/golden-vectors.json";
import { Standing } from "@/components/Standing";
import { compute, lastRateChangeDate, RATE_HISTORY_START } from "@/lib/engine";
import type { EngineInput, EngineResult } from "@/lib/engine";
import { formatDate, formatINR, formatMonth } from "@/lib/format";
import { toEngineInput } from "@/lib/standing";
import { initialState, reducer, validateForm, type FormValues } from "@/lib/wizard";

type Vector = { id: string; note: string; input: EngineInput; expected: EngineResult };
const all = vectors as unknown as Vector[];
const byId = (id: string) => all.find((v) => v.id === id)!;

const formFor = (i: EngineInput): FormValues => ({
  clientName: "Test Client",
  invoiceNumber: "INV-1",
  invoiceDate: i.invoiceDate,
  amount: String(i.amount),
  udyamDate: i.udyamDate,
  hasAgreement: i.agreementDays !== null,
  agreementDays: i.agreementDays === null ? "" : String(i.agreementDays),
  acceptanceDate: i.acceptanceDate,
});

/** Visible text of the rendered screen, tags stripped, entities decoded, whitespace collapsed. */
function screenText(v: Vector): string {
  const noop = () => {};
  const html = renderToStaticMarkup(
    <Standing result={v.expected} form={formFor(v.input)} onBack={noop} onTone={noop} onReset={noop} />,
  );
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

describe("form -> engine input mapping", () => {
  it.each(all.map((v) => [v.id, v] as const))("%s: the form round-trips to the golden input", (_id, v) => {
    expect(toEngineInput(formFor(v.input), v.input.asOf)).toEqual(v.input);
    expect(compute(toEngineInput(formFor(v.input), v.input.asOf))).toEqual(v.expected);
  });
});

describe("Standing screen: figures on screen equal the golden vectors", () => {
  const overdue = all.filter((v) => v.expected.status === "overdue");

  it.each(overdue.map((v) => [v.id, v] as const))("%s: headline, summary and every month", (_id, v) => {
    const e = v.expected as Extract<EngineResult, { status: "overdue" }>;
    const t = screenText(v);
    expect(t).toContain(`${formatINR(e.totalInterest)} interest may be owed so far`);
    expect(t).toContain(`Total now due ${formatINR(e.totalDue)}`);
    expect(t).toContain(`Payment was due by ${formatDate(e.lastPayableDate)}`);
    expect(t).toContain(`Interest runs from ${formatDate(e.interestStartDate)}`);
    expect(t).toContain(`Days overdue ${e.daysOverdue}`);
    expect(t).toContain(`Amount you confirmed ${formatINR(v.input.amount)}`);
    expect(t).toContain(`Interest to today ${formatINR(e.totalInterest)}`);
    for (const m of e.rows) {
      expect(t).toContain(formatMonth(m.month));
      expect(t).toContain(formatINR(m.openingBalance));
      expect(t).toContain(formatINR(m.interest));
      expect(t).toContain(formatINR(m.closingBalance));
    }
    expect(t).toContain("Choose a tone");
    expect(t).toContain(`Interest rates checked to ${formatDate(lastRateChangeDate())}`);
  });

  it("rate-change-crossing-7-oct-2026 shows both rates with their day counts", () => {
    const t = screenText(byId("rate-change-crossing-7-oct-2026"));
    expect(t).toContain("7,729.59");
    expect(t).toContain("2,57,729.59");
    expect(t).toContain("16.50% × 6 days");
    expect(t).toContain("17.25% × 16 days");
  });

  it("multi-month-compounding totals match to the paisa", () => {
    const t = screenText(byId("multi-month-compounding"));
    expect(t).toContain("₹47,228.01 interest may be owed so far");
    expect(t).toContain("₹5,47,228.01");
  });

  it("agreement-60-capped-to-45 shows the cap note with the agreed days", () => {
    const t = screenText(byId("agreement-60-capped-to-45"));
    expect(t).toContain("₹3,114.81 interest may be owed so far");
    expect(t).toContain("₹1,23,114.81");
    expect(t).toContain("Your agreement says 60 days. The law caps this at 45, so we used 45.");
  });

  it("does not show the cap note for an uncapped agreement or no agreement", () => {
    expect(screenText(byId("agreement-30-respected"))).not.toContain("caps this at 45");
    expect(screenText(byId("single-month-no-agreement"))).not.toContain("caps this at 45");
  });

  it("explains the method in plain English and never leaves a month out", () => {
    const t = screenText(byId("multi-month-compounding"));
    expect(t).toContain("three times the RBI Bank Rate");
    expect(t).toContain("365-day year");
    expect(t).toContain("added to the amount owed at the end of the month");
  });
});

describe("Standing screen: the other statuses", () => {
  it("not yet due: last day, days left, and no tone step", () => {
    const ten = screenText(byId("not-yet-due-10-days-left"));
    expect(ten).toContain("Not late yet");
    expect(ten).toContain("The last day to pay is 1 Nov 2026."); // accepted 17 Oct + 15 days
    expect(ten).toContain("10 days left.");
    expect(ten).toContain("Check another invoice");
    expect(ten).not.toContain("Choose a tone");
    expect(ten).not.toContain("interest may be owed so far");

    expect(screenText(byId("last-payable-day-is-today"))).toContain("Today is the last day to pay.");
  });

  it("udyam after invoice: why, the Supreme Court caveat, a lawyer, no figures, no tone step", () => {
    const t = screenText(byId("udyam-after-invoice"));
    expect(t).toContain("This invoice may not be covered");
    expect(t).toContain("registration date is after the invoice date");
    expect(t).toContain("stricter test");
    expect(t).toContain("referred the question to a larger bench");
    expect(t).toContain("check with a lawyer");
    expect(t).not.toContain("Choose a tone");
    expect(t).not.toMatch(/₹/);
  });

  it("rate history not loaded: the exact message, no figures, no tone step", () => {
    const t = screenText(byId("rate-history-not-loaded"));
    expect(formatDate(RATE_HISTORY_START)).toBe("8 Feb 2023");
    expect(t).toContain(
      "This version only has RBI rates from 8 Feb 2023. Interest on this invoice would start earlier, so we can't calculate it yet.",
    );
    expect(t).not.toContain("Choose a tone");
    expect(t).not.toMatch(/₹/);
  });

  it("every status shows the disclaimer, the unverified-figures line and Back", () => {
    for (const v of all) {
      const t = screenText(v);
      expect(t, v.id).toContain("Not legal advice.");
      expect(t, v.id).toContain("not verified");
      expect(t, v.id).toContain("Back");
    }
  });

  it("covers all four statuses", () => {
    expect(new Set(all.map((v) => v.expected.status))).toEqual(
      new Set(["overdue", "not_yet_due", "udyam_after_invoice", "rate_history_not_loaded"]),
    );
  });
});

describe("non-INR invoices", () => {
  const form: FormValues = formFor(byId("single-month-no-agreement").input);

  it("blocks with the exact message until the amount is re-entered", () => {
    expect(validateForm(form, "2026-10-22", "USD").amount).toBe(
      "This invoice isn't in rupees. Enter the amount in INR to continue.",
    );
    expect(validateForm(form, "2026-10-22", "INR")).toEqual({});
    expect(validateForm(form, "2026-10-22", null)).toEqual({});
  });

  it("editing the amount counts as confirming INR", () => {
    let s = { ...initialState, form, currency: "USD" as string | null };
    s = reducer(s, { type: "edit", field: "clientName", value: "Other" });
    expect(s.currency).toBe("USD"); // unrelated edits do not clear it
    s = reducer(s, { type: "edit", field: "amount", value: "50000" });
    expect(s.currency).toBe("INR");
    expect(validateForm(s.form, "2026-10-22", s.currency)).toEqual({});
  });
});

describe("formatMonth", () => {
  it("formats year-month keys", () => {
    expect(formatMonth("2026-08")).toBe("Aug 2026");
    expect(formatMonth("2025-12")).toBe("Dec 2025");
  });
});
