"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { RATE_HISTORY_START, daysBetween, lastRateChangeDate, type EngineResult, type MonthRow } from "@/lib/engine";
import { ELIGIBILITY, PAYMENTS, PRIORITIES_COPY, RATES, STANDING } from "@/lib/copy";
import { rateFreshness } from "@/lib/standing";
import { formatDate, formatINR, formatMonth, formatPercent } from "@/lib/format";
import type { FormValues } from "@/lib/wizard";
import { Banner } from "./ui/Banner";
import { CountUp } from "./ui/CountUp";
import { Button } from "./ui/Button";
import { Disclosure } from "./ui/Disclosure";

type Props = {
  result: EngineResult;
  form: FormValues;
  onBack: () => void;
  onTone: () => void;
  onReset: () => void;
  /** Hedged notes from the optional eligibility answers (eligibilityNotes). */
  notes?: string[];
  /** Today in India; turns on the stale-rate banner when the rate table is old. */
  asOf?: string;
  /** Hands this invoice to the toolkit's Priorities tab (in memory). Shown when the invoice has a result. */
  onAddToPriorities?: () => void;
};

// Presentational only: every number shown comes from compute() (CLAUDE.md rule 1).

const rateText = (m: MonthRow) =>
  m.segments.map((s) => `${formatPercent(s.section16Rate)} × ${STANDING.daysCount(s.days)}`);

function Working({ rows }: { rows: MonthRow[] }) {
  const c = STANDING.columns;
  // The "Paid" column only appears when the founder entered part payments.
  const hasPaid = rows.some((m) => m.paid);
  return (
    <Disclosure summary={STANDING.workingTitle} className="@container" summaryClassName="px-6 py-4 text-base text-link">
      {/* Wide container: a table. */}
      <div className="hidden overflow-x-auto px-4 pb-4 @lg:block">
        <table className="num w-full text-left text-sm">
          <thead>
            <tr className="border-b-2 border-line">
              <th scope="col" className="py-2 pr-2 font-semibold">{c.month}</th>
              <th scope="col" className="py-2 pr-2 text-right font-semibold">{c.days}</th>
              <th scope="col" className="py-2 pr-2 text-right font-semibold">{c.opening}</th>
              {hasPaid && <th scope="col" className="py-2 pr-2 text-right font-semibold">{PAYMENTS.paidColumn}</th>}
              <th scope="col" className="py-2 pr-2 font-semibold">{c.rate}</th>
              <th scope="col" className="py-2 pr-2 text-right font-semibold">{c.interest}</th>
              <th scope="col" className="py-2 text-right font-semibold">{c.closing}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.month} className="border-b border-line align-top">
                <th scope="row" className="py-2 pr-2 font-medium">{formatMonth(m.month)}</th>
                <td className="py-2 pr-2 text-right">{m.days}</td>
                <td className="py-2 pr-2 text-right">{formatINR(m.openingBalance)}</td>
                {hasPaid && <td className="py-2 pr-2 text-right">{m.paid ? `−${formatINR(m.paid)}` : "–"}</td>}
                <td className="py-2 pr-2">
                  {rateText(m).map((t) => (
                    <span key={t} className="block">{t}</span>
                  ))}
                </td>
                <td className="py-2 pr-2 text-right">{formatINR(m.interest)}</td>
                <td className="py-2 text-right">{formatINR(m.closingBalance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Narrow container: one stacked card per month, so nothing scrolls sideways. */}
      <ul className="num flex flex-col gap-3 px-4 pb-4 @lg:hidden">
        {rows.map((m) => (
          <li key={m.month} className="rounded-input border border-line bg-surface p-3">
            <p className="text-base font-semibold">
              {formatMonth(m.month)} <span className="font-normal text-muted">({STANDING.daysCount(m.days)})</span>
            </p>
            <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm">
              <dt>{c.opening}</dt>
              <dd className="text-right">{formatINR(m.openingBalance)}</dd>
              {m.paid ? (
                <>
                  <dt>{PAYMENTS.paidColumn}</dt>
                  <dd className="text-right">−{formatINR(m.paid)}</dd>
                </>
              ) : null}
              <dt>{c.rate}</dt>
              <dd className="text-right">
                {rateText(m).map((t) => (
                  <span key={t} className="block">{t}</span>
                ))}
              </dd>
              <dt>{c.interest}</dt>
              <dd className="text-right">{formatINR(m.interest)}</dd>
              <dt>{c.closing}</dt>
              <dd className="text-right font-semibold">{formatINR(m.closingBalance)}</dd>
            </dl>
          </li>
        ))}
      </ul>
    </Disclosure>
  );
}

