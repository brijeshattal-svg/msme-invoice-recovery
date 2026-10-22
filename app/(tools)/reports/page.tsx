import type { Metadata } from "next";
import { AgeingReport } from "@/components/toolkit/AgeingReport";
import { ToolHeading } from "@/components/toolkit/ToolsShell";
import { TOOLKIT } from "@/lib/copy";

export const metadata: Metadata = {
  title: `${TOOLKIT.tools.reports.title} · ${TOOLKIT.workspace}`,
  description: TOOLKIT.tools.reports.intro,
  robots: { index: false, follow: false },
};

export default function ReportsPage() {
  return (
    <>
      <ToolHeading id="reports" />
      <AgeingReport />
    </>
  );
}
