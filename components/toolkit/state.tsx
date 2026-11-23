"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { addDays } from "@/lib/engine";
import type { CashDraft } from "@/lib/forecast/cash";
import type { ToolkitInvoice } from "@/lib/intel/priority";
import { accountsEnabled, getSupabase } from "@/lib/supabase/client";
import { deleteAccount, deleteAllInvoices, deleteInvoice, listInvoices, mergeOnSignIn, saveInvoices, savable } from "@/lib/supabase/invoices";

// Signed out (or with accounts not set up): memory only, as in SPRINT_PLAN.md section 1.2: no
// localStorage, no server, gone on refresh or in a new tab. Signed in: the same list is also saved
// to the founder's own account (lib/supabase), one row per invoice. Cash inputs stay in memory.

/** One editable cash item; `fromPriorities` rows were brought in from the invoice list. */
export type CashRow = CashDraft & { fromPriorities?: boolean; sample?: boolean };

/** The Cash page's inputs, kept here so the dashboard can show the forecast too. */
export type CashState = {
  start: string;
  setStart: Dispatch<SetStateAction<string>>;
  collections: CashRow[];
  setCollections: Dispatch<SetStateAction<CashRow[]>>;
  expenses: CashRow[];
  setExpenses: Dispatch<SetStateAction<CashRow[]>>;
  late: boolean;
  setLate: Dispatch<SetStateAction<boolean>>;
};

/** "off": not signed in or accounts not set up; the rest describe the last save to the account. */
export type SyncStatus = "off" | "loading" | "saving" | "saved" | "error";

