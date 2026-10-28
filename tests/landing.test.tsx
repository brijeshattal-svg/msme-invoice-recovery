import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LandingPage from "@/app/page";
import { LANDING } from "@/lib/copy";
import { compute } from "@/lib/engine";
import { formatINR } from "@/lib/format";
import { landingSample } from "@/lib/landing";
import { samplePreviewInput } from "@/lib/wizard";

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");
const html = renderToStaticMarkup(<LandingPage />);

describe("landing page figures come from the engine, never from typing", () => {
  it("the sample is the same one the Quick Check landing card shows", () => {
    const { r, input } = landingSample();
    expect(input).toEqual(samplePreviewInput());
    expect(r).toEqual(compute(samplePreviewInput()));
    expect(r).toMatchObject({ daysOverdue: 60, totalInterest: 6532.03, totalDue: 242532.03 });
  });

  it("shows the engine's interest, total and days late", () => {
    const { r } = landingSample();
    const t = text(html);
    expect(t).toContain(`${r.daysOverdue} days late`);
    expect(t).toContain(formatINR(r.totalDue));
    expect(t).toContain(formatINR(r.totalInterest)); // the feature tile; the hero counts up to it on screen
  });

  it("the month-by-month tile adds up to the interest shown", () => {
    const { r } = landingSample();
    const shown = r.rows.slice(0, 3);
    expect(shown.reduce((s, m) => s + m.interest, 0)).toBeCloseTo(r.totalInterest, 2);
    for (const m of shown) expect(text(html)).toContain(formatINR(m.interest));
  });

  it("the part-payment tile is the engine's: ₹1,00,000 received incl. TDS, interest runs on the unpaid ₹1,36,000", () => {
    const { paid } = landingSample();
    expect(paid).toMatchObject({ paidSoFar: 100000, tdsSoFar: 10000, unpaidAmount: 136000 });
    const t = text(html);
    expect(t).toContain("−₹1,00,000.00");
    expect(t).toContain("TDS ₹10,000.00");
    expect(t).toContain("₹1,36,000.00");
  });
});

describe("landing page structure and honesty", () => {
  it("one h1, an h2 per section, and a sample label so it can't be mistaken for the visitor's own figures", () => {
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html.match(/<h2/g)).toHaveLength(6); // the dark statement band is a statement, not a heading
    expect(text(html)).toContain(LANDING.hero.sampleTag);
    expect(html).toContain(`aria-label="${LANDING.hero.sampleLabel.replace(/'/g, "&#x27;")}"`);
  });

  it("every action goes to Quick Check at /check; Privacy and tools are linked", () => {
    const hrefs = [...html.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs.filter((h) => h === "/check").length).toBeGreaterThanOrEqual(4);
    for (const h of ["/privacy", "/toolkit", "#how", "#features", "#faq"]) expect(hrefs).toContain(h);
  });

  it("says what it won't do, and has no invented proof, statistics or promises", () => {
    const t = text(html);
    expect(t).toContain("isn't legal advice");
    expect(t).toContain("never sends anything");
    expect(t).toContain("Not legal advice");
    expect(t).not.toMatch(/testimonial|trusted by|guarantee|will pay|always paid|\b\d+% /i);
    expect(t).not.toMatch(/\b(sue|lawsuit|court order|legal action)\b/i);
  });

  it("never claims every invoice gets 45 days (REDESIGN.md accuracy guardrail)", () => {
    const t = text(html);
    expect(t).toContain("within 15 days of accepting the work, or within the days agreed in writing, never more than 45");
    expect(t).not.toMatch(/(had|has|have|gets?|given) 45 days/i);
  });

  it("the FAQ reuses the in-app help answers, so there is one source", () => {
    expect(text(html)).toContain("Under Section 15 of the MSMED Act, 2006");
    expect(html.match(/<details/g)!.length).toBeGreaterThanOrEqual(6);
  });

  it("is static: no data, forms or file inputs on the landing", () => {
    expect(html).not.toMatch(/<form|<input|type="file"/);
  });
});
