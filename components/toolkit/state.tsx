"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { addDays } from "@/lib/engine";
import type { ToolkitInvoice } from "@/lib/intel/priority";

// SPRINT_PLAN.md section 1.2: memory only. No localStorage, no server, gone on refresh.

type ToolkitState = {
  invoices: ToolkitInvoice[];
  add: (inv: ToolkitInvoice) => void;
  update: (id: string, patch: Partial<ToolkitInvoice>) => void;
  remove: (id: string) => void;
  loadSample: (today: string) => void;
  clear: () => void;
};

const Ctx = createContext<ToolkitState | null>(null);

// Hand-off from Quick Check: set just before a client-side navigation to /toolkit (the JS module
// stays loaded, so this is still memory only), read when the toolkit mounts, then cleared.
let pending: ToolkitInvoice | null = null;
export function handOffInvoice(inv: ToolkitInvoice) {
  pending = inv;
}
/** Read without clearing (React may run state initialisers twice in development). */
export function peekHandOff(): ToolkitInvoice | null {
  return pending;
}
export function clearHandOff() {
  pending = null;
}

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

export function ToolkitProvider({ children, initial = [] }: { children: ReactNode; initial?: ToolkitInvoice[] }) {
  const [invoices, setInvoices] = useState<ToolkitInvoice[]>(initial);
  const value: ToolkitState = {
    invoices,
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
