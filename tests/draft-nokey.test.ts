import { describe, expect, it } from "vitest";

// No mocks on purpose: the real client module runs with the API key removed.
delete process.env.GEMINI_API_KEY;

import { POST } from "@/app/api/draft/route";
import { checkEmail } from "@/lib/email/check";
import { addDays } from "@/lib/engine";
import { todayIST } from "@/lib/today";
import { FORM, factsFor } from "./helpers";

describe("GATE: with GEMINI_API_KEY removed, the template path still completes the journey", () => {
  it("POST /api/draft returns a passing standard draft for every tone", async () => {
    const today = todayIST();
    const invoiceDate = addDays(today, -75);
    for (const tone of ["friendly", "firm", "formal"]) {
      const body = {
        clientName: FORM.clientName,
        invoiceNumber: FORM.invoiceNumber,
        invoiceDate,
        amount: 236000,
        acceptanceDate: invoiceDate,
        agreementDays: null,
        udyamDate: "2024-06-01",
        tone,
      };
      const res = await POST(
        new Request("http://localhost/api/draft", {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "x-forwarded-for": `10.2.0.${tone.length}` },
        }),
      );
      expect(res.status, tone).toBe(200);
      const j = await res.json();
      expect(j.source, tone).toBe("template");
      const facts = factsFor({ ...FORM, invoiceDate, acceptanceDate: invoiceDate }, today);
      expect(checkEmail(j, facts).ok, tone).toBe(true);
    }
  });
});
