import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Stepper } from "@/components/Stepper";
import { Toolkit } from "@/components/toolkit/Toolkit";
import { BLOCKERS_COPY, TOOLKIT } from "@/lib/copy";

const decode = (s: string) => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

describe("/toolkit page", () => {
  const html = decode(renderToStaticMarkup(<Toolkit />));

  it("has three labelled tabs with Blockers selected, and the memory-only note", () => {
    expect(html.match(/role="tab"/g)).toHaveLength(3);
    expect(html).toMatch(/id="tab-blockers"[^>]*aria-selected="true"|aria-selected="true"[^>]*id="tab-blockers"/);
    for (const t of Object.values(TOOLKIT.tabs)) expect(html).toContain(t);
    expect(html).toContain(TOOLKIT.memoryNote);
    expect(html).toContain(TOOLKIT.notAdvice);
  });

  it("the blocker form has a labelled reply box and labelled optional details", () => {
    expect(html).toContain('for="blk-reply"');
    expect(html).toContain(BLOCKERS_COPY.replyLabel);
    for (const id of ["blk-client", "blk-number", "blk-amount", "blk-due", "blk-context"]) expect(html).toContain(`for="${id}"`);
    expect(html).toContain(BLOCKERS_COPY.analyse);
  });

  it("shows no result, draft or send controls before anything is analysed", () => {
    expect(html).not.toContain(BLOCKERS_COPY.copy);
    expect(html).not.toContain(BLOCKERS_COPY.resultTitle);
  });
});

describe("Quick Check header", () => {
  it("links to the toolkit", () => {
    const html = renderToStaticMarkup(<Stepper current="upload" />);
    expect(html).toContain('href="/toolkit"');
  });
});
