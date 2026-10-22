import type { Metadata } from "next";
import { PriorityList } from "@/components/toolkit/PriorityList";
import { ToolHeading } from "@/components/toolkit/ToolsShell";
import { TOOLKIT } from "@/lib/copy";

export const metadata: Metadata = {
  title: `${TOOLKIT.tools.priorities.title} · ${TOOLKIT.workspace}`,
  description: TOOLKIT.tools.priorities.intro,
  robots: { index: false, follow: false },
};

export default function PrioritiesPage() {
  return (
    <>
      <ToolHeading id="priorities" />
      <div className="max-w-3xl">
        <PriorityList />
      </div>
    </>
  );
}
