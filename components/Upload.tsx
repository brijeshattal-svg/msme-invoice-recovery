"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { COPY, PRIVACY, PROCESS } from "@/lib/copy";
import { compute, lastRateChangeDate } from "@/lib/engine";
import { formatDate } from "@/lib/format";
import { SAMPLE_PREVIEW_AS_OF, samplePreviewInput, type State } from "@/lib/wizard";
import { Badge } from "./ui/Badge";
import { CountUp } from "./ui/CountUp";
import { Banner } from "./ui/Banner";
import { Button } from "./ui/Button";
import { cx } from "./ui/cx";
import { Disclosure } from "./ui/Disclosure";
import { Spinner } from "./ui/Spinner";
import { useSlow } from "./ui/useSlow";

type Props = {
  upload: State["upload"];
  error: string | null;
  onFile: (file: File) => void;
  onSample: () => void;
  onManual: () => void;
};

// Layout follows the approved demo (ui-demos/02-apple.html, screen 1).
export function Upload({ upload, error, onFile, onSample, onManual }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const busy = upload === "reading";
  const slow = useSlow(busy);

  useEffect(() => heading.current?.focus(), []);

  const pick = (files: FileList | null) => {
    const f = files?.[0];
    if (f && !busy) onFile(f);
  };

  return (
    <section aria-labelledby="upload-h" className="flex flex-col items-center gap-0 text-center">
      <p className="eyebrow mb-3.5">{COPY.eyebrow}</p>
      <h2 id="upload-h" ref={heading} tabIndex={-1} className="hero-title outline-none">
        {COPY.heroLine1}
        <br />
        <span className="text-brand-700">{COPY.heroLine2}</span>
      </h2>
      <p className="mx-auto mt-5 max-w-[30em] text-lg leading-snug text-muted sm:text-xl">{COPY.heroSub}</p>

      <div className="mt-11 grid w-full gap-4 text-left sm:grid-cols-[1.25fr_1fr]">
      <div className="rounded-hero bg-surface p-3.5 text-center shadow-raised">
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
            "rounded-[20px] border-[1.5px] border-dashed px-5 py-11 transition",
            over ? "scale-[1.01] border-brand-700 bg-brand-50" : "border-control",
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
          <div className="doc-icon" aria-hidden />
          <Button size="lg" disabled={busy} onClick={() => input.current?.click()} className="px-7">
            {COPY.chooseInvoice}
          </Button>
          <p className="mt-3.5 text-[15px] text-muted">{COPY.fileHint}</p>
          <div aria-live="polite">
            {busy && (
              <p className="mt-4 flex items-center justify-center gap-2.5 font-semibold text-brand-700" role="status">
                <Spinner />
                {COPY.reading}
              </p>
            )}
            {slow && <p className="mt-2 text-[15px] text-muted">{COPY.slowReading}</p>}
          </div>
        </div>
      </div>

      <SampleCard busy={busy} onSample={onSample} />
      </div>

      <div className="mt-3.5 flex flex-wrap justify-center gap-x-2">
        <Button variant="link" tone={slow ? "brand" : "muted"} onClick={onManual} className="px-2.5 text-[15px] no-underline hover:underline">
          Enter details manually
        </Button>
      </div>

      {upload === "error" && error && (
        <Banner
          tone="danger"
          size="sm"
          role="alert"
          className="mt-4 w-full text-left"
          action={
            <div className="flex flex-wrap gap-x-4">
              <Button variant="link" tone="ink" onClick={() => input.current?.click()} className="text-base font-semibold">
                Try another file
              </Button>
              <Button variant="link" tone="ink" onClick={onManual} className="text-base font-semibold">
                Enter details manually instead
              </Button>
            </div>
          }
        >
          <p className="text-base">{error}</p>
        </Banner>
      )}

      <p className="mt-5 text-sm text-muted">{COPY.privacy} Not legal advice.</p>

      <section aria-labelledby="process-h" className="mt-16 w-full text-left">
        <h3 id="process-h" className="sr-only">
          {PROCESS.title}
        </h3>
        <ol className="grid gap-6 sm:grid-cols-3">
          {PROCESS.steps.map((s, i) => (
            <li key={s.title}>
              <span aria-hidden className="num mb-2 block font-bold text-brand-700">
                {i + 1}
              </span>
              <span className="mb-1 block text-lg font-semibold tracking-tight">{s.title}</span>
              <span className="block text-base text-muted">{s.body}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-10 w-full rounded-card bg-surface p-6 text-left shadow-card">
        <h3 className="font-semibold">{PROCESS.haveReadyTitle}</h3>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-base text-muted">
          {PROCESS.haveReady.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </div>

      <ul className="mt-12 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted">
        {COPY.trust(formatDate(lastRateChangeDate())).map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>

      <Disclosure summary={COPY.dataTitle} className="mt-8 w-full rounded-card bg-surface text-left text-sm shadow-card" summaryClassName="px-5 py-3">
        <ul className="flex list-disc flex-col gap-2 px-5 pb-4 pl-10 text-ink">
          {COPY.dataPoints.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <p className="px-5 pb-4">
          <Link href="/privacy" className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800">{PRIVACY.link}</Link>
        </p>
      </Disclosure>
    </section>
  );
}

/**
 * Live example above the fold: the engine's real result for the fictional sample invoice, worked out
 * to a fixed date. Labelled "Sample" so it is never mistaken for the founder's own figures.
 */
function SampleCard({ busy, onSample }: { busy: boolean; onSample: () => void }) {
  const r = compute(samplePreviewInput());
  if (r.status !== "overdue") return null;
  return (
    <div className="flex flex-col justify-center rounded-hero bg-brand-50 p-6 text-ink">
      <Badge tone="neutral" className="self-start bg-surface">
        {COPY.sampleTag}
      </Badge>
      <p className="num mt-4 text-[15px] text-muted">
        {COPY.sampleDue(formatDate(r.lastPayableDate))} · <span className="font-semibold text-warn-ink">{COPY.sampleLate(r.daysOverdue)}</span>
      </p>
      <CountUp value={r.totalInterest} durationMs={1100} className="num mt-1 block text-4xl font-bold tracking-tight text-brand-800" />
      <p className="font-semibold">{COPY.sampleOwed}</p>
      <p className="num mt-3 text-sm text-muted">{COPY.sampleNote(formatDate(SAMPLE_PREVIEW_AS_OF))}</p>
      <Button variant="link" disabled={busy} onClick={onSample} className="mt-2 self-start px-0 text-base font-semibold no-underline hover:underline">
        {COPY.trySample} →
      </Button>
    </div>
  );
}
