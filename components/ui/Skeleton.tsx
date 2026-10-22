import { cx } from "./cx";

/** Placeholder block while content loads. Hidden from assistive tech; pulse stops under reduced motion. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden data-ui="skeleton" className={cx("animate-pulse rounded-input bg-line", className)} />;
}
