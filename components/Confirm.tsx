"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { COPY, ELIGIBILITY } from "@/lib/copy";
import { eligibilityNotes } from "@/lib/standing";
import { todayIST } from "@/lib/today";
import { validateForm, type Action, type FieldKey, type FormErrors, type State } from "@/lib/wizard";
import { Banner } from "./ui/Banner";
import { Button } from "./ui/Button";
import { cx } from "./ui/cx";
import { Field } from "./ui/Field";

type Props = { state: State; dispatch: (a: Action) => void; onSubmit: () => void };

// Layout follows the approved demo (ui-demos/02-apple.html, screen 2): grouped cards of rows.
export function Confirm({ state, dispatch, onSubmit }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [today] = useState(() => todayIST());
  const { form, flagged, read, termsHint, currency } = state;

  useEffect(() => heading.current?.focus(), []);
  const notes = eligibilityNotes(state.eligibility, form);

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
      <div className="text-center">
        <h2 id="check-h" ref={heading} tabIndex={-1} className="step-title outline-none">
          Check the details
        </h2>
        <p className="mx-auto mt-4 max-w-[30em] text-lg text-muted">
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

      <Group label="From your invoice">
        <Field id="f-clientName" label="Client name" flag={flagged.clientName} read={read.clientName} error={errors.clientName}>
          {(cls, d) => <input id="f-clientName" className={cls} aria-describedby={d} aria-invalid={!!errors.clientName} value={form.clientName} onChange={set("clientName")} autoComplete="off" />}
        </Field>
        <Field id="f-invoiceNumber" label="Invoice number" flag={flagged.invoiceNumber} read={read.invoiceNumber} error={errors.invoiceNumber}>
          {(cls, d) => <input id="f-invoiceNumber" className={cls} aria-describedby={d} aria-invalid={!!errors.invoiceNumber} value={form.invoiceNumber} onChange={set("invoiceNumber")} autoComplete="off" />}
        </Field>
        <Field id="f-invoiceDate" label="Invoice date" flag={flagged.invoiceDate} read={read.invoiceDate} error={errors.invoiceDate}>
          {(cls, d) => <input id="f-invoiceDate" type="date" max={today} className={`${cls} num`} aria-describedby={d} aria-invalid={!!errors.invoiceDate} value={form.invoiceDate} onChange={set("invoiceDate")} />}
        </Field>
        <Field id="f-amount" label="Amount (₹, incl. GST)" flag={flagged.amount} read={read.amount} error={errors.amount}>
          {(cls, d) => <input id="f-amount" type="number" inputMode="decimal" min="0" step="0.01" className={`${cls} num`} aria-describedby={d} aria-invalid={!!errors.amount} value={form.amount} onChange={set("amount")} />}
        </Field>
      </Group>

      <Group label="What you agreed">

        <div className="grid gap-x-4 gap-y-1.5 border-b border-line py-4 sm:grid-cols-[170px_1fr] sm:items-center">
          <p id="agree-l" className="text-base font-semibold">
            Written payment agreement?
          </p>
          <Segmented
            name="agreement"
            labelledBy="agree-l"
            options={[
              { value: "no", label: "No" },
              { value: "yes", label: "Yes" },
            ]}
            value={form.hasAgreement ? "yes" : "no"}
            onChange={(v) => dispatch({ type: "edit", field: "hasAgreement", value: v === "yes" })}
            className="sm:justify-self-end"
          />
          <p className="text-sm text-muted sm:col-start-2">
            {termsHint && <span className="font-medium text-ink">Your invoice says {termsHint}. </span>}
            {COPY.agreementNote}
          </p>
        </div>

        {form.hasAgreement && (
          <Field id="f-agreementDays" label="Agreed payment days" error={errors.agreementDays}>
            {(cls, d) => <input id="f-agreementDays" type="number" inputMode="numeric" min="0" max="365" step="1" className={`${cls} num`} aria-describedby={d} aria-invalid={!!errors.agreementDays} value={form.agreementDays} onChange={set("agreementDays")} />}
          </Field>
        )}

        <Field id="f-acceptanceDate" label="Work accepted on" help={COPY.acceptanceHelp} error={errors.acceptanceDate}>
          {(cls, d) => <input id="f-acceptanceDate" type="date" className={`${cls} num`} aria-describedby={d} aria-invalid={!!errors.acceptanceDate} value={form.acceptanceDate} onChange={set("acceptanceDate")} />}
        </Field>
      </Group>

      <Group label="Only you know">
        <Field id="f-udyamDate" label="Udyam registration date" help={COPY.udyamHelp} error={errors.udyamDate}>
          {(cls, d) => <input id="f-udyamDate" type="date" max={today} className={`${cls} num`} aria-describedby={d} aria-invalid={!!errors.udyamDate} value={form.udyamDate} onChange={set("udyamDate")} />}
        </Field>
        <h4 className="pt-4 font-semibold">{ELIGIBILITY.title}</h4>
        <p className="pt-1 text-sm text-muted">{ELIGIBILITY.intro}</p>
        <div className="flex flex-col gap-2 border-b border-line py-4">
          <p id="q-enterprise" className="text-base font-semibold">
            {ELIGIBILITY.enterpriseQ}
          </p>
          <Segmented
            name="enterprise"
            labelledBy="q-enterprise"
            options={ELIGIBILITY.enterpriseOptions}
            value={state.eligibility.enterprise}
            onChange={(v) => dispatch({ type: "eligibility", field: "enterprise", value: v })}
          />
        </div>
        <div className="flex flex-col gap-2 py-4">
          <p id="q-buyerInIndia" className="text-base font-semibold">
            {ELIGIBILITY.buyerQ}
          </p>
          <Segmented
            name="buyerInIndia"
            labelledBy="q-buyerInIndia"
            options={ELIGIBILITY.buyerOptions}
            value={state.eligibility.buyerInIndia}
            onChange={(v) => dispatch({ type: "eligibility", field: "buyerInIndia", value: v })}
          />
        </div>
        <div aria-live="polite">
          {notes.length > 0 && (
            <Banner tone="warn" size="sm" role="note" title={ELIGIBILITY.notesTitle} className="mb-5">
              <ul className="flex list-disc flex-col gap-1 pl-5">
                {notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </Banner>
          )}
        </div>
      </Group>

      {/* Sticky on phones so Continue is always in reach; inline from sm up. */}
      <div className="sticky bottom-0 z-10 -mx-5 mt-2 flex flex-col items-center gap-1.5 border-t border-line px-5 pb-[calc(10px+env(safe-area-inset-bottom))] pt-3 max-sm:glass sm:static sm:mx-0 sm:border-0 sm:p-0">
        <Button type="submit" size="lg" className="w-full px-7 sm:w-auto">
          Check what I may be owed
        </Button>
        <Button variant="link" tone="muted" onClick={() => dispatch({ type: "go", step: "upload" })} className="text-[15px] no-underline hover:underline">
          Back
        </Button>
      </div>
      <p className="text-center text-sm text-muted">Not legal advice.</p>
    </form>
  );
}

/** Small uppercase label above a white rounded card of rows (demo 2). */
function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="section-label">{label}</h3>
      <div className="rounded-hero bg-surface px-6 py-1 shadow-raised">{children}</div>
    </section>
  );
}

/** iOS-style segmented control: one answer, changeable. Wraps on narrow screens. */
function Segmented({
  name,
  labelledBy,
  options,
  value,
  onChange,
  className,
}: {
  name: string;
  labelledBy: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className={cx("flex w-fit flex-wrap gap-[3px] rounded-xl bg-line p-[3px]", className)}>
      {options.map((o) => (
        <label key={o.value} className="relative cursor-pointer">
          <input type="radio" name={name} className="peer sr-only" checked={value === o.value} onChange={() => onChange(o.value)} />
          <span className="grid min-h-10 min-w-[76px] place-items-center rounded-[9px] px-3.5 text-[15px] font-semibold text-ink transition peer-checked:bg-surface peer-checked:shadow-[0_1px_3px_rgb(0_0_0/0.18)] peer-focus-visible:outline-2 peer-focus-visible:outline-brand-600">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}
