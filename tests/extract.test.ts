import { ApiError } from "@google/genai";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { generateContent, chain } = vi.hoisted(() => ({ generateContent: vi.fn(), chain: { models: ["test-model"] } }));
vi.mock("@/lib/ai/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/client")>()),
  MODEL: "test-model",
  getModels: () => chain.models,
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
  chain.models = ["test-model"];
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

describe("extractInvoice: model chain (fallback on 429, 503, 404)", () => {
  const api = (status: number) => new ApiError({ message: "x", status });
  const modelsCalled = () => generateContent.mock.calls.map((c) => c[0].model);
  beforeEach(() => {
    chain.models = ["primary", "second", "third"];
  });

  it("uses only the primary when it works", async () => {
    generateContent.mockResolvedValue(reply(JSON.stringify(valid)));
    await extractInvoice(bytes, "application/pdf");
    expect(modelsCalled()).toEqual(["primary"]);
  });

  it.each([
    ["429 out of quota", 429],
    ["503 busy", 503],
    ["500 error", 500],
    ["504 gateway timeout", 504],
    ["404 model gone", 404],
  ])("moves to the next model after %s", async (_n, status) => {
    generateContent.mockRejectedValueOnce(api(status)).mockResolvedValueOnce(reply(JSON.stringify(valid)));
    expect(await extractInvoice(bytes, "image/png")).toMatchObject({ clientName: "Acme" });
    expect(modelsCalled()).toEqual(["primary", "second"]);
  });

  it("walks the whole chain and stops at the first model that works", async () => {
    generateContent
      .mockRejectedValueOnce(api(429))
      .mockRejectedValueOnce(api(503))
      .mockResolvedValueOnce(reply(JSON.stringify(valid)));
    await extractInvoice(bytes, "image/png");
    expect(modelsCalled()).toEqual(["primary", "second", "third"]);
  });

  it("reports rate_limited only when EVERY model was rate limited", async () => {
    generateContent.mockRejectedValue(api(429));
    await expect(extractInvoice(bytes, "image/png")).rejects.toMatchObject({ kind: "rate_limited" });
    expect(modelsCalled()).toEqual(["primary", "second", "third"]);
  });

  it("reports ai_failed when the failures are a mix of quota and outages", async () => {
    generateContent.mockRejectedValueOnce(api(429)).mockRejectedValueOnce(api(503)).mockRejectedValueOnce(api(429));
    await expect(extractInvoice(bytes, "image/png")).rejects.toMatchObject({ kind: "ai_failed" });
  });

  it.each([
    ["a timeout", () => Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" })],
    ["an abort", () => Object.assign(new Error("This operation was aborted"), { name: "AbortError" })],
    ["a network failure (fetch failed)", () => new TypeError("fetch failed")],
  ])("DOES move to the next model after %s (a hung or unreachable model)", async (_n, make) => {
    generateContent.mockRejectedValueOnce(make()).mockResolvedValueOnce(reply(JSON.stringify(valid)));
    expect(await extractInvoice(bytes, "image/png")).toMatchObject({ clientName: "Acme" });
    expect(modelsCalled()).toEqual(["primary", "second"]);
  });

  it("every model timing out is ai_failed (not rate_limited)", async () => {
    generateContent.mockRejectedValue(Object.assign(new Error("t"), { name: "TimeoutError" }));
    await expect(extractInvoice(bytes, "image/png")).rejects.toMatchObject({ kind: "ai_failed" });
    expect(modelsCalled()).toEqual(["primary", "second", "third"]);
  });

  it("gives models before the last a 20 s leash and the last model the long one", async () => {
    const spy = vi.spyOn(AbortSignal, "timeout");
    generateContent.mockRejectedValue(api(503));
    await expect(extractInvoice(bytes, "image/png")).rejects.toBeInstanceOf(ExtractionError);
    const ms = spy.mock.calls.map((c) => c[0]);
    expect(ms).toHaveLength(3);
    expect(ms[0]).toBeLessThanOrEqual(20_000);
    expect(ms[1]).toBeLessThanOrEqual(20_000);
    expect(ms[2]).toBeGreaterThan(20_000);
    spy.mockRestore();
  });

  it.each([
    ["a 400 bad request", () => api(400)],
    ["a 401 bad key", () => api(401)],
    ["a missing key", () => new Error("GEMINI_API_KEY is not set")],
  ])("does NOT switch models after %s (another model would not fix it)", async (_n, make) => {
    generateContent.mockRejectedValue(make());
    await expect(extractInvoice(bytes, "image/png")).rejects.toMatchObject({ kind: "ai_failed" });
    expect(modelsCalled()).toEqual(["primary"]);
  });

  it("does NOT switch for blocked or truncated answers", async () => {
    generateContent.mockResolvedValue(reply(JSON.stringify(valid), "SAFETY"));
    await expect(extractInvoice(bytes, "image/png")).rejects.toMatchObject({ kind: "ai_failed" });
    expect(modelsCalled()).toEqual(["primary"]);
  });

  it("retries a malformed answer on the SAME model before anything else", async () => {
    generateContent.mockResolvedValueOnce(reply("not json")).mockResolvedValueOnce(reply(JSON.stringify(valid)));
    await extractInvoice(bytes, "image/png");
    expect(modelsCalled()).toEqual(["primary", "primary"]);
  });

  it("a model that 429s after a malformed answer still hands over to the next model", async () => {
    generateContent
      .mockResolvedValueOnce(reply("not json"))
      .mockRejectedValueOnce(api(429))
      .mockResolvedValueOnce(reply(JSON.stringify(valid)));
    await extractInvoice(bytes, "image/png");
    expect(modelsCalled()).toEqual(["primary", "primary", "second"]);
  });

  it("with a single configured model, a 429 is reported as rate_limited after one call", async () => {
    chain.models = ["only"];
    generateContent.mockRejectedValue(api(429));
    await expect(extractInvoice(bytes, "image/png")).rejects.toMatchObject({ kind: "rate_limited" });
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it("logs the model and status but never the file", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    generateContent.mockRejectedValueOnce(api(429)).mockResolvedValueOnce(reply(JSON.stringify(valid)));
    await extractInvoice(Buffer.from("%PDF-SECRET-BYTES"), "application/pdf");
    const logged = spy.mock.calls.flat().join("\n");
    expect(logged).toContain("extract model_error status=429 model=primary");
    expect(logged).not.toContain("SECRET");
    spy.mockRestore();
  });
});
