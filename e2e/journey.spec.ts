import { expect, test } from "@playwright/test";
import { enterByHand, noHorizontalScroll, reachResult, setup, tap } from "./helpers";

test.describe("Quick Check: the core journey", () => {
  test("sample invoice to a checked, copyable email", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
    await setup(page, { draft: "down" });
    await reachResult(page);

    // Plain-code figures for the sample at the fixed date.
    await expect(page.getByText("₹6,532.03").first()).toBeVisible();
    await expect(page.getByText("60 days late").first()).toBeVisible();
    await expect(page.getByText("Not legal advice").first()).toBeVisible();
    await noHorizontalScroll(page);

    await page.getByRole("button", { name: "Choose a tone" }).click();
    await expect(page.getByRole("radio")).toHaveCount(7);
    await page.getByText("Firm", { exact: true }).click();
    await page.getByRole("button", { name: "Draft my email" }).click();

    // The AI is "down": the standard draft appears with its honest chip and the same checked figures.
    await expect(page.getByRole("heading", { name: "Send it yourself" })).toBeVisible();
    await expect(page.getByText(/Standard draft \(written without AI\)/)).toBeVisible();
    const body = page.getByLabel("Email");
    await expect(body).toHaveValue(/₹2,36,000\.00/);
    await expect(body).toHaveValue(/60 days/);
    await expect(body).toHaveValue(/₹6,532\.03/);
    await expect(body).toHaveValue(/\[Your name\]/);
    await expect(body).not.toHaveValue(/lawyer|court|portal/i);
    await noHorizontalScroll(page);

    await page.getByRole("button", { name: "Copy email" }).click();
    await expect(page.getByText(/Copied/).first()).toBeVisible();
  });

  test("the gentle check-in never mentions interest", async ({ page }) => {
    await setup(page, { draft: "down" });
    await reachResult(page);
    await page.getByRole("button", { name: "Choose a tone" }).click();
    await page.getByText("Gentle check-in", { exact: true }).click();
    await expect(page.getByText(/there is nothing to waive/)).toBeVisible();
    await page.getByRole("button", { name: "Draft my email" }).click();
    const body = page.getByLabel("Email");
    await expect(body).toHaveValue(/checking in/i);
    await expect(body).not.toHaveValue(/interest/i);
    await expect(body).not.toHaveValue(/₹6,532\.03/);
  });

  test("the waiver switch adds the exact offer sentence, and is off by default", async ({ page }) => {
    await setup(page, { draft: "down" });
    await reachResult(page);
    await page.getByRole("button", { name: "Choose a tone" }).click();
    await page.getByText("Firm", { exact: true }).click();
    const waiver = page.getByRole("checkbox", { name: /waive the interest/ });
    await expect(waiver).not.toBeChecked();
    await waiver.check();
    await page.getByRole("button", { name: "Draft my email" }).click();
    await expect(page.getByLabel("Email")).toHaveValue(
      /If payment reaches us by 29 Oct 2026, I will gladly waive the interest accrued so far, ₹6,532\.03\./,
    );
  });

  test("an AI answer with an invented figure is refused in the browser and replaced", async ({ page }) => {
    await setup(page);
    await page.route("**/api/draft", (r) =>
      r.fulfill({ json: { subject: "Reminder", body: "Dear team, you owe ₹9,99,999.00. [Your name]", source: "ai" } }),
    );
    await reachResult(page);
    await page.getByRole("button", { name: "Choose a tone" }).click();
    await page.getByRole("button", { name: "Draft my email" }).click();
    await expect(page.getByText(/Standard draft/)).toBeVisible();
    await expect(page.getByLabel("Email")).not.toHaveValue(/9,99,999/);
    await expect(page.getByText("Numbers checked against your calculation")).toHaveCount(0);
  });

  test("manual entry works when the invoice can't be read", async ({ page }) => {
    await setup(page);
    await page.route("**/api/extract", (r) => r.fulfill({ status: 500, json: { error: "ai_failed" } }));
    await enterByHand(page, "100000");
    await page.getByRole("button", { name: "Check what I may be owed" }).click();
    await expect(page.getByRole("heading", { name: /Where you stand/ })).toBeVisible();
    await expect(page.getByText("60 days late").first()).toBeVisible();
  });

  test("form mistakes are explained, not silently accepted", async ({ page }) => {
    await setup(page);
    await page.goto("/check");
    await page.getByRole("button", { name: "Enter details manually" }).click();
    await page.getByRole("button", { name: "Check what I may be owed" }).click();
    await expect(page.getByText(/Please fix \d+ things? below/)).toBeVisible();
    await expect(page.getByText("Enter the client's name.")).toBeVisible();
    await enterByHand(page, "10.555");
    await page.getByRole("button", { name: "Check what I may be owed" }).click();
    await expect(page.getByText(/at most 2 decimal places/).first()).toBeVisible();
  });
});

