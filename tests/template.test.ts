import { describe, expect, it } from "vitest";
import { checkEmail } from "@/lib/email/check";
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
      it.each(TONE_IDS)("%s tone always passes the number check", (tone) => {
        const email = buildTemplate(facts, tone);
        expect(checkEmail(email, facts)).toEqual({ ok: true, missing: [], strayNumbers: [], leakedNames: [], forbidden: [] });
      });
    });
  }

  it("uses every required fact verbatim in every tone", () => {
    const facts = scenarios["60 days overdue"];
    for (const tone of TONE_IDS) {
      const { body } = buildTemplate(facts, tone);
      for (const k of facts.required) expect(body, `${tone}/${k}`).toContain(facts.strings[k]);
    }
  });

  it("all three tones read visibly differently", () => {
    const facts = scenarios["60 days overdue"];
    const [a, b, c] = TONE_IDS.map((t) => buildTemplate(facts, t));
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
      // the heads-up comes before the money facts
      expect(body.indexOf("Section 43B(h)"), tone).toBeLessThan(body.indexOf(scenarios["60 days overdue"].strings.totalDue));
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

  it("states the reply-by without digits", () => {
    for (const tone of TONE_IDS) {
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
