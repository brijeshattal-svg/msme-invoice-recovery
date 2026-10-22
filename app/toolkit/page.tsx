import type { Metadata } from "next";
import { Toolkit } from "@/components/toolkit/Toolkit";

export const metadata: Metadata = {
  title: "Toolkit: payment blockers, priorities and cash",
  description: "Find what may be blocking a payment, who to chase first, and how late payments affect your cash.",
  robots: { index: false, follow: false },
};

export default function ToolkitPage() {
  return <Toolkit />;
}
