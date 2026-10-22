"use client";

import { useRef } from "react";
import { HELP } from "@/lib/copy";

/**
 * Static FAQ in a native modal <dialog>: showModal() traps focus and Escape closes it.
 * Fixed, reviewed answers only; not a chat (no AI call, nothing logged).
 */
export function Help() {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={opener}
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="min-h-11 whitespace-nowrap rounded-full px-3 text-sm font-semibold text-link hover:bg-brand-50"
      >
        <span className="sm:hidden">Help</span>
        <span className="hidden sm:inline">{HELP.open}</span>
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="help-h"
        onClose={() => opener.current?.focus()}
        // Click on the backdrop (the dialog element itself, outside the panel) closes it.
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="m-auto w-[min(36rem,calc(100%-2rem))] rounded-card bg-surface p-0 text-ink shadow-raised backdrop:bg-black/40"
      >
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
            <h2 id="help-h" className="text-xl font-bold tracking-tight">
              {HELP.title}
            </h2>
            <button
              type="button"
              autoFocus
              onClick={() => dialog.current?.close()}
              className="min-h-11 rounded-full px-3 text-sm font-semibold text-link hover:bg-brand-50"
            >
              {HELP.close}
            </button>
          </div>
          <dl className="flex flex-col gap-5 overflow-y-auto px-5 py-5">
            {HELP.items.map((item) => (
              <div key={item.q}>
                <dt className="font-semibold">{item.q}</dt>
                <dd className="mt-1 text-base text-muted">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </dialog>
    </>
  );
}
