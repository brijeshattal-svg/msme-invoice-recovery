import type { ReactNode } from "react";
import { COPY } from "@/lib/copy";
import { Badge } from "./Badge";
import { cx } from "./cx";

/** Shared look for text, date and number inputs (also used outside Field, e.g. the email subject). */
export const inputClass = "min-h-12 w-full rounded-input border-2 bg-surface px-3 py-2 text-base text-ink";

export type FieldFlag = "missing" | "check";

/**
 * Label + input + hint + error. The input is rendered by the caller (render prop) so any input
 * type works; it receives the class to use and the ids for aria-describedby.
 */
export function Field({
  id,
  label,
  flag,
  error,
  help,
  children,
}: {
  id: string;
  label: string;
  flag?: FieldFlag;
  error?: string;
  help?: string;
  children: (cls: string, describedBy: string | undefined) => ReactNode;
}) {
  const describedBy = [error ? `${id}-err` : null, help ? `${id}-help` : null].filter(Boolean).join(" ") || undefined;
  const border = error ? "border-danger" : flag ? "border-warn-ink" : "border-control";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={id} className="text-base font-semibold">
          {label}
        </label>
        {flag && <Badge tone="warn">{flag === "missing" ? COPY.unreadable : COPY.pleaseCheck}</Badge>}
      </div>
      {children(cx(inputClass, border), describedBy)}
      {help && (
        <p id={`${id}-help`} className="text-sm text-muted">
          {help}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
