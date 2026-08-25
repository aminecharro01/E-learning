import { defineConfig, devices } from "@playwright/test";

/**
 * E2E specs assume a backend is already reachable at PLAYWRIGHT_API_URL
 * (default http://localhost:8091 — a throwaway dev-profile instance, see
 * frontend/e2e/README.md) with the demo seed data loaded (apprenant@iat-academy.local).
 *
 * PLAYWRIGHT_PORT defaults to 3000 (not an alternate port) because the backend's
 * CORS allow-list (app.cors.origins / CORS_ORIGINS) defaults to
 * http://localhost:3000 — any other port is rejected by the browser's CORS check
 * even though the request succeeds server-side. Override both together if you
 * need a different pair (matching CORS_ORIGINS on the backend instance).
 */
const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
const API_URL = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:8091";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npx next dev --turbopack -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_API_URL: API_URL,
    },
  },
});
