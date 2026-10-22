import { useId } from "react";
import { COPY } from "@/lib/copy";

/** Step progress: visible "Step n of max" label plus an accessible progressbar. Used by the shell from R2. */
export function ProgressBar({ value, max, label }: { value: number; max: number; label?: string }) {
  const id = useId();
  const text = label ?? COPY.stepOf(value, max);
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="flex flex-col gap-1.5">
      <span id={id} className="text-sm font-medium text-ink">
        {text}
      </span>
      <div
        role="progressbar"
        aria-labelledby={id}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={text}
        className="h-1.5 w-full overflow-hidden rounded-full bg-line"
      >
        <div className="h-full rounded-full bg-brand-700 transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
