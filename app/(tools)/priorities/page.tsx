import type { Metadata } from "next";
import { PriorityList } from "@/components/toolkit/PriorityList";
import { ToolHeading } from "@/components/toolkit/ToolsShell";
import { TOOLKIT } from "@/lib/copy";

export const metadata: Metadata = {
  title: TOOLKIT.tools.priorities.title,
  description: TOOLKIT.tools.priorities.intro,
  robots: { index: false, follow: false },
};

export default function PrioritiesPage() {
  return (
    <>
      <ToolHeading id="priorities" />
      <PriorityList />
    </>
  );
}
