"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PRIVACY, TOOLKIT, type ToolId } from "@/lib/copy";
import { Help } from "../Help";
import { cx } from "../ui/cx";

// Simple line icons (24px grid, currentColor). Decorative: every link also has a text label.
const ICONS: Record<ToolId | "check", ReactNode> = {
  dashboard: <path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" />,
  blockers: <path d="M12 3l9 16H3zM12 10v4M12 17h.01" />,
  priorities: <path d="M5 6h14M5 12h10M5 18h6" />,
  cash: <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />,
  reports: <path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7" />,
  check: <path d="M12 5v14M5 12h14" />,
};

function Icon({ name }: { name: ToolId | "check" }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  );
}

function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={cx("flex items-center gap-2 whitespace-nowrap text-lg font-bold tracking-tight", light && "text-white")}>
      <span aria-hidden className="grid h-7 w-7 place-items-center rounded-lg bg-brand-700 text-xs font-extrabold text-on-brand">
        45
      </span>
      FortyFive
    </Link>
  );
}

/**
 * The workspace for the side tools: navy sidebar with grouped sections on desktop, a bottom tab bar
 * on phones, and a top bar, in the same light, green design as Quick Check. Quick Check (the main product, at /) is
 * always one click away and is not part of this shell.
 */
export function ToolsShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const isCurrent = (id: ToolId) => path === TOOLKIT.tools[id].href;
  const allIds = TOOLKIT.sections.flatMap((s) => s.items) as ToolId[];

  return (
    <div className="flex min-h-screen w-full text-ink">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-5 text-ink lg:flex" aria-label={TOOLKIT.workspace}>
        <div className="px-2">
          <Logo />
        </div>
        <Link
          href="/check"
          className="mt-6 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-3 text-sm font-semibold text-on-brand hover:bg-brand-800"
        >
          <Icon name="check" />
          {TOOLKIT.newCheck}
        </Link>
        <nav aria-label={TOOLKIT.navLabel} className="mt-6 flex flex-col gap-5 overflow-y-auto">
          {TOOLKIT.sections.map((section, i) => (
            <div key={i}>
              {section.label && <p className="mb-1.5 px-3 section-label">{section.label}</p>}
              <ul className="flex flex-col gap-0.5">
                {(section.items as readonly ToolId[]).map((id) => (
                  <li key={id}>
                    <Link
                      href={TOOLKIT.tools[id].href}
                      aria-current={isCurrent(id) ? "page" : undefined}
                      className={cx(
                        "flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors",
                        isCurrent(id) ? "bg-brand-50 text-brand-800" : "text-muted hover:bg-brand-50 hover:text-ink",
                      )}
                    >
                      <Icon name={id} />
                      {TOOLKIT.tools[id].nav}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <p className="mt-auto px-2 pt-4 text-xs leading-5 text-muted">{TOOLKIT.memoryNote}</p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-20 border-b border-line">
          <div className="flex h-14 items-center gap-3 px-5">
            <div className="lg:hidden">
              <Logo />
            </div>
            <span className="hidden rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted sm:inline-block lg:ml-0">
              {TOOLKIT.memoryPill}
            </span>
            <Link href="/check" className="ml-auto min-h-11 content-center whitespace-nowrap rounded-full px-3 text-sm font-semibold text-link hover:bg-brand-50">
              {TOOLKIT.backToCheck}
            </Link>
            <Help />
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-5 pb-28 pt-8 lg:px-8 lg:pb-12">
          {children}
          <p className="mt-auto pt-4 text-center text-sm text-muted">
            {TOOLKIT.notAdvice} <Link href="/privacy" className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800">{PRIVACY.link}</Link>
          </p>
        </main>
      </div>

      {/* Phones and tablets: bottom tab bar instead of the sidebar. */}
      <nav aria-label={TOOLKIT.navLabel} className="glass fixed inset-x-0 bottom-0 z-30 border-t border-line pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="mx-auto flex max-w-xl justify-between px-2">
          {allIds.map((id) => (
            <li key={id} className="flex-1">
              <Link
                href={TOOLKIT.tools[id].href}
                aria-current={isCurrent(id) ? "page" : undefined}
                className={cx(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold",
                  isCurrent(id) ? "text-brand-700" : "text-muted hover:text-ink",
                )}
              >
                <Icon name={id} />
                {TOOLKIT.tools[id].nav}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

/** Each workspace page's own heading and one-line purpose. */
export function ToolHeading({ id }: { id: ToolId }) {
  const t = TOOLKIT.tools[id];
  return (
    <div>
      <h1 className="text-[28px] font-bold leading-tight tracking-tight sm:text-[32px]">{t.title}</h1>
      <p className="mt-1.5 max-w-[42em] text-[17px] text-muted">{t.intro}</p>
    </div>
  );
}
