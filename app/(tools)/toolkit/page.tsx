import type { Metadata } from "next";
import Link from "next/link";
import { TOOLKIT, type ToolId } from "@/lib/copy";

export const metadata: Metadata = {
  title: TOOLKIT.title,
  description: TOOLKIT.intro,
  robots: { index: false, follow: false },
};

const IDS = Object.keys(TOOLKIT.tools) as ToolId[];

/** "More tools": a simple hub that links to each side tool's own page. */
export default function ToolkitHubPage() {
  return (
    <>
      <div className="text-center">
        <h1 className="step-title">{TOOLKIT.title}</h1>
        <p className="mx-auto mt-4 max-w-[30em] text-lg text-muted">{TOOLKIT.intro}</p>
      </div>
      <ul className="flex flex-col gap-4">
        {IDS.map((id) => {
          const t = TOOLKIT.tools[id];
          return (
            <li key={id}>
              <Link href={t.href} className="block rounded-hero bg-surface p-6 shadow-raised transition hover:-translate-y-0.5">
                <h2 className="text-xl font-bold tracking-tight">{t.title}</h2>
                <p className="mt-1 text-muted">{t.intro}</p>
                <span className="mt-3 inline-block font-semibold text-link">
                  {TOOLKIT.open} {t.nav} →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
