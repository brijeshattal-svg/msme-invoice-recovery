import { z } from "zod";

// The landing page's contact form (supabase/migrations/20261123100000_contact_messages.sql).
// Flow: validate -> save one row in Supabase -> email the owner -> send the sender a fixed
// acknowledgement. The acknowledgement never repeats anything the visitor typed, so the form
// can't be used to send someone else an email with an attacker's words in it.

const MAX_NAME = 100;
const MAX_EMAIL = 254;
const MAX_MESSAGE = 2000;

/** Single-line text: no control characters (so no header injection), spaces collapsed, capped. */
export function cleanLine(s: string, max: number): string {
  return s.replace(/[\u0000-\u001F\u007F-\u009F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

/** Multi-line text: keeps line breaks, removes other control characters, at most 2 blank lines. */
export function cleanMessage(s: string): string {
  return s
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_MESSAGE);
}

export const ContactRequest = z.object({
  name: z.string().max(500).transform((s) => cleanLine(s, MAX_NAME)).pipe(z.string().min(1)),
  email: z
    .string()
    .max(500)
    .transform((s) => s.trim())
    .pipe(z.string().max(MAX_EMAIL).regex(/^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]+$/)),
  message: z.string().max(10_000).transform(cleanMessage).pipe(z.string().min(1)),
  /** Honeypot: hidden from people; bots fill it in. */
  website: z.string().max(500).optional(),
});
export type ContactMessage = { name: string; email: string; message: string };

export type Mail = { to: string; subject: string; text: string; replyTo?: string };

/** The notification to the owner: everything the visitor sent, with Reply-To set to them. */
export function ownerMail(m: ContactMessage, to: string, receivedAt: Date): Mail {
  const when = receivedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
  return {
    to,
    replyTo: m.email,
    subject: `New FortyFive message from ${m.name}`,
    text: [
      "Someone wrote to you through the contact form on FortyFive.",
      "",
      `Name: ${m.name}`,
      `Email: ${m.email}`,
      `Received: ${when} (IST)`,
      "",
      "Message:",
      m.message,
      "",
      "Reply to this email to answer them directly. The message is also saved in Supabase (table contact_messages).",
    ].join("\n"),
  };
}

/** The automatic acknowledgement: fixed text only (nothing the visitor typed is repeated). */
export function acknowledgementMail(to: string): Mail {
  return {
    to,
    subject: "We got your message - FortyFive",
    text: [
      "Hello,",
      "",
      "Thank you for writing to FortyFive. This is an automatic reply to confirm that your message reached us. We read every message and will get back to you soon.",
      "",
      "If you didn't use the contact form on FortyFive, you can ignore this email.",
      "",
      "FortyFive",
      "https://msme-invoice-recovery.vercel.app",
    ].join("\n"),
  };
}

export type ContactDeps = {
  /** Saves the row; resolves false if the database refused it. */
  save: (m: ContactMessage) => Promise<boolean>;
  /** Sends one email; resolves false if it couldn't be sent. Null when email isn't set up. */
  send: ((mail: Mail) => Promise<boolean>) | null;
  ownerEmail: string | null;
  now: () => Date;
};

export type ContactOutcome =
  | { status: 200; body: { ok: true }; saved: boolean; notified: boolean; acknowledged: boolean }
  | { status: 400 | 502; body: { error: "invalid_input" | "save_failed" }; saved: false; notified: false; acknowledged: false };

/** Validate, save, then email. Bots that fill the honeypot get a normal-looking success. */
export async function handleContact(input: unknown, deps: ContactDeps): Promise<ContactOutcome> {
  const parsed = ContactRequest.safeParse(input);
  if (!parsed.success) return { status: 400, body: { error: "invalid_input" }, saved: false, notified: false, acknowledged: false };
  const { website, ...m } = parsed.data;
  if (website && website.trim() !== "") return { status: 200, body: { ok: true }, saved: false, notified: false, acknowledged: false };

  if (!(await deps.save(m))) return { status: 502, body: { error: "save_failed" }, saved: false, notified: false, acknowledged: false };

  let notified = false;
  let acknowledged = false;
  if (deps.send) {
    const [owner, ack] = await Promise.allSettled([
      deps.ownerEmail ? deps.send(ownerMail(m, deps.ownerEmail, deps.now())) : Promise.resolve(false),
      deps.send(acknowledgementMail(m.email)),
    ]);
    notified = owner.status === "fulfilled" && owner.value;
    acknowledged = ack.status === "fulfilled" && ack.value;
  }
  return { status: 200, body: { ok: true }, saved: true, notified, acknowledged };
}