test.describe("waiting on the AI", () => {
  test("a slow invoice read never traps the founder, and a late answer can't overwrite typing", async ({ page }) => {
    await setup(page);
    let release: () => void = () => {};
    const gate = new Promise<void>((res) => (release = res));
    await page.route("**/api/extract", async (r) => {
      await gate;
      await r.fulfill({
        json: {
          data: {
            isInvoice: true,
            clientName: "Late Answer Ltd",
            invoiceNumber: "L-1",
            invoiceDate: "2026-08-08",
            amountTotal: 5000,
            currency: "INR",
            paymentTermsDays: null,
            paymentTermsText: null,
            confidence: { clientName: "high", invoiceNumber: "high", invoiceDate: "high", amountTotal: "high", paymentTermsDays: "high" },
          },
        },
      });
    });
    await page.goto("/check");
    await page.getByRole("button", { name: /Try the sample/ }).click();
    await expect(page.getByText(/Reading your invoice/)).toBeVisible();
    const manual = page.getByRole("button", { name: "Enter details manually" });
    await expect(manual).toBeEnabled();
    await manual.click();
    await expect(page.getByRole("heading", { name: "Check the details" })).toBeVisible();
    await page.getByLabel("Client name").fill("Typed By Hand");
    release();
    await page.waitForTimeout(800);
    await expect(page.getByLabel("Client name")).toHaveValue("Typed By Hand");
  });
});

test.describe("part payments and TDS", () => {
  test("a part payment with TDS reduces what is owed and appears in the email", async ({ page }) => {
    await setup(page, { draft: "down" });
    await enterByHand(page);
    await tap(page.getByText("Yes, part of it"));
    await page.getByLabel("Date received").fill("2026-09-16");
    await page.getByLabel("Amount received (₹)").fill("90000");
    await page.getByLabel(/TDS deducted/).fill("10000");
    await page.getByRole("button", { name: "Check what I may be owed" }).click();

    await expect(page.getByRole("heading", { name: /Where you stand/ })).toBeVisible();
    await expect(page.getByText("Received so far")).toBeVisible();
    await expect(page.getByText(/including TDS of ₹10,000\.00/)).toBeVisible();
    await expect(page.getByText("₹1,36,000.00").first()).toBeVisible();

    await page.getByRole("button", { name: "Choose a tone" }).click();
    await page.getByRole("button", { name: "Draft my email" }).click();
    await expect(page.getByLabel("Email")).toHaveValue(
      /We have received ₹1,00,000\.00 so far, including TDS of ₹10,000\.00, so ₹1,36,000\.00 of the invoice is still unpaid\./,
    );
  });

  test("an advance printed on the invoice is pre-filled, so interest is never claimed on it", async ({ page }) => {
    await setup(page, { draft: "down" });
    await page.route("**/api/extract", (r) =>
      r.fulfill({
        json: {
          data: {
            isInvoice: true,
            clientName: "Greenleaf Organics Pvt Ltd",
            invoiceNumber: "MMW/INV/2026/064",
            invoiceDate: "2026-08-05",
            amountTotal: 236000,
            currency: "INR",
            paymentTermsDays: null,
            paymentTermsText: "Due on Receipt",
            amountPaid: 50000,
            amountPaidDate: "2026-07-25",
            confidence: { clientName: "high", invoiceNumber: "high", invoiceDate: "high", amountTotal: "high", paymentTermsDays: "low" },
          },
        },
      }),
    );
    await page.goto("/check");
    await page.getByRole("button", { name: /Try the sample/ }).click();
    await expect(page.getByText(/Your invoice shows ₹50,000\.00 already paid/)).toBeVisible();
    await expect(page.getByLabel("Date received")).toHaveValue("2026-07-25");
    await page.getByLabel("Udyam registration date").fill("2024-01-15");
    await page.getByRole("button", { name: "Check what I may be owed" }).click();
    await expect(page.getByText("Received so far")).toBeVisible();
    await expect(page.getByText("₹1,86,000.00").first()).toBeVisible();
  });

  test("payments that cover the whole invoice are refused with a clear message", async ({ page }) => {
    await setup(page);
    await enterByHand(page, "1000");
    await tap(page.getByText("Yes, part of it"));
    await page.getByLabel("Date received").fill("2026-09-16");
    await page.getByLabel("Amount received (₹)").fill("1000");
    await page.getByRole("button", { name: "Check what I may be owed" }).click();
    await expect(page.getByText(/add up to the whole invoice or more/)).toBeVisible();
  });
});
