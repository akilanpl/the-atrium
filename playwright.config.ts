import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  timeout: 600000,
  expect: { timeout: 15000 },
  retries: 0,
  outputDir: "work/browser-artifacts",
  reporter: [
    ["list"],
    ["json", { outputFile: "work/05-playwright-results.json" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:5174",
    actionTimeout: 15000,
    viewport: { width: 1280, height: 800 },
    headless: true,
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
    screenshot: "only-on-failure",
    trace: "off",
  },
  webServer: [
    {
      command: "npm run start -w apps/server",
      url: "http://127.0.0.1:2572/health",
      reuseExistingServer: false,
      timeout: 60000,
      env: {
        PORT: "2572",
        NODE_ENV: "test",
        FAST_MODE: "",
        ALLOWED_ORIGINS: "http://127.0.0.1:5174",
        PREPARATION_MS: "300000",
        EXPLORATION_MS: "120000",
        FINALE_MS: "120000",
      },
    },
    {
      command: "npm run dev -w apps/client -- --port 5174 --strictPort",
      url: "http://127.0.0.1:5174",
      reuseExistingServer: false,
      timeout: 60000,
      env: { VITE_SERVER_URL: "ws://127.0.0.1:2572" },
    },
  ],
});
