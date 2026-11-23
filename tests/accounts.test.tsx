import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import PrivacyPage from "@/app/privacy/page";
import { Account } from "@/components/toolkit/Account";
import { ToolkitProvider, newId } from "@/components/toolkit/state";
import { ACCOUNT, COPY, HELP, LANDING, PRIVACY } from "@/lib/copy";
import type { ToolkitInvoice } from "@/lib/intel/priority";
import { accountsEnabled } from "@/lib/supabase/client";
import {
  deleteAccount,
  deleteAllInvoices,
  deleteInvoice,
  invoiceFromRow,
  listInvoices,
  mergeOnSignIn,
  rowFromInvoice,
  saveInvoices,
} from "@/lib/supabase/invoices";
import type { SupabaseClient } from "@supabase/supabase-js";

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");

const inv = (over: Partial<ToolkitInvoice> = {}): ToolkitInvoice => ({
  id: "6f1c2d3e-0000-4000-8000-000000000001",
  client: "Meridian Foods Pvt Ltd",
  number: "INV-000142",
  amount: 354000,
  invoiceDate: "2026-08-01",
  acceptanceDate: "2026-08-01",
  agreementDays: null,
  promisedDate: null,
  paid: false,
  ...over,
});

/** A stand-in for the Supabase query builder: records each call, answers with `result`. */
function fakeClient(result: { data?: unknown; error: { message: string } | null } = { data: [], error: null }) {
  const calls: { method: string; args: unknown[] }[] = [];
  const chain: Record<string, unknown> = {};
  for (const m of ["from", "select", "order", "upsert", "delete", "eq", "not", "rpc"]) {
    chain[m] = (...args: unknown[]) => {
      calls.push({ method: m, args });
      return chain;
    };
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(result);
  const signOut = vi.fn(async () => ({ error: null }));
  chain.auth = { signOut };
  return { sb: chain as unknown as SupabaseClient, calls, signOut };
}

describe("accounts are optional and off unless configured", () => {
  it("only an https URL and a real-looking key turn accounts on", () => {
    expect(accountsEnabled(undefined, undefined)).toBe(false);
    expect(accountsEnabled("https://x.supabase.co", "")).toBe(false);
    expect(accountsEnabled("http://x.supabase.co", "k".repeat(40))).toBe(false);
    expect(accountsEnabled("https://x.supabase.co", "k".repeat(40))).toBe(true);
  });

  it("this test build has no keys: the account page says so and nothing else changes", () => {
    expect(accountsEnabled()).toBe(false);
    const html = renderToStaticMarkup(
      <ToolkitProvider>
        <Account />
      </ToolkitProvider>,
    );
    expect(text(html)).toContain(ACCOUNT.notSetUp);
    expect(html).not.toContain("acc-email");
  });

  it("ids are UUIDs, so the same id is the saved row's key", () => {
    expect(newId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(newId()).not.toBe(newId());
  });
});

describe("what is saved", () => {
  it("only the confirmed list fields; they round-trip, and amounts arriving as text become numbers", () => {
    const row = rowFromInvoice(inv({ agreementDays: 30, promisedDate: "2026-10-01", sample: true }));
    expect(Object.keys(row).sort()).toEqual(["acceptance_date", "agreement_days", "amount", "client", "id", "invoice_date", "number", "paid", "promised_date"]);
    expect(invoiceFromRow({ ...row, amount: "354000.00" as unknown as number })).toEqual(inv({ agreementDays: 30, promisedDate: "2026-10-01" }));
  });

  it("on sign-in: this tab's own invoices are uploaded once; samples and already-saved ones are not", () => {
    const saved = [inv()];
    const mine = inv({ id: "6f1c2d3e-0000-4000-8000-000000000002", client: "Brightpath" });
    const sample = inv({ id: "6f1c2d3e-0000-4000-8000-000000000003", client: "Orbitline (sample)", sample: true });
    const { upload, list } = mergeOnSignIn([inv(), mine, sample], saved);
    expect(upload).toEqual([mine]);
    expect(list.map((i) => i.client)).toEqual(["Meridian Foods Pvt Ltd", "Brightpath", "Orbitline (sample)"]);
  });
});

describe("talking to Supabase", () => {
  it("lists the saved invoices oldest first", async () => {
    const { sb, calls } = fakeClient({ data: [rowFromInvoice(inv())], error: null });
    const r = await listInvoices(sb);
    expect(r).toEqual({ ok: true, invoices: [inv()] });
    expect(calls.map((c) => c.method)).toEqual(["from", "select", "order"]);
    expect(calls[0].args).toEqual(["invoices"]);
  });

  it("saves by id (insert or update) and never sends sample rows", async () => {
    const { sb, calls } = fakeClient();
    await saveInvoices(sb, [inv(), inv({ id: "s", sample: true })]);
    const upsert = calls.find((c) => c.method === "upsert")!;
    expect(upsert.args[0]).toEqual([rowFromInvoice(inv())]);
    expect(upsert.args[1]).toEqual({ onConflict: "id" });
    const none = fakeClient();
    expect(await saveInvoices(none.sb, [inv({ sample: true })])).toEqual({ ok: true });
    expect(none.calls).toEqual([]);
  });

  it("deletes one invoice, all invoices, or the whole account (then signs out)", async () => {
    const one = fakeClient();
    await deleteInvoice(one.sb, "abc");
    expect(one.calls.map((c) => [c.method, ...c.args])).toEqual([["from", "invoices"], ["delete"], ["eq", "id", "abc"]]);
    const all = fakeClient();
    await deleteAllInvoices(all.sb);
    expect(all.calls.map((c) => c.method)).toEqual(["from", "delete", "not"]);
    const acc = fakeClient();
    expect(await deleteAccount(acc.sb)).toEqual({ ok: true });
    expect(acc.calls).toEqual([{ method: "rpc", args: ["delete_my_account"] }]);
    expect(acc.signOut).toHaveBeenCalled();
  });

  it("reports a failure instead of pretending it saved (and doesn't sign out on a failed delete)", async () => {
    const bad = fakeClient({ data: null, error: { message: "network" } });
    expect(await saveInvoices(bad.sb, [inv()])).toEqual({ ok: false, error: "network" });
    expect(await listInvoices(bad.sb)).toEqual({ ok: false, error: "network" });
    expect(await deleteAccount(bad.sb)).toEqual({ ok: false, error: "network" });
    expect(bad.signOut).not.toHaveBeenCalled();
  });
});

describe("the database script keeps each list private", () => {
  const sql = readFileSync("supabase/migrations/20261123000000_saved_invoices.sql", "utf8").toLowerCase();

  it("row-level security is on, every policy is limited to the owner, and signed-out visitors get nothing", () => {
    expect(sql).toContain("alter table public.invoices enable row level security");
    const policies = sql.match(/create policy[^;]+;/g) ?? [];
    expect(policies).toHaveLength(4);
    for (const p of policies) expect(p).toMatch(/to authenticated/);
    for (const p of policies) expect(p).toContain("user_id = auth.uid()");
    expect(sql).toContain("revoke all on public.invoices from anon");
  });

  it("has no column that could hold a file, the AI's reading, a client reply or an email", () => {
    const table = sql.slice(sql.indexOf("create table"), sql.indexOf(");", sql.indexOf("create table")));
    for (const word of ["file", "body", "email", "reply", "extract", "draft", "subject", "jsonb", "bytea"]) expect(table).not.toContain(word);
  });

  it("deleting an account only ever deletes the caller's own data", () => {
    const fn = sql.slice(sql.indexOf("create or replace function public.delete_my_account"));
    expect(fn).toContain("where user_id = auth.uid()");
    expect(fn).toContain("where id = auth.uid()");
    expect(fn).toContain("revoke all on function public.delete_my_account() from public, anon");
  });
});

describe("the privacy story stays accurate", () => {
  it("no page claims there's no database or no login any more, but 'no login needed' stays true", () => {
    const all = JSON.stringify({ COPY, HELP, LANDING, PRIVACY });
    expect(all).not.toMatch(/no database|no login\b(?! needed)|No login\.|Nothing stored/);
    expect(LANDING.hero.proof).toContain("No login needed");
  });

  it("the privacy page explains accounts: what's saved, who hosts it, and deleting it", () => {
    const t = text(renderToStaticMarkup(<PrivacyPage />));
    expect(t).toContain(PRIVACY.accountTitle);
    expect(t).toContain("Supabase");
    expect(t).toContain("never save invoice files");
    expect(t).toMatch(/delete your saved list, or your whole account/);
  });
});
