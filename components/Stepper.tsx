import { STEPS, type Step } from "@/lib/wizard";

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
              className={[
                "flex h-8 w-8 items-center justify-center rounded-full border-2 font-semibold",
                done ? "border-indigo-700 bg-indigo-700 text-white" : "",
                active ? "border-indigo-700 bg-white text-indigo-700 dark:bg-zinc-900 dark:text-indigo-300" : "",
                !done && !active ? "border-zinc-500 text-zinc-500 dark:text-zinc-400" : "",
              ].join(" ")}
            >
              {done ? <span aria-hidden>✓</span> : i + 1}
              {done && <span className="sr-only">completed</span>}
            </span>
            <span className={active ? "font-semibold" : "text-zinc-600 dark:text-zinc-400"}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
