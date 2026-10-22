import type { ReactNode } from "react";
import { cx } from "./cx";

/**
 * Native details/summary (keyboard and screen-reader support built in) with a 44px summary target.
 * `className` / `summaryClassName` REPLACE the default frame / padding rather than adding to them,
 * so callers never end up with two conflicting Tailwind utilities.
 */
export function Disclosure({
  summary,
  className,
  summaryClassName,
  children,
}: {
  summary: ReactNode;
  className?: string;
  summaryClassName?: string;
  children?: ReactNode;
}) {
  return (
    <details className={className ?? "rounded-card border border-line"}>
      <summary className={cx("min-h-11 min-w-11 cursor-pointer font-semibold", summaryClassName ?? "px-4 py-3")}>{summary}</summary>
      {children}
    </details>
  );
}
