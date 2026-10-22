import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CashChart } from "@/components/toolkit/CashChart";
import { CashForecast } from "@/components/toolkit/CashForecast";
import { inrPaise } from "@/components/toolkit/money";
import { ToolkitProvider } from "@/components/toolkit/state";
import { CASH_COPY as C } from "@/lib/copy";
import { forecastCash, type CashItem } from "@/lib/forecast/cash";

const decode = (s: string) => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

describe("Cash tab", () => {
  it("starts with labelled cash input, the assumptions, and a prompt instead of a forecast", () => {
    const html = decode(
      renderToStaticMarkup(
        <ToolkitProvider>
          <CashForecast />
        </ToolkitProvider>,
      ),
    );
    expect(html).toContain('for="cf-start"');
    expect(html).toContain(C.enterStart);
    for (const a of C.assumptions) expect(html).toContain(a);
    expect(html).toContain("expected, not guaranteed");
    expect(html).toContain("not financial advice");
    expect(html).toContain(C.prefill(0));
    expect(html).toContain(C.prefillNone);
  });
});

describe("CashChart", () => {
  const today = "2026-10-22";
  const item = (rupees: number, date: string, mayBeLate = false): CashItem => ({ id: date + rupees, label: "", amountPaise: rupees * 100, date, mayBeLate });
  const input = { today, startingCashPaise: 50000_00, collections: [item(60000, "2026-10-28", true)], expenses: [item(80000, "2026-11-01")] };

  it("is an image with a text summary; the late line only appears in the late scenario, dashed", () => {
    const expected = forecastCash(input, "expected");
    const only = renderToStaticMarkup(<CashChart expected={expected} late={null} />);
    expect(only).toContain('role="img"');
    expect(only).toContain(C.chartTitle);
    expect(only).toContain("lowest ₹30,000.00 on 1 Nov 2026");
    expect(only).not.toContain("fill-warn-bg"); // never negative: no below-zero band
    expect(only).not.toContain("stroke-dasharray=\"7 5\"");

    const both = decode(renderToStaticMarkup(<CashChart expected={expected} late={forecastCash(input, "late")} />));
    expect(both).toContain('stroke-dasharray="7 5"');
    expect(both).toContain(C.legendLate);
    expect(both).toContain("lowest -₹30,000.00 on 1 Nov 2026");
    expect(both).toContain("fill-warn-bg"); // the late line dips below zero
  });
});

describe("inrPaise", () => {
  it("formats negatives with the sign before the rupee symbol", () => {
    expect(inrPaise(-3000000)).toBe("-₹30,000.00");
    expect(inrPaise(5)).toBe("₹0.05");
    expect(inrPaise(0)).toBe("₹0.00");
  });
});
