import type { HTMLAttributes } from "react";
import { cx } from "./cx";

export type BadgeTone = "neutral" | "success" | "warn";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-line text-ink",
  success: "bg-brand-50 text-brand-800",
  warn: "bg-warn-bg text-warn-ink",
};

const sizes = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-sm",
};

export function Badge({
  tone = "neutral",
  size = "sm",
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone; size?: keyof typeof sizes }) {
  return (
    <span
      data-tone={tone}
      className={cx("inline-flex items-center gap-1 rounded-full font-semibold", tones[tone], sizes[size], className)}
      {...rest}
    />
  );
}
