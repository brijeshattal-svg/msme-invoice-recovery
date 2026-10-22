export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        Is your client paying you late?
      </h1>
      <p className="mt-4 text-base leading-7">
        Find out what you&apos;re owed and what to say. Upload an overdue
        invoice, see whether it&apos;s legally late and how much interest has
        built up, and get a polite email you send yourself.
      </p>
      <footer className="mt-12 text-sm text-zinc-600 dark:text-zinc-400">
        Not legal advice. Calculates and drafts; you decide what to send.
      </footer>
    </main>
  );
}
