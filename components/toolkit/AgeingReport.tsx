"use client";

import Link from "next/link";
import { useState } from "react";
import { REPORTS_COPY as C } from "@/lib/copy";
import { formatINR } from "@/lib/format";
import { AGEING_BUCKETS, ageingCsv, ageingReport } from "@/lib/intel/dashboard";
import { todayIST } from "@/lib/today";
import { Banner } from "../ui/Banner";
import { Button } from "../ui/Button";
import { useToolkit } from "./state";

/** Ageing report over the in-memory invoice list. The CSV is built in the browser; nothing is uploaded. */
export function AgeingReport() {
  const { invoices } = useToolkit();
  const [today] = useState(() => todayIST());
  const [toast, setToast] = useState<string | null>(null);
  const report = ageingReport(invoices, today);
  const hasSample = invoices.some((i) => i.sample && !i.paid);

  if (report.rows.length === 0) {
    return (
      <div className="rounded-hero bg-surface p-8 text-center shadow-raised">
        <p className="text-muted">{C.empty}</p>
        <Link href="/priorities" className="mt-4 inline-flex min-h-11 items-center rounded-button bg-brand-700 px-4 font-semibold text-on-brand hover:bg-brand-800">
          {C.goPriorities}
        </Link>
      </div>
    );
  }

  function download() {
    const blob = new Blob([ageingCsv(report, today)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ageing-report-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setToast(C.downloaded);
  }

  return (
    <section aria-label="Ageing report" className="flex flex-col gap-4">
      {hasSample && (
        <Banner tone="warn" size="sm" role="note">
          <p className="font-semibold">{C.sampleBanner}</p>
        </Banner>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[46em] text-sm text-muted">{C.note}</p>
        <div className="flex items-center gap-3">
          <p role="status" aria-live="polite" className="text-sm font-semibold text-link">
            {toast}
          </p>
          <Button onClick={download}>{C.download}</Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-card bg-surface shadow-card">
        <table className="num w-full min-w-[720px] text-right text-sm">
          <thead>
            <tr className="border-b-2 border-line">
              <th scope="col" className="px-4 py-3 text-left font-semibold">
                {C.client}
              </th>
              {AGEING_BUCKETS.map((b) => (
                <th key={b} scope="col" className="px-4 py-3 font-semibold">
                  {b}
                </th>
              ))}
              <th scope="col" className="px-4 py-3 font-semibold">
                {C.total}
              </th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((r) => (
              <tr key={r.client} className="border-b border-line">
                <th scope="row" className="px-4 py-3 text-left font-medium">
                  {r.client}
                </th>
                {AGEING_BUCKETS.map((b) => (
                  <td key={b} className={`px-4 py-3 ${b === "Over 90 days" && r.buckets[b] > 0 ? "font-semibold text-danger" : ""}`}>
                    {r.buckets[b] ? formatINR(r.buckets[b]) : "–"}
                  </td>
                ))}
                <td className="px-4 py-3 font-semibold">{formatINR(r.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-brand-50">
              <th scope="row" className="px-4 py-3 text-left font-bold">
                {report.totals.client}
              </th>
              {AGEING_BUCKETS.map((b) => (
                <td key={b} className="px-4 py-3 font-bold">
                  {formatINR(report.totals.buckets[b])}
                </td>
              ))}
              <td className="px-4 py-3 font-bold">{formatINR(report.totals.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
