import { ApiError } from "@google/genai";
import { beforeEach, describe, expect, it, vi } from "vitest";

const generateContent = vi.fn();
vi.mock("@/lib/ai/client", () => ({
  MODEL: "test-model",
  getClient: () => ({ models: { generateContent } }),
}));

import { extractInvoice, ExtractionError } from "@/lib/ai/extract";

const valid = {
  isInvoice: true,
  clientName: "Acme",
  invoiceNumber: "INV-1",
  invoiceDate: "2026-08-01",
  amountTotal: 5000,
  currency: "INR",
  paymentTermsDays: null,
  paymentTermsText: null,
  confidence: { clientName: "high", invoiceNumber: "high", invoiceDate: "high", amountTotal: "high", paymentTermsDays: "low" },
};
const reply = (text: string | undefined, finishReason = "STOP") => ({
  text,
  candidates: [{ finishReason }],
});
const bytes = Buffer.from("%PDF-1.4 fake");

// Braces matter: returning the mock from beforeEach makes vitest call it as a cleanup hook.
beforeEach(() => {
  generateContent.mockReset();
});

describe("extractInvoice", () => {
  it("sends the file part before the text part, in JSON mode", async () => {
    generateContent.mockResolvedValue(reply(JSON.stringify(valid)));
    await extractInvoice(bytes, "application/pdf");
    const req = generateContent.mock.calls[0][0];
    expect(req.model).toBe("test-model");
    expect(req.contents[0].parts[0].inlineData.mimeType).toBe("application/pdf");
    expect(req.contents[0].parts[1].text).toBeTypeOf("string");
    expect(req.config.responseMimeType).toBe("application/json");
  });

  it("returns the normalised result", async () => {
    generateContent.mockResolvedValue(reply(JSON.stringify({ ...valid, currency: "inr" })));
    expect(await extractInvoice(bytes, "application/pdf")).toMatchObject({ currency: "INR", amountTotal: 5000 });
  });

  it("retries once on malformed JSON, then succeeds", async () => {
    generateContent.mockResolvedValueOnce(reply("not json")).mockResolvedValueOnce(reply(JSON.stringify(valid)));
    expect(await extractInvoice(bytes, "image/png")).toMatchObject({ isInvoice: true });
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("fails as ai_failed after two malformed answers", async () => {
    generateContent.mockResolvedValue(reply(JSON.stringify({ isInvoice: "yes" })));
    await expect(extractInvoice(bytes, "image/png")).rejects.toMatchObject({ kind: "ai_failed" });
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("does not retry a rate limit", async () => {
    generateContent.mockImplementation(async () => {
      throw new ApiError({ message: "quota", status: 429 });
    });
    await expect(extractInvoice(bytes, "image/png")).rejects.toMatchObject({ kind: "rate_limited" });
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("does not retry other API errors or timeouts", async () => {
    generateContent.mockImplementation(async () => {
      throw new Error("The operation was aborted due to timeout");
    });
    await expect(extractInvoice(bytes, "image/png")).rejects.toBeInstanceOf(ExtractionError);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("treats truncation, safety stops, blocked prompts and empty text as ai_failed without retrying", async () => {
    for (const r of [
      reply(JSON.stringify(valid), "MAX_TOKENS"),
      reply(JSON.stringify(valid), "SAFETY"),
      reply(undefined),
      { text: undefined, promptFeedback: { blockReason: "SAFETY" }, candidates: [] },
    ]) {
      generateContent.mockReset();
      generateContent.mockResolvedValue(r);
      await expect(extractInvoice(bytes, "image/png")).rejects.toMatchObject({ kind: "ai_failed" });
      expect(generateContent).toHaveBeenCalledTimes(1);
    }
  });
});
