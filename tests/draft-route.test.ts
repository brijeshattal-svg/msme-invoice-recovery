import { beforeEach, describe, expect, it, vi } from "vitest";

const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock("@/lib/ai/client", () => ({
  MODEL: "test-model",
  getClient: () => ({ models: { generateContent } }),
}));

import { POST } from "@/app/api/draft/route";
import { checkEmail } from "@/lib/email/check";
import { buildTemplate } from "@/lib/email/template";
import { addDays } from "@/lib/engine";
import { todayIST } from "@/lib/today";
import { FORM, factsFor } from "./helpers";

// The route uses the real clock, so build the invoice relative to today (IST).
const today = todayIST();
const invoiceDate = addDays(today, -75);
const base = {
  clientName: "Northwind Test Industries Pvt Ltd",
  invoiceNumber: "BDS/2026/0142",
  invoiceDate,
  amount: 236000,
  acceptanceDate: invoiceDate,
  agreementDays: null as number | null,
  udyamDate: "2024-06-01",
  tone: "friendly",
};
const formFor = (b: typeof base) => ({
  ...FORM,
  clientName: b.clientName,
  invoiceNumber: b.invoiceNumber,
  invoiceDate: b.invoiceDate,
  amount: String(b.amount),
  acceptanceDate: b.acceptanceDate,
  udyamDate: b.udyamDate,
  hasAgreement: b.agreementDays !== null,
  agreementDays: b.agreementDays === null ? "" : String(b.agreementDays),
});
const factsOf = (b: typeof base) => factsFor(formFor(b), today);
const goodReply = (b: typeof base = base) => ({
  text: JSON.stringify(buildTemplate(factsOf(b), "friendly")),
  candidates: [{ finishReason: "STOP" }],
});

let ipN = 0;
const post = (body: unknown, ip = `10.1.0.${++ipN}`) =>
  POST(
    new Request("http://localhost/api/draft", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
    }),
  );

beforeEach(() => {
  generateContent.mockReset();
  generateContent.mockImplementation(async () => goodReply());
});

describe("POST /api/draft", () => {
  it("returns an AI draft that passes the number check, with no-store caching", async () => {
    const res = await post(base);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const j = await res.json();
    expect(j).toMatchObject({ source: "ai", redrafts: 0 });
    expect(checkEmail(j, factsOf(base)).ok).toBe(true);
  });

  it("GATE: a wrong-amount model is redrafted twice, then the template is returned", async () => {
    const good = JSON.parse(goodReply().text);
    const f = factsOf(base);
    generateContent.mockImplementation(async () => ({
      text: JSON.stringify({ subject: good.subject, body: good.body.split(f.strings.totalDue).join("₹1,11,111.00") }),
      candidates: [{ finishReason: "STOP" }],
    }));
    const j = await (await post(base)).json();
    expect(generateContent).toHaveBeenCalledTimes(3);
    expect(j).toMatchObject({ source: "template", redrafts: 2 });
    expect(checkEmail(j, f).ok).toBe(true);
    expect(j.body).not.toContain("1,11,111.00");
  });

  it("recomputes on the server: the model sees server-computed figures, and extra client figures are ignored", async () => {
    const res = await post({ ...base, totalDue: 1, interest: 2, daysOverdue: 3, totalInterest: 4 });
    expect(res.status).toBe(200);
    const prompt = generateContent.mock.calls[0][0].contents[0].parts[0].text as string;
    const f = factsOf(base);
    expect(prompt).toContain(f.strings.totalDue);
    expect(prompt).toContain(f.strings.interest);
    expect(prompt).toContain(f.strings.daysOverdue);
    expect(f.strings.daysOverdue).toBe("60 days");
  });

  it("works for a capped agreement (60 days -> 45)", async () => {
    const b = { ...base, agreementDays: 60 };
    generateContent.mockImplementation(async () => goodReply(b));
    const j = await (await post(b)).json();
    expect(j.source).toBe("ai");
    expect(checkEmail(j, factsOf(b)).ok).toBe(true);
  });

  it("returns 409 not_overdue, without calling the model, when the invoice is not late", async () => {
    const recent = addDays(today, -5);
    const res = await post({ ...base, invoiceDate: recent, acceptanceDate: recent });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "not_overdue" });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("returns 409 when Udyam registration is after the invoice", async () => {
    const res = await post({ ...base, udyamDate: addDays(invoiceDate, 1) });
    expect(res.status).toBe(409);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it.each([
    ["non-JSON body", "not json"],
    ["missing clientName", { ...base, clientName: undefined }],
    ["clientName with only control characters", { ...base, clientName: "\u0000\n\t" }],
    ["impossible date", { ...base, invoiceDate: "2026-02-30" }],
    ["zero amount", { ...base, amount: 0 }],
    ["negative amount", { ...base, amount: -5 }],
    ["amount as a string", { ...base, amount: "236000" }],
    ["unknown tone", { ...base, tone: "angry" }],
    ["fractional agreement days", { ...base, agreementDays: 2.5 }],
    ["agreement days too large", { ...base, agreementDays: 4000 }],
    ["overlong name", { ...base, clientName: "x".repeat(5000) }],
  ])("rejects %s with 400 and never calls the model", async (_name, body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_input" });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("cleans untrusted strings before they reach the prompt", async () => {
    await post({ ...base, clientName: "Acme\n\u0000  Pvt   Ltd" });
    const prompt = generateContent.mock.calls[0][0].contents[0].parts[0].text as string;
    expect(prompt).toContain('"clientName": "Acme Pvt Ltd"');
    expect(prompt).not.toContain("\u0000");
  });

  it("rate-limits the 11th request from one IP", async () => {
    const ip = "9.9.9.9";
    for (let i = 0; i < 10; i++) expect((await post(base, ip)).status).toBe(200);
    expect((await post(base, ip)).status).toBe(429);
  });

  it("never logs inputs or the email", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const b = { ...base, clientName: "SECRET CLIENT NAME" };
    generateContent.mockImplementation(async () => goodReply(b)); // the model must use the real name or the check fails
    await post(b);
    const logged = spy.mock.calls.flat().join(" ");
    expect(logged).toMatch(/^draft status=200 ms=\d+ source=ai redrafts=0$/);
    expect(logged).not.toContain("SECRET");
    spy.mockRestore();
  });
});