export type Account = {
  /** This version has a Supabase project to save to. */
  enabled: boolean;
  user: { id: string; email: string } | null;
  sync: SyncStatus;
  /** Sends a one-time sign-in link to the email address. */
  signIn: (email: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  signOut: () => Promise<void>;
  /** Deletes every saved invoice, keeping the account. */
  deleteSaved: () => Promise<boolean>;
  /** Deletes the account and everything saved in it, then signs out. */
  deleteAccount: () => Promise<boolean>;
};

type ToolkitState = {
  cash: CashState;
  invoices: ToolkitInvoice[];
  /** True while the invoice last added from Quick Check is still in the list. */
  fromQuickCheck: boolean;
  /** Only on the founder's click on the Quick Check result screen. */
  addFromQuickCheck: (inv: ToolkitInvoice) => void;
  add: (inv: ToolkitInvoice) => void;
  update: (id: string, patch: Partial<ToolkitInvoice>) => void;
  remove: (id: string) => void;
  loadSample: (today: string) => void;
  clear: () => void;
  account: Account;
};

const Ctx = createContext<ToolkitState | null>(null);

/** A UUID, so the same id can be the saved row's primary key. */
export function newId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  const b = c.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * Fictional sample: invented clients and numbers, dated relative to today so the demo always shows
 * a mix of overdue, not-yet-due, paid and missed-promise cases. Every row is flagged `sample` and is
 * never saved to an account.
 */
export function sampleInvoices(today: string): ToolkitInvoice[] {
  const d = (days: number) => addDays(today, -days);
  const row = (client: string, number: string, amount: number, ageDays: number, extra: Partial<ToolkitInvoice> = {}): ToolkitInvoice => ({
    id: newId(),
    client,
    number,
    amount,
    invoiceDate: d(ageDays),
    acceptanceDate: d(ageDays),
    agreementDays: null,
    promisedDate: null,
    paid: false,
    sample: true,
    ...extra,
  });
  return [
    row("Orbitline Logistics Pvt Ltd (sample)", "SMP-101", 340000, 95, { promisedDate: d(20) }),
    row("Orbitline Logistics Pvt Ltd (sample)", "SMP-108", 120000, 50),
    row("Kestrel Foods Ltd (sample)", "SMP-104", 785000, 25, { agreementDays: 30 }),
    row("Bluepeak Health LLP (sample)", "SMP-102", 96000, 70, { promisedDate: d(5) }),
    row("Bluepeak Health LLP (sample)", "SMP-097", 150000, 120, { paid: true }),
    row("Northgate Media (sample)", "SMP-110", 210000, 40),
  ];
}

/**
 * Lives in the root layout, so the list survives client-side navigation between Quick Check and the
 * tool pages. Signed out, a refresh or a new tab starts empty; signed in, the list comes back.
 */
export function ToolkitProvider({ children, initial = [] }: { children: ReactNode; initial?: ToolkitInvoice[] }) {
  const [invoices, setInvoices] = useState<ToolkitInvoice[]>(initial);
  const [fromQuickCheckId, setFromQuickCheckId] = useState<string | null>(null);
  const [start, setStart] = useState("");
  const [collections, setCollections] = useState<CashRow[]>([]);
  const [expenses, setExpenses] = useState<CashRow[]>([]);
  const [late, setLate] = useState(false);
  const [user, setUser] = useState<Account["user"]>(null);
  const [sync, setSync] = useState<SyncStatus>("off");
  /** The user whose saved list is on screen; until it matches the signed-in user, we're loading. */
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const latest = useRef(invoices);
  useEffect(() => {
    latest.current = invoices;
  }, [invoices]);
  const prevUserId = useRef<string | null>(null);

  // Follow the sign-in state. The callback only records the user: Supabase calls made inside it
  // can deadlock, so loading happens in the effect below.
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    const toUser = (s: { user: { id: string; email?: string } } | null) => (s ? { id: s.user.id, email: s.user.email ?? "" } : null);
    const { data } = sb.auth.onAuthStateChange((_event, session) => {
      const next = toUser(session);
      // Signed out: clear the saved list from the screen (a shared computer shouldn't keep showing it).
      if (!next && prevUserId.current) setInvoices((xs) => xs.filter((x) => !savable(x)));
      prevUserId.current = next?.id ?? null;
      setUser((prev) => (prev?.id === next?.id ? prev : next));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Signed in: save this tab's own invoices to the account, then show the account's list.
  const userId = user?.id ?? null;
  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !userId) return;
    let cancelled = false;
    (async () => {
      const saved = await listInvoices(sb);
      if (cancelled) return;
      if (!saved.ok) {
        setSync("error");
        setLoadedFor(userId);
        return;
      }
      const { upload, list } = mergeOnSignIn(latest.current, saved.invoices);
      const up = await saveInvoices(sb, upload);
      if (cancelled) return;
      setInvoices(list);
      setSync(up.ok ? "saved" : "error");
      setLoadedFor(userId);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  /** Runs a save against the account when signed in; the screen has already changed. */
  const persist = useCallback(
    (op: (sb: NonNullable<ReturnType<typeof getSupabase>>) => Promise<{ ok: boolean }>) => {
      const sb = getSupabase();
      if (!sb || !userId) return;
      setSync("saving");
      op(sb).then((r) => setSync(r.ok ? "saved" : "error"));
    },
    [userId],
  );

  const account: Account = {
    enabled: accountsEnabled(),
    user,
    sync: !userId ? "off" : loadedFor !== userId ? "loading" : sync,
    signIn: async (email) => {
      const sb = getSupabase();
      if (!sb) return { ok: false, error: "Accounts are not set up on this version." };
      const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/account` } });
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    signOut: async () => {
      await getSupabase()?.auth.signOut();
    },
    deleteSaved: async () => {
      const sb = getSupabase();
      if (!sb || !userId) return false;
      const r = await deleteAllInvoices(sb);
      if (r.ok) setInvoices((xs) => xs.filter((x) => !savable(x)));
      return r.ok;
    },
    deleteAccount: async () => {
      const sb = getSupabase();
      if (!sb || !userId) return false;
      return (await deleteAccount(sb)).ok;
    },
  };

  const value: ToolkitState = {
    cash: { start, setStart, collections, setCollections, expenses, setExpenses, late, setLate },
    invoices,
    fromQuickCheck: fromQuickCheckId !== null && invoices.some((i) => i.id === fromQuickCheckId),
    addFromQuickCheck: (inv) => {
      setInvoices((xs) => [...xs, inv]);
      setFromQuickCheckId(inv.id);
      persist((sb) => saveInvoices(sb, [inv]));
    },
    add: (inv) => {
      setInvoices((xs) => [...xs, inv]);
      persist((sb) => saveInvoices(sb, [inv]));
    },
    update: (id, patch) => {
      const next = latest.current.find((x) => x.id === id);
      setInvoices((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
      if (next) persist((sb) => saveInvoices(sb, [{ ...next, ...patch }]));
    },
    remove: (id) => {
      setInvoices((xs) => xs.filter((x) => x.id !== id));
      persist((sb) => deleteInvoice(sb, id));
    },
    loadSample: (today) => setInvoices((xs) => [...xs.filter((x) => !x.sample), ...sampleInvoices(today)]),
    clear: () => {
      const saved = latest.current.filter(savable);
      setInvoices([]);
      if (saved.length) persist((sb) => deleteAllInvoices(sb));
    },
    account,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useToolkit(): ToolkitState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToolkit must be used inside ToolkitProvider");
  return v;
}
