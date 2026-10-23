import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { noHorizontalScroll, setup } from "./helpers";

test.describe("workspace tools", () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
  });

  test("an invoice added in Priorities flows through the Dashboard, Reports and Cash", async ({ page }) => {
    await page.goto("/priorities");
    await page.getByLabel("Client", { exact: true }).fill("Test Client Pvt Ltd");
    await page.getByLabel("Invoice number").fill("T-001");
    await page.getByLabel(/^Amount/).fill("100000");
    await page.getByLabel("Invoice date", { exact: true }).fill("2026-08-01");
    await page.getByRole("button", { name: "Add invoice" }).click();
    await expect(page.getByText(/Priority 1/)).toBeVisible();
    await expect(page.getByText(/67 days overdue/)).toBeVisible();

    // In-app links keep the in-memory list (a full reload empties it, by design).
    await page.getByRole("link", { name: "Dashboard" }).first().click();
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
    await expect(page.getByText("₹1,00,000.00").first()).toBeVisible();
    await page.getByRole("link", { name: "Reports" }).first().click();
    await expect(page.getByRole("heading", { name: "Ageing Report", level: 1 })).toBeVisible();
    await expect(page.getByRole("rowheader", { name: "Test Client Pvt Ltd" })).toBeVisible();
    await page.getByRole("link", { name: "Cash" }).first().click();
    await expect(page.getByRole("heading", { name: "Cash-flow Forecast", level: 1 })).toBeVisible();
    await page.getByLabel(/Cash available today/).fill("50000");
    await page.getByRole("button", { name: /Use unpaid invoices from Priorities/ }).click();
    await expect(page.getByText(/Lowest point/).first()).toBeVisible();
    await noHorizontalScroll(page);
  });

  test("the sample list loads and the CSV is built in the browser with no formula cells", async ({ page }) => {
    await page.goto("/toolkit");
    await page.getByRole("button", { name: "Load fictional sample" }).click();
    await expect(page.getByText(/Showing fictional sample data/)).toBeVisible();
    await page.getByRole("link", { name: "Reports" }).first().click();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download CSV" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.csv$/);
    const csv = await readFile((await file.path())!, "utf8");
    const lines = csv.trim().split(/\r?\n/);
    expect(lines.length).toBeGreaterThan(2);
    for (const line of lines) for (const cell of line.split(",")) expect(cell).not.toMatch(/^"?[=+@]/);
  });

  test("Blockers: a classified reply shows the client's own words and an editable reply", async ({ page }) => {
    await page.route("**/api/blocker", (r) =>
      r.fulfill({
        json: {
          data: {
            blockers: [{ type: "approval_pending", evidence: "we can't release payment until our manager approves it", confidence: "high" }],
            promisedDate: null,
            unclear: false,
          },
        },
      }),
    );
    await page.goto("/blockers");
    await page.getByRole("textbox").first().fill("Hi, we can't release payment until our manager approves it.");
    await page.getByRole("button", { name: "Analyse reply" }).click();
    await expect(page.getByText(/Pending approval/).first()).toBeVisible();
    await expect(page.getByText(/manager approves it/).first()).toBeVisible();
    await expect(page.getByLabel("Message")).toHaveValue(/\[Your name\]/);
  });

  test("Blockers: if the AI is down, the founder can still pick the blocker", async ({ page }) => {
    await page.route("**/api/blocker", (r) => r.fulfill({ status: 502, json: { error: "ai_failed" } }));
    await page.goto("/blockers");
    await page.getByRole("textbox").first().fill("Please wait, finance is checking.");
    await page.getByRole("button", { name: "Analyse reply" }).click();
    const choose = page.getByLabel(/Choose the blocker/);
    await choose.selectOption("approval_pending");
    await expect(choose).toHaveValue("approval_pending");
    await expect(page.getByLabel("Message")).toHaveValue(/approv/i);
  });
});
