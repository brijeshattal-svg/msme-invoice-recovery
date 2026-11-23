import type { Metadata } from "next";
import { Account } from "@/components/toolkit/Account";
import { ACCOUNT, TOOLKIT } from "@/lib/copy";

export const metadata: Metadata = {
  title: `${ACCOUNT.title} · ${TOOLKIT.workspace}`,
  description: ACCOUNT.intro,
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{ACCOUNT.title}</h1>
        <p className="mt-2 max-w-2xl text-lg text-muted">{ACCOUNT.intro}</p>
      </div>
      <div className="max-w-2xl">
        <Account />
      </div>
    </>
  );
}
