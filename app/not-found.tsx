import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-4 py-12">
      <h1 className="text-2xl font-semibold">We couldn&apos;t find that page</h1>
      <p className="text-base">The link may be wrong or out of date.</p>
      <Link
        href="/"
        className="inline-flex min-h-12 min-w-11 items-center self-start rounded-button bg-brand-700 px-5 py-3 text-base font-semibold text-on-brand hover:bg-brand-800"
      >
        Check an invoice
      </Link>
    </main>
  );
}
