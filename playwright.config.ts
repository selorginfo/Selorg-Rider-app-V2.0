import { defineConfig } from "@playwright/test";
import path from "node:path";
import dotenv from "dotenv";

// Load Rider .env then selorg-service .env (JWT/Mongo for auth helpers).
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "..", "selorg-service", ".env") });

const API_BASE = (process.env.API_BASE_URL || "http://127.0.0.1:3333")
  .replace(/\/$/, "")
  .replace(/\/api\/v1$/i, "")
  .replace(/\/$/, "");

/**
 * Rider App automation audit — hits real selorg-service `/api/v1/picker/*` APIs.
 * Does not start servers; expects backend already running.
 *
 * Native Detox/Maestro UI E2E is not configured; user flows are covered as
 * real-backend API journeys matching frontend service contracts.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: [
    ["list"],
    ["json", { outputFile: "test-results/playwright-report.json" }],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  outputDir: "test-results/artifacts",
  use: {
    baseURL: API_BASE,
    trace: "on-first-retry",
    extraHTTPHeaders: {
      Accept: "application/json",
    },
  },
  projects: [
    {
      name: "api",
      testMatch: /api\/.*\.spec\.ts/,
    },
    {
      name: "flows",
      testMatch: /flows\/.*\.spec\.ts/,
    },
  ],
  metadata: {
    apiBaseUrl: API_BASE,
    pickerPrefix: "/api/v1/picker",
    app: "Selorg-RiderApp-v1.3",
  },
});
