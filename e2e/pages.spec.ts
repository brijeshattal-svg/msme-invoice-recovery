import { expect, test } from "@playwright/test";
import { noHorizontalScroll, setup } from "./helpers";

const PAGES = ["/", "/check", "/toolkit", "/blockers", "/priorities", "/cash", "/reports", "/privacy"];

test.describe("every page", () => {
  for (const path of PAGES) {
    test(`${path} loads with one h1, no errors and no sideways scroll`, async ({ page }) => {
      await setup(page);
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
      });
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      await noHorizontalScroll(page);
      expect(errors).toEqual([]);
    });
  }

  test("nothing scrolls sideways on a small 360px Android phone either", async ({ page }) => {
    await setup(page);
    await page.setViewportSize({ width: 360, height: 740 });
    for (const path of PAGES) {
      await page.goto(path);
      await noHorizontalScroll(page);
    }
  });

  test("the privacy page covers what is sent, what isn't kept, logs and the terms", async ({ page }) => {
    await page.goto("/privacy");
    for (const h of ["What happens to your invoice", "What we don't do", "What is logged", "Terms of use"]) {
      await expect(page.getByRole("heading", { name: h })).toBeVisible();
    }
    await expect(page.getByText(/Not legal, tax or financial advice/)).toBeVisible();
    await page.getByRole("link", { name: /Back to Quick Check/ }).click();
    await expect(page).toHaveURL(/\/check$/);
  });

  test("the landing links to the privacy page, and an unknown URL gets a friendly 404 with a way back", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Privacy and terms" }).first().click();
    await expect(page).toHaveURL(/\/privacy$/);
    const res = await page.goto("/no-such-page");
    expect(res?.status()).toBe(404);
    await expect(page.getByText("We couldn't find that page")).toBeVisible();
    await page.getByRole("link", { name: "Check an invoice" }).click();
    await expect(page).toHaveURL(/\/check$/);
  });
});

test.describe("headers and secrets", () => {
  test("API answers aren't cached, pages can't be framed, and no key reaches the browser", async ({ page, request }) => {
    const health = await request.get("/api/health");
    expect(health.headers()["cache-control"]).toContain("no-store");
    const home = await request.get("/");
    expect(home.headers()["x-frame-options"]).toBe("DENY");
    await page.goto("/");
    expect(await page.content()).not.toMatch(/AIza[0-9A-Za-z_-]{20,}/);
    expect(await health.text()).not.toMatch(/AIza/);
  });
});
