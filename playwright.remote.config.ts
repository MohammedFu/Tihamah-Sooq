import { defineConfig } from "@playwright/test";

process.env.RUN_REMOTE_BACKEND_SMOKE = "1";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "remote-backend-smoke.spec.ts",
  workers: 1,
  reporter: "line",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    channel: "msedge",
    locale: "ar-SA",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    viewport: { width: 390, height: 844 },
    launchOptions: { args: ["--disable-gpu"] },
  },
  webServer: {
    command: "node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173",
    env: {
      VITE_API_MODE: "remote",
      VITE_API_URL: "http://localhost:8080/api/v1",
      VITE_MEDIA_HOST: "http://localhost:8080",
      VITE_APP_ENV: "test",
    },
    reuseExistingServer: false,
    timeout: 120_000,
    url: "http://127.0.0.1:4173/login",
  },
});
