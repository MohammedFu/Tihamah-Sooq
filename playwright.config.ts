import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    channel: "msedge",
    locale: "ar-YE",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    viewport: { width: 390, height: 844 },
    launchOptions: { args: ["--disable-gpu"] },
  },
  webServer: {
    command: "node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173",
    env: {
      VITE_API_MODE: "fixture",
      VITE_APP_ENV: "test",
    },
    reuseExistingServer: true,
    timeout: 120_000,
    url: "http://127.0.0.1:4173/login",
  },
});
