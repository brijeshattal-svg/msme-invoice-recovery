import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToolkitProvider } from "@/components/toolkit/state";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Overdue invoice check for service MSEs",
  description:
    "See whether a client's invoice may be late under the MSMED Act, the interest that may be owed, and a polite email to send yourself.",
  // A hackathon demo, not a public site: keep it out of search results (also sent as a header).
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* In-memory list shared by Quick Check and the side tools; nothing is stored (CLAUDE.md rule 3). */}
        <ToolkitProvider>{children}</ToolkitProvider>
      </body>
    </html>
  );
}
