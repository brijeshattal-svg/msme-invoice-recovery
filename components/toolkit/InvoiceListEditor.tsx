"use client";

import { useState } from "react";
import { PRIORITIES_COPY as C } from "@/lib/copy";
import { formatDate, formatINR } from "@/lib/format";
import { toInvoice, validateInvoiceDraft, type InvoiceDraft, type InvoiceDraftErrors, type ToolkitInvoice } from "@/lib/intel/priority";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { newId, useToolkit } from "./state";

const EMPTY: InvoiceDraft = { client: "", number: "", amount: "", invoiceDate: "", acceptanceDate: "", agreementDays: "", promisedDate: "" };

const toDraft = (i: ToolkitInvoice): InvoiceDraft => ({
  client: i.client,
  number: i.number,
  amount: String(i.amount),
  invoiceDate: i.invoiceDate,
  acceptanceDate: i.acceptanceDate === i.invoiceDate ? "" : i.acceptanceDate,
  agreementDays: i.agreementDays === null ? "" : String(i.agreementDays),
  promisedDate: i.promisedDate ?? "",
});

/** The temporary invoice list: add, edit, mark paid, remove. Memory only. */
export function InvoiceListEditor({ today }: { today: string }) {
  const { invoices, add, update, remove } = useToolkit();
  const [draft, setDraft] = useState<InvoiceDraft>(EMPTY);
  const [errors, setErrors] = useState<InvoiceDraftErrors>({});
  const [editing, setEditing] = useState<string | null>(null);

  const set = (k: keyof InvoiceDraft) => (e: { target: { value: string } }) => setDraft({ ...draft, [k]: e.target.value });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const found = validateInvoiceDraft(draft, today);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      document.getElementById(`pr-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    if (editing) {
      // An edited row is the founder's own data now, so it is no longer marked as sample.
      update(editing, { ...toInvoice(draft, editing), sample: false });
    } else {
      add(toInvoice(draft, newId()));
    }
    setDraft(EMPTY);
    setEditing(null);
  }

  return (
    <div className="flex flex-col gap-5">
      {invoices.length > 0 && (
        <section aria-labelledby="pr-list-h" className="rounded-hero bg-surface p-6 shadow-raised">
          <h3 id="pr-list-h" className="section-label">
            {C.listTitle}
          </h3>
          <ul className="mt-2 flex flex-col">
            {invoices.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line py-3 last:border-b-0">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {i.client} · <span className="num">{i.number}</span>
                  </p>
                  <p className="num text-sm text-muted">
                    {formatINR(i.amount)} · {formatDate(i.invoiceDate)}
                    {i.promisedDate && ` · promised ${formatDate(i.promisedDate)}`}
                  </p>
                  <div className="mt-1 flex gap-2">
                    {i.paid && <Badge tone="success">{C.paid}</Badge>}
                    {i.sample && <Badge tone="warn">Fictional sample</Badge>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-1">
                  <Button variant="link" className="text-sm" onClick={() => update(i.id, { paid: !i.paid })}>
                    {i.paid ? C.markUnpaid : C.markPaid}
                  </Button>
                  <Button
                    variant="link"
                    className="text-sm"
                    onClick={() => {
                      setEditing(i.id);
                      setDraft(toDraft(i));
                      setErrors({});
                      document.getElementById("pr-client")?.focus();
                    }}
                  >
                    {C.edit}
                  </Button>
                  <Button variant="link" tone="muted" className="text-sm" onClick={() => remove(i.id)} aria-label={`${C.remove} ${i.number}`}>
                    {C.remove}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form onSubmit={submit} noValidate aria-labelledby="pr-form-h" className="rounded-hero bg-surface px-6 pb-5 pt-6 shadow-raised">
        <h3 id="pr-form-h" className="section-label">
          {editing ? C.editTitle : C.addTitle}
        </h3>
        <Field id="pr-client" label={C.clientLabel} error={errors.client}>
          {(cls, d) => <input id="pr-client" className={cls} aria-describedby={d} aria-invalid={!!errors.client} value={draft.client} onChange={set("client")} autoComplete="off" />}
        </Field>
        <Field id="pr-number" label={C.numberLabel} error={errors.number}>
          {(cls, d) => <input id="pr-number" className={cls} aria-describedby={d} aria-invalid={!!errors.number} value={draft.number} onChange={set("number")} autoComplete="off" />}
        </Field>
        <Field id="pr-amount" label={C.amountLabel} error={errors.amount}>
          {(cls, d) => <input id="pr-amount" inputMode="decimal" className={`${cls} num`} aria-describedby={d} aria-invalid={!!errors.amount} value={draft.amount} onChange={set("amount")} />}
        </Field>
        <Field id="pr-invoiceDate" label={C.invoiceDateLabel} error={errors.invoiceDate}>
          {(cls, d) => <input id="pr-invoiceDate" type="date" max={today} className={`${cls} num`} aria-describedby={d} aria-invalid={!!errors.invoiceDate} value={draft.invoiceDate} onChange={set("invoiceDate")} />}
        </Field>
        <Field id="pr-acceptanceDate" label={C.acceptanceLabel} help={C.acceptanceHelp} error={errors.acceptanceDate}>
          {(cls, d) => <input id="pr-acceptanceDate" type="date" max={today} className={`${cls} num`} aria-describedby={d} aria-invalid={!!errors.acceptanceDate} value={draft.acceptanceDate} onChange={set("acceptanceDate")} />}
        </Field>
        <Field id="pr-agreementDays" label={C.agreementLabel} help={C.agreementHelp} error={errors.agreementDays}>
          {(cls, d) => <input id="pr-agreementDays" inputMode="numeric" className={`${cls} num`} aria-describedby={d} aria-invalid={!!errors.agreementDays} value={draft.agreementDays} onChange={set("agreementDays")} />}
        </Field>
        <Field id="pr-promisedDate" label={C.promisedLabel} error={errors.promisedDate}>
          {(cls, d) => <input id="pr-promisedDate" type="date" className={`${cls} num`} aria-describedby={d} aria-invalid={!!errors.promisedDate} value={draft.promisedDate} onChange={set("promisedDate")} />}
        </Field>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button type="submit" size="lg" className="px-7">
            {editing ? C.save : C.add}
          </Button>
          {editing && (
            <Button
              variant="link"
              tone="muted"
              onClick={() => {
                setEditing(null);
                setDraft(EMPTY);
                setErrors({});
              }}
            >
              {C.cancel}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
