import { ApiError } from "@google/genai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock("@/lib/ai/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/client")>()),
  getModels: () => ["test-model"],
  getClient: () => ({ models: { generateContent } }),
}));

import { POST } from "@/app/api/draft/route";
import { ToneScreen } from "@/components/Tone";
import { checkEmail } from "@/lib/email/check";
import { REPLY_BY_DAYS, factsForTone } from "@/lib/email/facts";
import { getDraft, payloadFromForm, type DraftFetcher } from "@/lib/email/flow";
import { followUpPlan } from "@/lib/email/followup";
import { buildDraftPrompt, DRAFT_SYSTEM_PROMPT, feedbackFrom } from "@/lib/email/prompt";
import { buildTemplate } from "@/lib/email/template";
import { TONE_IDS, TONES } from "@/lib/email/tones";
import { addDays } from "@/lib/engine";
import { initialState, reducer } from "@/lib/wizard";
import { todayIST } from "@/lib/today";
import { FORM, TODAY, factsFor } from "./helpers";

const base = factsFor(); // 22 Oct 2026, 60 days overdue; replyByDate = 29 Oct 2026
const withWords = (email: { subject: string; body: string }, add: string) => ({ ...email, body: `${email.body}\n\n${add}` });

describe("Gentle check-in: no interest at all", () => {
  const f = factsForTone(base, "checkin");
  const email = buildTemplate(f, "checkin");

  it("does not require, and does not contain, the interest figure, total due or basis sentence", () => {
    expect(f.required).not.toContain("interest");
    expect(f.required).not.toContain("totalDue");
    for (const k of ["interest", "totalDue", "interestBasis"] as const) expect(email.body).not.toContain(base.strings[k]);
    expect(`${email.subject} ${email.body}`).not.toMatch(/\binterest\b|section 16|msmed/i);
    expect(email.body).toContain(base.strings.amount);
    expect(email.body).toContain(base.strings.daysOverdue);
    expect(checkEmail(email, f).ok).toBe(true);
  });

  it("asks for the payment date and whether anything is holding it up, with no deadline or concession", () => {
    expect(email.body).toMatch(/when we can expect the payment/);
    expect(email.body).toMatch(/holding it up/);
    expect(email.body).not.toMatch(/waive|discount|deadline/i);
  });

  it("the checker rejects each way an AI draft could slip interest in", () => {
    const withFigure = checkEmail(withWords(email, `Interest so far is ${base.strings.interest}.`), f);
    expect(withFigure.ok).toBe(false);
    expect(withFigure.forbidden.join(" ")).toContain("the interest figure (not used in this email)");

    expect(checkEmail(withWords(email, `The total now due is ${base.strings.totalDue}.`), f).forbidden.join(" ")).toContain("the total now due");
    expect(checkEmail(withWords(email, base.strings.interestBasis), f).forbidden.join(" ")).toContain("the interest basis sentence");

    const word = checkEmail(withWords(email, "We may also charge some interest later."), f);
    expect(word.ok).toBe(false);
    expect(word.forbidden).toContain('the word "interest" (not used in this email)');
  });

  it("a client whose own name contains 'interest' does not fail the check", () => {
    const named = { ...base, strings: { ...base.strings, clientName: "Interest Global Pvt Ltd" } };
    const nf = factsForTone(named, "checkin");
    expect(checkEmail(buildTemplate(nf, "checkin"), nf).ok).toBe(true);
  });

  it("other tones still require and show the interest", () => {
    const friendly = factsForTone(base, "friendly");
    expect(friendly.required).toEqual(expect.arrayContaining(["interest", "totalDue"]));
    expect(buildTemplate(friendly, "friendly").body).toContain(base.strings.interest);
    expect(friendly.avoid).toEqual([]);
  });

  it("is the gentlest step of the follow-up ladder", () => {
    expect(followUpPlan(TODAY, "checkin").map((s) => s.tone)).toEqual(["checkin", "friendly", "lastReminder"]);
  });

  it("has a card with guidance for the model that forbids interest, and a digit-free preview", () => {
    expect(TONES.checkin.label).toBe("Gentle check-in");
    expect(TONES.checkin.style).toMatch(/Do NOT mention interest/);
    expect(TONES.checkin.preview).not.toMatch(/\p{Nd}/u);
  });
});

