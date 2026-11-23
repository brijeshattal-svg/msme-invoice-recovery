"use client";

import Link from "next/link";
import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { CONTACT as C } from "@/lib/copy";
import { CLIENT_TIMEOUT_MS } from "@/lib/limits";
import { Eyebrow, SectionTitle, wrap } from "./ui";

type FieldName = "name" | "email" | "message";
type Status = "idle" | "sending" | "sent" | "rate_limited" | "failed";

const EMAIL = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]+$/;

/** Browser-side checks (the server checks again); returns the fields with a problem. */
export function contactErrors(v: Record<FieldName, string>): Partial<Record<FieldName, string>> {
  const e: Partial<Record<FieldName, string>> = {};
  if (!v.name.trim()) e.name = C.errors.name;
  if (!EMAIL.test(v.email.trim())) e.email = C.errors.email;
  if (!v.message.trim() || v.message.length > 2000) e.message = C.errors.message;
  return e;
}

/** The landing page's contact form: saved to Supabase, emailed to the owner, auto-acknowledged. */
export function Contact() {
  const [v, setV] = useState<Record<FieldName, string>>({ name: "", email: "", message: "" });
  const [website, setWebsite] = useState(""); // honeypot
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [status, setStatus] = useState<Status>("idle");

  const set = (f: FieldName) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [f]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = contactErrors(v);
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(`c-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...v, website }),
        signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
      });
      if (res.ok) {
        setStatus("sent");
        setV({ name: "", email: "", message: "" });
      } else setStatus(res.status === 429 ? "rate_limited" : "failed");
    } catch {
      setStatus("failed");
    }
  };

  const field = (f: FieldName) => ({
    id: `c-${f}`,
    value: v[f],
    onChange: set(f),
    "aria-invalid": Boolean(errors[f]),
    "aria-describedby": [errors[f] ? `c-${f}-err` : "", f === "message" ? "c-message-help" : ""].filter(Boolean).join(" ") || undefined,
    className: `${inputClass} mt-2 ${errors[f] ? "border-danger" : "border-control"}`,
  });
  const err = (f: FieldName) =>
    errors[f] && (
      <p id={`c-${f}-err`} className="mt-1.5 font-medium text-danger">
        {errors[f]}
      </p>
    );

  return (
    <section id="contact" aria-labelledby="contact-h" className="scroll-mt-16 border-t border-line bg-surface">
      <div className={`${wrap} grid gap-10 py-20 md:grid-cols-[1fr_1.2fr] md:py-28`}>
        <div>
          <Eyebrow>{C.eyebrow}</Eyebrow>
          <SectionTitle id="contact-h" className="mt-3">
            {C.title}
          </SectionTitle>
          <p className="mt-5 max-w-md text-lg text-muted">{C.sub}</p>
        </div>

        <form onSubmit={submit} noValidate className="rounded-hero bg-canvas p-6 shadow-raised sm:p-8" aria-labelledby="contact-h">
          <div className="flex flex-col gap-5">
            <div>
              <label htmlFor="c-name" className="font-semibold">
                {C.nameLabel}
              </label>
              <input {...field("name")} autoComplete="name" maxLength={100} />
              {err("name")}
            </div>
            <div>
              <label htmlFor="c-email" className="font-semibold">
                {C.emailLabel}
              </label>
              <input {...field("email")} type="email" inputMode="email" autoComplete="email" maxLength={254} />
              {err("email")}
            </div>
            <div>
              <label htmlFor="c-message" className="font-semibold">
                {C.messageLabel}
              </label>
              <p id="c-message-help" className="text-sm text-muted">
                {C.messageHelp}
              </p>
              <textarea {...field("message")} rows={5} maxLength={2000} className={`${field("message").className} min-h-32 py-3`} />
              {err("message")}
            </div>
            {/* Honeypot: invisible to people and screen readers; bots fill it in and are quietly ignored. */}
            <div aria-hidden className="absolute -left-[10000px] h-px w-px overflow-hidden">
              <label htmlFor="c-website">Website</label>
              <input id="c-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>
            <Button type="submit" size="lg" loading={status === "sending"} className="self-start">
              {status === "sending" ? C.sending : C.send}
            </Button>
            <div aria-live="polite">
              {status === "sent" && (
                <Banner tone="info" size="sm">
                  <p>{C.sent}</p>
                </Banner>
              )}
              {(status === "failed" || status === "rate_limited") && (
                <Banner tone="danger" size="sm">
                  <p>{status === "rate_limited" ? C.errors.rate_limited : C.errors.failed}</p>
                </Banner>
              )}
            </div>
            <p className="text-sm text-muted">
              {C.note.replace(" See Privacy and terms.", " ")}
              <Link href="/privacy" className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800">
                Privacy and terms
              </Link>
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}
