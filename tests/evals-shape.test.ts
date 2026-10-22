import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isValidISODate } from "@/lib/engine";

// Shape check for the V0 blocker evaluation set. The live evaluation (R4) is a separate script.
const TYPES = [
  "po_missing", "po_mismatch", "vendor_not_onboarded", "invoice_correction", "missing_documents", "approval_pending",
  "payment_cycle", "payment_processing", "amount_dispute", "deliverable_dispute", "tds_or_tax_query",
  "contact_or_routing", "other",
];
const ITEMS = [
  "po_number", "po_copy", "vendor_form", "gst_certificate", "pan", "bank_letter", "udyam_certificate", "corrected_invoice",
  "credit_note", "timesheet", "sign_off", "work_completion_certificate", "approver_name", "utr", "breakdown", "contact",
];
const REFERENCE_TODAY = "2026-10-22";

type Case = { id: string; reply: string; expected: { blockers: string[]; promisedDate: string | null; requestedItems: string[] } };
const cases: Case[] = readFileSync("evals/blockers/cases.jsonl", "utf8")
  .split(/\r?\n/)
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l));

describe("evals/blockers/cases.jsonl", () => {
  it("has 60 cases with unique ids", () => {
    expect(cases).toHaveLength(60);
    expect(new Set(cases.map((c) => c.id)).size).toBe(60);
  });

  it("uses only known blocker types and requested items, and valid future dates", () => {
    for (const c of cases) {
      expect(c.reply.length, c.id).toBeGreaterThan(0);
      expect(c.expected.blockers.length, c.id).toBeGreaterThan(0);
      for (const b of c.expected.blockers) expect(TYPES, c.id).toContain(b);
      for (const i of c.expected.requestedItems) expect(ITEMS, c.id).toContain(i);
      const d = c.expected.promisedDate;
      if (d !== null) {
        expect(isValidISODate(d), c.id).toBe(true);
        expect(d > REFERENCE_TODAY, c.id).toBe(true);
      }
    }
  });

  it("covers every type at least 4 times and includes injection cases", () => {
    for (const t of TYPES) {
      const n = cases.filter((c) => c.expected.blockers.includes(t)).length;
      expect(n, t).toBeGreaterThanOrEqual(4);
    }
    expect(cases.filter((c) => c.id.startsWith("inj-")).length).toBeGreaterThanOrEqual(4);
  });

  it("contains no real-looking email domains other than .example", () => {
    for (const c of cases) {
      for (const m of c.reply.matchAll(/[\w.+-]+@([\w-]+\.)+([a-z]+)/gi)) expect(m[2], c.id).toBe("example");
    }
  });
});
