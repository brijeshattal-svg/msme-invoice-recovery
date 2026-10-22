import { cx } from "./cx";

/** Decorative spinner; takes the current text colour. Animation stops under prefers-reduced-motion. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      data-ui="spinner"
      className={cx("inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent", className)}
    />
  );
}
