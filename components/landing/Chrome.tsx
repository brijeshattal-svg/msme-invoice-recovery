import Link from "next/link";
import { LANDING as L } from "@/lib/copy";
import { Wordmark, wrap } from "./ui";

/** Translucent sticky header: wordmark, section links (from tablet up) and the one primary action. */
export function LandingNav() {
  const link = "min-h-11 content-center rounded-full px-3.5 text-[15px] font-medium text-muted transition hover:bg-brand-50 hover:text-ink";
  return (
    <header className="glass sticky top-0 z-30 border-b border-line">
      <div className={`${wrap} flex h-14 items-center gap-2`}>
        <Wordmark />
        <nav aria-label={L.nav.label} className="ml-auto hidden items-center md:flex">
          <a href="#how" className={link}>
            {L.nav.how}
          </a>
          <a href="#features" className={link}>
            {L.nav.features}
          </a>
          <a href="#faq" className={link}>
            {L.nav.faq}
          </a>
        </nav>
        <Link
          href="/check"
          className="ml-auto inline-flex min-h-11 items-center rounded-full bg-brand-700 px-5 text-[15px] font-semibold text-on-brand transition hover:bg-brand-800 md:ml-3"
        >
          {L.nav.cta}
        </Link>
      </div>
    </header>
  );
}

export function LandingFooter() {
  const f = L.footer;
  const link = "min-h-11 content-center font-medium text-link underline-offset-4 hover:underline";
  return (
    <footer className="border-t border-line">
      <div className={`${wrap} flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex flex-col gap-2">
          <Wordmark />
          <p className="max-w-sm text-sm text-muted">{f.disclaimer}</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 text-[15px]">
          <Link href="/check" className={link}>
            {f.links.check}
          </Link>
          <Link href="/toolkit" className={link}>
            {f.links.tools}
          </Link>
          <Link href="/privacy" className={link}>
            {f.links.privacy}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
