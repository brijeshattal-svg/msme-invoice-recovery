"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { EMAIL } from "@/lib/copy";
import { checkEmail } from "@/lib/email/check";
import type { Facts } from "@/lib/email/facts";
import { buildMailto, emailAsText } from "@/lib/email/mailto";
import type { DraftState } from "@/lib/wizard";

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
          <mark key={i} className="rounded bg-amber-300/70 text-transparent dark:bg-amber-500/50">
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

const btnPrimary =
  "min-h-12 flex-1 rounded-lg bg-indigo-700 px-5 py-3 text-base font-semibold text-white hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700";
const btnSecondary =
  "min-h-12 flex-1 rounded-lg border-2 border-indigo-700 px-5 py-3 text-base font-semibold text-indigo-800 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 dark:text-indigo-200 dark:hover:bg-indigo-950";

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
  }

  return (
    <section aria-labelledby="send-h" className="flex flex-col gap-5">
      <h2 id="send-h" ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">
        {EMAIL.sendTitle}
      </h2>

      {draft.status === "loading" && (
        <div role="status" aria-live="polite" className="flex flex-col gap-4">
          <p className="flex items-center gap-2 text-base">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-700 border-t-transparent" aria-hidden />
            {EMAIL.writing}
          </p>
          <div className="flex animate-pulse flex-col gap-3" aria-hidden>
            <div className="h-12 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-72 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
      )}

      {draft.status === "idle" && (
        <p role="alert" className="rounded-lg border border-amber-500 bg-amber-50 p-4 text-base text-amber-950 dark:bg-amber-950 dark:text-amber-50">
          {EMAIL.notOverdue}
        </p>
      )}

      {ready && (
        <>
          {draft.edited ? (
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{EMAIL.edited}</p>
          ) : draft.source === "ai" ? (
            <p className="self-start rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-900 dark:bg-green-900 dark:text-green-100">
              <span aria-hidden>✓ </span>
              {EMAIL.checkedChip}
            </p>
          ) : (
            <p className="self-start rounded-full bg-zinc-200 px-3 py-1 text-sm font-semibold text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100">
              {EMAIL.templateChip}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="e-subject" className="text-base font-semibold">
              {EMAIL.subjectLabel}
            </label>
            <input
              id="e-subject"
              value={draft.subject}
              onChange={(e) => onEdit("subject", e.target.value)}
              className="min-h-12 w-full rounded-lg border-2 border-zinc-400 bg-white px-3 py-2 text-base text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="e-body" className="text-base font-semibold">
              {EMAIL.bodyLabel}
            </label>
            <div className="relative rounded-lg border-2 border-zinc-400 bg-white focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-indigo-700 dark:border-zinc-600 dark:bg-zinc-900">
              <div aria-hidden className="min-h-72 whitespace-pre-wrap break-words p-3 text-base leading-7 text-transparent">
                <Highlight text={draft.body} />
              </div>
              <textarea
                id="e-body"
                value={draft.body}
                onChange={(e) => onEdit("body", e.target.value)}
                spellCheck
                className="absolute inset-0 h-full w-full resize-none overflow-hidden bg-transparent p-3 text-base leading-7 text-zinc-900 outline-none dark:text-zinc-50"
              />
            </div>
          </div>

          {hasPlaceholders && (
            <p role="note" className="rounded-lg border border-amber-500 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-50">
              {EMAIL.placeholderWarning}
            </p>
          )}
          {strays.length > 0 && (
            <p role="alert" className="rounded-lg border border-amber-500 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-50">
              {EMAIL.strayWarning(strays.join(", "))}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onCopy} className={btnPrimary}>
              {EMAIL.copy}
            </button>
            <button type="button" onClick={onOpen} className={btnSecondary}>
              {EMAIL.open}
            </button>
          </div>
          <p role="status" aria-live="polite" className="min-h-6 text-sm font-medium text-green-800 dark:text-green-300">
            {toast}
          </p>
        </>
      )}

      <div className="flex flex-wrap gap-x-6 gap-y-1">
        <button type="button" onClick={onChangeTone} className="min-h-11 text-base underline underline-offset-4">
          {EMAIL.changeTone}
        </button>
        <button type="button" onClick={onBack} className="min-h-11 text-base underline underline-offset-4">
          {EMAIL.back}
        </button>
      </div>
      <p className="text-sm text-zinc-700 dark:text-zinc-300">{EMAIL.disclaimer}</p>
    </section>
  );
}
