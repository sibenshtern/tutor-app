import { defineConfig, devices } from "@playwright/test";
import { TEST_DATABASE_URL } from "./tests/test-db";

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  workers: 1,
  use: { baseURL: "http://localhost:3100" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run build && npx next start -p 3100",
    url: "http://localhost:3100/login",
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      DIRECT_URL: TEST_DATABASE_URL,
      AUTH_SECRET: "e2e-only-secret-e2e-only-secret-0123",
      AUTH_TRUST_HOST: "true",
      APP_TIMEZONE: "Europe/Moscow",
      CRON_SECRET: "e2e-cron-secret",
    },
  },
});
