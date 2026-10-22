import type { ReactNode } from "react";
import { ToolsShell } from "@/components/toolkit/ToolsShell";

// Route group: shares the tools header and navigation without adding "(tools)" to any URL.
export default function ToolsLayout({ children }: { children: ReactNode }) {
  return <ToolsShell>{children}</ToolsShell>;
}
