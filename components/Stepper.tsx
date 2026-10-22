import { COPY } from "@/lib/copy";
import { Help } from "./Help";
import { STEPS, type Step } from "@/lib/wizard";

/** Glass header: logo, "Step n of 5" and a thin progress hairline. */
export function Stepper({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  const n = idx + 1;
  const text = COPY.stepOf(n, STEPS.length);
  return (
    <header className="glass sticky top-0 z-20 border-b border-line">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-5">
        <span className="flex items-center gap-2 whitespace-nowrap text-lg font-bold tracking-tight">
          <span aria-hidden className="grid h-7 w-7 place-items-center rounded-lg bg-brand-700 text-xs font-extrabold text-on-brand">
            45
          </span>
          FortyFive
        </span>
        <span className="num ml-auto whitespace-nowrap text-sm text-muted" aria-live="polite">
          {text}
        </span>
        <Help />
      </div>
      <div
        role="progressbar"
        aria-label="Progress"
        aria-valuemin={0}
        aria-valuemax={STEPS.length}
        aria-valuenow={n}
        aria-valuetext={`${text}: ${STEPS[idx]?.label ?? ""}`}
        className="h-0.5 bg-line"
      >
        <div className="h-full bg-brand-700 transition-[width] duration-500" style={{ width: `${(n / STEPS.length) * 100}%` }} />
      </div>
    </header>
  );
}
