import type { HTMLAttributes } from "react";
import { cx } from "./cx";

/** Surface card: radius 20, soft shadow in light mode, 1px line border instead in dark mode. */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-ui="card"
      className={cx("rounded-card bg-surface shadow-card dark:border dark:border-line dark:shadow-none", className)}
      {...rest}
    />
  );
}
