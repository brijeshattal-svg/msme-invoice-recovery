import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { HELP, LANDING as L, TOOLKIT } from "@/lib/copy";
import { TONES, TONE_IDS } from "@/lib/email/tones";
import { formatINR, formatMonth } from "@/lib/format";
import { landingSample } from "@/lib/landing";
import { Eyebrow, SectionTitle, ctaPrimary, ctaSecondary, wrap } from "./ui";

const card = "reveal rounded-hero bg-surface p-7 shadow-card sm:p-9";

/** "The law already sides with you": why founders don't ask, in three honest reasons. */
export function Why() {
  const w = L.why;
  return (
    <section aria-labelledby="why-h" className="border-y border-line bg-surface">
      <div className={`${wrap} py-20 sm:py-28`}>
        <div className="reveal mx-auto max-w-3xl text-center">
          <Eyebrow>{w.eyebrow}</Eyebrow>
          <SectionTitle id="why-h" className="mt-3">
            {w.title}
          </SectionTitle>
          <p className="mt-6 text-lg leading-relaxed text-muted sm:text-xl">{w.body}</p>
        </div>
        <ul className="mt-14 grid gap-4 md:grid-cols-3">
          {w.reasons.map((r) => (
            <li key={r.title} className="reveal rounded-card bg-canvas p-7">
              <h3 className="text-xl font-bold tracking-tight">{r.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-muted">{r.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Three steps, big numerals. */
export function How() {
  const h = L.how;
  return (
    <section id="how" aria-labelledby="how-h" className="scroll-mt-16">
      <div className={`${wrap} py-20 sm:py-28`}>
        <div className="reveal mx-auto max-w-3xl text-center">
          <Eyebrow>{h.eyebrow}</Eyebrow>
          <SectionTitle id="how-h" className="mt-3">
            {h.title}
          </SectionTitle>
        </div>
        <ol className="mt-14 grid gap-4 md:grid-cols-3">
          {h.steps.map((s) => (
            <li key={s.n} className={card}>
              <span aria-hidden className="num grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-3xl font-bold text-brand-800">
                {s.n}
              </span>
              <h3 className="mt-6 text-2xl font-bold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Tile({ title, body, className = "", children }: { title: string; body: string; className?: string; children?: React.ReactNode }) {
  return (
    <div className={`${card} flex flex-col ${className}`}>
      <h3 className="text-2xl font-bold leading-tight tracking-tight">{title}</h3>
      <p className="mt-2 max-w-xl text-base leading-relaxed text-muted">{body}</p>
      {children && <div className="mt-auto pt-7">{children}</div>}
    </div>
  );
}

/** Bento grid of what you get. Every figure shown is the real engine's, for the fictional sample. */
export function Features() {
  const f = L.features;
  const { r, paid, facts } = landingSample();
  const rows = r.rows.slice(0, 3);
  return (
    <section id="features" aria-labelledby="features-h" className="scroll-mt-16 bg-brand-50/60">
      <div className={`${wrap} py-20 sm:py-28`}>
        <div className="reveal mx-auto max-w-3xl text-center">
          <Eyebrow>{f.eyebrow}</Eyebrow>
          <SectionTitle id="features-h" className="mt-3">
            {f.title}
          </SectionTitle>
        </div>
        <div className="mt-14 grid gap-4 lg:grid-cols-6">
          <Tile title={f.maths.title} body={f.maths.body} className="lg:col-span-4">
            <div className="num overflow-hidden rounded-card border border-line text-sm">
              <div className="grid grid-cols-[1.3fr_0.6fr_1fr] bg-canvas px-4 py-2.5 font-semibold text-muted">
                {f.maths.cols.map((c, i) => (
                  <span key={c} className={i ? "text-right" : ""}>
                    {c}
                  </span>
                ))}
              </div>
              {rows.map((m) => (
                <div key={m.month} className="grid grid-cols-[1.3fr_0.6fr_1fr] border-t border-line px-4 py-3">
                  <span className="font-medium">{formatMonth(m.month)}</span>
                  <span className="text-right">{m.days}</span>
                  <span className="text-right font-semibold">{formatINR(m.interest)}</span>
                </div>
              ))}
            </div>
          </Tile>

          <Tile title={f.privacy.title} body={f.privacy.body} className="lg:col-span-2">
            <p aria-hidden className="num text-[clamp(88px,12vw,132px)] font-bold leading-none tracking-[-0.05em] text-brand-700">
              {f.privacy.big}
            </p>
            <p className="mt-1 text-sm font-semibold text-muted">{f.privacy.bigLabel}</p>
          </Tile>

          <Tile title={f.checked.title} body={f.checked.body} className="lg:col-span-3">
            <Badge tone="success" size="md">
              ✓ {L.hero.checkedChip}
            </Badge>
            <p className="num mt-4 rounded-card bg-canvas p-4 text-[15px] leading-relaxed">
              Interest so far comes to <mark className="rounded bg-brand-50 px-1 font-semibold text-brand-800">{facts.interest}</mark>, so the total now due is{" "}
              <mark className="rounded bg-brand-50 px-1 font-semibold text-brand-800">{facts.totalDue}</mark>.
            </p>
          </Tile>

          <Tile title={f.tones.title} body={f.tones.body} className="lg:col-span-3">
            <ul className="flex flex-wrap gap-2">
              {TONE_IDS.map((t) => (
                <li key={t} className="rounded-full bg-canvas px-3.5 py-1.5 text-sm font-semibold">
                  {TONES[t].label}
                </li>
              ))}
            </ul>
          </Tile>

          <Tile title={f.payments.title} body={f.payments.body} className="lg:col-span-3">
            <dl className="num rounded-card bg-canvas p-4 text-[15px]">
              <div className="flex justify-between gap-3 py-1">
                <dt className="text-muted">Invoice</dt>
                <dd className="font-semibold">{facts.amount}</dd>
              </div>
              <div className="flex justify-between gap-3 py-1">
                <dt className="text-muted">Received (incl. TDS {formatINR(paid.tdsSoFar ?? 0)})</dt>
                <dd className="font-semibold">−{formatINR(paid.paidSoFar ?? 0)}</dd>
              </div>
              <div className="mt-1 flex justify-between gap-3 border-t border-line pt-2">
                <dt className="text-muted">Interest runs on</dt>
                <dd className="font-bold text-brand-800">{formatINR(paid.unpaidAmount ?? 0)}</dd>
              </div>
            </dl>
          </Tile>

          <Tile title={f.tools.title} body={f.tools.body} className="lg:col-span-3">
            <ul className="mb-5 flex flex-wrap gap-2">
              {(["priorities", "blockers", "cash", "reports"] as const).map((k) => (
                <li key={k} className="rounded-full bg-canvas px-3.5 py-1.5 text-sm font-semibold">
                  {TOOLKIT.tools[k].title}
                </li>
              ))}
            </ul>
            <Link href="/toolkit" className="inline-flex min-h-11 items-center gap-1 font-semibold text-link underline-offset-4 hover:underline">
              {f.tools.cta} <span aria-hidden>→</span>
            </Link>
          </Tile>
        </div>
      </div>
    </section>
  );
}

/** Full-bleed statement: the positioning line. */
export function Band() {
  const b = L.band;
  return (
    <section aria-label={b.line2} className="bg-brand-800 text-on-brand">
      <div className={`${wrap} reveal py-24 text-center sm:py-36`}>
        <p className="text-balance text-[clamp(30px,5.6vw,68px)] font-bold leading-[1.06] tracking-[-0.03em] text-white/65">{b.line1}</p>
        <p className="mt-2 text-balance text-[clamp(30px,5.6vw,68px)] font-bold leading-[1.06] tracking-[-0.03em] text-white">{b.line2}</p>
        <p className="mt-6 text-xl text-white/80 sm:text-2xl">{b.sub}</p>
      </div>
    </section>
  );
}

/** What it won't do: trust through honesty. */
export function Limits() {
  const l = L.limits;
  return (
    <section aria-labelledby="limits-h">
      <div className={`${wrap} py-20 sm:py-28`}>
        <div className="reveal mx-auto max-w-3xl text-center">
          <Eyebrow>{l.eyebrow}</Eyebrow>
          <SectionTitle id="limits-h" className="mt-3">
            {l.title}
          </SectionTitle>
        </div>
        <ul className="mt-14 grid gap-x-12 gap-y-2 md:grid-cols-2">
          {l.items.map((i) => (
            <li key={i.title} className="reveal border-t border-line py-6">
              <h3 className="text-xl font-bold tracking-tight">{i.title}</h3>
              <p className="mt-1.5 text-base leading-relaxed text-muted">{i.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** FAQ from the in-app help, so the answers have one source. Native details: keyboard and screen readers work. */
export function Faq() {
  const q = L.faq;
  return (
    <section id="faq" aria-labelledby="faq-h" className="scroll-mt-16 border-t border-line bg-surface">
      <div className={`${wrap} py-20 sm:py-28`}>
        <div className="reveal mx-auto max-w-3xl text-center">
          <Eyebrow>{q.eyebrow}</Eyebrow>
          <SectionTitle id="faq-h" className="mt-3">
            {q.title}
          </SectionTitle>
        </div>
        <div className="reveal mx-auto mt-12 max-w-3xl">
          {HELP.items.map((i) => (
            <details key={i.q} className="group border-b border-line first:border-t">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                {i.q}
                <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-xl text-brand-800 transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="pb-5 pr-12 text-base leading-relaxed text-muted">{i.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Closing action. */
export function FinalCta() {
  const c = L.final;
  return (
    <section aria-labelledby="final-h">
      <div className={`${wrap} py-20 sm:py-28`}>
        <div className="reveal rounded-hero bg-brand-50 px-6 py-16 text-center sm:px-12 sm:py-24">
          <SectionTitle id="final-h">{c.title}</SectionTitle>
          <p className="mt-4 text-lg text-muted sm:text-xl">{c.sub}</p>
          <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
            <Link href="/check" className={ctaPrimary}>
              {c.cta} <span aria-hidden>→</span>
            </Link>
            <Link href="/toolkit" className={ctaSecondary}>
              {c.tools}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
