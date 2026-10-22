import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PriorityList } from "@/components/toolkit/PriorityList";
import { clearHandOff, handOffInvoice, peekHandOff, sampleInvoices, ToolkitProvider } from "@/components/toolkit/state";
import { PRIORITIES_COPY as C } from "@/lib/copy";
import { rankClients } from "@/lib/intel/priority";
import { todayIST } from "@/lib/today";

const decode = (s: string) => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const render = (initial: Parameters<typeof ToolkitProvider>[0]["initial"] = []) =>
  decode(
    renderToStaticMarkup(
      <ToolkitProvider initial={initial}>
        <PriorityList />
      </ToolkitProvider>,
    ),
  );

describe("Priorities tab", () => {
  it("empty state teaches the next step and offers the fictional sample", () => {
    const html = render();
    expect(html).toContain(C.empty);
    expect(html).toContain(C.loadSample);
    expect(html).not.toContain(C.sampleBanner);
    for (const id of ["pr-client", "pr-number", "pr-amount", "pr-invoiceDate", "pr-acceptanceDate", "pr-agreementDays", "pr-promisedDate"]) {
      expect(html).toContain(`for="${id}"`);
    }
  });

  it("the sample is labelled fictional everywhere: banner, every row, every client name", () => {
    const today = todayIST();
    const sample = sampleInvoices(today);
    expect(sample.every((i) => i.sample && /\(sample\)$/.test(i.client))).toBe(true);
    const html = render(sample);
    expect(html).toContain(C.sampleBanner);
    expect(html.match(/Fictional sample<\/span>/g)).toHaveLength(sample.length);
  });

  it("the sample shows a useful mix: 3 ranked clients, a missed promise, and a client with nothing overdue", () => {
    const today = todayIST();
    const { ranked, clear } = rankClients(sampleInvoices(today), today);
    expect(ranked.length).toBeGreaterThanOrEqual(3);
    expect(ranked.some((c) => c.missedPromises > 0)).toBe(true);
    expect(ranked[0].client).toBe("Orbitline Logistics Pvt Ltd (sample)");
    expect(clear).toEqual(["Kestrel Foods Ltd (sample)"]);
    const html = render(sampleInvoices(today));
    expect(html).toContain(C.rankTitle);
    expect(html).toContain("Not enough history yet");
    expect(html).toContain(C.whyTitle);
    expect(html).toContain("1 missed promise");
  });
});

describe("Quick Check hand-off", () => {
  it("is held in memory until cleared, and reading does not clear it", () => {
    clearHandOff();
    expect(peekHandOff()).toBeNull();
    const inv = sampleInvoices("2026-10-22")[0];
    handOffInvoice(inv);
    expect(peekHandOff()).toBe(inv);
    expect(peekHandOff()).toBe(inv);
    clearHandOff();
    expect(peekHandOff()).toBeNull();
  });
});
