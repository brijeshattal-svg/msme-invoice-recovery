import { compute, daysBetween, isValidISODate } from "@/lib/engine";
import { MAX_AMOUNT } from "@/lib/wizard";

// SPRINT_PLAN.md section 2.3: which client needs attention first. Pure and deterministic.
// Due dates and days overdue come from lib/engine (the legal rules are not duplicated here).

/** One invoice in the toolkit's temporary, in-memory list. Amounts in rupees. */
export type ToolkitInvoice = {
  id: string;
  client: string;
  number: string;
  amount: number;
  invoiceDate: string;
  acceptanceDate: string;
  /** null = no written agreement (15-day rule). */
  agreementDays: number | null;
  /** A payment date the client promised, as entered by the founder. */
  promisedDate: string | null;
  paid: boolean;
  /** True for rows from "Load fictional sample". */
  sample?: boolean;
};

export type InvoiceState = "paid" | "not_yet_due" | "overdue";

export type InvoiceView = {
  invoice: ToolkitInvoice;
  state: InvoiceState;
  dueDate: string | null;
  daysOverdue: number;
  /** Section 16 interest that may be owed today, when the engine can work it out. */
  interest: number | null;
  missedPromise: boolean;
};

export type ClientPriority = {
  client: string;
  overdueAmount: number;
  overdueCount: number;
  oldestDaysOverdue: number;
  missedPromises: number;
  score: number;
  reason: string;
  invoices: InvoiceView[];
};

/** Payment patterns need paid-invoice history this sprint doesn't have (SPRINT_PLAN.md 1.2 rule 7). */
export const HISTORY_NOTE = "Not enough history yet";

export const SCORE_FORMULA =
  "score = log10(1 + overdue amount in ₹) × (1 + oldest days overdue ÷ 30) × (1 + 0.5 × missed promises)";

const inr = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (n: number) => `₹${inr.format(n)}`;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Due date, days overdue and interest for one invoice, from the existing engine. The engine's
 * Udyam check is not relevant to prioritising, so the Udyam date is passed as the invoice date
 * (which can never be "after the invoice"); eligibility stays in Quick Check.
 */
export function viewInvoice(inv: ToolkitInvoice, today: string): InvoiceView {
  const base = { invoice: inv, interest: null, missedPromise: false };
  const r = compute({
    amount: inv.amount,
    invoiceDate: inv.invoiceDate,
    acceptanceDate: inv.acceptanceDate,
    agreementDays: inv.agreementDays,
    udyamDate: inv.invoiceDate,
    asOf: today,
  });
  const dueDate = r.status === "udyam_after_invoice" ? null : r.lastPayableDate;
  if (inv.paid) return { ...base, state: "paid", dueDate, daysOverdue: 0 };

  const missedPromise = inv.promisedDate !== null && inv.promisedDate < today;
  if (r.status === "overdue") {
    return { ...base, state: "overdue", dueDate, daysOverdue: r.daysOverdue, interest: r.totalInterest, missedPromise };
  }
  if (r.status === "rate_history_not_loaded") {
    // Too old for the loaded rate table: still overdue, but no interest figure.
    return { ...base, state: "overdue", dueDate, daysOverdue: daysBetween(r.lastPayableDate, today), missedPromise };
  }
  return { ...base, state: "not_yet_due", dueDate, daysOverdue: 0, missedPromise };
}

export function scoreOf(overdueAmount: number, oldestDaysOverdue: number, missedPromises: number): number {
  return Math.log10(1 + overdueAmount) * (1 + oldestDaysOverdue / 30) * (1 + 0.5 * missedPromises);
}

export function reasonOf(c: Pick<ClientPriority, "overdueAmount" | "overdueCount" | "oldestDaysOverdue" | "missedPromises">): string {
  const parts = [
    `${money(c.overdueAmount)} overdue across ${plural(c.overdueCount, "invoice", "invoices")}`,
    `oldest ${plural(c.oldestDaysOverdue, "day", "days")}`,
  ];
  if (c.missedPromises > 0) parts.push(plural(c.missedPromises, "missed promise", "missed promises"));
  return parts.join(", ");
}

