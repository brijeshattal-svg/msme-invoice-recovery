import { beforeEach, describe, expect, it, vi } from "vitest";

const { extractInvoice } = vi.hoisted(() => ({ extractInvoice: vi.fn() }));
vi.mock("@/lib/ai/extract", async () => {
  class ExtractionError extends Error {
    constructor(public kind: string) {
      super(kind);
    }
  }
  return { extractInvoice, ExtractionError };
});

import { POST } from "@/app/api/extract/route";
import { ExtractionError } from "@/lib/ai/extract";

let ipCounter = 0;
function req(file: File | null, opts: { ip?: string; field?: string } = {}) {
  const form = new FormData();
  if (file) form.append(opts.field ?? "file", file);
  return new Request("http://localhost/api/extract", {
    method: "POST",
    body: form,
    headers: { "x-forwarded-for": opts.ip ?? `10.0.0.${++ipCounter}` },
  });
}
const pdf = (n = 100) => new File([Buffer.concat([Buffer.from("%PDF-1.4"), Buffer.alloc(n)])], "a.pdf", { type: "application/pdf" });
const png = new File([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0])], "a.png", { type: "image/png" });

beforeEach(() => {
  extractInvoice.mockReset();
});

describe("POST /api/extract", () => {
  it("returns the extracted data with no-store caching", async () => {
    extractInvoice.mockResolvedValue({ isInvoice: true });
    const res = await POST(req(pdf()));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ data: { isInvoice: true } });
  });

  it("rejects a missing file, an unsupported type and a mislabelled file", async () => {
    expect((await POST(req(null))).status).toBe(400);
    const txt = new File(["hello"], "a.txt", { type: "text/plain" });
    const r = await POST(req(txt));
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: "not_supported" });
    const fake = new File(["not really a pdf"], "a.pdf", { type: "application/pdf" });
    expect((await POST(req(fake))).status).toBe(400);
    expect(extractInvoice).not.toHaveBeenCalled();
  });

  it("rejects empty and oversized files", async () => {
    const empty = await POST(req(new File([], "a.pdf", { type: "application/pdf" })));
    expect(empty.status).toBe(400);
    expect(await empty.json()).toEqual({ error: "empty" });
    const big = await POST(req(pdf(5 * 1024 * 1024)));
    expect(big.status).toBe(413);
    expect(await big.json()).toEqual({ error: "too_large" });
  });

  it("maps model failures: rate limit -> 429, anything else -> 502", async () => {
    extractInvoice.mockRejectedValueOnce(new ExtractionError("rate_limited"));
    expect((await POST(req(png))).status).toBe(429);
    extractInvoice.mockRejectedValueOnce(new ExtractionError("ai_failed"));
    const r = await POST(req(png));
    expect(r.status).toBe(502);
    expect(await r.json()).toEqual({ error: "ai_failed" });
    extractInvoice.mockRejectedValueOnce(new Error("unexpected"));
    expect((await POST(req(png))).status).toBe(502);
  });

  it("rate-limits the 11th request from one IP", async () => {
    extractInvoice.mockResolvedValue({ isInvoice: true });
    const ip = "9.9.9.9";
    for (let i = 0; i < 10; i++) expect((await POST(req(pdf(), { ip }))).status).toBe(200);
    expect((await POST(req(pdf(), { ip }))).status).toBe(429);
  });

  it("does not log file content, extracted fields or prompts", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    extractInvoice.mockResolvedValue({ isInvoice: true, clientName: "SECRET CLIENT" });
    await POST(req(pdf()));
    const logged = spy.mock.calls.flat().join(" ");
    expect(logged).toMatch(/^extract status=200 ms=\d+$/);
    expect(logged).not.toContain("SECRET CLIENT");
    spy.mockRestore();
  });
});
