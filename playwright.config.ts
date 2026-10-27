import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end smoke tests against a running app (`npm run dev` or `npm start`).
 * Set E2E_BASE_URL to point elsewhere. Tests that need data use the seeded
 * accounts (see docs/backend-setup.md) via E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD
 * and skip themselves when those are not set.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
});