/** Client names are grouped case- and space-insensitively; the first spelling entered is shown. */
const clientKey = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Clients with at least one overdue, unpaid invoice, highest score first. Ties: larger overdue
 * amount, then client name. Clients with nothing overdue are returned separately.
 */
export function rankClients(invoices: ToolkitInvoice[], today: string): { ranked: ClientPriority[]; clear: string[] } {
  const groups = new Map<string, { client: string; views: InvoiceView[] }>();
  for (const inv of invoices) {
    const key = clientKey(inv.client);
    const g = groups.get(key) ?? { client: inv.client.trim().replace(/\s+/g, " "), views: [] };
    g.views.push(viewInvoice(inv, today));
    groups.set(key, g);
  }

  const ranked: ClientPriority[] = [];
  const clear: string[] = [];
  for (const { client, views } of groups.values()) {
    const overdue = views.filter((v) => v.state === "overdue");
    if (overdue.length === 0) {
      clear.push(client);
      continue;
    }
    // Sum in paise so totals like ₹0.10 + ₹0.20 stay exact.
    const overdueAmount = overdue.reduce((s, v) => s + Math.round(v.invoice.amount * 100), 0) / 100;
    const oldestDaysOverdue = Math.max(...overdue.map((v) => v.daysOverdue));
    const missedPromises = overdue.filter((v) => v.missedPromise).length;
    const c = { overdueAmount, overdueCount: overdue.length, oldestDaysOverdue, missedPromises };
    ranked.push({
      client,
      ...c,
      score: scoreOf(overdueAmount, oldestDaysOverdue, missedPromises),
      reason: reasonOf(c),
      invoices: [...views].sort((a, b) => b.daysOverdue - a.daysOverdue),
    });
  }
  ranked.sort((a, b) => b.score - a.score || b.overdueAmount - a.overdueAmount || a.client.localeCompare(b.client));
  clear.sort((a, b) => a.localeCompare(b));
  return { ranked, clear };
}

export type InvoiceDraft = {
  client: string;
  number: string;
  amount: string;
  invoiceDate: string;
  acceptanceDate: string;
  agreementDays: string;
  promisedDate: string;
};
export type InvoiceDraftErrors = Partial<Record<keyof InvoiceDraft, string>>;

/** Same standards as the Quick Check form: digits with up to 2 decimals, real dates, nothing in the future. */
export function validateInvoiceDraft(d: InvoiceDraft, today: string): InvoiceDraftErrors {
  const e: InvoiceDraftErrors = {};
  if (!d.client.trim()) e.client = "Enter the client's name.";
  if (!d.number.trim()) e.number = "Enter the invoice number.";
  const a = d.amount.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(a) || Number(a) <= 0) e.amount = "Enter the amount in rupees, with at most 2 decimal places.";
  else if (Number(a) > MAX_AMOUNT) e.amount = "That amount looks too large. Please check it.";
  if (!isValidISODate(d.invoiceDate)) e.invoiceDate = "Enter a valid invoice date.";
  else if (d.invoiceDate > today) e.invoiceDate = "The invoice date can't be in the future.";
  if (d.acceptanceDate && !isValidISODate(d.acceptanceDate)) e.acceptanceDate = "Enter a valid date.";
  else if (d.acceptanceDate > today) e.acceptanceDate = "The acceptance date can't be in the future.";
  if (d.agreementDays.trim() !== "") {
    const n = Number(d.agreementDays);
    if (!Number.isInteger(n) || n < 0 || n > 365) e.agreementDays = "Enter whole days from 0 to 365, or leave it blank.";
  }
  if (d.promisedDate && !isValidISODate(d.promisedDate)) e.promisedDate = "Enter a valid date.";
  return e;
}

/** A validated draft as an invoice (call only when validateInvoiceDraft returned no errors). */
export function toInvoice(d: InvoiceDraft, id: string): ToolkitInvoice {
  return {
    id,
    client: d.client.trim(),
    number: d.number.trim(),
    amount: Number(d.amount.trim()),
    invoiceDate: d.invoiceDate,
    acceptanceDate: d.acceptanceDate || d.invoiceDate,
    agreementDays: d.agreementDays.trim() === "" ? null : Number(d.agreementDays),
    promisedDate: d.promisedDate || null,
    paid: false,
  };
}
