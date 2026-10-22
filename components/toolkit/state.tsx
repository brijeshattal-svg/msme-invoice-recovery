"use client";

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { addDays } from "@/lib/engine";
import type { CashDraft } from "@/lib/forecast/cash";
import type { ToolkitInvoice } from "@/lib/intel/priority";

// SPRINT_PLAN.md section 1.2: memory only. No localStorage, no server, gone on refresh or in a new tab.

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
};

const Ctx = createContext<ToolkitState | null>(null);

let seq = 0;
export const newId = () => `inv-${Date.now().toString(36)}-${++seq}`;

/**
 * Fictional sample: invented clients and numbers, dated relative to today so the demo always shows
 * a mix of overdue, not-yet-due, paid and missed-promise cases. Every row is flagged `sample`.
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
 * tool pages. Still memory only: a refresh or a new tab starts empty.
 */
export function ToolkitProvider({ children, initial = [] }: { children: ReactNode; initial?: ToolkitInvoice[] }) {
  const [invoices, setInvoices] = useState<ToolkitInvoice[]>(initial);
  const [fromQuickCheckId, setFromQuickCheckId] = useState<string | null>(null);
  const [start, setStart] = useState("");
  const [collections, setCollections] = useState<CashRow[]>([]);
  const [expenses, setExpenses] = useState<CashRow[]>([]);
  const [late, setLate] = useState(false);
  const value: ToolkitState = {
    cash: { start, setStart, collections, setCollections, expenses, setExpenses, late, setLate },
    invoices,
    fromQuickCheck: fromQuickCheckId !== null && invoices.some((i) => i.id === fromQuickCheckId),
    addFromQuickCheck: (inv) => {
      setInvoices((xs) => [...xs, inv]);
      setFromQuickCheckId(inv.id);
    },
    add: (inv) => setInvoices((xs) => [...xs, inv]),
    update: (id, patch) => setInvoices((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x))),
    remove: (id) => setInvoices((xs) => xs.filter((x) => x.id !== id)),
    loadSample: (today) => setInvoices((xs) => [...xs.filter((x) => !x.sample), ...sampleInvoices(today)]),
    clear: () => setInvoices([]),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useToolkit(): ToolkitState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToolkit must be used inside ToolkitProvider");
  return v;
}
