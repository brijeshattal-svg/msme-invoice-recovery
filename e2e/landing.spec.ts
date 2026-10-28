import { expect, test } from "@playwright/test";
import { noHorizontalScroll, setup } from "./helpers";

test.describe("landing page (/)", () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
    await page.goto("/");
  });

  test("the first thing a visitor sees: the promise, one action, and the real sample figure", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Your client is late.");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Here's what you may be owed.");
    // The hero's sample comes from the real calculator at the fixed sample date.
    await expect(page.getByText("₹6,532.03").first()).toBeVisible();
    await expect(page.getByText("60 days late").first()).toBeVisible();
    await expect(page.getByText("Sample", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/No login/).first()).toBeVisible();
  });

  test("'Check an invoice' opens Quick Check, which starts at the upload screen", async ({ page }) => {
    await page.getByRole("link", { name: /Check an invoice/ }).first().click();
    await expect(page).toHaveURL(/\/check$/);
    await expect(page.getByRole("button", { name: "Choose invoice" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Try the sample/ })).toBeVisible();
  });

  test("the section links scroll to their sections", async ({ page }, info) => {
    test.skip(info.project.name === "phone", "section links are hidden on phones");
    await page.getByRole("link", { name: "How it works" }).first().click();
    await expect(page.locator("#how")).toBeInViewport();
    await page.getByRole("link", { name: "Questions" }).first().click();
    await expect(page.locator("#faq")).toBeInViewport();
  });

  test("every section is there, in order, with honest limits and no invented proof", async ({ page }) => {
    const headings = await page.getByRole("heading", { level: 2 }).allTextContents();
    expect(headings.join(" | ")).toMatch(/Most founders never ask.*From a late invoice.*Exact where it matters.*What it won't do.*Good questions.*Check your first invoice/);
    const text = await page.locator("main").innerText();
    expect(text).toMatch(/isn't legal advice/i);
    expect(text).toMatch(/never sends anything/i);
    expect(text).not.toMatch(/testimonial|trusted by|\d+\+? (users|founders|customers)|guarantee/i);
  });

  test("the FAQ opens and closes with the keyboard", async ({ page }) => {
    const first = page.locator("#faq summary").first();
    await first.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#faq details").first()).toHaveAttribute("open", "");
    await expect(page.getByText(/Under Section 15 of the MSMED Act, 2006/).first()).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.locator("#faq details").first()).not.toHaveAttribute("open", "");
  });

  test("footer links reach Privacy, the tools and Quick Check", async ({ page }) => {
    const footer = page.getByRole("navigation", { name: "Footer" });
    await expect(footer.getByRole("link", { name: "Privacy and terms" })).toHaveAttribute("href", "/privacy");
    await expect(footer.getByRole("link", { name: "More tools" })).toHaveAttribute("href", "/toolkit");
    await expect(footer.getByRole("link", { name: "Check an invoice" })).toHaveAttribute("href", "/check");
  });

  test("no sideways scroll at desktop, tablet and phone widths", async ({ page }) => {
    for (const [w, h] of [
      [1280, 800],
      [820, 1100],
      [390, 844],
      [360, 740],
    ]) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto("/");
      await noHorizontalScroll(page);
    }
  });

  test("reduced motion: nothing floats or fades", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const names = await page.evaluate(() => [...document.querySelectorAll(".float, .float-slow, .reveal")].map((e) => getComputedStyle(e).animationName));
    expect(names.length).toBeGreaterThan(3);
    expect(new Set(names)).toEqual(new Set(["none"]));
  });
});
