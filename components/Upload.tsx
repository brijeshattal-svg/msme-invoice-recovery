"use client";

import { useEffect, useRef, useState } from "react";
import { COPY } from "@/lib/copy";
import type { State } from "@/lib/wizard";

type Props = {
  upload: State["upload"];
  error: string | null;
  onFile: (file: File) => void;
  onSample: () => void;
  onManual: () => void;
};

export function Upload({ upload, error, onFile, onSample, onManual }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const busy = upload === "reading";

  useEffect(() => heading.current?.focus(), []);

  const pick = (files: FileList | null) => {
    const f = files?.[0];
    if (f && !busy) onFile(f);
  };

  return (
    <section aria-labelledby="upload-h" className="flex flex-col gap-6">
      <h2 id="upload-h" ref={heading} tabIndex={-1} className="text-2xl font-semibold leading-tight outline-none sm:text-3xl">
        {COPY.headline}
      </h2>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          pick(e.dataTransfer.files);
        }}
        className={[
          "flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-6 text-center",
          over ? "border-indigo-700 bg-indigo-50 dark:bg-indigo-950" : "border-zinc-500",
        ].join(" ")}
      >
        <input
          ref={input}
          id="invoice-file"
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          // Reached through the visible button below; keep it out of the tab order so keyboard
          // and screen-reader users don't meet an unlabelled duplicate control.
          aria-label="Upload invoice (PDF or photo)"
          tabIndex={-1}
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = ""; // allow re-picking the same file after an error
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="min-h-12 w-full rounded-lg bg-indigo-700 px-5 py-3 text-base font-semibold text-white hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 disabled:opacity-60 sm:w-auto"
        >
          Upload invoice (PDF or photo)
        </button>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">or drop a file here</p>
        <button
          type="button"
          disabled={busy}
          onClick={onSample}
          className="min-h-11 min-w-11 rounded px-3 text-base font-medium text-indigo-800 underline underline-offset-4 hover:text-indigo-950 focus-visible:outline-2 focus-visible:outline-indigo-700 disabled:opacity-60 dark:text-indigo-300"
        >
          Try a sample invoice
        </button>
      </div>

      <div aria-live="polite" className="min-h-6">
        {busy && (
          <p className="flex items-center gap-2 text-base" role="status">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-700 border-t-transparent" aria-hidden />
            {COPY.reading}
          </p>
        )}
        {upload === "error" && error && (
          <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-base text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
            <p>{error}</p>
            <button type="button" onClick={onManual} className="mt-2 min-h-11 min-w-11 font-semibold underline underline-offset-4">
              Enter details manually instead
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{COPY.privacy}</p>
        <details className="rounded-lg border border-zinc-300 text-sm dark:border-zinc-700">
          <summary className="min-h-11 min-w-11 cursor-pointer px-3 py-2.5 font-semibold">{COPY.dataTitle}</summary>
          <ul className="flex list-disc flex-col gap-2 px-3 pb-3 pl-8 text-zinc-800 dark:text-zinc-200">
            {COPY.dataPoints.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </details>
      </div>
      {upload !== "error" && (
        <button
          type="button"
          onClick={onManual}
          disabled={busy}
          className="min-h-11 min-w-11 self-start text-sm text-zinc-700 underline underline-offset-4 dark:text-zinc-300"
        >
          Enter details manually instead
        </button>
      )}
    </section>
  );
}
