import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES } from "@/lib/limits";

describe("public/sample/sample-invoice.pdf", () => {
  const bytes = readFileSync("public/sample/sample-invoice.pdf");

  it("is a real PDF small enough for the upload limit", () => {
    expect(bytes.subarray(0, 4).toString("latin1")).toBe("%PDF");
    expect(bytes.length).toBeGreaterThan(500);
    expect(bytes.length).toBeLessThan(MAX_UPLOAD_BYTES);
  });

  it("contains no real-looking identifiers (GSTIN, PAN, bank account, IFSC)", () => {
    // Text in the generated PDF is stored uncompressed by pdf-lib's standard-font drawing.
    const raw = bytes.toString("latin1");
    expect(raw).not.toMatch(/\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/); // GSTIN
    expect(raw).not.toMatch(/\b[A-Z]{5}\d{4}[A-Z]\b/); // PAN
    expect(raw).not.toMatch(/\b[A-Z]{4}0[A-Z0-9]{6}\b/); // IFSC
    expect(raw).not.toMatch(/\b\d{9,18}\b/); // account-number-like digit runs
  });
});
