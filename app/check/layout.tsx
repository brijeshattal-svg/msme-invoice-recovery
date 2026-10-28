import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Check an overdue invoice · FortyFive",
  description: "Upload an overdue invoice, see the interest that may be owed, and get a polite email you can send yourself.",
  robots: { index: false, follow: false },
};

export default function CheckLayout({ children }: { children: React.ReactNode }) {
  return children;
}
