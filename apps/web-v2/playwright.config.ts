import { defineConfig, devices } from "@playwright/test";
export const testSecret = "0123456789abcdef".repeat(4);
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:3101",
    trace: "retain-on-failure",
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: [
    {
      command: "node e2e/api-fixture.mjs",
      url: "http://127.0.0.1:3102/health",
      reuseExistingServer: false,
    },
    {
      command: "node scripts/start-standalone.mjs",
      url: "http://127.0.0.1:3101",
      reuseExistingServer: false,
      env: {
        PORT: "3101",
        HOSTNAME: "127.0.0.1",
        APP_BASE_URL: "http://127.0.0.1:3101",
        AUTH0_DOMAIN: "test.invalid",
        AUTH0_CLIENT_ID: "test-client",
        AUTH0_CLIENT_SECRET: "test-client-secret",
        AUTH0_SECRET: testSecret,
        AUTH0_AUDIENCE: "https://curateds.test",
        API_BASE_URL: "http://127.0.0.1:3102",
      },
    },
  ],
});
