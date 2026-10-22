"use client";

import { useEffect, useRef, useState } from "react";
import { COPY } from "@/lib/copy";
import { todayIST } from "@/lib/today";
import { validateForm, type Action, type FieldKey, type FormErrors, type State } from "@/lib/wizard";
import { Banner } from "./ui/Banner";
import { Button } from "./ui/Button";
import { Field } from "./ui/Field";

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
        <h2 id="check-h" ref={heading} tabIndex={-1} className="step-title outline-none">
          Check the details
        </h2>
        <p className="mt-1 text-base text-muted">
          We filled these in from your invoice. Please correct anything that&apos;s wrong.
        </p>
      </div>

      {currency && currency !== "INR" && (
        <Banner tone="warn" size="sm" role="note">
          <p>This invoice looks like it&apos;s in {currency}, not rupees. Enter the amount in INR.</p>
        </Banner>
      )}

      {/* Announced to screen readers on submit; focus also moves to the first field with a problem. */}
      <div aria-live="assertive">
        {Object.keys(errors).length > 0 && (
          <Banner tone="danger" size="sm" className="font-medium">
            <p className="text-danger">{COPY.fixErrors(Object.keys(errors).length)}</p>
          </Banner>
        )}
      </div>

      <Field id="f-clientName" label="Client name" flag={flagged.clientName} error={errors.clientName}>
        {(cls, d) => <input id="f-clientName" className={cls} aria-describedby={d} aria-invalid={!!errors.clientName} value={form.clientName} onChange={set("clientName")} autoComplete="off" />}
      </Field>
      <Field id="f-invoiceNumber" label="Invoice number" flag={flagged.invoiceNumber} error={errors.invoiceNumber}>
        {(cls, d) => <input id="f-invoiceNumber" className={cls} aria-describedby={d} aria-invalid={!!errors.invoiceNumber} value={form.invoiceNumber} onChange={set("invoiceNumber")} autoComplete="off" />}
      </Field>
      <Field id="f-invoiceDate" label="Invoice date" flag={flagged.invoiceDate} error={errors.invoiceDate}>
        {(cls, d) => <input id="f-invoiceDate" type="date" max={today} className={`${cls} num`} aria-describedby={d} aria-invalid={!!errors.invoiceDate} value={form.invoiceDate} onChange={set("invoiceDate")} />}
      </Field>
      <Field id="f-amount" label="Invoice amount (₹, including GST)" flag={flagged.amount} error={errors.amount}>
        {(cls, d) => <input id="f-amount" type="number" inputMode="decimal" min="0" step="0.01" className={`${cls} num`} aria-describedby={d} aria-invalid={!!errors.amount} value={form.amount} onChange={set("amount")} />}
      </Field>

      <fieldset className="flex flex-col gap-6 rounded-card border-2 border-line p-4">
        <legend className="px-2 text-lg font-semibold">Three things only you know</legend>

        <Field id="f-udyamDate" label="Your Udyam registration date" help={COPY.udyamHelp} error={errors.udyamDate}>
          {(cls, d) => <input id="f-udyamDate" type="date" max={today} className={`${cls} num`} aria-describedby={d} aria-invalid={!!errors.udyamDate} value={form.udyamDate} onChange={set("udyamDate")} />}
        </Field>

        <div className="flex flex-col gap-2" role="radiogroup" aria-labelledby="agree-l">
          <p id="agree-l" className="text-base font-semibold">
            Do you have a written payment agreement with this client?
          </p>
          <div className="flex gap-3">
            {[true, false].map((v) => (
              <label
                key={String(v)}
                className="flex min-h-12 flex-1 cursor-pointer items-center justify-center rounded-input border-2 border-control px-4 text-base font-medium has-[:checked]:border-brand-700 has-[:checked]:bg-brand-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-600"
              >
                <input type="radio" name="agreement" className="sr-only" checked={form.hasAgreement === v} onChange={() => dispatch({ type: "edit", field: "hasAgreement", value: v })} />
                {v ? "Yes" : "No"}
              </label>
            ))}
          </div>
          <p className="text-sm text-muted">{COPY.agreementNote}</p>
          {termsHint && <p className="text-sm font-medium text-ink">Your invoice says: {termsHint}</p>}
        </div>

        {form.hasAgreement && (
          <Field id="f-agreementDays" label="Agreed payment days" error={errors.agreementDays}>
            {(cls, d) => <input id="f-agreementDays" type="number" inputMode="numeric" min="0" max="365" step="1" className={`${cls} num`} aria-describedby={d} aria-invalid={!!errors.agreementDays} value={form.agreementDays} onChange={set("agreementDays")} />}
          </Field>
        )}

        <Field id="f-acceptanceDate" label="Date the client accepted the work" help={COPY.acceptanceHelp} error={errors.acceptanceDate}>
          {(cls, d) => <input id="f-acceptanceDate" type="date" className={`${cls} num`} aria-describedby={d} aria-invalid={!!errors.acceptanceDate} value={form.acceptanceDate} onChange={set("acceptanceDate")} />}
        </Field>
      </fieldset>

      <div className="flex flex-col gap-3">
        <Button type="submit" size="lg">
          Check what I may be owed
        </Button>
        <Button variant="link" tone="ink" onClick={() => dispatch({ type: "go", step: "upload" })} className="self-start text-base">
          Back
        </Button>
      </div>
      <p className="text-sm text-muted">Not legal advice.</p>
    </form>
  );
}
