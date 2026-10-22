"use client";

import { useEffect, useRef } from "react";

// Shown if something unexpected throws while rendering. Plain words and a way forward;
// the technical detail stays in the server/browser console and never reaches the screen.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-4 py-12">
      <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">
        Something went wrong
      </h1>
      <p className="text-base">
        Sorry about that. Nothing was saved or sent. You can try again, or start over with your invoice.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="min-h-12 rounded-lg bg-indigo-700 px-5 py-3 text-base font-semibold text-white hover:bg-indigo-800"
        >
          Try again
        </button>
        <button
          type="button"
          // Full reload on purpose: it clears all in-memory state, which is the point of "start over".
          onClick={() => window.location.reload()}
          className="min-h-12 rounded-lg border-2 border-indigo-700 px-5 py-3 text-base font-semibold text-indigo-800 hover:bg-indigo-50 dark:text-indigo-200 dark:hover:bg-indigo-950"
        >
          Start over
        </button>
      </div>
      <p className="text-sm text-zinc-700 dark:text-zinc-300">Not legal advice.</p>
    </main>
  );
}
