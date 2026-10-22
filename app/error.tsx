"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";

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
        <Button size="lg" onClick={reset}>
          Try again
        </Button>
        {/* Full reload on purpose: it clears all in-memory state, which is the point of "start over". */}
        <Button variant="secondary" size="lg" onClick={() => window.location.reload()}>
          Start over
        </Button>
      </div>
      <p className="text-sm text-muted">Not legal advice.</p>
    </main>
  );
}
