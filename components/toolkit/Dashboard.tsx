"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { DASHBOARD_COPY as C } from "@/lib/copy";
import { forecastCash, parsePaise, toCashItems, validateStartingCash } from "@/lib/forecast/cash";
import { formatDate, formatINR } from "@/lib/format";
import { summarize } from "@/lib/intel/dashboard";
import { todayIST } from "@/lib/today";
import { Banner } from "../ui/Banner";
import { Button } from "../ui/Button";
import { cx } from "../ui/cx";
import { inrPaise } from "./money";
import { useToolkit } from "./state";

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0 rounded-card bg-surface p-4 shadow-card sm:p-5">
      <p className="text-sm font-medium text-muted">{label}</p>
      {/* Smaller on phones so lakh and crore amounts fit two cards per row. */}
      <p className="num mt-1 break-words text-lg font-bold tracking-tight sm:text-2xl">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{sub}</p>
    </div>
  );
}

function Action({ title, value, unit, body, href, cta, tone = "neutral" }: { title: string; value?: string; unit?: string; body?: ReactNode; href: string; cta: string; tone?: "neutral" | "alert" }) {
  return (
    <div className="flex flex-col rounded-card bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{title}</p>
        <span aria-hidden className={cx("h-2 w-2 rounded-full", tone === "alert" ? "bg-[#e0a22b]" : "bg-brand-600")} />
      </div>
      {value !== undefined && (
        <p className="mt-2">
          <span className="num text-3xl font-bold tracking-tight">{value}</span> {unit && <span className="text-sm text-muted">{unit}</span>}
        </p>
      )}
      {body && <div className="mt-2 text-[15px] text-muted">{body}</div>}
      <Link href={href} className="mt-auto inline-flex min-h-11 items-center pt-3 text-[15px] font-semibold text-link hover:underline">
        {cta} →
      </Link>
    </div>
  );
}

