import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// ToolsShell highlights the current page with usePathname (Next.js); fix it for these renders.
const nav = vi.hoisted(() => ({ path: "/blockers" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.path, useRouter: () => ({ push: () => {} }) }));

import BlockersPage from "@/app/(tools)/blockers/page";
import CashPage from "@/app/(tools)/cash/page";
import PrioritiesPage from "@/app/(tools)/priorities/page";
import ReportsPage from "@/app/(tools)/reports/page";
import DashboardPage from "@/app/(tools)/toolkit/page";
import { Stepper } from "@/components/Stepper";
import { sampleInvoices, ToolkitProvider } from "@/components/toolkit/state";
import { ToolsShell } from "@/components/toolkit/ToolsShell";
import { BLOCKERS_COPY, DASHBOARD_COPY, REPORTS_COPY, TOOLKIT } from "@/lib/copy";
import type { ToolkitInvoice } from "@/lib/intel/priority";
import { todayIST } from "@/lib/today";

const decode = (s: string) => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const page = (path: string, el: React.ReactElement, initial: ToolkitInvoice[] = []) => {
  nav.path = path;
  return decode(
    renderToStaticMarkup(
      <ToolkitProvider initial={initial}>
        <ToolsShell>{el}</ToolsShell>
      </ToolkitProvider>,
    ),
  );
};

describe("workspace pages", () => {
  it.each([
    ["/toolkit", "dashboard", <DashboardPage key="d" />],
    ["/blockers", "blockers", <BlockersPage key="b" />],
    ["/priorities", "priorities", <PrioritiesPage key="p" />],
    ["/cash", "cash", <CashPage key="c" />],
    ["/reports", "reports", <ReportsPage key="r" />],
  ] as const)("%s: one h1 with its own title, its intro, current page marked, back to Quick Check", (path, id, el) => {
    const html = page(path, el);
    const t = TOOLKIT.tools[id];
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toMatch(new RegExp(`<h1[^>]*>${t.title}</h1>`));
    expect(html).toContain(t.intro);
    // Marked in both the sidebar and the phone tab bar.
    const current = html.match(/<a [^>]*aria-current="page"[^>]*>/g) ?? [];
    expect(current).toHaveLength(2);
    for (const tag of current) expect(tag).toContain(`href="${t.href}"`);
    expect(html).toContain('href="/"');
    expect(html).toContain(TOOLKIT.newCheck);
    expect(html).toContain(TOOLKIT.memoryNote);
  });

  it("the sidebar groups the tools under Collect, Plan and Reports", () => {
    const html = page("/toolkit", <DashboardPage />);
    for (const s of TOOLKIT.sections) if (s.label) expect(html).toContain(`>${s.label}</p>`);
    for (const t of Object.values(TOOLKIT.tools)) expect(html).toContain(`href="${t.href}"`);
  });

  it("the blocker page keeps its labelled form and shows no result before analysis", () => {
    const html = page("/blockers", <BlockersPage />);
    expect(html).toContain('for="blk-reply"');
    expect(html).toContain(BLOCKERS_COPY.analyse);
    expect(html).not.toContain(BLOCKERS_COPY.copy);
  });
});

describe("dashboard", () => {
  it("empty: teaches the next step", () => {
    const html = page("/toolkit", <DashboardPage />);
    expect(html).toContain(DASHBOARD_COPY.emptyTitle);
    expect(html).toContain("Load fictional sample");
  });

  it("with the fictional sample: banner, overdue hero, KPIs, priorities and a cash set-up prompt", () => {
    const html = page("/toolkit", <DashboardPage />, sampleInvoices(todayIST()));
    expect(html).toContain(DASHBOARD_COPY.sampleBanner);
    expect(html).toContain(DASHBOARD_COPY.heroLabel);
    expect(html).toContain("4 invoices overdue");
    expect(html).toContain(DASHBOARD_COPY.prioritiesTitle);
    expect(html).toContain("Orbitline Logistics Pvt Ltd (sample)"); // chase first
    expect(html).toContain('href="/blockers"');
    expect(html).toContain(DASHBOARD_COPY.cashSetup);
    expect(html).toContain(DASHBOARD_COPY.notAdvice);
  });
});

describe("reports", () => {
  it("empty, then a table with buckets, totals and the CSV button", () => {
    expect(page("/reports", <ReportsPage />)).toContain(REPORTS_COPY.empty);
    const html = page("/reports", <ReportsPage />, sampleInvoices(todayIST()));
    expect(html).toContain(REPORTS_COPY.download);
    expect(html).toContain(">Over 90 days</th>");
    expect(html).toContain("<tfoot>");
    expect(html).toContain(REPORTS_COPY.sampleBanner);
  });
});

describe("Quick Check header", () => {
  it("keeps Quick Check as the main page with a small 'More tools' link", () => {
    const html = renderToStaticMarkup(<Stepper current="upload" />);
    expect(html).toContain('href="/toolkit"');
    expect(html).toContain(TOOLKIT.link);
  });
});
