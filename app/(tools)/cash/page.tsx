import type { Metadata } from "next";
import { CashForecast } from "@/components/toolkit/CashForecast";
import { ToolHeading } from "@/components/toolkit/ToolsShell";
import { TOOLKIT } from "@/lib/copy";

export const metadata: Metadata = {
  title: `${TOOLKIT.tools.cash.title} · ${TOOLKIT.workspace}`,
  description: TOOLKIT.tools.cash.intro,
  robots: { index: false, follow: false },
};

export default function CashPage() {
  return (
    <>
      <ToolHeading id="cash" />
      <div className="max-w-3xl">
        <CashForecast />
      </div>
    </>
  );
}
