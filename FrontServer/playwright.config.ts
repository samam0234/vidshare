import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import os from "node:os";

const tmpDir = path.join(os.tmpdir(), `vidshare-e2e-${Date.now()}`);
const BACKEND_PORT = 4310;
const FRONTEND_PORT = 3310;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: "retain-on-failure",
    actionTimeout: 30_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npm run dev",
      cwd: path.resolve(__dirname, "../BackendServer"),
      env: {
        PORT: String(BACKEND_PORT),
        SQLITE_PATH: path.join(tmpDir, "e2e.sqlite"),
        UPLOADS_PATH: path.join(tmpDir, "uploads"),
      },
      url: `http://localhost:${BACKEND_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: `npm run dev -- -p ${FRONTEND_PORT}`,
      cwd: __dirname,
      env: {
        NEXT_PUBLIC_API_URL: `http://localhost:${BACKEND_PORT}`,
        PLAYWRIGHT_E2E: "1",
      },
      url: `http://localhost:${FRONTEND_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
