"use client";

import { useEffect, useRef, useState } from "react";
import { COPY } from "@/lib/copy";
import type { State } from "@/lib/wizard";
import { Banner } from "./ui/Banner";
import { Button } from "./ui/Button";
import { cx } from "./ui/cx";
import { Disclosure } from "./ui/Disclosure";
import { Spinner } from "./ui/Spinner";

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
      <h2 id="upload-h" ref={heading} tabIndex={-1} className="step-title outline-none">
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
        className={cx(
          "flex flex-col items-center gap-3 rounded-card border-2 border-dashed p-6 text-center",
          over ? "border-brand-700 bg-brand-50" : "border-control",
        )}
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
        <Button size="lg" disabled={busy} onClick={() => input.current?.click()} className="w-full sm:w-auto">
          Upload invoice (PDF or photo)
        </Button>
        <p className="text-sm text-muted">or drop a file here</p>
        <Button variant="link" disabled={busy} onClick={onSample} className="px-3 text-base font-medium">
          Try a sample invoice
        </Button>
      </div>

      <div aria-live="polite" className="min-h-6">
        {busy && (
          <p className="flex items-center gap-2 text-base" role="status">
            <Spinner className="text-brand-700" />
            {COPY.reading}
          </p>
        )}
        {upload === "error" && error && (
          <Banner
            tone="danger"
            size="sm"
            role="alert"
            action={
              <Button variant="link" tone="ink" onClick={onManual} className="text-base font-semibold">
                Enter details manually instead
              </Button>
            }
          >
            <p className="text-base">{error}</p>
          </Banner>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted">{COPY.privacy}</p>
        <Disclosure summary={COPY.dataTitle} className="rounded-card border border-line text-sm" summaryClassName="px-3 py-2.5">
          <ul className="flex list-disc flex-col gap-2 px-3 pb-3 pl-8 text-ink">
            {COPY.dataPoints.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Disclosure>
      </div>
      {upload !== "error" && (
        <Button variant="link" tone="muted" onClick={onManual} disabled={busy} className="self-start text-sm">
          Enter details manually instead
        </Button>
      )}
    </section>
  );
}
