import { addDays } from "@/lib/engine";
import { rankClients, viewInvoice, type ToolkitInvoice } from "./priority";

// Workspace dashboard and ageing report. Pure functions over the in-memory invoice list; every
// figure is derived from lib/engine via viewInvoice, and money is summed in paise.

export type DashboardSummary = {
  /** Unpaid invoices, overdue or not. */
  outstanding: number;
  outstandingCount: number;
  overdue: number;
  overdueCount: number;
  /** Section 16 interest that may be owed on overdue invoices, where the engine can work it out. */
  interestMayBeOwed: number;
  /** Unpaid, not yet overdue, with the last day to pay within the next 7 days (today included). */
  dueSoonCount: number;
  clientsOverdue: number;
  missedPromises: number;
  topClient: { client: string; reason: string } | null;
};

const paise = (r: number) => Math.round(r * 100);

export function summarize(invoices: ToolkitInvoice[], today: string): DashboardSummary {
  const views = invoices.map((i) => viewInvoice(i, today));
  const unpaid = views.filter((v) => v.state !== "paid");
  const overdue = views.filter((v) => v.state === "overdue");
  const weekEnd = addDays(today, 6);
  const { ranked } = rankClients(invoices, today);
  return {
    outstanding: unpaid.reduce((s, v) => s + paise(v.invoice.amount), 0) / 100,
    outstandingCount: unpaid.length,
    overdue: overdue.reduce((s, v) => s + paise(v.invoice.amount), 0) / 100,
    overdueCount: overdue.length,
    interestMayBeOwed: overdue.reduce((s, v) => s + paise(v.interest ?? 0), 0) / 100,
    dueSoonCount: views.filter((v) => v.state === "not_yet_due" && v.dueDate !== null && v.dueDate <= weekEnd).length,
    clientsOverdue: ranked.length,
    missedPromises: overdue.filter((v) => v.missedPromise).length,
    topClient: ranked[0] ? { client: ranked[0].client, reason: ranked[0].reason } : null,
  };
}

export const AGEING_BUCKETS = ["Not yet due", "1-30 days", "31-60 days", "61-90 days", "Over 90 days"] as const;
export type AgeingBucket = (typeof AGEING_BUCKETS)[number];

export function bucketOf(daysOverdue: number, overdue: boolean): AgeingBucket {
  if (!overdue) return "Not yet due";
  if (daysOverdue <= 30) return "1-30 days";
  if (daysOverdue <= 60) return "31-60 days";
  if (daysOverdue <= 90) return "61-90 days";
  return "Over 90 days";
}

export type AgeingRow = { client: string; buckets: Record<AgeingBucket, number>; total: number };

const emptyBuckets = (): Record<AgeingBucket, number> =>
  Object.fromEntries(AGEING_BUCKETS.map((b) => [b, 0])) as Record<AgeingBucket, number>;

/** Unpaid amounts per client and age bucket, largest total first; plus a totals row. */
export function ageingReport(invoices: ToolkitInvoice[], today: string): { rows: AgeingRow[]; totals: AgeingRow } {
  const byClient = new Map<string, { client: string; p: Record<AgeingBucket, number> }>();
  for (const inv of invoices) {
    const v = viewInvoice(inv, today);
    if (v.state === "paid") continue;
    const key = inv.client.trim().replace(/\s+/g, " ").toLowerCase();
    const row = byClient.get(key) ?? { client: inv.client.trim().replace(/\s+/g, " "), p: emptyBuckets() };
    row.p[bucketOf(v.daysOverdue, v.state === "overdue")] += paise(inv.amount);
    byClient.set(key, row);
  }
  const toRow = (client: string, p: Record<AgeingBucket, number>): AgeingRow => {
    const buckets = emptyBuckets();
    let total = 0;
    for (const b of AGEING_BUCKETS) {
      buckets[b] = p[b] / 100;
      total += p[b];
    }
    return { client, buckets, total: total / 100 };
  };
  const rows = [...byClient.values()].map((r) => toRow(r.client, r.p)).sort((a, b) => b.total - a.total || a.client.localeCompare(b.client));
  const sum = emptyBuckets();
  for (const r of byClient.values()) for (const b of AGEING_BUCKETS) sum[b] += r.p[b];
  return { rows, totals: toRow("Total", sum) };
}

/**
 * CSV for the ageing report. Cells are quoted, and any cell starting with = + - @ (or a tab or
 * carriage return) gets a leading apostrophe so a spreadsheet can't run it as a formula.
 */
export function ageingCsv(report: { rows: AgeingRow[]; totals: AgeingRow }, today: string): string {
  const cell = (s: string) => {
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const num = (n: number) => n.toFixed(2);
  const header = ["Client", ...AGEING_BUCKETS, "Total"].map(cell).join(",");
  const line = (r: AgeingRow) => [cell(r.client), ...AGEING_BUCKETS.map((b) => num(r.buckets[b])), num(r.total)].join(",");
  return [`${cell(`Ageing report as of ${today} (amounts in INR, unpaid invoices only)`)}`, header, ...report.rows.map(line), line(report.totals)].join("\r\n");
}
