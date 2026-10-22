"use client";

import { Fragment, useEffect, useState } from "react";
import { analyseReply } from "@/lib/api";
import { playbook, type InvoiceDetails } from "@/lib/blockers/playbooks";
import { BLOCKER_LABELS, BLOCKER_TYPES, type BlockerAnalysis, type BlockerType } from "@/lib/blockers/types";
import { evidenceRanges, MAX_REPLY_CHARS, normalizeForMatch } from "@/lib/blockers/validate";
import { BLOCKERS_COPY as C } from "@/lib/copy";
import { buildMailto, emailAsText } from "@/lib/email/mailto";
import { isValidISODate } from "@/lib/engine";
import { formatDate } from "@/lib/format";
import { Badge } from "../ui/Badge";
import { Banner } from "../ui/Banner";
import { Button } from "../ui/Button";
import { Disclosure } from "../ui/Disclosure";
import { Field } from "../ui/Field";
import { Spinner } from "../ui/Spinner";
import { copyToClipboard } from "./clipboard";

type Status = "idle" | "loading" | "done" | "error";
type ErrorKind = "rate_limited" | "ai_failed" | "invalid_input" | "network";

const AMOUNT = /^\d+(\.\d{1,2})?$/;

/** The reply with each evidence quote highlighted (whitespace-normalised, as matched). */
function Highlighted({ reply, evidences }: { reply: string; evidences: string[] }) {
  const text = normalizeForMatch(reply);
  const ranges = evidenceRanges(reply, evidences);
  const parts: { t: string; mark: boolean }[] = [];
  let at = 0;
  for (const r of ranges) {
    if (r.start > at) parts.push({ t: text.slice(at, r.start), mark: false });
    parts.push({ t: text.slice(r.start, r.end), mark: true });
    at = r.end;
  }
  if (at < text.length) parts.push({ t: text.slice(at), mark: false });
  return (
    <p className="whitespace-pre-wrap break-words text-base leading-7">
      {parts.map((p, i) =>
        p.mark ? (
          <mark key={i} className="rounded bg-warn-bg px-0.5 text-ink ring-1 ring-warn-ink">
            {p.t}
          </mark>
        ) : (
          <Fragment key={i}>{p.t}</Fragment>
        ),
      )}
    </p>
  );
}

