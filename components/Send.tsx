"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { EMAIL } from "@/lib/copy";
import { checkEmail } from "@/lib/email/check";
import type { Facts } from "@/lib/email/facts";
import { buildMailto, emailAsText } from "@/lib/email/mailto";
import type { DraftState } from "@/lib/wizard";
import { Badge } from "./ui/Badge";
import { Banner } from "./ui/Banner";
import { Button } from "./ui/Button";
import { cx } from "./ui/cx";
import { inputClass } from "./ui/Field";
import { Skeleton } from "./ui/Skeleton";
import { Spinner } from "./ui/Spinner";

type Props = {
  draft: DraftState;
  facts: Facts | null;
  onEdit: (field: "subject" | "body", value: string) => void;
  onChangeTone: () => void;
  onBack: () => void;
};

const HAS_PLACEHOLDER = /\[[^\]\n]{1,60}\]/;

/** Mirror layer: same text as the textarea, invisible, with [placeholders] highlighted behind it. */
function Highlight({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]\n]{1,60}\])/);
  return (
    <>
      {parts.map((p, i) =>
        /^\[[^\]\n]{1,60}\]$/.test(p) ? (
          <mark key={i} className="rounded bg-warn-bg text-transparent ring-1 ring-warn-ink">
            {p}
          </mark>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
      {"​"}
    </>
  );
}

export function SendScreen({ draft, facts, onEdit, onChangeTone, onBack }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => heading.current?.focus(), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const ready = draft.status === "ready";
  const hasPlaceholders = ready && (HAS_PLACEHOLDER.test(draft.body) || HAS_PLACEHOLDER.test(draft.subject));

  // After an edit the generated text's guarantee is gone: re-check in the browser, warn but never block.
  const recheck = ready && draft.edited && facts ? checkEmail({ subject: draft.subject, body: draft.body }, facts) : null;
  const strays = recheck?.strayNumbers ?? [];

  const fullText = emailAsText(draft.subject, draft.body);

  async function copyText(): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(fullText);
      return true;
    } catch {
      // Some browsers and in-app webviews refuse the async clipboard API: fall back to the old way.
      const ta = document.createElement("textarea");
      ta.value = fullText;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;";
      document.body.appendChild(ta);
      ta.select();
      try {
        return document.execCommand("copy");
      } catch {
        return false;
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  async function onCopy() {
    const ok = await copyText();
    setToast(ok ? (hasPlaceholders ? EMAIL.copiedWithPlaceholders : EMAIL.copied) : EMAIL.copyFailed);
  }

  async function onOpen() {
    const { href, truncated } = buildMailto(draft.subject, draft.body);
    if (truncated) setToast((await copyText()) ? EMAIL.draftLong : EMAIL.copyFailed);
    else if (hasPlaceholders) setToast(EMAIL.placeholderWarning);
    window.location.href = href;
    // A mailto: link does nothing visible when the device has no mail app. If this tab still has
    // focus a moment later, nothing took over, so say what to do instead.
    setTimeout(() => {
      if (document.visibilityState === "visible" && document.hasFocus()) setToast(EMAIL.noMailApp);
    }, 1500);
  }

  return (
    <section aria-labelledby="send-h" className="flex flex-col gap-5">
      <h2 id="send-h" ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">
        {EMAIL.sendTitle}
      </h2>

      {draft.status === "loading" && (
        <div role="status" aria-live="polite" className="flex flex-col gap-4">
          <p className="flex items-center gap-2 text-base">
            <Spinner className="text-brand-700" />
            {EMAIL.writing}
          </p>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-12" />
            <Skeleton className="h-72" />
          </div>
        </div>
      )}

      {draft.status === "idle" && (
        <Banner tone="warn" role="alert">
          <p className="text-base">{EMAIL.notOverdue}</p>
        </Banner>
      )}

      {ready && (
        <>
          {draft.edited ? (
            <p className="text-sm font-medium text-ink">{EMAIL.edited}</p>
          ) : draft.source === "ai" ? (
            <Badge tone="success" size="md" className="self-start">
              <span aria-hidden>✓ </span>
              {EMAIL.checkedChip}
            </Badge>
          ) : (
            <Badge tone="neutral" size="md" className="self-start">
              {EMAIL.templateChip}
            </Badge>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="e-subject" className="text-base font-semibold">
              {EMAIL.subjectLabel}
            </label>
            <input id="e-subject" value={draft.subject} onChange={(e) => onEdit("subject", e.target.value)} className={cx(inputClass, "border-control")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="e-body" className="text-base font-semibold">
              {EMAIL.bodyLabel}
            </label>
            <div className="relative rounded-input border-2 border-control bg-surface focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-600">
              <div aria-hidden className="min-h-72 whitespace-pre-wrap break-words p-3 text-base leading-7 text-transparent">
                <Highlight text={draft.body} />
              </div>
              <textarea
                id="e-body"
                value={draft.body}
                onChange={(e) => onEdit("body", e.target.value)}
                spellCheck
                className="absolute inset-0 h-full w-full resize-none overflow-hidden bg-transparent p-3 text-base leading-7 text-ink outline-none"
              />
            </div>
          </div>

          {hasPlaceholders && (
            <Banner tone="warn" size="sm" role="note">
              <p>{EMAIL.placeholderWarning}</p>
            </Banner>
          )}
          {strays.length > 0 && (
            <Banner tone="warn" size="sm" role="alert">
              <p>{EMAIL.strayWarning(strays.join(", "))}</p>
            </Banner>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" onClick={onCopy} className="flex-1">
              {EMAIL.copy}
            </Button>
            <Button variant="secondary" size="lg" onClick={onOpen} className="flex-1">
              {EMAIL.open}
            </Button>
          </div>
          <p role="status" aria-live="polite" className="min-h-6 text-sm font-medium text-link">
            {toast}
          </p>
        </>
      )}

      <div className="flex flex-wrap gap-x-6 gap-y-1">
        <Button variant="link" tone="ink" onClick={onChangeTone} className="text-base">
          {EMAIL.changeTone}
        </Button>
        <Button variant="link" tone="ink" onClick={onBack} className="text-base">
          {EMAIL.back}
        </Button>
      </div>
      <p className="text-sm text-muted">{EMAIL.disclaimer}</p>
    </section>
  );
}