export function Standing({ result, form, onBack, onTone, onReset, notes = [], asOf, onAddToPriorities }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const r = STANDING.rows;
  // The engine already explains a registration after the invoice (udyam_after_invoice), so skip that note here.
  const shown = notes.filter((n) => n !== ELIGIBILITY.notes.udyamAfter);

  let body: ReactNode;
  let actions: ReactNode;
  const another = (
    <Button size="lg" onClick={onReset}>
      {STANDING.checkAnother}
    </Button>
  );

  if (result.status === "overdue") {
    body = (
      <>
        <p className="num text-center text-lg text-ink">{STANDING.plain(formatDate(result.lastPayableDate), result.daysOverdue)}</p>
        <div className="rounded-hero bg-brand-50 px-7 py-11 text-center text-ink">
          <p className="leading-tight">
            <CountUp value={result.totalInterest} className="hero-number num block" />
            <span className="mt-2.5 block text-xl font-semibold">{STANDING.interestSuffix}</span>
          </p>
          <p className="num mt-1.5 text-muted">{STANDING.totalNowDueLine(formatINR(result.totalDue))}</p>
          <span className="num mt-4 inline-block rounded-full bg-warn-bg px-4 py-1.5 text-[15px] font-bold text-warn-ink">
            {STANDING.daysLate(result.daysOverdue)}
          </span>
          <p className="mx-auto mt-4 max-w-[34em] text-[14.5px] text-muted">{STANDING.legalLine}</p>
        </div>

        {result.capped && (
          <Banner tone="warn" size="sm" role="note">
            <p>{STANDING.capped(String(Number(form.agreementDays)))}</p>
          </Banner>
        )}

        {asOf && <Timeline start={form.invoiceDate} due={result.lastPayableDate} today={asOf} />}

        <dl className="num rounded-hero bg-surface text-base shadow-raised">
          <Row label={r.dueBy} value={formatDate(result.lastPayableDate)} />
          <Row label={r.interestFrom} value={formatDate(result.interestStartDate)} />
          <Row label={r.daysOverdue} value={String(result.daysOverdue)} />
          <Row label={r.amount} value={formatINR(Number(form.amount))} />
          {result.paidSoFar !== undefined && (
            <>
              <Row
                label={PAYMENTS.receivedLabel}
                value={`${formatINR(result.paidSoFar)}${result.tdsSoFar ? ` (${PAYMENTS.tdsNote(formatINR(result.tdsSoFar))})` : ""}`}
              />
              <Row label={PAYMENTS.unpaidLabel} value={formatINR(result.unpaidAmount ?? 0)} />
            </>
          )}
          <Row label={r.interest} value={formatINR(result.totalInterest)} />
          <Row label={r.total} value={formatINR(result.totalDue)} strong />
        </dl>

        <div className="overflow-hidden rounded-hero bg-surface shadow-raised">
          <Working rows={result.rows} />
          <section aria-labelledby="how-h" className="flex flex-col gap-2 border-t border-line px-6 py-5">
            <h3 id="how-h" className="font-semibold">{STANDING.howTitle}</h3>
            <p className="text-base leading-7 text-muted">{STANDING.how}</p>
            {result.paidSoFar !== undefined && <p className="text-base leading-7 text-muted">{PAYMENTS.howPayments}</p>}
            <p className="text-sm text-muted">{STANDING.ratesLoaded(formatDate(lastRateChangeDate()))}</p>
          </section>
        </div>

        {asOf && rateFreshness(asOf).stale && (
          <Banner tone="warn" size="sm" role="note" title={RATES.staleTitle}>
            <p>{RATES.staleBody}</p>
          </Banner>
        )}
      </>
    );
    actions = (
      <Button size="lg" onClick={onTone}>
        {STANDING.chooseTone}
      </Button>
    );
  } else if (result.status === "not_yet_due") {
    body = (
      <Banner tone="info" role="status" title={STANDING.notYetDueTitle}>
        <p className="num text-base">{STANDING.lastDayToPay(formatDate(result.lastPayableDate))}</p>
        <p className="num text-base font-semibold">{STANDING.daysLeft(result.daysLeft)}</p>
      </Banner>
    );
    actions = another;
  } else if (result.status === "udyam_after_invoice") {
    body = (
      <Banner tone="warn" role="status" title={STANDING.notCoveredTitle}>
        <p className="text-base">{STANDING.notCoveredBody}</p>
        <p className="text-base">{STANDING.notCoveredCaveat}</p>
        <p className="text-base font-semibold">{STANDING.notCoveredLawyer}</p>
      </Banner>
    );
    actions = another;
  } else {
    body = (
      <Banner tone="warn" role="status" title={STANDING.historyTitle}>
        <p className="num text-base">{STANDING.historyBody(formatDate(RATE_HISTORY_START))}</p>
      </Banner>
    );
    actions = another;
  }

  return (
    <section aria-labelledby="standing-h" className="flex flex-col gap-6">
      <h2 id="standing-h" ref={heading} tabIndex={-1} className="eyebrow outline-none">
        {STANDING.title}
        {asOf && <span className="num"> · {formatDate(asOf)}</span>}
      </h2>
      {shown.length > 0 && (
        <Banner tone="warn" size="sm" role="note" title={ELIGIBILITY.notesTitle}>
          <ul className="flex list-disc flex-col gap-1 pl-5">
            {shown.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </Banner>
      )}
      {body}
      <p className="text-center text-sm text-muted">
        {STANDING.notAdvice} {STANDING.figuresNote}
      </p>
      <div className="flex flex-col items-center gap-1.5">
        {actions}
        {onAddToPriorities && (result.status === "overdue" || result.status === "not_yet_due") && (
          <Button variant="secondary" onClick={onAddToPriorities} className="mt-1">
            {PRIORITIES_COPY.addFromCheck}
          </Button>
        )}
        <Button variant="link" tone="muted" onClick={onBack} className="text-[15px] no-underline hover:underline">
          {STANDING.back}
        </Button>
      </div>
    </section>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line px-6 py-4 last:border-b-0">
      <dt className={strong ? "font-semibold" : "text-muted"}>{label}</dt>
      <dd className={strong ? "text-right text-xl font-bold text-brand-800" : "text-right font-semibold"}>{value}</dd>
    </div>
  );
}

/**
 * Invoice date -> due -> today as a bar. Positions are layout only (how far along the bar to draw a
 * dot); every date shown comes from the form or compute().
 */
function Timeline({ start, due, today }: { start: string; due: string; today: string }) {
  const span = Math.max(1, daysBetween(start, today));
  const at = (d: string) => 6 + (88 * Math.min(span, Math.max(0, daysBetween(start, d)))) / span;
  const duePos = at(due);
  return (
    <div className="rounded-hero bg-surface px-7 pb-6 pt-8 shadow-raised">
      <div className="relative pt-1" aria-hidden>
        <div className="relative h-1.5 rounded-full bg-line">
          <span className="absolute inset-y-0 rounded-full bg-[#e0a22b]" style={{ left: `${duePos}%`, right: "6%" }} />
        </div>
        {[at(start), duePos].map((left, i) => (
          <span key={i} className="absolute top-[-5px] h-[18px] w-[18px] -translate-x-1/2 rounded-full border-4 border-brand-700 bg-surface" style={{ left: `${left}%` }} />
        ))}
        <span className="absolute top-[-5px] h-[18px] w-[18px] -translate-x-1/2 rounded-full border-4 border-[#e0a22b] bg-surface" style={{ left: "94%" }} />
      </div>
      <ol className="num mt-6 grid grid-cols-3 text-sm text-muted">
        <li>
          <b className="block text-base text-ink">{formatDate(start)}</b>
          {STANDING.timeline.invoice}
        </li>
        <li className="text-center">
          <b className="block text-base text-ink">{formatDate(due)}</b>
          {STANDING.timeline.due}
        </li>
        <li className="text-right">
          <b className="block text-base text-ink">{formatDate(today)}</b>
          {STANDING.timeline.today}
        </li>
      </ol>
    </div>
  );
}
