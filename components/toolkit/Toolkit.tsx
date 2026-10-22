"use client";

import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";
import { TOOLKIT } from "@/lib/copy";
import { Help } from "../Help";
import { cx } from "../ui/cx";
import { BlockerAssistant } from "./BlockerAssistant";

type Tab = "blockers" | "priorities" | "cash";
const TABS: Tab[] = ["blockers", "priorities", "cash"];

/** /toolkit: three tools in tabs. All state lives in memory (SPRINT_PLAN.md section 1.2). */
export function Toolkit() {
  const [tab, setTab] = useState<Tab>("blockers");
  const refs = useRef<Record<Tab, HTMLButtonElement | null>>({ blockers: null, priorities: null, cash: null });

  // Arrow keys move between tabs (WAI-ARIA tabs pattern).
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = TABS.indexOf(tab);
    const next = e.key === "ArrowRight" ? TABS[(i + 1) % TABS.length] : e.key === "ArrowLeft" ? TABS[(i + TABS.length - 1) % TABS.length] : null;
    if (!next) return;
    e.preventDefault();
    setTab(next);
    refs.current[next]?.focus();
  };

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
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-5 py-10 sm:py-14">
        <div className="text-center">
          <h1 className="step-title">{TOOLKIT.title}</h1>
          <p className="mx-auto mt-4 max-w-[30em] text-lg text-muted">{TOOLKIT.intro}</p>
          <p className="mt-2 text-sm text-muted">{TOOLKIT.memoryNote}</p>
        </div>

        <div role="tablist" aria-label={TOOLKIT.title} className="mx-auto flex w-fit gap-[3px] rounded-xl bg-line p-[3px]">
          {TABS.map((t) => (
            <button
              key={t}
              ref={(el) => {
                refs.current[t] = el;
              }}
              id={`tab-${t}`}
              role="tab"
              type="button"
              aria-selected={tab === t}
              aria-controls={`panel-${t}`}
              tabIndex={tab === t ? 0 : -1}
              onClick={() => setTab(t)}
              onKeyDown={onKey}
              className={cx(
                "min-h-10 min-w-[92px] rounded-[9px] px-4 text-[15px] font-semibold transition",
                tab === t ? "bg-surface shadow-[0_1px_3px_rgb(0_0_0/0.18)]" : "text-muted hover:text-ink",
              )}
            >
              {TOOLKIT.tabs[t]}
            </button>
          ))}
        </div>

        {/* Panels stay mounted so each tool keeps its in-memory state while you switch tabs. */}
        <div id="panel-blockers" role="tabpanel" aria-labelledby="tab-blockers" hidden={tab !== "blockers"}>
          <BlockerAssistant />
        </div>
        <div id="panel-priorities" role="tabpanel" aria-labelledby="tab-priorities" hidden={tab !== "priorities"}>
          <p className="rounded-hero bg-surface p-6 text-center text-muted shadow-raised">{TOOLKIT.comingNext}</p>
        </div>
        <div id="panel-cash" role="tabpanel" aria-labelledby="tab-cash" hidden={tab !== "cash"}>
          <p className="rounded-hero bg-surface p-6 text-center text-muted shadow-raised">{TOOLKIT.comingNext}</p>
        </div>

        <p className="mt-auto text-center text-sm text-muted">{TOOLKIT.notAdvice}</p>
      </main>
    </>
  );
}
