import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { CountUp } from "@/components/ui/CountUp";
import { LANDING as L } from "@/lib/copy";
import { formatDate, formatINR } from "@/lib/format";
import { landingSample } from "@/lib/landing";
import { ctaPrimary, ctaSecondary, wrap } from "./ui";

/** Hero: two-tone headline and one action on the left; a layered sample of the real result on the right. */
export function Hero() {
  const h = L.hero;
  return (
    <section aria-label={h.eyebrow} className="relative isolate overflow-hidden">
      {/* Soft green light behind the product: depth without a second colour. */}
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[42rem] bg-[radial-gradient(60%_55%_at_72%_28%,var(--brand-50),transparent)]" />
      <div className={`${wrap} grid items-center gap-14 pb-24 pt-14 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:pb-36 lg:pt-24`}>
        <div className="text-center lg:text-left">
          <p className="text-[15px] font-semibold text-brand-700">{h.eyebrow}</p>
          <h1 className="mt-4 text-balance text-[clamp(40px,5.7vw,72px)] font-bold leading-[1.03] tracking-[-0.035em]">
            {h.line1}
            <span className="block text-brand-700">{h.line2}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-[34rem] text-lg leading-relaxed text-muted sm:text-xl lg:mx-0">{h.sub}</p>
          <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row lg:justify-start">
            <Link href="/check" className={ctaPrimary}>
              {h.cta}
              <span aria-hidden>→</span>
            </Link>
            <a href="#how" className={ctaSecondary}>
              {h.secondary}
            </a>
          </div>
          <ul className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-muted lg:justify-start">
            {h.proof.map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <span aria-hidden className="text-brand-700">
                  ✓
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <HeroStack />
      </div>
    </section>
  );
}

/** Invoice behind, result in front, checked email floating: all figures come from the real engine. */
function HeroStack() {
  const { r, facts: f, asOf, invoiceDate } = landingSample();
  const h = L.hero;
  return (
    <figure aria-label={h.sampleLabel} className="relative mx-auto w-full max-w-[30rem] lg:mb-16 lg:max-w-none lg:pl-10">
      {/* Back: the invoice that was read (decorative). */}
      <div aria-hidden className="float-slow absolute -left-2 top-6 hidden w-60 -rotate-6 rounded-card bg-surface p-5 shadow-card lg:block">
        <div className="h-2.5 w-20 rounded-full bg-brand-700" />
        <p className="mt-4 truncate text-sm font-semibold">{f.clientName}</p>
        <p className="num mt-0.5 text-xs text-muted">{f.invoiceNumber}</p>
        <div className="mt-4 space-y-2">
          <div className="h-2 rounded-full bg-line" />
          <div className="h-2 w-4/5 rounded-full bg-line" />
          <div className="h-2 w-3/5 rounded-full bg-line" />
        </div>
        <p className="num mt-5 text-lg font-bold">{f.amount}</p>
        <Badge tone="success" className="mt-3">
          ✓ {h.readChip}
        </Badge>
      </div>

      {/* Front: the result. */}
      <div className="float relative rounded-hero bg-surface p-7 shadow-raised sm:p-9 lg:ml-24 lg:pb-14">
        <div className="flex items-center justify-between gap-3">
          <Badge tone="neutral">{h.sampleTag}</Badge>
          <span className="num text-sm text-muted">{formatDate(r.lastPayableDate)}</span>
        </div>
        <CountUp value={r.totalInterest} durationMs={1300} className="num mt-5 block text-[clamp(44px,8vw,68px)] font-bold leading-none tracking-[-0.04em] text-brand-800" />
        <p className="mt-2 text-lg font-semibold">{h.owedLabel}</p>
        <span className="num mt-4 inline-block rounded-full bg-warn-bg px-4 py-1.5 text-[15px] font-bold text-warn-ink">
          {r.daysOverdue} days late
        </span>
        <div aria-hidden className="relative mt-7 h-1.5 rounded-full bg-line">
          <span className="absolute inset-y-0 right-[6%] left-[22%] rounded-full bg-[#e0a22b]" />
          <span className="absolute -top-[6px] left-[6%] h-[18px] w-[18px] rounded-full border-4 border-brand-700 bg-surface" />
          <span className="absolute -top-[6px] left-[22%] h-[18px] w-[18px] rounded-full border-4 border-brand-700 bg-surface" />
          <span className="absolute -top-[6px] left-[94%] h-[18px] w-[18px] rounded-full border-4 border-[#e0a22b] bg-surface" />
        </div>
        <ol className="num mt-5 grid grid-cols-3 text-xs text-muted sm:text-sm">
          <li>
            <b className="block text-ink">{formatDate(invoiceDate)}</b>Invoice
          </li>
          <li className="text-center">
            <b className="block text-ink">{formatDate(r.lastPayableDate)}</b>Due
          </li>
          <li className="text-right">
            <b className="block text-ink">{formatDate(asOf)}</b>Today
          </li>
        </ol>
        <p className="num mt-6 flex justify-between gap-3 border-t border-line pt-4 text-base">
          <span className="text-muted">Total now due</span>
          <b>{formatINR(r.totalDue)}</b>
        </p>
      </div>

      {/* Front, lower: the checked email. */}
      <div className="float-slow mt-4 rounded-card bg-surface p-5 shadow-raised lg:absolute lg:-bottom-20 lg:-right-2 lg:mt-0 lg:w-[19rem]">
        <div className="flex items-center justify-between gap-2">
          <span aria-hidden className="mail-dots flex gap-1.5">
            <i />
            <i />
            <i />
          </span>
          <span className="text-xs font-semibold text-muted">{h.emailTo}</span>
        </div>
        <Badge tone="success" className="mt-3 text-left">
          ✓ {h.checkedChip}
        </Badge>
        <p className="num mt-3 text-sm leading-relaxed text-ink">
          Invoice {f.invoiceNumber} for {f.amount} was due by {f.lastPayableDate} and is now {f.daysOverdue} overdue.
        </p>
        <div aria-hidden className="mt-3 space-y-1.5">
          <div className="h-2 rounded-full bg-line" />
          <div className="h-2 w-2/3 rounded-full bg-line" />
        </div>
      </div>
    </figure>
  );
}
