import type { Metadata } from "next";
import { BlockerAssistant } from "@/components/toolkit/BlockerAssistant";
import { ToolHeading } from "@/components/toolkit/ToolsShell";
import { TOOLKIT } from "@/lib/copy";

export const metadata: Metadata = {
  title: TOOLKIT.tools.blockers.title,
  description: TOOLKIT.tools.blockers.intro,
  robots: { index: false, follow: false },
};

export default function BlockersPage() {
  return (
    <>
      <ToolHeading id="blockers" />
      <BlockerAssistant />
    </>
  );
}
