import type { SupabaseClient } from "@supabase/supabase-js";
import type { ToolkitInvoice } from "@/lib/intel/priority";

// The saved invoice list (table public.invoices, supabase/migrations). Only these confirmed fields
// are ever sent: never the invoice file, the AI's reading of it, client replies or email drafts.

export type InvoiceRow = {
  id: string;
  client: string;
  number: string;
  amount: number;
  invoice_date: string;
  acceptance_date: string;
  agreement_days: number | null;
  promised_date: string | null;
  paid: boolean;
};

const COLUMNS = "id,client,number,amount,invoice_date,acceptance_date,agreement_days,promised_date,paid";

export function rowFromInvoice(i: ToolkitInvoice): InvoiceRow {
  return {
    id: i.id,
    client: i.client,
    number: i.number,
    amount: i.amount,
    invoice_date: i.invoiceDate,
    acceptance_date: i.acceptanceDate,
    agreement_days: i.agreementDays,
    promised_date: i.promisedDate,
    paid: i.paid,
  };
}

export function invoiceFromRow(r: InvoiceRow): ToolkitInvoice {
  return {
    id: r.id,
    client: r.client,
    number: r.number,
    amount: Number(r.amount), // numeric can arrive as a string
    invoiceDate: r.invoice_date,
    acceptanceDate: r.acceptance_date,
    agreementDays: r.agreement_days,
    promisedDate: r.promised_date,
    paid: r.paid,
  };
}

/** Fictional sample rows stay in this tab only; they are never saved to an account. */
export const savable = (i: ToolkitInvoice) => !i.sample;

/**
 * On sign-in: what to upload (this tab's own invoices that the account doesn't have yet) and the
 * list to show (the account's invoices, then those uploads, then any sample rows).
 */
export function mergeOnSignIn(local: ToolkitInvoice[], saved: ToolkitInvoice[]): { upload: ToolkitInvoice[]; list: ToolkitInvoice[] } {
  const have = new Set(saved.map((i) => i.id));
  const upload = local.filter((i) => savable(i) && !have.has(i.id));
  return { upload, list: [...saved, ...upload, ...local.filter((i) => !savable(i))] };
}

type Result = { ok: true } | { ok: false; error: string };
const done = (error: { message: string } | null): Result => (error ? { ok: false, error: error.message } : { ok: true });

export async function listInvoices(sb: SupabaseClient): Promise<{ ok: true; invoices: ToolkitInvoice[] } | { ok: false; error: string }> {
  const { data, error } = await sb.from("invoices").select(COLUMNS).order("created_at", { ascending: true });
  if (error) return { ok: false, error: error.message };
  return { ok: true, invoices: ((data ?? []) as InvoiceRow[]).map(invoiceFromRow) };
}

/** Insert or update by id. The database fills in user_id from the signed-in user. */
export async function saveInvoices(sb: SupabaseClient, invoices: ToolkitInvoice[]): Promise<Result> {
  const rows = invoices.filter(savable).map(rowFromInvoice);
  if (rows.length === 0) return { ok: true };
  const { error } = await sb.from("invoices").upsert(rows, { onConflict: "id" });
  return done(error);
}

export async function deleteInvoice(sb: SupabaseClient, id: string): Promise<Result> {
  const { error } = await sb.from("invoices").delete().eq("id", id);
  return done(error);
}

/** Deletes every saved invoice of the signed-in user (row-level security limits it to theirs). */
export async function deleteAllInvoices(sb: SupabaseClient): Promise<Result> {
  const { error } = await sb.from("invoices").delete().not("id", "is", null);
  return done(error);
}

/** Deletes the account and its invoices (public.delete_my_account), then signs out. */
export async function deleteAccount(sb: SupabaseClient): Promise<Result> {
  const { error } = await sb.rpc("delete_my_account");
  if (error) return { ok: false, error: error.message };
  await sb.auth.signOut();
  return { ok: true };
}
