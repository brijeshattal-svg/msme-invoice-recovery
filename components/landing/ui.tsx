import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";

/** Page width shared by every landing section. */
export const wrap = "mx-auto w-full max-w-6xl px-5 sm:px-8";

const cta = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-7 text-base font-semibold transition duration-150 active:scale-[0.98]";
export const ctaPrimary = cx(cta, "bg-brand-700 text-on-brand shadow-card hover:scale-[1.02] hover:bg-brand-800");
export const ctaSecondary = cx(cta, "border-2 border-brand-700 bg-surface text-link hover:bg-brand-50");

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link href="/" className={cx("flex items-center gap-2 whitespace-nowrap text-lg font-bold tracking-tight", className)}>
      <span aria-hidden className="grid h-7 w-7 place-items-center rounded-lg bg-brand-700 text-xs font-extrabold text-on-brand">
        45
      </span>
      FortyFive
    </Link>
  );
}

/** Small green label above a section title. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("text-[15px] font-semibold text-brand-700", className)}>{children}</p>;
}

/** Big Apple-style section title. */
export function SectionTitle({ id, children, className }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <h2 id={id} className={cx("text-balance text-[clamp(32px,5.2vw,60px)] font-bold leading-[1.06] tracking-[-0.03em]", className)}>
      {children}
    </h2>
  );
}
