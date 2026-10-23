import type { Metadata } from "next";
import Link from "next/link";
import { PRIVACY as P } from "@/lib/copy";
import { aiPlanIsPaid } from "@/lib/privacy";

export const metadata: Metadata = {
  title: `${P.title} · FortyFive`,
  description: P.intro,
  robots: { index: false, follow: false },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function List({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-6">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

const linkClass = "font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800";

export default function PrivacyPage() {
  const paid = aiPlanIsPaid();
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10 text-base text-ink">
      <header className="flex flex-col gap-3">
        <Link href="/" className={`self-start text-sm ${linkClass}`}>
          ← {P.back}
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{P.title}</h1>
        <p>{P.intro}</p>
        <p className="text-sm text-muted">{P.updated}</p>
      </header>

      <div className="rounded-card bg-brand-50 p-5">
        <h2 className="font-semibold">{P.summaryTitle}</h2>
        <div className="mt-2">
          <List items={P.summary} />
        </div>
      </div>

      <Section title={P.flowTitle}>
        <ol className="flex list-decimal flex-col gap-2 pl-6">
          {P.flow.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
      </Section>

      <Section title={P.notTitle}>
        <List items={P.not} />
      </Section>

      <Section title={P.logsTitle}>
        <List items={P.logs} />
      </Section>

      <Section title={P.aiTitle}>
        <p className={paid ? "" : "rounded-card bg-warn-bg p-4 text-warn-ink"}>{paid ? P.aiPaid : P.aiFree}</p>
        <a href={P.aiTermsUrl} target="_blank" rel="noopener noreferrer" className={`self-start ${linkClass}`}>
          {P.aiTerms}
        </a>
      </Section>

      <Section title={P.rightsTitle}>
        <p>{P.rights}</p>
        <a href={P.contactUrl} target="_blank" rel="noopener noreferrer" className={`self-start ${linkClass}`}>
          {P.contactLabel}
        </a>
      </Section>

      <Section title={P.termsTitle}>
        <List items={P.terms} />
      </Section>
    </main>
  );
}