/** Workspace dashboard. Every number comes from lib/intel/dashboard.ts and lib/forecast/cash.ts. */
export function Dashboard() {
  const { invoices, loadSample, cash } = useToolkit();
  const [today] = useState(() => todayIST());
  const s = summarize(invoices, today);
  const hasSample = invoices.some((i) => i.sample);

  const startOk = cash.start.trim() !== "" && validateStartingCash(cash.start) === null;
  const forecast = startOk
    ? forecastCash({ today, startingCashPaise: parsePaise(cash.start)!, collections: toCashItems(cash.collections), expenses: toCashItems(cash.expenses) })
    : null;
  const actionCount = [s.overdueCount > 0, s.missedPromises > 0, forecast?.shortfall].filter(Boolean).length;

  if (invoices.length === 0 && !forecast) {
    return (
      <div className="rounded-hero bg-surface p-8 text-center shadow-raised">
        <h2 className="text-xl font-bold tracking-tight">{C.emptyTitle}</h2>
        <p className="mx-auto mt-2 max-w-[34em] text-muted">{C.emptyBody}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={() => loadSample(today)}>
            Load fictional sample
          </Button>
          <Link href="/priorities" className="inline-flex min-h-12 items-center rounded-button border-2 border-brand-700 bg-surface px-5 font-semibold text-link hover:bg-brand-50">
            {C.addInvoices}
          </Link>
        </div>
        <p className="mt-6 text-sm text-muted">{C.notAdvice}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {hasSample && (
        <Banner tone="warn" size="sm" role="note">
          <p className="font-semibold">{C.sampleBanner}</p>
        </Banner>
      )}

      <section aria-label="Summary" className="grid gap-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-hero bg-brand-800 p-6 text-white shadow-raised">
          <span aria-hidden className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">{C.heroLabel}</p>
          <p className="num mt-2 text-4xl font-bold tracking-tight">{formatINR(s.overdue)}</p>
          {s.overdueCount > 0 ? (
            <>
              <span className="mt-3 inline-block rounded-full bg-[#ffe7b3] px-3 py-1 text-xs font-bold text-[#5c3a00]">{C.heroChip(s.overdueCount)}</span>
              <p className="num mt-3 text-sm text-white/80">{C.heroInterest(formatINR(s.interestMayBeOwed))}</p>
            </>
          ) : (
            <p className="mt-3 text-sm text-white/80">{C.heroNone}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-2">
          <Kpi label={C.outstanding} value={formatINR(s.outstanding)} sub={C.outstandingSub(s.outstandingCount)} />
          <Kpi label={C.interest} value={formatINR(s.interestMayBeOwed)} sub={C.interestSub} />
          <Kpi label={C.clients} value={String(s.clientsOverdue)} sub={C.clientsSub} />
          <Kpi label={C.dueSoon} value={String(s.dueSoonCount)} sub={C.dueSoonSub} />
        </div>
      </section>

      <section aria-labelledby="db-pri-h">
        <div className="flex items-baseline gap-3">
          <h2 id="db-pri-h" className="text-xl font-bold tracking-tight">
            {C.prioritiesTitle}
          </h2>
          <span className="text-sm font-semibold text-link">{C.actionItems(actionCount)}</span>
        </div>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Action title={C.pOverdue} value={String(s.overdueCount)} unit={C.pOverdueUnit} href="/priorities" cta={C.review} tone={s.overdueCount ? "alert" : "neutral"} />
          <Action title={C.pMissed} value={String(s.missedPromises)} unit={C.pMissedUnit} href="/priorities" cta={C.followUp} tone={s.missedPromises ? "alert" : "neutral"} />
          <Action
            title={C.pTop}
            body={s.topClient ? <><span className="font-semibold text-ink">{s.topClient.client}</span><br /><span className="num">{s.topClient.reason}</span></> : C.pTopNone}
            href="/priorities"
            cta={C.open}
          />
          <Action title={C.pBlockers} body={C.pBlockersBody} href="/blockers" cta={C.analyse} />
          <Action
            title={C.pCash}
            body={
              forecast ? (
                <span className="num">
                  <span className={cx("font-semibold", forecast.lowest.balancePaise < 0 ? "text-danger" : "text-ink")}>{inrPaise(forecast.lowest.balancePaise)}</span> on {formatDate(forecast.lowest.date)}
                </span>
              ) : (
                C.pCashNone
              )
            }
            href="/cash"
            cta={C.plan}
            tone={forecast?.shortfall ? "alert" : "neutral"}
          />
          <Action title={C.pCheck} body={C.pCheckBody} href="/" cta={C.start} />
        </div>
      </section>

      <section aria-labelledby="db-cash-h">
        <div className="flex items-baseline gap-3">
          <h2 id="db-cash-h" className="text-xl font-bold tracking-tight">
            {C.cashTitle}
          </h2>
          <span className="text-sm text-muted">{C.cashWindow}</span>
        </div>
        {forecast ? (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Kpi label={C.expectedIn} value={inrPaise(forecast.totals.inflowPaise)} sub="expected, not guaranteed" />
            <Kpi label={C.goingOut} value={inrPaise(forecast.totals.outflowPaise)} sub="bills and salaries entered" />
            <Kpi label={C.lowest} value={inrPaise(forecast.lowest.balancePaise)} sub={`on ${formatDate(forecast.lowest.date)}`} />
            <Kpi
              label={forecast.shortfall ? C.shortfall : C.noShortfall}
              value={forecast.shortfall ? inrPaise(forecast.shortfall.amountPaise) : C.healthy}
              sub={forecast.shortfall ? `below zero on ${formatDate(forecast.shortfall.date)}` : "in the next 30 days"}
            />
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-card bg-surface p-5 shadow-card">
            <p className="text-muted">{C.cashSetupBody}</p>
            <Link href="/cash" className="inline-flex min-h-11 items-center rounded-button bg-brand-700 px-4 font-semibold text-on-brand hover:bg-brand-800">
              {C.cashSetup}
            </Link>
          </div>
        )}
      </section>

      <p className="text-sm text-muted">{C.notAdvice}</p>
    </div>
  );
}
