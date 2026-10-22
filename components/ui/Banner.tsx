import type { AriaRole, ReactNode } from "react";
import { cx } from "./cx";

export type BannerTone = "info" | "warn" | "danger";

const tones: Record<BannerTone, string> = {
  info: "border-brand-700 bg-brand-50 text-ink",
  warn: "border-warn-ink bg-warn-bg text-warn-ink",
  danger: "border-danger bg-surface text-ink",
};

const sizes = {
  sm: "gap-1 p-3 text-sm",
  md: "gap-2 p-5 text-base",
};

/**
 * Message block with an optional title and action. The caller chooses the live-region role:
 * "alert" for errors that just happened, "status" for results, "note" for standing advice.
 */
export function Banner({
  tone = "info",
  size = "md",
  title,
  action,
  role,
  className,
  children,
}: {
  tone?: BannerTone;
  size?: keyof typeof sizes;
  title?: ReactNode;
  action?: ReactNode;
  role?: AriaRole;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div role={role} data-tone={tone} className={cx("flex flex-col rounded-card border-2", tones[tone], sizes[size], className)}>
      {title && <p className={cx("font-semibold", size === "md" ? "text-xl" : "text-base", tone === "danger" && "text-danger")}>{title}</p>}
      {children}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
