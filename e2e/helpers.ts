import { expect, type Locator, type Page } from "@playwright/test";

/** 22 Oct 2026, 10:00 in India: the sample invoice is then 60 days late with ₹6,532.03 interest. */
export const NOW = new Date("2026-10-22T10:00:00+05:30");

export const SAMPLE_EXTRACTION = {
  isInvoice: true,
  clientName: "Northwind Test Industries Pvt Ltd",
  invoiceNumber: "BDS/2026/0142",
  invoiceDate: "2026-08-08",
  amountTotal: 236000,
  currency: "INR",
  paymentTermsDays: 30,
  paymentTermsText: "Net 30",
  confidence: { clientName: "high", invoiceNumber: "high", invoiceDate: "high", amountTotal: "high", paymentTermsDays: "high" },
};

/**
 * Fixes the clock and fakes the AI, so no test spends quota or depends on the model.
 * `draft: "down"` makes the draft route fail, so the standard draft is used.
 */
export async function setup(page: Page, opts: { draft?: "down" } = {}) {
  await page.clock.setFixedTime(NOW);
  await page.route("**/api/extract", (r) => r.fulfill({ json: { data: SAMPLE_EXTRACTION } }));
  if (opts.draft === "down") await page.route("**/api/draft", (r) => r.fulfill({ status: 500, json: { error: "ai_failed" } }));
}

/** From the landing page to the "Where you stand" screen using the sample invoice. */
export async function reachResult(page: Page) {
  await page.goto("/check");
  await page.getByRole("button", { name: /Try the sample/ }).click();
  await expect(page.getByRole("heading", { name: "Check the details" })).toBeVisible();
  await page.getByLabel("Udyam registration date").fill("2024-01-15");
  await page.getByRole("button", { name: "Check what I may be owed" }).click();
  await expect(page.getByRole("heading", { name: /Where you stand/ })).toBeVisible();
}

/** Manual entry of the sample invoice's details (no file, no AI). */
export async function enterByHand(page: Page, amount = "236000") {
  await page.goto("/check");
  await page.getByRole("button", { name: "Enter details manually" }).click();
  await page.getByLabel("Client name").fill("Northwind Test Industries Pvt Ltd");
  await page.getByLabel("Invoice number").fill("BDS/2026/0142");
  await page.getByLabel("Invoice date").fill("2026-08-08");
  await page.getByLabel(/^Amount/).fill(amount);
  await page.getByLabel("Udyam registration date").fill("2024-01-15");
}

export async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "page scrolls sideways").toBeLessThanOrEqual(1);
}

/** Scrolls the target to the middle of the screen first, so the sticky phone footer cannot cover it. */
export async function tap(target: Locator) {
  await target.evaluate((e) => e.scrollIntoView({ block: "center" }));
  await target.click();
}
