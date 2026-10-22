"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { EMAIL } from "@/lib/copy";
import { factsForTone } from "@/lib/email/facts";
import { followUpPlan, whatsappText } from "@/lib/email/followup";
import { buildTemplate } from "@/lib/email/template";
import { TONES, type Tone } from "@/lib/email/tones";
import { formatDate } from "@/lib/format";
import { checkEmail } from "@/lib/email/check";
import type { Facts } from "@/lib/email/facts";
import { buildMailto, emailAsText } from "@/lib/email/mailto";
import type { DraftState } from "@/lib/wizard";
import { Banner } from "./ui/Banner";
import { Button } from "./ui/Button";
import { Skeleton } from "./ui/Skeleton";
import { Spinner } from "./ui/Spinner";

type Props = {
  draft: DraftState;
  facts: Facts | null;
  /** For the follow-up plan: the chosen tone, today (IST) and facts worked out for a later date. */
  tone?: Tone;
  today?: string;
  factsOn?: (date: string) => Facts | null;
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

export function SendScreen({ draft, facts, tone, today, factsOn, onEdit, onChangeTone, onBack }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Held in this tab's memory only, like everything else (CLAUDE.md rule 3).
  const [to, setTo] = useState("");
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

  async function copyText(text: string = fullText): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Some browsers and in-app webviews refuse the async clipboard API: fall back to the old way.
      const ta = document.createElement("textarea");
      ta.value = text;
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
    const { href, truncated } = buildMailto(draft.subject, draft.body, to);
    if (truncated) setToast((await copyText()) ? EMAIL.draftLong : EMAIL.copyFailed);
    else if (hasPlaceholders) setToast(EMAIL.placeholderWarning);
    window.location.assign(href);
    // A mailto: link does nothing visible when the device has no mail app. If this tab still has
    // focus a moment later, nothing took over, so say what to do instead.
    setTimeout(() => {
      if (document.visibilityState === "visible" && document.hasFocus()) setToast(EMAIL.noMailApp);
    }, 1500);
  }

  async function onWhatsApp() {
    if (!facts) return;
    setToast((await copyText(whatsappText(facts))) ? EMAIL.copiedWhatsApp : EMAIL.copyFailed);
  }

  // Later reminders: the template for that tone, with figures worked out for the send date.
  async function copyReminder(sendOn: string, t: Tone) {
    const base = factsOn?.(sendOn);
    if (!base) return;
    const e = buildTemplate(factsForTone(base, t), t);
    setToast((await copyText(emailAsText(e.subject, e.body))) ? EMAIL.copiedReminder(formatDate(sendOn)) : EMAIL.copyFailed);
  }

  const plan = tone && today ? followUpPlan(today, tone) : [];

  return (
    <section aria-labelledby="send-h" className="flex flex-col gap-5 pb-28">
      <div className="text-center">
        <h2 id="send-h" ref={heading} tabIndex={-1} className="step-title outline-none">
          {EMAIL.sendTitle}
        </h2>
        <p className="mt-4 text-lg text-muted">{EMAIL.sendSub}</p>
      </div>

      {draft.status === "loading" && (
        <div role="status" aria-live="polite" className="flex flex-col gap-4">
          <p className="flex items-center justify-center gap-2 text-base font-semibold text-brand-700">
            <Spinner />
            {EMAIL.writing}
          </p>
          <div className="flex flex-col gap-4 rounded-hero bg-surface p-6 shadow-raised">
            <Skeleton className="h-5" />
            <Skeleton className="h-5 w-3/5" />
            <Skeleton className="h-5" />
            <Skeleton className="h-5 w-2/5" />
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
          <div className="text-center">
            {draft.edited ? (
              <p className="text-sm font-medium text-ink">{EMAIL.edited}</p>
            ) : draft.source === "ai" ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-[15px] font-semibold text-brand-800">
                <span aria-hidden>✓</span>
                {EMAIL.checkedChip}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-line px-4 py-2 text-[15px] font-semibold text-ink">{EMAIL.templateChip}</span>
            )}
          </div>

          <div className="overflow-hidden rounded-hero bg-surface shadow-raised">
            <div className="mail-dots flex items-center gap-2 border-b border-line bg-[color-mix(in_srgb,var(--line)_40%,transparent)] px-[18px] py-3.5" aria-hidden>
              <i />
              <i />
              <i />
              <span className="ml-2.5 text-sm text-muted">{EMAIL.newMessage}</span>
            </div>
            <div className="flex items-center gap-3 border-b border-line px-[22px] py-1.5">
              <label htmlFor="e-to" className="w-[60px] text-[15px] text-muted">
                {EMAIL.toLabel}
              </label>
              <input
                id="e-to"
                type="email"
                inputMode="email"
                autoComplete="off"
                placeholder={EMAIL.toPlaceholder}
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="min-h-[46px] flex-1 bg-transparent text-[17px] text-ink outline-none placeholder:text-muted"
              />
            </div>
            <div className="flex items-center gap-3 border-b border-line px-[22px] py-1.5">
              <label htmlFor="e-subject" className="w-[60px] text-[15px] text-muted">
                {EMAIL.subjectLabel}
              </label>
              <input
                id="e-subject"
                value={draft.subject}
                onChange={(e) => onEdit("subject", e.target.value)}
                className="min-h-[46px] flex-1 bg-transparent text-[17px] font-semibold text-ink outline-none"
              />
            </div>
            <label htmlFor="e-body" className="sr-only">
              {EMAIL.bodyLabel}
            </label>
            <div className="relative focus-within:bg-[color-mix(in_srgb,var(--brand-50)_35%,transparent)]">
              <div aria-hidden className="min-h-[420px] whitespace-pre-wrap break-words p-[22px] text-[17px] leading-[1.65] text-transparent">
                <Highlight text={draft.body} />
              </div>
              <textarea
                id="e-body"
                value={draft.body}
                onChange={(e) => onEdit("body", e.target.value)}
                spellCheck
                className="absolute inset-0 h-full w-full resize-none overflow-hidden bg-transparent p-[22px] text-[17px] leading-[1.65] text-ink outline-none"
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

          {plan.length > 0 && (
            <section aria-labelledby="plan-h" className="rounded-hero bg-surface px-6 py-5 shadow-raised">
              <h3 id="plan-h" className="text-lg font-semibold">
                {EMAIL.planTitle}
              </h3>
              <p className="mt-1 text-sm text-muted">{EMAIL.planHelp}</p>
              <ol className="mt-3 flex flex-col">
                {plan.map((step) => (
                  <li key={step.day} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line py-3 last:border-b-0">
                    <div>
                      <p className="num font-semibold">
                        {step.day === 0 ? EMAIL.planToday : formatDate(step.sendOn)}
                      </p>
                      <p className="text-sm text-muted">{step.day === 0 ? EMAIL.planThisEmail(TONES[step.tone].label) : TONES[step.tone].label}</p>
                    </div>
                    {step.day > 0 && (
                      <Button variant="link" onClick={() => copyReminder(step.sendOn, step.tone)} className="text-[15px] font-semibold no-underline hover:underline">
                        {EMAIL.copyReminder}
                      </Button>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          <div className="rounded-hero bg-surface px-6 py-5 shadow-raised">
            <h3 className="mb-2 text-lg font-semibold">{EMAIL.beforeTitle}</h3>
            <ol className="flex list-decimal flex-col gap-1 pl-5 text-muted">
              {EMAIL.beforeSteps.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ol>
          </div>

          {/* Sticky action bar, like a mail app's toolbar. */}
          <div className="glass fixed inset-x-0 bottom-0 z-20 border-t border-line px-5 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3">
            <div className="mx-auto flex max-w-xl flex-wrap items-center justify-end gap-3">
              <p role="status" aria-live="polite" className="mr-auto min-h-6 text-left text-[15px] font-semibold text-brand-700 transition-opacity duration-200">
                {toast}
              </p>
              {facts && (
                <Button variant="link" onClick={onWhatsApp} className="text-[15px] font-semibold no-underline hover:underline">
                  {EMAIL.copyWhatsApp}
                </Button>
              )}
              <Button variant="secondary" size="lg" onClick={onOpen}>
                {EMAIL.open}
              </Button>
              <Button size="lg" onClick={onCopy}>
                {EMAIL.copy}
              </Button>
            </div>
          </div>
        </>
      )}

      <div className="flex flex-wrap justify-center gap-x-6 gap-y-1">
        <Button variant="link" tone="brand" onClick={onChangeTone} className="text-base font-semibold no-underline hover:underline">
          {EMAIL.changeTone}
        </Button>
        <Button variant="link" tone="muted" onClick={onBack} className="text-base no-underline hover:underline">
          {EMAIL.back}
        </Button>
      </div>
      <p className="text-center text-sm text-muted">{EMAIL.disclaimer}</p>
    </section>
  );
}
