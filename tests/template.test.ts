import { describe, expect, it } from "vitest";
import { checkEmail } from "@/lib/email/check";
import { factsForTone } from "@/lib/email/facts";
import { buildTemplate } from "@/lib/email/template";
import { TONE_IDS } from "@/lib/email/tones";
import { FORM, factsFor } from "./helpers";

const FORBIDDEN = /lawyer|legal action|court|council|portal|sue |notice|threat/i;

const scenarios = {
  "60 days overdue": factsFor(),
  "1 day overdue": factsFor({ ...FORM, invoiceDate: "2026-10-06", acceptanceDate: "2026-10-06" }, "2026-10-22"),
  "name and invoice number containing digits": (() => {
    const base = factsFor();
    return { ...base, strings: { ...base.strings, clientName: "Acme 2 Pvt Ltd", invoiceNumber: "A-77/2026" } };
  })(),
};

describe("deterministic templates", () => {
  for (const [name, facts] of Object.entries(scenarios)) {
    describe(name, () => {
      it.each(TONE_IDS)("%s tone always passes the number check (under its own tone rules)", (tone) => {
        const toned = factsForTone(facts, tone);
        const email = buildTemplate(toned, tone);
        expect(checkEmail(email, toned)).toEqual({ ok: true, missing: [], strayNumbers: [], leakedNames: [], forbidden: [], misplaced: [] });
      });

      it.each(TONE_IDS)("%s tone with the waiver offer on also passes", (tone) => {
        const toned = factsForTone(facts, tone, { waiver: true });
        const email = buildTemplate(toned, tone);
        expect(checkEmail(email, toned).ok).toBe(true);
      });
    });
  }

  it("uses every required fact verbatim in every tone", () => {
    const facts = scenarios["60 days overdue"];
    for (const tone of TONE_IDS) {
      const toned = factsForTone(facts, tone);
      const { body } = buildTemplate(toned, tone);
      for (const k of toned.required) expect(body, `${tone}/${k}`).toContain(toned.strings[k]);
    }
  });

  it("all six tones read visibly differently", () => {
    const facts = scenarios["60 days overdue"];
    const all = TONE_IDS.map((t) => buildTemplate(facts, t));
    expect(new Set(all.map((e) => e.subject)).size).toBe(TONE_IDS.length);
    expect(new Set(all.map((e) => e.body)).size).toBe(TONE_IDS.length);
    const [a, b, c] = (["friendly", "firm", "formal"] as const).map((t) => buildTemplate(facts, t));
    expect(new Set([a.subject, b.subject, c.subject]).size).toBe(3);
    expect(new Set([a.body, b.body, c.body]).size).toBe(3);
    expect(a.body).toContain("Hi ");
    expect(b.body).toContain("follow");
    expect(c.body).toContain("Yours faithfully");
  });

  it("opens with the client's own tax cost, hedged, and names both Acts", () => {
    for (const tone of TONE_IDS) {
      const { body } = buildTemplate(scenarios["60 days overdue"], tone);
      expect(body, tone).toContain("Section 43B(h) of the Income-tax Act, 1961");
      expect(body, tone).toContain("Section 37(2)(g) of the Income-tax Act, 2025");
      expect(body, tone).toContain("MSME Form-1");
      expect(body, tone).toMatch(/as we understand it/);
      expect(body, tone).toMatch(/may not be able to claim/);
      // the heads-up comes before the money facts (the invoice amount is in every tone, even the check-in)
      expect(body.indexOf("Section 43B(h)"), tone).toBeLessThan(body.indexOf(scenarios["60 days overdue"].strings.amount));
    }
  });

  it("never threatens or mentions lawyers, courts or portals", () => {
    for (const tone of TONE_IDS) {
      const { subject, body } = buildTemplate(scenarios["60 days overdue"], tone);
      expect(`${subject}\n${body}`, tone).not.toMatch(FORBIDDEN);
    }
  });

  it("signs off with the literal placeholders, and no others", () => {
    for (const tone of TONE_IDS) {
      const { body } = buildTemplate(scenarios["60 days overdue"], tone);
      expect(body).toContain("[Your name]");
      expect(body).toContain("[Your business]");
      expect([...body.matchAll(/\[[^\]]+\]/g)].map((m) => m[0]).sort()).toEqual(["[Your business]", "[Your name]"]);
    }
  });

  it("last reminder states the reply-by date (today + 7, an approved fact) and still passes the check", () => {
    const facts = factsForTone(scenarios["60 days overdue"], "lastReminder");
    expect(facts.strings.replyByDate).toBe("29 Oct 2026"); // TODAY 22 Oct 2026 + 7
    expect(facts.required).toContain("replyByDate");
    const email = buildTemplate(facts, "lastReminder");
    expect(email.body).toContain("by 29 Oct 2026");
    expect(checkEmail(email, facts).ok).toBe(true);
    // the other tones neither need nor use it
    expect(factsForTone(scenarios["60 days overdue"], "friendly").required).not.toContain("replyByDate");
    expect(buildTemplate(facts, "friendly").body).not.toContain("29 Oct 2026");
  });

  it("an invented reply-by date is still rejected", () => {
    const facts = factsForTone(scenarios["60 days overdue"], "lastReminder");
    const email = buildTemplate(facts, "lastReminder");
    const forged = { ...email, body: email.body.replace("29 Oct 2026", "30 Oct 2026") };
    expect(checkEmail(forged, facts).ok).toBe(false);
  });

  it("states the reply-by without digits (all but the last reminder)", () => {
    for (const tone of TONE_IDS.filter((t) => t !== "lastReminder")) {
      const { body } = buildTemplate(scenarios["60 days overdue"], tone);
      expect(body, tone).toMatch(/this week|end of (this|next) week/);
    }
  });

  it("uses singular 'day' for one day overdue", () => {
    const facts = scenarios["1 day overdue"];
    expect(facts.strings.daysOverdue).toBe("1 day");
    expect(buildTemplate(facts, "friendly").body).toContain("1 day overdue");
  });
});
