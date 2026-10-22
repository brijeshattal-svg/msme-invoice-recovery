import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// ToolsShell highlights the current page with usePathname (Next.js); fix it for these renders.
const nav = vi.hoisted(() => ({ path: "/blockers" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.path, useRouter: () => ({ push: () => {} }) }));

import BlockersPage from "@/app/(tools)/blockers/page";
import CashPage from "@/app/(tools)/cash/page";
import PrioritiesPage from "@/app/(tools)/priorities/page";
import ToolkitHubPage from "@/app/(tools)/toolkit/page";
import { Stepper } from "@/components/Stepper";
import { ToolkitProvider } from "@/components/toolkit/state";
import { ToolsShell } from "@/components/toolkit/ToolsShell";
import { BLOCKERS_COPY, TOOLKIT } from "@/lib/copy";

const decode = (s: string) => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const page = (path: string, el: React.ReactElement) => {
  nav.path = path;
  return decode(
    renderToStaticMarkup(
      <ToolkitProvider>
        <ToolsShell>{el}</ToolsShell>
      </ToolkitProvider>,
    ),
  );
};

describe("tool pages", () => {
  it.each([
    ["/blockers", "blockers", <BlockersPage key="b" />],
    ["/priorities", "priorities", <PrioritiesPage key="p" />],
    ["/cash", "cash", <CashPage key="c" />],
  ] as const)("%s has its own heading, intro, the shared nav (current page marked) and the notes", (path, id, el) => {
    const html = page(path, el);
    const t = TOOLKIT.tools[id];
    expect(html).toMatch(new RegExp(`<h1[^>]*>${t.title}</h1>`));
    expect(html).toContain(t.intro);
    expect(html).toMatch(new RegExp(`aria-current="page"[^>]*>${t.nav}<|href="${t.href}"[^>]*aria-current="page"`));
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain('href="/"'); // back to the main Quick Check
    expect(html).toContain(TOOLKIT.memoryNote);
    expect(html).toContain(TOOLKIT.notAdvice);
  });

  it("the blocker page keeps its labelled form and shows no result before analysis", () => {
    const html = page("/blockers", <BlockersPage />);
    expect(html).toContain('for="blk-reply"');
    for (const id of ["blk-client", "blk-number", "blk-amount", "blk-due", "blk-context"]) expect(html).toContain(`for="${id}"`);
    expect(html).toContain(BLOCKERS_COPY.analyse);
    expect(html).not.toContain(BLOCKERS_COPY.copy);
  });

  it("the More tools hub links to each tool's own page", () => {
    const html = page("/toolkit", <ToolkitHubPage />);
    expect(html).toMatch(new RegExp(`<h1[^>]*>${TOOLKIT.title}</h1>`));
    for (const t of Object.values(TOOLKIT.tools)) {
      expect(html).toContain(`href="${t.href}"`);
      expect(html).toContain(t.title);
    }
  });
});

describe("Quick Check header", () => {
  it("keeps Quick Check as the main page with a small 'More tools' link", () => {
    const html = renderToStaticMarkup(<Stepper current="upload" />);
    expect(html).toContain('href="/toolkit"');
    expect(html).toContain(TOOLKIT.link);
  });
});
