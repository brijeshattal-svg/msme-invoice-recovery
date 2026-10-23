import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// The same e2e tests against the deployed site (no local server). AI routes are faked in the
// tests, so this spends no quota: `npx playwright test -c playwright.live.config.ts`.
export default defineConfig({
  ...base,
  webServer: undefined,
  use: { ...base.use, baseURL: process.env.LIVE_URL ?? "https://msme-invoice-recovery.vercel.app" },
});