describe("Interest-waiver offer", () => {
  const offer = `If payment reaches us by ${base.strings.replyByDate}, I will gladly waive the interest accrued so far, ${base.strings.interest}.`;

  it("is one fixed approved sentence built in code from the reply-by date and the interest figure", () => {
    expect(base.strings.replyByDate).toBe("29 Oct 2026");
    expect(REPLY_BY_DAYS).toBe(7);
    const f = factsForTone(base, "friendly", { waiver: true });
    expect(f.strings.waiverOffer).toBe(offer);
    expect(f.required).toContain("waiverOffer");
    expect(f.avoidWords).toEqual([]);
  });

  it.each(TONE_IDS.filter((t) => t !== "checkin"))("%s: the template contains the offer verbatim, and passes the check", (tone) => {
    const f = factsForTone(base, tone, { waiver: true });
    const email = buildTemplate(f, tone);
    expect(email.body).toContain(offer);
    expect(checkEmail(email, f)).toMatchObject({ ok: true, missing: [], strayNumbers: [], misplaced: [] });
    // The offer comes before the closing request, and only once.
    expect(email.body.split(offer)).toHaveLength(2);
  });

  it("an AI draft that leaves the offer out is rejected as missing it", () => {
    const f = factsForTone(base, "friendly", { waiver: true });
    const without = buildTemplate(factsForTone(base, "friendly"), "friendly");
    const r = checkEmail(without, f);
    expect(r.ok).toBe(false);
    expect(r.missing).toContain("waiverOffer");
  });

  it("an AI draft that changes the date or amount in the offer is rejected", () => {
    const f = factsForTone(base, "friendly", { waiver: true });
    const ok = buildTemplate(f, "friendly");
    const forged = { ...ok, body: ok.body.replace("by 29 Oct 2026", "by 15 Nov 2026") };
    expect(checkEmail(forged, f).ok).toBe(false);
    const forgedAmount = { ...ok, body: ok.body.replace(`accrued so far, ${base.strings.interest}`, "accrued so far, ₹100.00") };
    expect(checkEmail(forgedAmount, f).ok).toBe(false);
  });

  it("without the switch, any waiver wording is rejected, so the AI cannot invent a concession", () => {
    const f = factsForTone(base, "friendly");
    const email = buildTemplate(f, "friendly");
    expect(email.body).not.toMatch(/waive/i);
    for (const line of ["I am happy to waive the interest.", "We could offer a waiver if you pay soon.", "The late fee is waived."]) {
      const r = checkEmail(withWords(email, line), f);
      expect(r.ok, line).toBe(false);
      expect(r.forbidden.join(" "), line).toContain("(not used in this email)");
    }
  });

  it("is never applied to the gentle check-in, even if the switch is on", () => {
    const f = factsForTone(base, "checkin", { waiver: true });
    expect(f.strings.waiverOffer).toBe("");
    expect(f.required).not.toContain("waiverOffer");
    expect(buildTemplate(f, "checkin").body).not.toMatch(/waive/i);
  });

  it("is not offered when there is no reply-by date (facts built without today's date)", () => {
    const noDate = { ...base, strings: { ...base.strings, replyByDate: "" } };
    const f = factsForTone(noDate, "friendly", { waiver: true });
    expect(f.strings.waiverOffer).toBe("");
    expect(f.required).not.toContain("waiverOffer");
    expect(f.avoidWords).toContain("waive");
  });

  it("the tone screen shows an unticked switch, with the founder-decision warning; hides it for the check-in", () => {
    const html = (tone: "friendly" | "checkin", waiver = false) =>
      renderToStaticMarkup(<ToneScreen tone={tone} onSelect={() => {}} onDraft={() => {}} onBack={() => {}} waiver={waiver} onWaiver={() => {}} />).replace(/&#x27;/g, "'");
    const on = html("friendly");
    expect(on).toContain('type="checkbox"');
    expect(on).not.toMatch(/<input type="checkbox"[^>]*checked/);
    expect(on).toContain("Offer to waive the interest if they pay within 7 days");
    expect(on).toContain("Your decision, not ours");
    expect(html("friendly", true)).toMatch(/<input type="checkbox"[^>]*checked/);
    const off = html("checkin");
    expect(off).not.toContain('type="checkbox"');
    expect(off).toContain("doesn't mention interest");
    // The original screen (no handler) is unchanged.
    expect(renderToStaticMarkup(<ToneScreen tone="friendly" onSelect={() => {}} onDraft={() => {}} onBack={() => {}} />)).not.toContain('type="checkbox"');
  });

  it("is a wizard choice that is off by default and cleared on reset", () => {
    expect(initialState.waiver).toBe(false);
    const on = reducer(initialState, { type: "setWaiver", on: true });
    expect(on.waiver).toBe(true);
    expect(reducer(on, { type: "setTone", tone: "firm" }).waiver).toBe(true);
    expect(reducer(on, { type: "reset" }).waiver).toBe(false);
  });
});

describe("prompt and redraft feedback", () => {
  it("tells the model what is required and what is not allowed", () => {
    const checkin = buildDraftPrompt(factsForTone(base, "checkin"), "checkin");
    expect(checkin).toContain("NOT ALLOWED");
    expect(checkin).toContain(`- the interest figure: ${base.strings.interest}`);
    expect(checkin).toContain('- the word "interest"');
    expect(checkin).not.toMatch(/REQUIRED[\s\S]*- interest:/);

    const waiver = buildDraftPrompt(factsForTone(base, "friendly", { waiver: true }), "friendly");
    expect(waiver).toContain("- waiverOffer: If payment reaches us by 29 Oct 2026");
    expect(waiver).not.toContain('- the word "waive"');

    const plain = buildDraftPrompt(factsForTone(base, "friendly"), "friendly");
    expect(plain).toContain('- the word "waive"');
  });

  it("the system prompt covers the offer and the leave-out rule", () => {
    expect(DRAFT_SYSTEM_PROMPT).toMatch(/If REQUIRED lists waiverOffer, include that sentence verbatim/);
    expect(DRAFT_SYSTEM_PROMPT).toMatch(/Never offer a waiver, discount, extension or any other concession otherwise/);
    expect(DRAFT_SYSTEM_PROMPT).toMatch(/if they are not, the email must not mention interest at all/);
  });

  it("redraft feedback names what to remove, and keeps the legal-words message separate", () => {
    const f = factsForTone(base, "checkin");
    const email = withWords(buildTemplate(f, "checkin"), `Interest so far is ${base.strings.interest}. We will go to court.`);
    const msg = feedbackFrom(checkEmail(email, f), f);
    expect(msg).toContain("must leave out: the interest figure (not used in this email)");
    expect(msg).toContain("words that are not allowed: court");
    expect(msg).not.toContain("words that are not allowed: the interest");
  });
});

describe("the journey carries the choice through", () => {
  it("getDraft sends waiver only when chosen, and rejects an AI draft without the offer", async () => {
    const f = factsForTone(base, "friendly", { waiver: true });
    const without = buildTemplate(factsForTone(base, "friendly"), "friendly");
    const withOffer = buildTemplate(f, "friendly");

    const calls: unknown[] = [];
    const missing: DraftFetcher = async (p) => (calls.push(p), { ...without, source: "ai" });
    const d = await getDraft(FORM, "friendly", TODAY, missing, true);
    expect(d?.source).toBe("template"); // AI draft lacked the offer, so the standard draft (which has it) is used
    expect(d?.body).toContain(`I will gladly waive the interest accrued so far, ${base.strings.interest}`);
    expect(calls[0]).toMatchObject({ tone: "friendly", waiver: true });

    const good: DraftFetcher = async () => ({ ...withOffer, source: "ai" });
    expect((await getDraft(FORM, "friendly", TODAY, good, true))?.source).toBe("ai");

    expect(payloadFromForm(FORM, "friendly")).not.toHaveProperty("waiver");
    expect(payloadFromForm(FORM, "friendly", true)).toMatchObject({ waiver: true });
  });

  it("an AI check-in that mentions interest falls back to the interest-free standard draft", async () => {
    const f = factsForTone(base, "checkin");
    const leaky: DraftFetcher = async () => ({ ...withWords(buildTemplate(f, "checkin"), `Interest so far is ${base.strings.interest}.`), source: "ai" });
    const d = await getDraft(FORM, "checkin", TODAY, leaky);
    expect(d?.source).toBe("template");
    expect(d?.body).not.toMatch(/\binterest\b/i);
  });
});

describe("POST /api/draft with the new options", () => {
  const today = todayIST();
  const invoiceDate = addDays(today, -75);
  const body = (over: Record<string, unknown> = {}) => ({
    clientName: "Northwind Test Industries Pvt Ltd",
    invoiceNumber: "BDS/2026/0142",
    invoiceDate,
    amount: 236000,
    acceptanceDate: invoiceDate,
    agreementDays: null,
    udyamDate: "2024-06-01",
    tone: "friendly",
    ...over,
  });
  const form = { ...FORM, invoiceDate, acceptanceDate: invoiceDate, amount: "236000", udyamDate: "2024-06-01", clientName: "Northwind Test Industries Pvt Ltd", invoiceNumber: "BDS/2026/0142" };
  const reply = (email: { subject: string; body: string }) => ({ text: JSON.stringify(email), candidates: [{ finishReason: "STOP" }] });
  const call = async (b: unknown) => {
    const res = await POST(
      new Request("http://localhost/api/draft", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` }, body: JSON.stringify(b) }),
    );
    return { status: res.status, json: (await res.json()) as { subject: string; body: string; source: string } };
  };
  // Braces matter: returning the mock would make vitest call it as a cleanup hook.
  beforeEach(() => {
    generateContent.mockReset();
  });

  it("accepts an AI check-in without interest", async () => {
    const f = factsForTone(factsFor(form, today), "checkin");
    generateContent.mockResolvedValueOnce(reply(buildTemplate(f, "checkin")));
    const { status, json } = await call(body({ tone: "checkin" }));
    expect(status).toBe(200);
    expect(json.source).toBe("ai");
    expect(json.body).not.toMatch(/\binterest\b/i);
  });

  it("rejects an AI check-in that mentions interest, redrafts with the 'leave out' feedback, then uses the template", async () => {
    const f = factsForTone(factsFor(form, today), "checkin");
    const leaky = withWords(buildTemplate(f, "checkin"), `Interest so far is ${factsFor(form, today).strings.interest}.`);
    generateContent.mockResolvedValue(reply(leaky));
    const { json } = await call(body({ tone: "checkin", waiver: true }));
    expect(json.source).toBe("template");
    expect(json.body).not.toMatch(/\binterest\b|waive/i);
    const prompts = generateContent.mock.calls.map((c) => c[0].contents[0].parts[0].text as string);
    expect(prompts.length).toBeGreaterThan(1);
    expect(prompts[1]).toContain("must leave out");
  });

  it("with waiver: true, requires the offer; accepts a draft that has it", async () => {
    const f = factsForTone(factsFor(form, today), "friendly", { waiver: true });
    generateContent.mockResolvedValueOnce(reply(buildTemplate(f, "friendly")));
    const { json } = await call(body({ waiver: true }));
    expect(json.source).toBe("ai");
    expect(json.body).toContain("I will gladly waive the interest accrued so far");
    expect(generateContent.mock.calls[0][0].contents[0].parts[0].text).toContain("- waiverOffer:");
  });

  it("without the switch, a draft that invents a waiver is rejected", async () => {
    const f = factsForTone(factsFor(form, today), "friendly");
    generateContent.mockResolvedValue(reply(withWords(buildTemplate(f, "friendly"), "I am happy to waive the interest if you pay quickly.")));
    const { json } = await call(body());
    expect(json.source).toBe("template");
    expect(json.body).not.toMatch(/waive/i);
  });

  it("rejects a non-boolean waiver value", async () => {
    const { status } = await call(body({ waiver: "yes" }));
    expect(status).toBe(400);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("when the AI quota is used up the template is served (never a dead end), with the offer when chosen", async () => {
    generateContent.mockRejectedValue(new ApiError({ message: "quota", status: 429 }));
    const { json } = await call(body({ waiver: true }));
    expect(json.source).toBe("template");
    expect(json.body).toContain("I will gladly waive the interest accrued so far");
  });
});
