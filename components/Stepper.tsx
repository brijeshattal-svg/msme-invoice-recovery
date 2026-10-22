import { STEPS, type Step } from "@/lib/wizard";
import { cx } from "./ui/cx";

// Kept as-is in R1 (structure unchanged); R2 replaces it with ui/ProgressBar.
export function Stepper({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <ol className="flex items-center justify-between gap-1 text-xs sm:text-sm" aria-label="Progress">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <li key={s.id} className="flex flex-1 flex-col items-center gap-1" aria-current={active ? "step" : undefined}>
            <span
              className={cx(
                "num flex h-8 w-8 items-center justify-center rounded-full border-2 font-semibold",
                done && "border-brand-700 bg-brand-700 text-on-brand",
                active && "border-brand-700 bg-surface text-link",
                !done && !active && "border-control text-muted",
              )}
            >
              {done ? <span aria-hidden>✓</span> : i + 1}
              {done && <span className="sr-only">completed</span>}
            </span>
            <span className={active ? "font-semibold" : "text-muted"}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
