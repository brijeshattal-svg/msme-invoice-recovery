import type { Metadata } from "next";
import { LandingFooter, LandingNav } from "@/components/landing/Chrome";
import { Hero } from "@/components/landing/Hero";
import { Band, Faq, FinalCta, Features, How, Limits, Why } from "@/components/landing/Sections";
import { COPY } from "@/lib/copy";

export const metadata: Metadata = {
  title: "FortyFive: the 45-day rule, on your side",
  description: COPY.heroSub,
  robots: { index: false, follow: false },
};

/** The front door. Quick Check (the working app) lives at /check. Static: no data, no state. */
export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <main className="flex-1">
        <Hero />
        <Why />
        <How />
        <Features />
        <Band />
        <Limits />
        <Faq />
        <FinalCta />
      </main>
      <LandingFooter />
    </>
  );
}
