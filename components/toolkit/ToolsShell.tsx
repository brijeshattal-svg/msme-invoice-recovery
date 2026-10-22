"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { TOOLKIT, type ToolId } from "@/lib/copy";
import { Help } from "../Help";
import { cx } from "../ui/cx";

const IDS = Object.keys(TOOLKIT.tools) as ToolId[];

/** Header and tool navigation shared by /toolkit, /blockers, /priorities and /cash. */
export function ToolsShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  return (
    <>
      <header className="glass sticky top-0 z-20 border-b border-line">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-5">
          <Link href="/" className="flex items-center gap-2 whitespace-nowrap text-lg font-bold tracking-tight">
            <span aria-hidden className="grid h-7 w-7 place-items-center rounded-lg bg-brand-700 text-xs font-extrabold text-on-brand">
              45
            </span>
            FortyFive
          </Link>
          <Link href="/" className="ml-auto min-h-11 content-center whitespace-nowrap rounded-full px-3 text-sm font-semibold text-link hover:bg-brand-50">
            {TOOLKIT.backToCheck}
          </Link>
          <Help />
        </div>
        <nav aria-label={TOOLKIT.navLabel} className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-4 pb-2">
          <Link
            href="/toolkit"
            aria-current={path === "/toolkit" ? "page" : undefined}
            className={cx(
              "min-h-10 content-center whitespace-nowrap rounded-full px-3 text-sm font-semibold",
              path === "/toolkit" ? "bg-ink text-canvas" : "text-muted hover:bg-brand-50 hover:text-ink",
            )}
          >
            {TOOLKIT.link}
          </Link>
          {IDS.map((id) => {
            const t = TOOLKIT.tools[id];
            const current = path === t.href;
            return (
              <Link
                key={id}
                href={t.href}
                aria-current={current ? "page" : undefined}
                className={cx(
                  "min-h-10 content-center whitespace-nowrap rounded-full px-3 text-sm font-semibold",
                  current ? "bg-ink text-canvas" : "text-muted hover:bg-brand-50 hover:text-ink",
                )}
              >
                {t.nav}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-5 py-10 sm:py-14">
        {children}
        <p className="mt-auto text-center text-sm text-muted">
          {TOOLKIT.memoryNote} {TOOLKIT.notAdvice}
        </p>
      </main>
    </>
  );
}

/** Each tool page's own heading and one-line purpose. */
export function ToolHeading({ id }: { id: ToolId }) {
  const t = TOOLKIT.tools[id];
  return (
    <div className="text-center">
      <h1 className="step-title">{t.title}</h1>
      <p className="mx-auto mt-4 max-w-[30em] text-lg text-muted">{t.intro}</p>
    </div>
  );
}
