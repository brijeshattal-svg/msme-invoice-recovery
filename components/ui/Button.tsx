import type { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "link";
export type ButtonSize = "md" | "lg";
/** Text colour for the link variant only. */
export type LinkTone = "brand" | "ink" | "muted";

// Every variant keeps a 44x44px minimum target (min-h-11 min-w-11). Classes that a caller may
// want to change (weight, size, colour of links) are deliberately NOT in the base, because in
// Tailwind two conflicting utilities resolve by stylesheet order, not by the order written.
const base =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<ButtonVariant, string> = {
  primary: "rounded-button bg-brand-700 text-base font-semibold text-on-brand hover:bg-brand-800",
  secondary: "rounded-button border-2 border-brand-700 bg-surface text-base font-semibold text-link hover:bg-brand-50",
  ghost: "rounded-button text-base font-semibold text-ink hover:bg-brand-50",
  link: "rounded-input underline underline-offset-4",
};

const linkTones: Record<LinkTone, string> = {
  brand: "text-link hover:text-brand-800",
  ink: "text-ink",
  muted: "text-muted hover:text-ink",
};

const sizes: Record<ButtonSize, string> = {
  md: "px-4 py-2",
  lg: "min-h-12 px-5 py-3",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Link variant only: text colour. */
  tone?: LinkTone;
  /** Shows a spinner, sets aria-busy and disables the button. */
  loading?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  tone = "brand",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const isLink = variant === "link";
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-variant={variant}
      className={cx(base, variants[variant], isLink ? linkTones[tone] : sizes[size], className)}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
