"use client";

import Link from "next/link";
import { useState } from "react";
import { ACCOUNT as C, PRIVACY } from "@/lib/copy";
import { Banner } from "../ui/Banner";
import { Button } from "../ui/Button";
import { inputClass } from "../ui/Field";
import { useToolkit } from "./state";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const card = "rounded-hero bg-surface p-6 shadow-raised";

/** Optional sign-in (one-time email link), what is saved, sign out, and deleting your data. */
export function Account() {
  const { account } = useToolkit();
  if (!account.enabled) {
    return (
      <Banner tone="info" role="note">
        <p>{C.notSetUp}</p>
      </Banner>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      {account.user ? <SignedIn /> : <SignIn />}
      <section aria-labelledby="saved-h" className={card}>
        <h2 id="saved-h" className="text-lg font-semibold">
          What an account keeps
        </h2>
        <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-base">
          {C.saved.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <Link href="/privacy" className="mt-4 inline-block font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800">
          {PRIVACY.link}
        </Link>
      </section>
    </div>
  );
}

function SignIn() {
  const { account } = useToolkit();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "bad" | "failed">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL.test(value)) return setState("bad");
    setState("sending");
    const r = await account.signIn(value);
    setState(r.ok ? "sent" : "failed");
  };

  return (
    <form onSubmit={submit} noValidate className={card} aria-labelledby="signin-h">
      <h2 id="signin-h" className="text-lg font-semibold">
        Sign in to save your list
      </h2>
      <label htmlFor="acc-email" className="mt-4 block font-semibold">
        {C.emailLabel}
      </label>
      <p id="acc-email-help" className="text-sm text-muted">
        {C.emailHelp}
      </p>
      <input
        id="acc-email"
        type="email"
        inputMode="email"
        autoComplete="email"
        className={`${inputClass} mt-2 border-control`}
        aria-describedby={state === "bad" ? "acc-email-help acc-email-err" : "acc-email-help"}
        aria-invalid={state === "bad"}
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (state !== "sending") setState("idle");
        }}
      />
      {state === "bad" && (
        <p id="acc-email-err" className="mt-2 font-medium text-danger">
          {C.badEmail}
        </p>
      )}
      <Button type="submit" size="lg" className="mt-4" loading={state === "sending"} disabled={state === "sending"}>
        {state === "sending" ? C.sending : C.send}
      </Button>
      <div aria-live="polite">
        {state === "sent" && (
          <Banner tone="info" size="sm" className="mt-4">
            <p>{C.sent(email.trim())}</p>
          </Banner>
        )}
        {state === "failed" && (
          <Banner tone="danger" size="sm" className="mt-4">
            <p>{C.failed}</p>
          </Banner>
        )}
      </div>
    </form>
  );
}

function SignedIn() {
  const { account } = useToolkit();
  const [confirm, setConfirm] = useState<"none" | "saved" | "account">("none");
  const [note, setNote] = useState<string | null>(null);
  const user = account.user!;

  const run = async (what: "saved" | "account") => {
    const ok = what === "saved" ? await account.deleteSaved() : await account.deleteAccount();
    setConfirm("none");
    setNote(ok ? (what === "saved" ? C.deletedSaved : null) : C.deleteFailed);
  };

  return (
    <>
      <section className={card} aria-labelledby="who-h">
        <h2 id="who-h" className="text-lg font-semibold">
          {C.signedInAs(user.email)}
        </h2>
        <p aria-live="polite" className={account.sync === "error" ? "mt-2 font-medium text-danger" : "mt-2 text-muted"}>
          {C.status[account.sync]}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/priorities"
            className="inline-flex min-h-12 items-center rounded-button bg-brand-700 px-5 text-base font-semibold text-on-brand hover:bg-brand-800"
          >
            {C.openList}
          </Link>
          <Button variant="secondary" onClick={() => account.signOut()}>
            {C.signOut}
          </Button>
        </div>
      </section>

      <section className={card} aria-labelledby="danger-h">
        <h2 id="danger-h" className="text-lg font-semibold">
          {C.dangerTitle}
        </h2>
        <div className="mt-4 flex flex-col items-start gap-3">
          {confirm === "none" && (
            <>
              <Button variant="secondary" onClick={() => setConfirm("saved")}>
                {C.deleteSaved}
              </Button>
              <Button variant="link" tone="muted" onClick={() => setConfirm("account")} className="px-0">
                {C.deleteAccount}
              </Button>
            </>
          )}
          {confirm !== "none" && (
            <div role="alert" className="flex flex-wrap gap-3">
              <Button onClick={() => run(confirm)} className="bg-danger hover:bg-danger">
                {confirm === "saved" ? C.deleteSavedConfirm : C.deleteAccountConfirm}
              </Button>
              <Button variant="ghost" onClick={() => setConfirm("none")}>
                {C.cancel}
              </Button>
            </div>
          )}
          <div aria-live="polite">{note && <p className="font-medium">{note}</p>}</div>
        </div>
      </section>
    </>
  );
}

/** Small status link in the tools header: "Sign in to save", or the saving state when signed in. */
export function AccountChip() {
  const { account } = useToolkit();
  if (!account.enabled) return null;
  const label = !account.user
    ? C.chipSignIn
    : account.sync === "error"
      ? C.chipError
      : account.sync === "saving" || account.sync === "loading"
        ? C.chipSaving
        : C.chipSaved;
  // Phones: an icon (the label stays for screen readers), so the header still fits 360px.
  return (
    <Link
      href="/account"
      className={`inline-flex min-h-11 min-w-11 items-center justify-center whitespace-nowrap rounded-full px-2 text-sm font-semibold hover:bg-brand-50 sm:px-3 ${account.sync === "error" ? "text-danger" : "text-link"}`}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 sm:hidden" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
      </svg>
      <span className="max-sm:sr-only">{label}</span>
    </Link>
  );
}
