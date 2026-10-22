"use client";

import { useState } from "react";
import { PRIORITIES_COPY as C } from "@/lib/copy";
import { formatDate, formatINR } from "@/lib/format";
import { HISTORY_NOTE, rankClients, SCORE_FORMULA } from "@/lib/intel/priority";
import { todayIST } from "@/lib/today";
import { Badge } from "../ui/Badge";
import { Banner } from "../ui/Banner";
import { Button } from "../ui/Button";
import { Disclosure } from "../ui/Disclosure";
import { InvoiceListEditor } from "./InvoiceListEditor";
import { useToolkit } from "./state";

/** Priorities tab: ranked clients (pure, tested logic in lib/intel/priority.ts) plus the editable list. */
export function PriorityList() {
  const { invoices, loadSample, clear } = useToolkit();
  const [today] = useState(() => todayIST());
  const { ranked, clear: clearClients } = rankClients(invoices, today);
  const hasSample = invoices.some((i) => i.sample);

  return (
    <section aria-labelledby="pr-h" className="flex flex-col gap-5">
      <div className="rounded-hero bg-surface p-6 shadow-raised">
        <h2 id="pr-h" className="text-xl font-bold tracking-tight">
          {C.heading}
        </h2>
        <p className="mt-1 text-muted">{C.help}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => loadSample(today)}>
            {C.loadSample}
          </Button>
          {invoices.length > 0 && (
            <Button variant="link" tone="muted" onClick={clear}>
              {C.clearAll}
            </Button>
          )}
        </div>
      </div>

      {hasSample && (
        <Banner tone="warn" size="sm" role="note">
          <p className="font-semibold">{C.sampleBanner}</p>
        </Banner>
      )}

      {invoices.length === 0 ? (
        <p className="rounded-hero bg-surface p-6 text-center text-muted shadow-raised">{C.empty}</p>
      ) : (
        <section aria-labelledby="pr-rank-h" className="rounded-hero bg-surface p-6 shadow-raised">
          <h3 id="pr-rank-h" className="section-label">
            {C.rankTitle}
          </h3>
          {ranked.length === 0 && <p className="mt-3 text-muted">{C.nothingOverdue}</p>}
          <ol className="mt-3 flex flex-col gap-4">
            {ranked.map((c, i) => (
              <li key={c.client} className="rounded-card border border-line p-4">
                <div className="flex items-start gap-3">
                  <span aria-hidden className="num grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 font-bold text-brand-800">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      <span className="sr-only">Priority {i + 1}: </span>
                      {c.client}
                    </p>
                    <p className="num text-[15px]">{c.reason}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {c.missedPromises > 0 && <Badge tone="warn">{C.missedChip(c.missedPromises)}</Badge>}
                      <Badge tone="neutral" title={C.historyHelp}>
                        {HISTORY_NOTE}
                      </Badge>
                    </div>
                    <ul className="num mt-3 flex flex-col gap-1 text-sm text-muted">
                      {c.invoices.map((v) => (
                        <li key={v.invoice.id}>
                          <span className="font-medium text-ink">{v.invoice.number}</span> · {formatINR(v.invoice.amount)} ·{" "}
                          {v.state === "overdue"
                            ? `${C.daysOverdue(v.daysOverdue)}${v.dueDate ? ` (${C.due(formatDate(v.dueDate))})` : ""}`
                            : v.state === "paid"
                              ? C.paid
                              : v.dueDate
                                ? C.notYetDue(formatDate(v.dueDate))
                                : ""}
                          {v.interest !== null && v.state === "overdue" && ` · ${C.interestMay(formatINR(v.interest))}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          {clearClients.length > 0 && (
            <p className="mt-4 text-sm text-muted">
              {C.clearTitle}: {clearClients.join(", ")}
            </p>
          )}
          <Disclosure summary={C.whyTitle} className="mt-4 rounded-card border border-line" summaryClassName="px-4 py-3 text-[15px]">
            <div className="flex flex-col gap-2 px-4 pb-4 text-sm">
              <p>{C.whyBody}</p>
              <p className="num rounded-input bg-canvas p-3 font-mono text-[13px]">{SCORE_FORMULA}</p>
              <p className="text-muted">{C.historyHelp}</p>
            </div>
          </Disclosure>
        </section>
      )}

      <InvoiceListEditor today={today} />
    </section>
  );
}
