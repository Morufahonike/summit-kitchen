import { defineConfig, devices } from "@playwright/test";

// End-to-end tests. Require a running app with a migrated + seeded TEST database
// and Paystack TEST keys (never live keys). See README "Testing".
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  retries: 0,
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    { name: "mobile", use: { ...devices["iPhone 13"] } },
    { name: "tablet", use: { ...devices["iPad (gen 7)"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : { command: "npm run start", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
});
