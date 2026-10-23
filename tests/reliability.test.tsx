import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import PrivacyPage from "@/app/privacy/page";
import { Upload } from "@/components/Upload";
import { analyseReply, extractInvoice, requestDraft } from "@/lib/api";
import { COPY, PRIVACY } from "@/lib/copy";
import { checkEmail } from "@/lib/email/check";
import { templateDraft } from "@/lib/email/flow";
import { CLIENT_TIMEOUT_MS, SLOW_AFTER_MS } from "@/lib/limits";
import { aiPlanIsPaid } from "@/lib/privacy";
import { FORM, TODAY } from "./helpers";

const noop = () => {};
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");

describe("privacy and terms page", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("only GEMINI_BILLING=paid counts as a paid plan", () => {
    expect(aiPlanIsPaid(undefined)).toBe(false);
    expect(aiPlanIsPaid("")).toBe(false);
    expect(aiPlanIsPaid("free")).toBe(false);
    expect(aiPlanIsPaid(" Paid ")).toBe(true);
  });

  it("on the free tier, warns not to upload a real client's invoice", () => {
    vi.stubEnv("GEMINI_BILLING", "");
    const t = text(renderToStaticMarkup(<PrivacyPage />));
    expect(t).toContain(PRIVACY.aiFree);
    expect(t).not.toContain(PRIVACY.aiPaid);
    expect(t).toContain("Please don't upload a real client's invoice here");
  });

  it("on a paid plan, says so and still points to Google's terms", () => {
    vi.stubEnv("GEMINI_BILLING", "paid");
    const html = renderToStaticMarkup(<PrivacyPage />);
    expect(text(html)).toContain(PRIVACY.aiPaid);
    expect(html).toContain(`href="${PRIVACY.aiTermsUrl}"`);
  });

  it("covers what is sent, what is not kept, logs, rights and the terms, with one h1", () => {
    const t = text(renderToStaticMarkup(<PrivacyPage />));
    for (const s of [PRIVACY.flowTitle, PRIVACY.notTitle, PRIVACY.logsTitle, PRIVACY.rightsTitle, PRIVACY.termsTitle]) expect(t).toContain(s);
    expect(t).toContain("Not legal, tax or financial advice");
    expect(renderToStaticMarkup(<PrivacyPage />).match(/<h1/g)).toHaveLength(1);
  });

  it("the upload screen links to it", () => {
    const html = renderToStaticMarkup(<Upload upload="idle" error={null} onFile={noop} onSample={noop} onManual={noop} />);
    expect(html).toContain('href="/privacy"');
  });
});

describe("waiting on the AI never traps the founder", () => {
  it("'Enter details manually' stays usable while the invoice is being read", () => {
    const html = renderToStaticMarkup(<Upload upload="reading" error={null} onFile={noop} onSample={noop} onManual={noop} />);
    const manual = html.match(/<button[^>]*>Enter details manually<\/button>/)?.[0] ?? "";
    expect(manual).not.toBe("");
    expect(manual).not.toMatch(/\sdisabled=""/);
    // ...whereas the file button really is disabled while reading
    expect(html).toMatch(/<button[^>]*\sdisabled=""[^>]*>Choose invoice<\/button>/);
    expect(text(html)).toContain(COPY.reading);
  });

  it("the reading message matches what we measured live (15-20 s), not 'about 10 seconds'", () => {
    expect(COPY.reading).not.toContain("about 10 seconds");
    expect(SLOW_AFTER_MS).toBeLessThan(CLIENT_TIMEOUT_MS);
    expect(CLIENT_TIMEOUT_MS).toBeGreaterThan(60_000); // the server gives up at 60 s first
  });

  it("templateDraft gives the standard draft with checked figures, and null if not overdue", () => {
    const t = templateDraft(FORM, "firm", TODAY, true);
    expect(t?.source).toBe("template");
    expect(checkEmail(t!, t!.facts).ok).toBe(true);
    expect(t!.body).toContain(t!.facts.strings.waiverOffer);
    expect(templateDraft({ ...FORM, invoiceDate: TODAY, acceptanceDate: TODAY }, "firm", TODAY)).toBeNull();
  });
});

describe("every browser request has a timeout", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("draft, extract and blocker requests all pass an abort signal", async () => {
    const fetch = vi.fn(async () => Response.json({ error: "ai_failed" }, { status: 500 }));
    vi.stubGlobal("fetch", fetch);
    await requestDraft({} as never).catch(() => {});
    await extractInvoice(new File(["x"], "a.pdf", { type: "application/pdf" })).catch(() => {});
    await analyseReply("hello");
    expect(fetch).toHaveBeenCalledTimes(3);
    for (const call of fetch.mock.calls as unknown as [string, RequestInit][]) expect(call[1].signal).toBeInstanceOf(AbortSignal);
  });

  it("a timed-out extraction becomes the network message (the founder can enter details by hand)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new DOMException("timed out", "TimeoutError"))));
    await expect(extractInvoice(new File(["x"], "a.pdf", { type: "application/pdf" }))).rejects.toThrow(COPY.network);
  });
});
