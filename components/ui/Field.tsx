import type { ReactNode } from "react";
import { COPY } from "@/lib/copy";
import { Badge } from "./Badge";
import { cx } from "./cx";

/** Shared look for text, date and number inputs used outside a Field row. */
export const inputClass = "min-h-12 w-full rounded-input border-2 bg-surface px-3 py-2 text-base text-ink";

/**
 * Input inside a Field row (demo 2): borderless, right-aligned on wide screens, tinted on focus.
 * On phones it stacks under the label with a soft fill so it still reads as a field.
 */
const rowInputClass =
  "min-h-12 w-full rounded-input border-0 bg-canvas px-3 text-base text-ink outline-none focus:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-600 sm:bg-transparent sm:text-right";

export type FieldFlag = "missing" | "check";

/**
 * One row of a settings-style card: label on the left, input on the right, hint and error below.
 * The input is rendered by the caller (render prop) so any input type works; it receives the
 * class to use and the ids for aria-describedby.
 */
export function Field({
  id,
  label,
  flag,
  read = false,
  error,
  help,
  children,
}: {
  id: string;
  label: string;
  flag?: FieldFlag;
  /** Filled from the invoice with high confidence. */
  read?: boolean;
  error?: string;
  help?: string;
  children: (cls: string, describedBy: string | undefined) => ReactNode;
}) {
  const describedBy = [error ? `${id}-err` : null, help ? `${id}-help` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div
      className={cx(
        "grid gap-x-4 gap-y-1.5 border-b border-line py-4 last:border-b-0 sm:grid-cols-[170px_1fr] sm:items-center",
        error && "-mx-6 bg-[color-mix(in_srgb,var(--danger)_7%,transparent)] px-6",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={id} className="text-base font-semibold">
          {label}
        </label>
        {flag ? (
          <Badge tone="warn">{flag === "missing" ? COPY.unreadable : COPY.pleaseCheck}</Badge>
        ) : (
          read && <Badge tone="success">{COPY.readFromInvoice}</Badge>
        )}
      </div>
      {children(cx(rowInputClass, error ? "ring-2 ring-danger" : flag && "bg-warn-bg sm:bg-warn-bg"), describedBy)}
      {help && (
        <p id={`${id}-help`} className="text-sm text-muted sm:col-start-2">
          {help}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="text-sm font-semibold text-danger sm:col-start-2">
          {error}
        </p>
      )}
    </div>
  );
}
