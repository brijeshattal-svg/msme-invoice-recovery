import type { Metadata } from "next";
import { Dashboard } from "@/components/toolkit/Dashboard";
import { ToolHeading } from "@/components/toolkit/ToolsShell";
import { TOOLKIT } from "@/lib/copy";

export const metadata: Metadata = {
  title: `${TOOLKIT.tools.dashboard.title} · ${TOOLKIT.workspace}`,
  description: TOOLKIT.tools.dashboard.intro,
  robots: { index: false, follow: false },
};

/** "More tools" lands here: the workspace dashboard. */
export default function DashboardPage() {
  return (
    <>
      <ToolHeading id="dashboard" />
      <Dashboard />
    </>
  );
}
