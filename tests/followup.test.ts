import { describe, expect, it } from "vitest";
import { checkEmail } from "@/lib/email/check";
import { factsForTone } from "@/lib/email/facts";
import { factsFromForm } from "@/lib/email/flow";
import { followUpPlan, NEXT_TONE, whatsappText } from "@/lib/email/followup";
import { buildTemplate } from "@/lib/email/template";
import { TONE_IDS, TONES } from "@/lib/email/tones";
import { FORM, TODAY, factsFor } from "./helpers";

describe("WhatsApp text", () => {
  const facts = factsFor();
  const text = whatsappText(facts);

  it("uses only approved strings: every digit passes the number check", () => {
    expect(checkEmail({ subject: "", body: text }, facts)).toEqual({ ok: true, missing: [], strayNumbers: [], leakedNames: [], forbidden: [], misplaced: [] });
  });

  it("is short, hedged and has one placeholder", () => {
    expect(text.length).toBeLessThan(500);
    expect(text).toContain("may be owed");
    expect([...text.matchAll(/\[[^\]]+\]/g)].map((m) => m[0])).toEqual(["[Your name]"]);
  });

  it("is rejected like an email if a figure is changed", () => {
    expect(checkEmail({ subject: "", body: text.replace(facts.strings.totalDue, "₹2,42,532.00") }, facts).ok).toBe(false);
  });
});

describe("follow-up plan", () => {
  it("suggests day 0, 7 and 15 from today, getting one step firmer, ending at the last reminder", () => {
    expect(followUpPlan(TODAY, "friendly")).toEqual([
      { day: 0, sendOn: "2026-10-22", tone: "friendly" },
      { day: 7, sendOn: "2026-10-29", tone: "firm" },
      { day: 15, sendOn: "2026-11-06", tone: "lastReminder" },
    ]);
    expect(followUpPlan(TODAY, "firm").map((s) => s.tone)).toEqual(["firm", "firm", "lastReminder"]);
    expect(followUpPlan(TODAY, "finance").map((s) => s.tone)).toEqual(["finance", "formal", "lastReminder"]);
  });

  it("every tone has a next step and the ladder ends at the last reminder", () => {
    for (const t of TONE_IDS) expect(TONE_IDS).toContain(NEXT_TONE[t]);
    expect(NEXT_TONE.lastReminder).toBe("lastReminder");
  });

  it("each later reminder, drafted for its send date, passes the number check", () => {
    for (const chosen of TONE_IDS) {
      for (const step of followUpPlan(TODAY, chosen).slice(1)) {
        const base = factsFromForm(FORM, step.sendOn);
        expect(base, step.sendOn).not.toBeNull();
        const facts = factsForTone(base!, step.tone);
        const email = buildTemplate(facts, step.tone);
        expect(checkEmail(email, facts).ok, `${chosen} -> ${step.tone} on ${step.sendOn}`).toBe(true);
      }
    }
  });

  it("the day-15 reminder asks for a reply 7 days after its own send date", () => {
    const facts = factsForTone(factsFromForm(FORM, "2026-11-06")!, "lastReminder");
    expect(facts.strings.replyByDate).toBe("13 Nov 2026");
    expect(buildTemplate(facts, "lastReminder").body).toContain("by 13 Nov 2026");
  });
});

describe("tone cards", () => {
  it("every preview is free of digits and forbidden words", () => {
    for (const t of TONE_IDS) {
      expect(TONES[t].preview, t).not.toMatch(/\p{Nd}/u);
      expect(`${TONES[t].preview} ${TONES[t].style}`, t).not.toMatch(/\b(lawyers?|courts?|councils?|portal|notices?|complaints?|legal action)\b/i);
    }
  });
});

describe("F2 screens and helpers", () => {
  it("mailto carries a plausible To address and drops anything else", async () => {
    const { buildMailto } = await import("@/lib/email/mailto");
    expect(buildMailto("s", "b", "ap@client.co.in").href).toMatch(/^mailto:ap@client\.co\.in\?subject=/);
    expect(buildMailto("s", "b", "a@b.c?cc=x@y.z").href).toMatch(/^mailto:\?subject=/);
    expect(buildMailto("s", "b").href).toMatch(/^mailto:\?subject=/);
  });

  it("marks confident AI-read fields, and clears the mark when the founder edits one", async () => {
    const { initialState, reducer, sampleExtraction } = await import("@/lib/wizard");
    const data = { ...sampleExtraction(), confidence: { ...sampleExtraction().confidence, amountTotal: "low" as const } };
    let s = reducer(initialState, { type: "extracted", data });
    expect(s.read).toEqual({ clientName: true, invoiceNumber: true, invoiceDate: true });
    expect(s.flagged).toEqual({ amount: "check" });
    s = reducer(s, { type: "edit", field: "clientName", value: "Acme" });
    expect(s.read.clientName).toBeUndefined();
  });

  it("the landing sample card shows the engine's real figures for the sample invoice", async () => {
    const { compute } = await import("@/lib/engine");
    const { samplePreviewInput } = await import("@/lib/wizard");
    const r = compute(samplePreviewInput());
    expect(r).toMatchObject({ status: "overdue", lastPayableDate: "2026-08-23", daysOverdue: 60, totalInterest: 6532.03 });
  });
});