export function BlockerAssistant() {
  const [reply, setReply] = useState("");
  const [context, setContext] = useState("");
  const [details, setDetails] = useState({ clientName: "", invoiceNumber: "", amount: "", dueDate: "" });
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<ErrorKind | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<BlockerAnalysis | null>(null);
  const [analysedReply, setAnalysedReply] = useState("");
  const [chosen, setChosen] = useState<BlockerType | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const amountOk = details.amount.trim() === "" || AMOUNT.test(details.amount.trim());
  const dueOk = details.dueDate === "" || isValidISODate(details.dueDate);

  /** Only valid, founder-entered values reach the draft. */
  const invoice = (): InvoiceDetails => ({
    clientName: details.clientName.trim() || undefined,
    invoiceNumber: details.invoiceNumber.trim() || undefined,
    amount: amountOk && details.amount.trim() ? Number(details.amount.trim()) : undefined,
    dueDate: dueOk && details.dueDate ? details.dueDate : undefined,
  });

  const fillDraft = (type: BlockerType, promisedDate: string | null) => {
    const p = playbook(type, invoice(), promisedDate);
    setChosen(type);
    setSubject(p.subject);
    setBody(p.body);
  };

  async function onAnalyse() {
    const text = reply.trim();
    if (!text) return setInputError(C.empty);
    if (text.length > MAX_REPLY_CHARS) return setInputError(C.tooLong(MAX_REPLY_CHARS));
    setInputError(null);
    setStatus("loading");
    setError(null);
    const res = await analyseReply(text, context.trim() || undefined);
    setAnalysedReply(text);
    if (res.ok) {
      setAnalysis(res.data);
      setStatus("done");
      const primary = res.data.unclear ? "unclear" : res.data.blockers[0].type;
      fillDraft(primary, res.data.promisedDate);
    } else {
      setAnalysis(null);
      setError(res.error);
      setStatus("error");
      fillDraft("unclear", null); // manual choice below still works without the AI
    }
  }

  const errorText = error === "rate_limited" ? C.rateLimited : error === "network" ? C.network : C.failed;
  const confident = analysis ? analysis.blockers.filter((b) => b.type !== "unclear" && b.confidence !== "low") : [];
  const possible = analysis ? analysis.blockers.filter((b) => b.type !== "unclear" && b.confidence === "low") : [];
  const showResult = status === "done" || status === "error";

  async function onCopy() {
    setToast((await copyToClipboard(emailAsText(subject, body))) ? C.copied : C.copyFailed);
  }

  return (
    <section aria-labelledby="blk-h" className="flex flex-col gap-5">
      <div className="rounded-hero bg-surface p-6 shadow-raised">
        <h2 id="blk-h" className="text-xl font-bold tracking-tight">
          {C.heading}
        </h2>
        <p className="mt-1 text-muted">{C.help}</p>

        <label htmlFor="blk-reply" className="mt-5 block font-semibold">
          {C.replyLabel}
        </label>
        <textarea
          id="blk-reply"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={6}
          maxLength={MAX_REPLY_CHARS + 500}
          placeholder={C.replyPlaceholder}
          aria-describedby={inputError ? "blk-reply-err" : undefined}
          aria-invalid={!!inputError}
          className="mt-2 w-full rounded-input border-2 border-control bg-surface p-3 text-base leading-7 text-ink"
        />
        <p className="mt-1 text-right text-xs text-muted num">
          {reply.length.toLocaleString("en-IN")} / {MAX_REPLY_CHARS.toLocaleString("en-IN")}
        </p>
        {inputError && (
          <p id="blk-reply-err" className="text-sm font-semibold text-danger">
            {inputError}
          </p>
        )}

        <Disclosure summary={C.detailsTitle} className="mt-3 rounded-card border border-line" summaryClassName="px-4 py-3 text-[15px]">
          <div className="px-4 pb-2">
            <Field id="blk-client" label={C.clientLabel}>
              {(cls) => <input id="blk-client" className={cls} value={details.clientName} onChange={(e) => setDetails({ ...details, clientName: e.target.value })} autoComplete="off" />}
            </Field>
            <Field id="blk-number" label={C.numberLabel}>
              {(cls) => <input id="blk-number" className={cls} value={details.invoiceNumber} onChange={(e) => setDetails({ ...details, invoiceNumber: e.target.value })} autoComplete="off" />}
            </Field>
            <Field id="blk-amount" label={C.amountLabel} error={amountOk ? undefined : C.amountInvalid}>
              {(cls, d) => (
                <input id="blk-amount" inputMode="decimal" className={`${cls} num`} aria-describedby={d} aria-invalid={!amountOk} value={details.amount} onChange={(e) => setDetails({ ...details, amount: e.target.value })} />
              )}
            </Field>
            <Field id="blk-due" label={C.dueLabel} error={dueOk ? undefined : C.dateInvalid}>
              {(cls, d) => <input id="blk-due" type="date" className={`${cls} num`} aria-describedby={d} aria-invalid={!dueOk} value={details.dueDate} onChange={(e) => setDetails({ ...details, dueDate: e.target.value })} />}
            </Field>
            <label htmlFor="blk-context" className="mt-3 block font-semibold">
              {C.contextLabel}
            </label>
            <textarea id="blk-context" value={context} onChange={(e) => setContext(e.target.value)} rows={2} maxLength={500} className="mb-3 mt-2 w-full rounded-input border-2 border-control bg-surface p-3 text-base text-ink" />
          </div>
        </Disclosure>

        <div className="mt-5 flex justify-center">
          <Button size="lg" onClick={onAnalyse} loading={status === "loading"} className="px-7">
            {status === "loading" ? C.analysing : C.analyse}
          </Button>
        </div>
      </div>

      <div aria-live="polite">
        {status === "error" && (
          <Banner tone="warn" role="alert">
            <p>{errorText}</p>
          </Banner>
        )}
      </div>

      {status === "loading" && (
        <p className="flex items-center justify-center gap-2 font-semibold text-brand-700" role="status">
          <Spinner />
          {C.analysing}
        </p>
      )}

      {showResult && (
        <div className="flex flex-col gap-5">
          {analysis && (
            <div className="rounded-hero bg-surface p-6 shadow-raised">
              <h3 className="section-label">{C.resultTitle}</h3>
              {analysis.unclear ? (
                <Banner tone="warn" size="sm" role="status" title={C.unclearTitle} className="mt-3">
                  <p>{C.unclearBody}</p>
                </Banner>
              ) : (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {confident.map((b) => (
                    <li key={b.type}>
                      <Badge tone="success" size="md">
                        {BLOCKER_LABELS[b.type]} · {C.confidence[b.confidence]}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
              {possible.length > 0 && (
                <p className="mt-3 text-sm text-muted">
                  {C.possible}: {possible.map((b) => BLOCKER_LABELS[b.type]).join(", ")} ({C.confidence.low.toLowerCase()})
                </p>
              )}
              {analysis.blockers.some((b) => b.evidence) && (
                <>
                  <h4 className="mt-5 font-semibold">{C.evidenceTitle}</h4>
                  <div className="mt-2 rounded-card bg-canvas p-4">
                    <Highlighted reply={analysedReply} evidences={analysis.blockers.map((b) => b.evidence)} />
                  </div>
                </>
              )}
              {analysis.promisedDate && (
                <p className="num mt-4 rounded-card bg-brand-50 p-3 text-[15px] text-ink">{C.promised(formatDate(analysis.promisedDate))}</p>
              )}
            </div>
          )}

          {chosen && (
            <div className="rounded-hero bg-surface p-6 shadow-raised">
              <h3 className="section-label">{C.nextAction}</h3>
              <p className="mt-2 text-lg">{playbook(chosen, invoice()).nextAction}</p>

              <label htmlFor="blk-choose" className="mt-5 block font-semibold">
                {C.chooseLabel}
              </label>
              <p className="text-sm text-muted">{C.chooseHelp}</p>
              <select
                id="blk-choose"
                value={chosen}
                onChange={(e) => fillDraft(e.target.value as BlockerType, analysis?.promisedDate ?? null)}
                className="mt-2 min-h-12 w-full rounded-input border-2 border-control bg-surface px-3 text-base text-ink"
              >
                {BLOCKER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {BLOCKER_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {chosen && (
            <div className="overflow-hidden rounded-hero bg-surface shadow-raised">
              <div className="border-b border-line px-6 py-4">
                <h3 className="font-semibold">{C.draftTitle}</h3>
                <p className="text-sm text-muted">{C.draftHelp}</p>
              </div>
              <div className="flex items-center gap-3 border-b border-line px-6 py-1.5">
                <label htmlFor="blk-subject" className="w-[64px] text-[15px] text-muted">
                  {C.subjectLabel}
                </label>
                <input id="blk-subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="min-h-[46px] flex-1 bg-transparent font-semibold text-ink outline-none" />
              </div>
              <label htmlFor="blk-body" className="sr-only">
                {C.bodyLabel}
              </label>
              <textarea id="blk-body" value={body} onChange={(e) => setBody(e.target.value)} rows={12} className="w-full resize-y bg-transparent p-6 text-base leading-7 text-ink outline-none focus:bg-[color-mix(in_srgb,var(--brand-50)_35%,transparent)]" />
              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line px-6 py-4">
                <p role="status" aria-live="polite" className="mr-auto min-h-6 text-[15px] font-semibold text-brand-700">
                  {toast}
                </p>
                <Button variant="secondary" onClick={() => window.location.assign(buildMailto(subject, body).href)}>
                  {C.open}
                </Button>
                <Button onClick={onCopy}>{C.copy}</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
