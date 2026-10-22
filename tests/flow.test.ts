import { describe, expect, it, vi } from "vitest";
import { checkEmail } from "@/lib/email/check";
import { factsFromForm, getDraft, payloadFromForm, type DraftFetcher } from "@/lib/email/flow";
import { buildMailto, emailAsText } from "@/lib/email/mailto";
import { buildTemplate } from "@/lib/email/template";
import { FORM, TODAY, factsFor } from "./helpers";

const facts = factsFor();
const good = buildTemplate(facts, "friendly");

describe("payloadFromForm", () => {
  it("sends inputs, never figures", () => {
    const p = payloadFromForm({ ...FORM, hasAgreement: true, agreementDays: "30" }, "firm");
    expect(p).toEqual({
      clientName: FORM.clientName,
      invoiceNumber: FORM.invoiceNumber,
      invoiceDate: "2026-08-08",
      amount: 236000,
      acceptanceDate: "2026-08-08",
      agreementDays: 30,
      udyamDate: "2024-06-01",
      tone: "firm",
    });
    expect(Object.keys(p)).not.toContain("totalDue");
  });

  it("sends null when there is no written agreement", () => {
    expect(payloadFromForm(FORM, "friendly").agreementDays).toBeNull();
  });
});

describe("factsFromForm", () => {
  it("is null when the invoice is not overdue today", () => {
    expect(factsFromForm({ ...FORM, invoiceDate: "2026-10-20", acceptanceDate: "2026-10-20" }, TODAY)).toBeNull();
  });
  it("matches the facts the server builds", () => {
    expect(factsFromForm(FORM, TODAY)).toEqual(facts);
  });
});

describe("getDraft", () => {
  it("accepts a server draft that passes the browser's own number check", async () => {
    const fetchDraft: DraftFetcher = vi.fn(async () => ({ ...good, source: "ai" as const }));
    const d = await getDraft(FORM, "friendly", TODAY, fetchDraft);
    expect(d).toMatchObject({ source: "ai", subject: good.subject });
    expect(fetchDraft).toHaveBeenCalledOnce();
  });

  it("does not trust a server draft that fails the check: uses the local template, not the 'AI' chip", async () => {
    const tampered = { subject: good.subject, body: good.body.split(facts.strings.totalDue).join("₹9,99,999.00"), source: "ai" as const };
    const d = (await getDraft(FORM, "friendly", TODAY, async () => tampered))!;
    expect(d.source).toBe("template");
    expect(d.body).not.toContain("9,99,999.00");
    expect(checkEmail(d, d.facts).ok).toBe(true);
  });

  it.each([
    ["a network error", async () => { throw new TypeError("Failed to fetch"); }],
    ["a 502", async () => { throw new Error("draft failed: 502"); }],
    ["a rate limit", async () => { throw new Error("draft failed: 429"); }],
  ])("falls back to the local template after %s, so the journey never dead-ends", async (_n, fetchDraft) => {
    const d = (await getDraft(FORM, "formal", TODAY, fetchDraft as DraftFetcher))!;
    expect(d.source).toBe("template");
    expect(d.subject).toBe(buildTemplate(facts, "formal").subject);
    expect(checkEmail(d, d.facts).ok).toBe(true);
  });

  it("returns null, without calling the server, when the invoice is not overdue", async () => {
    const fetchDraft = vi.fn();
    const d = await getDraft({ ...FORM, invoiceDate: "2026-10-20", acceptanceDate: "2026-10-20" }, "friendly", TODAY, fetchDraft);
    expect(d).toBeNull();
    expect(fetchDraft).not.toHaveBeenCalled();
  });
});

describe("emailAsText (what Copy email puts on the clipboard)", () => {
  it("is the subject line, a blank line, then the body, unchanged", () => {
    const text = emailAsText(good.subject, good.body);
    expect(text.startsWith(`Subject: ${good.subject}\n\n`)).toBe(true);
    expect(text.endsWith(good.body)).toBe(true);
    expect(text).toContain(facts.strings.totalDue);
    expect(text).toContain("[Your name]");
  });
});

describe("buildMailto", () => {
  it("fills subject and body, with CRLF line breaks as %0D%0A", () => {
    const { href, truncated } = buildMailto("Invoice A/1: reminder", "Line one\nLine two\r\nLine three");
    expect(truncated).toBe(false);
    expect(href.startsWith("mailto:?subject=Invoice%20A%2F1%3A%20reminder&body=")).toBe(true);
    expect(href).toContain("Line%20one%0D%0ALine%20two%0D%0ALine%20three");
    expect(href).not.toContain("%0A%0A");
  });

  it("encodes the rupee sign and brackets", () => {
    const { href } = buildMailto("s", "Total ₹2,36,000.00 [Your name]");
    expect(href).toContain("%E2%82%B92%2C36%2C000.00");
    expect(href).toContain("%5BYour%20name%5D");
  });

  it("round-trips: decoding the body gives back the text with CRLF", () => {
    const body = "Hi team,\n\nTotal ₹2,36,000.00\n\n[Your name]";
    const href = buildMailto("s", body).href;
    expect(decodeURIComponent(href.split("&body=")[1])).toBe(body.replace(/\n/g, "\r\n"));
  });

  it("falls back to subject-only over about 1800 characters", () => {
    const { href, truncated } = buildMailto("Long one", "word ".repeat(600));
    expect(truncated).toBe(true);
    expect(href).toBe("mailto:?subject=Long%20one");
  });

  it("a real standard draft fits in a mailto", () => {
    for (const tone of ["friendly", "firm", "formal"] as const) {
      const e = buildTemplate(facts, tone);
      expect(buildMailto(e.subject, e.body).truncated, tone).toBe(false);
    }
  });
});
