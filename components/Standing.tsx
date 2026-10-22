"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { RATE_HISTORY_START, lastRateChangeDate, type EngineResult, type MonthRow } from "@/lib/engine";
import { STANDING } from "@/lib/copy";
import { formatDate, formatINR, formatMonth, formatPercent } from "@/lib/format";
import type { FormValues } from "@/lib/wizard";

type Props = {
  result: EngineResult;
  form: FormValues;
  onBack: () => void;
  onTone: () => void;
  onReset: () => void;
};

// Presentational only: every number shown comes from compute() (CLAUDE.md rule 1).

const btnPrimary =
  "min-h-12 rounded-lg bg-indigo-700 px-5 py-3 text-base font-semibold text-white hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700";
const btnLink = "min-h-11 min-w-11 self-start text-base underline underline-offset-4";

const rateText = (m: MonthRow) =>
  m.segments.map((s) => `${formatPercent(s.section16Rate)} × ${STANDING.daysCount(s.days)}`);

function Banner({ tone, title, children }: { tone: "info" | "warn"; title: string; children: ReactNode }) {
  const cls =
    tone === "warn"
      ? "border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-50"
      : "border-indigo-600 bg-indigo-50 text-indigo-950 dark:bg-indigo-950 dark:text-indigo-50";
  return (
    <div role="status" className={`flex flex-col gap-2 rounded-xl border-2 p-5 ${cls}`}>
      <p className="text-xl font-semibold">{title}</p>
      {children}
    </div>
  );
}

function Working({ rows }: { rows: MonthRow[] }) {
  const c = STANDING.columns;
  return (
    <details className="@container rounded-xl border-2 border-zinc-300 dark:border-zinc-700">
      <summary className="min-h-12 cursor-pointer p-4 text-base font-semibold">{STANDING.workingTitle}</summary>

      {/* Wide container: a table. */}
      <div className="hidden overflow-x-auto px-4 pb-4 @lg:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b-2 border-zinc-300 dark:border-zinc-700">
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
              <tr key={m.month} className="border-b border-zinc-200 align-top dark:border-zinc-800">
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
      <ul className="flex flex-col gap-3 px-4 pb-4 @lg:hidden">
        {rows.map((m) => (
          <li key={m.month} className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-900">
            <p className="text-base font-semibold">
              {formatMonth(m.month)} <span className="font-normal text-zinc-600 dark:text-zinc-400">({STANDING.daysCount(m.days)})</span>
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
    </details>
  );
}

export function Standing({ result, form, onBack, onTone, onReset }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const r = STANDING.rows;

  let body: ReactNode;
  let actions: ReactNode;

  if (result.status === "overdue") {
    body = (
      <>
        <div className="rounded-xl bg-indigo-50 p-5 dark:bg-indigo-950">
          <p className="text-base font-semibold leading-tight">
            <span className="block text-3xl font-bold sm:text-4xl">{formatINR(result.totalInterest)}</span>
            <span className="mt-1 block text-lg">{STANDING.interestSuffix}</span>
          </p>
          <p className="mt-3 text-base">{STANDING.totalNowDueLine(formatINR(result.totalDue))}</p>
          <p className="mt-3 text-sm text-zinc-800 dark:text-zinc-200">{STANDING.legalLine}</p>
        </div>

        {result.capped && (
          <p role="note" className="rounded-lg border border-amber-500 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-50">
            {STANDING.capped(String(Number(form.agreementDays)))}
          </p>
        )}

        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-3 rounded-xl border-2 border-zinc-300 p-4 text-base dark:border-zinc-700">
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
          <dt className="border-t-2 border-zinc-300 pt-3 font-semibold dark:border-zinc-700">{r.total}</dt>
          <dd className="border-t-2 border-zinc-300 pt-3 text-right text-lg font-bold dark:border-zinc-700">{formatINR(result.totalDue)}</dd>
        </dl>

        <Working rows={result.rows} />

        <section aria-labelledby="how-h" className="flex flex-col gap-2">
          <h3 id="how-h" className="text-lg font-semibold">{STANDING.howTitle}</h3>
          <p className="text-base leading-7">{STANDING.how}</p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{STANDING.ratesLoaded(formatDate(lastRateChangeDate()))}</p>
        </section>
      </>
    );
    actions = (
      <button type="button" onClick={onTone} className={btnPrimary}>
        {STANDING.chooseTone}
      </button>
    );
  } else if (result.status === "not_yet_due") {
    body = (
      <Banner tone="info" title={STANDING.notYetDueTitle}>
        <p className="text-base">{STANDING.lastDayToPay(formatDate(result.lastPayableDate))}</p>
        <p className="text-base font-semibold">{STANDING.daysLeft(result.daysLeft)}</p>
      </Banner>
    );
    actions = (
      <button type="button" onClick={onReset} className={btnPrimary}>
        {STANDING.checkAnother}
      </button>
    );
  } else if (result.status === "udyam_after_invoice") {
    body = (
      <Banner tone="warn" title={STANDING.notCoveredTitle}>
        <p className="text-base">{STANDING.notCoveredBody}</p>
        <p className="text-base">{STANDING.notCoveredCaveat}</p>
        <p className="text-base font-semibold">{STANDING.notCoveredLawyer}</p>
      </Banner>
    );
    actions = (
      <button type="button" onClick={onReset} className={btnPrimary}>
        {STANDING.checkAnother}
      </button>
    );
  } else {
    body = (
      <Banner tone="warn" title={STANDING.historyTitle}>
        <p className="text-base">{STANDING.historyBody(formatDate(RATE_HISTORY_START))}</p>
      </Banner>
    );
    actions = (
      <button type="button" onClick={onReset} className={btnPrimary}>
        {STANDING.checkAnother}
      </button>
    );
  }

  return (
    <section aria-labelledby="standing-h" className="flex flex-col gap-6">
      <h2 id="standing-h" ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">
        {STANDING.title}
      </h2>
      {body}
      <div className="flex flex-col gap-3">
        {actions}
        <button type="button" onClick={onBack} className={btnLink}>
          {STANDING.back}
        </button>
      </div>
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        {STANDING.notAdvice} {STANDING.figuresNote}
      </p>
    </section>
  );
}
