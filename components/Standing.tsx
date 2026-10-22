"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { RATE_HISTORY_START, lastRateChangeDate, type EngineResult, type MonthRow } from "@/lib/engine";
import { ELIGIBILITY, RATES, STANDING } from "@/lib/copy";
import { rateFreshness } from "@/lib/standing";
import { formatDate, formatINR, formatMonth, formatPercent } from "@/lib/format";
import type { FormValues } from "@/lib/wizard";
import { Banner } from "./ui/Banner";
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
};

// Presentational only: every number shown comes from compute() (CLAUDE.md rule 1).

const rateText = (m: MonthRow) =>
  m.segments.map((s) => `${formatPercent(s.section16Rate)} × ${STANDING.daysCount(s.days)}`);

function Working({ rows }: { rows: MonthRow[] }) {
  const c = STANDING.columns;
  return (
    <Disclosure summary={STANDING.workingTitle} className="@container rounded-card border-2 border-line" summaryClassName="p-4 text-base">
      {/* Wide container: a table. */}
      <div className="hidden overflow-x-auto px-4 pb-4 @lg:block">
        <table className="num w-full text-left text-sm">
          <thead>
            <tr className="border-b-2 border-line">
              <th scope="col" className="py-2 pr-2 font-semibold">{c.month}</th>
              <th scope="col" className="py-2 pr-2 text-right font-semibold">{c.days}</th>
              <th scope="col" className="py-2 pr-2 text-right font-semibold">{c.opening}</th>
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

export function Standing({ result, form, onBack, onTone, onReset, notes = [], asOf }: Props) {
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
        <div className="rounded-card bg-brand-50 p-5 text-ink">
          <p className="text-base font-semibold leading-tight">
            <span className="num block text-3xl font-bold sm:text-4xl">{formatINR(result.totalInterest)}</span>
            <span className="mt-1 block text-lg">{STANDING.interestSuffix}</span>
          </p>
          <p className="num mt-3 text-base">{STANDING.totalNowDueLine(formatINR(result.totalDue))}</p>
          <p className="mt-3 text-sm text-ink">{STANDING.legalLine}</p>
        </div>

        {result.capped && (
          <Banner tone="warn" size="sm" role="note">
            <p>{STANDING.capped(String(Number(form.agreementDays)))}</p>
          </Banner>
        )}

        <dl className="num grid grid-cols-[1fr_auto] gap-x-4 gap-y-3 rounded-card border-2 border-line p-4 text-base">
          <dt>{r.dueBy}</dt>
          <dd className="text-right font-semibold">{formatDate(result.lastPayableDate)}</dd>
          <dt>{r.interestFrom}</dt>
          <dd className="text-right font-semibold">{formatDate(result.interestStartDate)}</dd>
          <dt>{r.daysOverdue}</dt>
          <dd className="text-right font-semibold">{result.daysOverdue}</dd>
          <dt>{r.amount}</dt>
          <dd className="text-right font-semibold">{formatINR(Number(form.amount))}</dd>
          <dt>{r.interest}</dt>
          <dd className="text-right font-semibold">{formatINR(result.totalInterest)}</dd>
          <dt className="border-t-2 border-line pt-3 font-semibold">{r.total}</dt>
          <dd className="border-t-2 border-line pt-3 text-right text-lg font-bold">{formatINR(result.totalDue)}</dd>
        </dl>

        <Working rows={result.rows} />

        <section aria-labelledby="how-h" className="flex flex-col gap-2">
          <h3 id="how-h" className="text-lg font-semibold">{STANDING.howTitle}</h3>
          <p className="text-base leading-7">{STANDING.how}</p>
          <p className="text-sm text-muted">{STANDING.ratesLoaded(formatDate(lastRateChangeDate()))}</p>
        </section>

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
      <h2 id="standing-h" ref={heading} tabIndex={-1} className="step-title outline-none">
        {STANDING.title}
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
      <div className="flex flex-col gap-3">
        {actions}
        <Button variant="link" tone="ink" onClick={onBack} className="self-start text-base">
          {STANDING.back}
        </Button>
      </div>
      <p className="text-sm text-muted">
        {STANDING.notAdvice} {STANDING.figuresNote}
      </p>
    </section>
  );
}
