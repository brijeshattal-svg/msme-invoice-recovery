import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import PrivacyPage from "@/app/privacy/page";
import { Contact, contactErrors } from "@/components/landing/Contact";
import { CONTACT, PRIVACY } from "@/lib/copy";
import { acknowledgementMail, cleanLine, cleanMessage, handleContact, ownerMail, type ContactDeps, type Mail } from "@/lib/contact";

const OWNER = "owner@example.com";
const good = { name: "Asha Rao", email: "asha@example.com", message: "Does the 45-day rule apply to retainers?\nThanks!" };

function deps(over: Partial<ContactDeps> = {}) {
  const saved: unknown[] = [];
  const sent: Mail[] = [];
  const d: ContactDeps = {
    save: vi.fn(async (m) => {
      saved.push(m);
      return true;
    }),
    send: vi.fn(async (mail: Mail) => {
      sent.push(mail);
      return true;
    }),
    ownerEmail: OWNER,
    now: () => new Date("2026-11-23T10:00:00Z"),
    ...over,
  };
  return { d, saved, sent };
}

describe("contact form: save, notify, acknowledge", () => {
  it("a good message is saved once, the owner is notified with Reply-To, and the sender gets the acknowledgement", async () => {
    const { d, saved, sent } = deps();
    const r = await handleContact(good, d);
    expect(r).toMatchObject({ status: 200, body: { ok: true }, saved: true, notified: true, acknowledged: true });
    expect(saved).toEqual([good]);
    expect(sent.map((m) => m.to).sort()).toEqual(["asha@example.com", OWNER].sort());
    const owner = sent.find((m) => m.to === OWNER)!;
    expect(owner.replyTo).toBe("asha@example.com");
    expect(owner.text).toContain(good.message);
    expect(owner.subject).toBe("New FortyFive message from Asha Rao");
  });

  it("the automatic reply repeats nothing the visitor typed (the form can't be used to spam others)", async () => {
    const { d, sent } = deps();
    await handleContact({ name: "Buy cheap pills at spam.example", email: "victim@example.com", message: "Visit spam.example now" }, d);
    const ack = sent.find((m) => m.to === "victim@example.com")!;
    expect(ack).toEqual(acknowledgementMail("victim@example.com"));
    expect(`${ack.subject} ${ack.text}`).not.toMatch(/spam|pills|Visit/);
  });

  it("if saving fails, nothing is emailed and the visitor is told it didn't work", async () => {
    const { d, sent } = deps({ save: async () => false });
    const r = await handleContact(good, d);
    expect(r).toMatchObject({ status: 502, body: { error: "save_failed" } });
    expect(sent).toEqual([]);
  });

  it("if an email fails, the message is still saved and the visitor still sees success", async () => {
    const { d } = deps({ send: async (m) => m.to !== OWNER });
    const r = await handleContact(good, d);
    expect(r).toMatchObject({ status: 200, saved: true, notified: false, acknowledged: true });
  });

  it("with email not set up, messages are still saved", async () => {
    const { d, saved } = deps({ send: null });
    const r = await handleContact(good, d);
    expect(r).toMatchObject({ status: 200, saved: true, notified: false, acknowledged: false });
    expect(saved).toHaveLength(1);
  });

  it("a bot that fills the hidden field gets a normal-looking success, but nothing is saved or sent", async () => {
    const { d, saved, sent } = deps();
    const r = await handleContact({ ...good, website: "http://spam.example" }, d);
    expect(r).toMatchObject({ status: 200, body: { ok: true }, saved: false });
    expect(saved).toEqual([]);
    expect(sent).toEqual([]);
  });

  it.each([
    ["no name", { ...good, name: "   " }],
    ["bad email", { ...good, email: "not-an-email" }],
    ["two addresses", { ...good, email: "a@example.com, b@example.com" }],
    ["header injection in the email", { ...good, email: "a@example.com\nBcc: everyone@example.com" }],
    ["empty message", { ...good, message: "\n\n " }],
    ["missing fields", {}],
    ["not an object", "hello"],
  ])("rejects %s", async (_label, input) => {
    const { d, saved } = deps();
    expect((await handleContact(input, d)).status).toBe(400);
    expect(saved).toEqual([]);
  });

  it("names can't inject email headers; messages keep line breaks but lose control characters; lengths are capped", () => {
    expect(cleanLine("Asha\r\nBcc: x@y.z", 100)).toBe("Asha Bcc: x@y.z");
    expect(cleanLine("x".repeat(500), 100)).toHaveLength(100);
    expect(cleanMessage("line one\r\nline two\u0007\n\n\n\nend")).toBe("line one\nline two\n\nend");
    expect(cleanMessage("y".repeat(5000))).toHaveLength(2000);
    expect(ownerMail({ ...good, name: cleanLine("A\nB", 100) }, OWNER, new Date()).subject).not.toMatch(/\n/);
  });
});

describe("the form on the landing page", () => {
  it("has labelled fields, a hidden honeypot and a privacy link", () => {
    const html = renderToStaticMarkup(<Contact />);
    for (const id of ["c-name", "c-email", "c-message"]) expect(html).toMatch(new RegExp(`<label[^>]*for="${id}"`));
    expect(html).toContain('id="contact"');
    expect(html).toMatch(/aria-hidden="true"[^>]*class="absolute -left-\[10000px\]/);
    expect(html).toContain('href="/privacy"');
  });

  it("checks fields in the browser before sending", () => {
    expect(contactErrors({ name: "", email: "x", message: "" })).toEqual({ name: CONTACT.errors.name, email: CONTACT.errors.email, message: CONTACT.errors.message });
    expect(contactErrors({ name: "A", email: "a@b.co", message: "hi" })).toEqual({});
  });

  it("the privacy page explains what the form keeps and how to get it deleted", () => {
    const t = renderToStaticMarkup(<PrivacyPage />).replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'");
    expect(t).toContain(PRIVACY.contactTitle);
    expect(t).toContain("Nobody can read them through the website");
  });
});

describe("the contact table only accepts new messages", () => {
  const sql = readFileSync("supabase/migrations/20261123100000_contact_messages.sql", "utf8").toLowerCase();

  it("row-level security is on, the only policy is insert, and only insert is granted", () => {
    expect(sql).toContain("alter table public.contact_messages enable row level security");
    const policies = sql.match(/create policy[^;]+;/g) ?? [];
    expect(policies).toHaveLength(1);
    expect(policies[0]).toContain("for insert");
    expect(sql).toContain("revoke all on public.contact_messages from anon, authenticated");
    expect(sql).toContain("grant insert on public.contact_messages to anon, authenticated");
    expect(sql).not.toMatch(/grant (select|update|delete)/);
  });
});
