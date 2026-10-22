import { CASH_COPY as C } from "@/lib/copy";
import { WINDOW_DAYS, type Forecast } from "@/lib/forecast/cash";
import { formatDate } from "@/lib/format";
import { inrPaise } from "./money";

const W = 600;
const H = 240;
const PAD = { l: 8, r: 8, t: 18, b: 30 };

/**
 * Daily balance as a line (solid = expected; dashed = late scenario), with the zero line marked.
 * Not colour-only: the late line is dashed and the legend says so. Screen readers get a summary
 * (title + desc); the full numbers are in the table next to it.
 */
export function CashChart({ expected, late }: { expected: Forecast; late: Forecast | null }) {
  const values = [...expected.rows, ...(late?.rows ?? [])].map((r) => r.balancePaise);
  const goesNegative = values.some((v) => v < 0);
  let min = Math.min(0, ...values);
  let max = Math.max(0, ...values);
  if (max === min) max = min + 100_00;
  const pad = (max - min) * 0.08;
  min -= pad;
  max += pad;

  const x = (i: number) => PAD.l + (i * (W - PAD.l - PAD.r)) / (WINDOW_DAYS - 1);
  const y = (p: number) => PAD.t + ((max - p) * (H - PAD.t - PAD.b)) / (max - min);
  const path = (f: Forecast) => f.rows.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(r.balancePaise).toFixed(1)}`).join(" ");
  const lowIdx = (f: Forecast) => f.rows.findIndex((r) => r.date === f.lowest.date);

  const summary = (f: Forecast, label: string) =>
    `${label}: starts at ${inrPaise(f.rows[0].balancePaise)}, lowest ${inrPaise(f.lowest.balancePaise)} on ${formatDate(f.lowest.date)}, ends at ${inrPaise(f.rows[WINDOW_DAYS - 1].balancePaise)}.`;
  const desc = [summary(expected, C.expectedTitle), late ? summary(late, C.lateTitle) : ""].filter(Boolean).join(" ");
  const ticks = [0, 14, WINDOW_DAYS - 1];

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-labelledby="cf-chart-t cf-chart-d">
        <title id="cf-chart-t">{C.chartTitle}</title>
        <desc id="cf-chart-d">{desc}</desc>
        {goesNegative && <rect x={PAD.l} y={y(0)} width={W - PAD.l - PAD.r} height={y(min) - y(0)} className="fill-warn-bg" />}
        <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} className="stroke-control" strokeWidth={1} strokeDasharray="2 4" />
        <text x={W - PAD.r} y={y(0) - 5} textAnchor="end" className="fill-muted text-[12px]">
          ₹0
        </text>
        {late && <path d={path(late)} fill="none" className="stroke-warn-ink" strokeWidth={2.5} strokeDasharray="7 5" strokeLinejoin="round" />}
        <path d={path(expected)} fill="none" className="stroke-brand-700" strokeWidth={2.5} strokeLinejoin="round" />
        <circle cx={x(lowIdx(expected))} cy={y(expected.lowest.balancePaise)} r={4.5} className="fill-surface stroke-brand-700" strokeWidth={2.5} />
        {late && <circle cx={x(lowIdx(late))} cy={y(late.lowest.balancePaise)} r={4.5} className="fill-surface stroke-warn-ink" strokeWidth={2.5} />}
        {ticks.map((i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === WINDOW_DAYS - 1 ? "end" : "middle"} className="fill-muted text-[12px]">
            {formatDate(expected.rows[i].date)}
          </text>
        ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
        <span>{C.legendExpected}</span>
        {late && <span>{C.legendLate}</span>}
      </figcaption>
    </figure>
  );
}
