"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { COPY } from "@/lib/copy";
import { todayIST } from "@/lib/today";
import { validateForm, type Action, type FieldKey, type FormErrors, type State } from "@/lib/wizard";

const inputCls =
  "min-h-12 w-full rounded-lg border-2 bg-white px-3 py-2 text-base text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 dark:bg-zinc-900 dark:text-zinc-50";

function Field({
  id, label, flag, error, help, children,
}: {
  id: string;
  label: string;
  flag?: "missing" | "check";
  error?: string;
  help?: string;
  children: (cls: string, describedBy: string | undefined) => ReactNode;
}) {
  const describedBy = [error ? `${id}-err` : null, help ? `${id}-help` : null].filter(Boolean).join(" ") || undefined;
  const border = error
    ? "border-red-600"
    : flag
      ? "border-amber-500"
      : "border-zinc-500";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={id} className="text-base font-semibold">
          {label}
        </label>
        {flag && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-900 dark:text-amber-100">
            {flag === "missing" ? COPY.unreadable : COPY.pleaseCheck}
          </span>
        )}
      </div>
      {children(`${inputCls} ${border}`, describedBy)}
      {help && (
        <p id={`${id}-help`} className="text-sm text-zinc-700 dark:text-zinc-300">
          {help}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="text-sm font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

type Props = { state: State; dispatch: (a: Action) => void; onSubmit: () => void };

export function Confirm({ state, dispatch, onSubmit }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [today] = useState(() => todayIST());
  const { form, flagged, termsHint, currency } = state;

  useEffect(() => heading.current?.focus(), []);

  const set = (field: FieldKey) => (e: { target: { value: string } }) =>
    dispatch({ type: "edit", field, value: e.target.value });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateForm(form, today, currency);
    setErrors(found);
    if (Object.keys(found).length === 0) onSubmit();
    else document.getElementById(`f-${Object.keys(found)[0]}`)?.focus();
  };

  return (
    <form onSubmit={submit} noValidate aria-labelledby="check-h" className="flex flex-col gap-6">
      <div>
        <h2 id="check-h" ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">
          Check the details
        </h2>
        <p className="mt-1 text-base text-zinc-700 dark:text-zinc-300">
          We filled these in from your invoice. Please correct anything that&apos;s wrong.
        </p>
      </div>

      {currency && currency !== "INR" && (
        <p role="note" className="rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">
          This invoice looks like it&apos;s in {currency}, not rupees. Enter the amount in INR.
        </p>
      )}

      {/* Announced to screen readers on submit; focus also moves to the first field with a problem. */}
      <div aria-live="assertive">
        {Object.keys(errors).length > 0 && (
          <p className="rounded-lg border border-red-600 bg-red-50 p-3 text-sm font-medium text-red-800 dark:bg-red-950 dark:text-red-200">
            {COPY.fixErrors(Object.keys(errors).length)}
          </p>
        )}
      </div>

      <Field id="f-clientName" label="Client name" flag={flagged.clientName} error={errors.clientName}>
        {(cls, d) => <input id="f-clientName" className={cls} aria-describedby={d} aria-invalid={!!errors.clientName} value={form.clientName} onChange={set("clientName")} autoComplete="off" />}
      </Field>
      <Field id="f-invoiceNumber" label="Invoice number" flag={flagged.invoiceNumber} error={errors.invoiceNumber}>
        {(cls, d) => <input id="f-invoiceNumber" className={cls} aria-describedby={d} aria-invalid={!!errors.invoiceNumber} value={form.invoiceNumber} onChange={set("invoiceNumber")} autoComplete="off" />}
      </Field>
      <Field id="f-invoiceDate" label="Invoice date" flag={flagged.invoiceDate} error={errors.invoiceDate}>
        {(cls, d) => <input id="f-invoiceDate" type="date" max={today} className={cls} aria-describedby={d} aria-invalid={!!errors.invoiceDate} value={form.invoiceDate} onChange={set("invoiceDate")} />}
      </Field>
      <Field id="f-amount" label="Invoice amount (₹, including GST)" flag={flagged.amount} error={errors.amount}>
        {(cls, d) => <input id="f-amount" type="number" inputMode="decimal" min="0" step="0.01" className={cls} aria-describedby={d} aria-invalid={!!errors.amount} value={form.amount} onChange={set("amount")} />}
      </Field>

      <fieldset className="flex flex-col gap-6 rounded-xl border-2 border-zinc-300 p-4 dark:border-zinc-700">
        <legend className="px-2 text-lg font-semibold">Three things only you know</legend>

        <Field id="f-udyamDate" label="Your Udyam registration date" error={errors.udyamDate}>
          {(cls, d) => <input id="f-udyamDate" type="date" max={today} className={cls} aria-describedby={d} aria-invalid={!!errors.udyamDate} value={form.udyamDate} onChange={set("udyamDate")} />}
        </Field>

        <div className="flex flex-col gap-2" role="radiogroup" aria-labelledby="agree-l">
          <p id="agree-l" className="text-base font-semibold">
            Do you have a written payment agreement with this client?
          </p>
          <div className="flex gap-3">
            {[true, false].map((v) => (
              <label key={String(v)} className={`flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-lg border-2 px-4 text-base font-medium has-[:checked]:border-indigo-700 has-[:checked]:bg-indigo-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-indigo-700 dark:has-[:checked]:bg-indigo-950 ${"border-zinc-500"}`}>
                <input type="radio" name="agreement" className="sr-only" checked={form.hasAgreement === v} onChange={() => dispatch({ type: "edit", field: "hasAgreement", value: v })} />
                {v ? "Yes" : "No"}
              </label>
            ))}
          </div>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{COPY.agreementNote}</p>
          {termsHint && (
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Your invoice says: {termsHint}</p>
          )}
        </div>

        {form.hasAgreement && (
          <Field id="f-agreementDays" label="Agreed payment days" error={errors.agreementDays}>
            {(cls, d) => <input id="f-agreementDays" type="number" inputMode="numeric" min="0" max="365" step="1" className={cls} aria-describedby={d} aria-invalid={!!errors.agreementDays} value={form.agreementDays} onChange={set("agreementDays")} />}
          </Field>
        )}

        <Field id="f-acceptanceDate" label="Date the client accepted the work" help={COPY.acceptanceHelp} error={errors.acceptanceDate}>
          {(cls, d) => <input id="f-acceptanceDate" type="date" className={cls} aria-describedby={d} aria-invalid={!!errors.acceptanceDate} value={form.acceptanceDate} onChange={set("acceptanceDate")} />}
        </Field>
      </fieldset>

      <div className="flex flex-col gap-3">
        <button type="submit" className="min-h-12 rounded-lg bg-indigo-700 px-5 py-3 text-base font-semibold text-white hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700">
          Check what I&apos;m owed
        </button>
        <button type="button" onClick={() => dispatch({ type: "go", step: "upload" })} className="min-h-11 min-w-11 self-start text-base underline underline-offset-4">
          Back
        </button>
      </div>
      <p className="text-sm text-zinc-700 dark:text-zinc-300">Not legal advice.</p>
    </form>
  );
}
