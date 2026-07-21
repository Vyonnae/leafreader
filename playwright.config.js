import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:8443",
    channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || "chrome",
    trace: "retain-on-failure"
  },
  webServer: {
    command: "npm run dev -- --port 8443",
    url: "http://127.0.0.1:8443",
    reuseExistingServer: true,
    timeout: 120000
  }
})
