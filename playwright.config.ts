import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  reporter: "line",
  use: { baseURL: "http://127.0.0.1:4473", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:4473",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
