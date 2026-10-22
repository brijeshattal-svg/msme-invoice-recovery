"use client";

import { useState } from "react";
import { CASH_COPY as C } from "@/lib/copy";
import { addDays } from "@/lib/engine";
import {
  forecastCash,
  parsePaise,
  toCashItems,
  validateCashDraft,
  validateStartingCash,
  WINDOW_DAYS,
  type CashDraft,
  type Forecast,
} from "@/lib/forecast/cash";
import { formatDate } from "@/lib/format";
import { viewInvoice } from "@/lib/intel/priority";
import { todayIST } from "@/lib/today";
import { Banner } from "../ui/Banner";
import { Button } from "../ui/Button";
import { Disclosure } from "../ui/Disclosure";
import { CashChart } from "./CashChart";
import { inrPaise } from "./money";
import { newId, useToolkit } from "./state";

type Row = CashDraft & { fromPriorities?: boolean; sample?: boolean };

const inputCls = "min-h-12 w-full rounded-input border-2 border-control bg-surface px-3 text-base text-ink";

/** One editable item (collection or expense). Errors show once a field has something in it. */
function ItemRow({ row, kind, onChange, onRemove }: { row: Row; kind: "in" | "out"; onChange: (r: Row) => void; onRemove: () => void }) {
  const err = validateCashDraft(row);
  const id = (f: string) => `cf-${row.id}-${f}`;
  const counted = Object.keys(err).length === 0;
  return (
    <li className="rounded-card border border-line p-4">
      <div className="grid grid-cols-2 gap-x-3 gap-y-3">
        <div className="col-span-2">
          <label htmlFor={id("label")} className="text-sm font-semibold">
            {C.descLabel}
          </label>
          <input
            id={id("label")}
            value={row.label}
            placeholder={kind === "in" ? C.collectionPlaceholder : C.expensePlaceholder}
            onChange={(e) => onChange({ ...row, label: e.target.value })}
            className={`${inputCls} mt-1`}
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor={id("amount")} className="text-sm font-semibold">
            {C.amountLabel}
          </label>
          <input
            id={id("amount")}
            inputMode="decimal"
            value={row.amount}
            onChange={(e) => onChange({ ...row, amount: e.target.value })}
            aria-invalid={!!row.amount && !!err.amount}
            aria-describedby={row.amount && err.amount ? id("amount-err") : undefined}
            className={`${inputCls} num mt-1`}
          />
        </div>
        <div>
          <label htmlFor={id("date")} className="text-sm font-semibold">
            {kind === "in" ? C.dateIn : C.dateOut}
          </label>
          <input
            id={id("date")}
            type="date"
            value={row.date}
            onChange={(e) => onChange({ ...row, date: e.target.value })}
            aria-invalid={!!row.date && !!err.date}
            className={`${inputCls} num mt-1 px-2`}
          />
        </div>
      </div>
      {row.amount && err.amount && (
        <p id={id("amount-err")} className="mt-2 text-sm font-semibold text-danger">
          {err.amount}
        </p>
      )}
      {!counted && !(row.amount && err.amount) && <p className="mt-2 text-sm text-muted">{C.notCounted}</p>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {kind === "in" ? (
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[15px] font-medium">
            <input type="checkbox" checked={row.mayBeLate} onChange={(e) => onChange({ ...row, mayBeLate: e.target.checked })} className="h-5 w-5 accent-[var(--brand-700)]" />
            {C.mayBeLate}
          </label>
        ) : (
          <span />
        )}
        <Button variant="link" tone="muted" className="text-sm" onClick={onRemove} aria-label={`${C.remove} ${row.label || (kind === "in" ? C.collectionPlaceholder : C.expensePlaceholder)}`}>
          {C.remove}
        </Button>
      </div>
    </li>
  );
}

function Summary({ f, title, tone }: { f: Forecast; title: string; tone: "expected" | "late" }) {
  const end = formatDate(f.rows[WINDOW_DAYS - 1].date);
  const overdue = f.inside.filter((p) => p.overdue).length + f.outside.filter((p) => p.overdue).length;
  return (
    <div className={`rounded-card p-5 ${tone === "late" ? "border-2 border-dashed border-warn-ink bg-surface" : "bg-brand-50"}`}>
      <h4 className="font-semibold">{title}</h4>
      <p className="num mt-2 text-lg font-semibold">{C.lowest(inrPaise(f.lowest.balancePaise), formatDate(f.lowest.date))}</p>
      {f.shortfall ? (
        <p className="num mt-2 rounded-input bg-warn-bg p-2 font-semibold text-warn-ink">{C.shortfall(inrPaise(f.shortfall.amountPaise), formatDate(f.shortfall.date))}</p>
      ) : (
        <p className="mt-2 font-semibold text-brand-800">{C.noShortfall}</p>
      )}
      <p className="num mt-2 text-sm text-muted">{C.totals(inrPaise(f.totals.inflowPaise), inrPaise(f.totals.outflowPaise))}</p>
      {overdue > 0 && <p className="mt-1 text-sm text-muted">{C.overdueNote(overdue)}</p>}
      {f.outside.length > 0 && <p className="mt-1 text-sm text-muted">{C.outsideNote(f.outside.length, end)}</p>}
    </div>
  );
}

/** Cash tab: manual inputs -> pure, tested forecast (lib/forecast/cash.ts). Memory only. */
export function CashForecast() {
  const { invoices } = useToolkit();
  const [today] = useState(() => todayIST());
  const [start, setStart] = useState("");
  const [collections, setCollections] = useState<Row[]>([]);
  const [expenses, setExpenses] = useState<Row[]>([]);
  const [late, setLate] = useState(false);

  const unpaid = invoices.filter((i) => !i.paid);
  const blank = (): Row => ({ id: newId(), label: "", amount: "", date: addDays(today, 7), mayBeLate: true });

  function prefill() {
    const fromInvoices: Row[] = unpaid.map((inv) => ({
      id: newId(),
      label: `${inv.client} · ${inv.number}`,
      amount: String(inv.amount),
      date: viewInvoice(inv, today).dueDate ?? inv.invoiceDate,
      mayBeLate: true,
      fromPriorities: true,
      sample: inv.sample,
    }));
    setCollections((xs) => [...xs.filter((x) => !x.fromPriorities), ...fromInvoices]);
  }

  const startError = start.trim() === "" ? null : validateStartingCash(start);
  const startPaise = start.trim() === "" || startError ? null : parsePaise(start);
  const input = startPaise === null ? null : { today, startingCashPaise: startPaise, collections: toCashItems(collections), expenses: toCashItems(expenses) };
  const expected = input ? forecastCash(input, "expected") : null;
  const lateF = input && late ? forecastCash(input, "late") : null;
  const ticked = collections.filter((c) => c.mayBeLate).length;
  const hasPrefilled = collections.some((c) => c.fromPriorities);
  const hasSample = collections.some((c) => c.sample);

  const update = (set: typeof setCollections) => (r: Row) => set((xs) => xs.map((x) => (x.id === r.id ? r : x)));
  const remove = (set: typeof setCollections, id: string) => set((xs) => xs.filter((x) => x.id !== id));

  return (
    <section aria-labelledby="cf-h" className="flex flex-col gap-5">
      <div className="rounded-hero bg-surface p-6 shadow-raised">
        <h2 id="cf-h" className="text-xl font-bold tracking-tight">
          {C.heading}
        </h2>
        <p className="mt-1 text-muted">{C.help}</p>
        <label htmlFor="cf-start" className="mt-5 block font-semibold">
          {C.startLabel}
        </label>
        <p className="text-sm text-muted">{C.startHelp}</p>
        <input
          id="cf-start"
          inputMode="decimal"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          aria-invalid={!!startError}
          aria-describedby={startError ? "cf-start-err" : undefined}
          className={`${inputCls} num mt-2`}
        />
        {startError && (
          <p id="cf-start-err" className="mt-1 text-sm font-semibold text-danger">
            {startError}
          </p>
        )}
      </div>

      <section aria-labelledby="cf-in-h" className="rounded-hero bg-surface p-6 shadow-raised">
        <h3 id="cf-in-h" className="section-label">
          {C.collectionsTitle}
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={prefill} disabled={unpaid.length === 0}>
            {C.prefill(unpaid.length)}
          </Button>
        </div>
        {unpaid.length === 0 && <p className="mt-2 text-sm text-muted">{C.prefillNone}</p>}
        {hasPrefilled && <p className="mt-2 text-sm text-muted">{C.prefillNote}</p>}
        {hasSample && (
          <Banner tone="warn" size="sm" role="note" className="mt-3">
            <p className="font-semibold">{C.sampleNote}</p>
          </Banner>
        )}
        <ul className="mt-4 flex flex-col gap-3">
          {collections.map((r) => (
            <ItemRow key={r.id} row={r} kind="in" onChange={update(setCollections)} onRemove={() => remove(setCollections, r.id)} />
          ))}
        </ul>
        <Button variant="link" className="mt-3 text-base font-semibold" onClick={() => setCollections((xs) => [...xs, blank()])}>
          + {C.addCollection}
        </Button>
      </section>

      <section aria-labelledby="cf-out-h" className="rounded-hero bg-surface p-6 shadow-raised">
        <h3 id="cf-out-h" className="section-label">
          {C.expensesTitle}
        </h3>
        <ul className="mt-4 flex flex-col gap-3">
          {expenses.map((r) => (
            <ItemRow key={r.id} row={r} kind="out" onChange={update(setExpenses)} onRemove={() => remove(setExpenses, r.id)} />
          ))}
        </ul>
        <Button variant="link" className="mt-3 text-base font-semibold" onClick={() => setExpenses((xs) => [...xs, { ...blank(), mayBeLate: false }])}>
          + {C.addExpense}
        </Button>
      </section>

      {!expected ? (
        <p className="rounded-hero bg-surface p-6 text-center text-muted shadow-raised">{C.enterStart}</p>
      ) : (
        <section aria-labelledby="cf-res-h" className="rounded-hero bg-surface p-6 shadow-raised">
          <h3 id="cf-res-h" className="section-label">
            {C.chartTitle}
          </h3>
          <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 text-[15px] font-medium">
            <input type="checkbox" checked={late} onChange={(e) => setLate(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand-700)]" />
            <span>{C.lateToggle}</span>
          </label>
          {late && ticked === 0 && <p className="mt-1 text-sm text-muted">{C.lateNoneTicked}</p>}

          <div aria-live="polite" className="mt-4 grid gap-3 sm:grid-cols-2">
            <Summary f={expected} title={C.expectedTitle} tone="expected" />
            {lateF && <Summary f={lateF} title={C.lateTitle} tone="late" />}
          </div>

          <div className="mt-5">
            <CashChart expected={expected} late={lateF} />
          </div>

          <Disclosure summary={C.tableTitle} className="mt-4 rounded-card border border-line" summaryClassName="px-4 py-3 text-[15px]">
            <div className="overflow-x-auto px-2 pb-3">
              <table className="num w-full min-w-[320px] text-right text-sm">
                <thead>
                  <tr className="border-b-2 border-line">
                    <th scope="col" className="px-2 py-2 text-left font-semibold">{C.colDate}</th>
                    <th scope="col" className="px-2 py-2 font-semibold">{C.colIn}</th>
                    <th scope="col" className="px-2 py-2 font-semibold">{C.colOut}</th>
                    <th scope="col" className="px-2 py-2 font-semibold">{C.colBalance}</th>
                    {lateF && <th scope="col" className="px-2 py-2 font-semibold">{C.colLateBalance}</th>}
                  </tr>
                </thead>
                <tbody>
                  {expected.rows.map((r, i) => (
                    <tr key={r.date} className="border-b border-line">
                      <th scope="row" className="px-2 py-1.5 text-left font-medium">{formatDate(r.date)}</th>
                      <td className="px-2 py-1.5">{r.inflowPaise ? inrPaise(r.inflowPaise) : "–"}</td>
                      <td className="px-2 py-1.5">{r.outflowPaise ? inrPaise(r.outflowPaise) : "–"}</td>
                      <td className={`px-2 py-1.5 ${r.balancePaise < 0 ? "font-semibold text-danger" : ""}`}>{inrPaise(r.balancePaise)}</td>
                      {lateF && <td className={`px-2 py-1.5 ${lateF.rows[i].balancePaise < 0 ? "font-semibold text-danger" : ""}`}>{inrPaise(lateF.rows[i].balancePaise)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Disclosure>
        </section>
      )}

      <section aria-labelledby="cf-assume-h" className="rounded-hero bg-surface p-6 shadow-raised">
        <h3 id="cf-assume-h" className="section-label">
          {C.assumptionsTitle}
        </h3>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-[15px] text-muted">
          {C.assumptions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </section>
    </section>
  );
}
