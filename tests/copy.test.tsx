import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Confirm } from "@/components/Confirm";
import { COPY, EMAIL, STANDING } from "@/lib/copy";
import { initialState } from "@/lib/wizard";

const decoded = (s: string) => s.replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("legal wording (CLAUDE.md rule 7: say 'may be owed', never claim certainty)", () => {
  it("no headline states the interest as certainly owed", () => {
    expect(STANDING.interestSuffix).toBe("interest may be owed so far");
    expect(COPY.headline).toMatch(/may be owed/);
    expect(COPY.headline).not.toMatch(/you're owed/);
  });

  it("the page description does not claim a legal conclusion", () => {
    const layout = readFileSync("app/layout.tsx", "utf8");
    expect(layout).not.toMatch(/legally late/);
    expect(layout).toMatch(/may be late/);
  });

  it("the submit button and the privacy line are accurate", () => {
    const confirm = readFileSync("components/Confirm.tsx", "utf8");
    expect(confirm).toContain("Check what I may be owed");
    expect(confirm).not.toMatch(/Check what I&apos;m owed/);
    expect(COPY.privacy).toContain("This app doesn't save it");
  });

  it("says the rules cover micro and small enterprises only (no medium or trader field is built)", () => {
    expect(STANDING.figuresNote).toMatch(/micro and small enterprises only/);
    expect(STANDING.figuresNote).toMatch(/not verified/);
  });
});

describe("first-time-user hints", () => {
  const html = decoded(renderToStaticMarkup(<Confirm state={initialState} dispatch={() => {}} onSubmit={() => {}} />));

  it("tells people where to find the Udyam date", () => {
    expect(html).toContain("Find it on your Udyam registration certificate");
  });

  it("explains that terms printed on an invoice are not a written agreement, and what No means", () => {
    expect(html).toContain("Choose Yes only if you and your client agreed the days in writing");
    expect(html).toContain("the 15-day rule applies");
  });

  it("has copy for a device with no mail app", () => {
    expect(EMAIL.noMailApp).toMatch(/Use Copy email/);
  });
});
