import nodemailer from "nodemailer";
import { handleContact, type ContactMessage, type Mail } from "@/lib/contact";
import { ipFrom, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

const HEADERS = { "Cache-Control": "no-store" };
const MAX_BODY_BYTES = 12_000;

// Server-only settings. GMAIL_APP_PASSWORD is a secret (never NEXT_PUBLIC_). The Supabase URL and
// publishable key are public; the table only accepts inserts (row-level security).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
const CONTACT_TO = process.env.CONTACT_TO || GMAIL_USER || null;

async function save(m: ContactMessage): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/contact_messages`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(m),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const transport =
  GMAIL_USER && GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD } })
    : null;

async function send(mail: Mail): Promise<boolean> {
  if (!transport || !GMAIL_USER) return false;
  try {
    await transport.sendMail({ from: { name: "FortyFive", address: GMAIL_USER }, ...mail });
    return true;
  } catch {
    return false;
  }
}

// CLAUDE.md rule 3: log outcome and timing only; never the name, address or message.
function respond(started: number, status: number, body: unknown, extra = ""): Response {
  console.info(`contact status=${status} ms=${Date.now() - started}${extra}`);
  return Response.json(body, { status, headers: HEADERS });
}

export async function POST(req: Request) {
  const started = Date.now();
  if (!rateLimit(`contact:${ipFrom(req)}`)) return respond(started, 429, { error: "rate_limited" });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return respond(started, 413, { error: "too_large" });
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return respond(started, 400, { error: "invalid_input" });
  }
  const r = await handleContact(json, { save, send: transport ? send : null, ownerEmail: CONTACT_TO, now: () => new Date() });
  return respond(started, r.status, r.body, ` saved=${r.saved} notified=${r.notified} acknowledged=${r.acknowledged}`);
}
