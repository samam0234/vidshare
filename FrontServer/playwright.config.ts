import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const tmpDir = path.join(os.tmpdir(), `vidshare-e2e-${Date.now()}`);
const BACKEND_PORT = 4310;
const FRONTEND_PORT = 3310;
const backendDir = path.resolve(__dirname, "../BackendServer");

/**
 * E2E 백엔드는 **테스트 DB** 의 `e2e` 스키마를 쓴다(매 실행 초기화).
 * 환경 변수가 우선이고, 없으면 BackendServer/.env 의 DATABASE_URL_TEST 를 읽는다.
 * 여기서 DATABASE_URL 을 넘기지 않으면 백엔드가 .env 의 개발 DB 를 쓰게 되므로 반드시 명시한다.
 */
function testDatabaseUrl(): string {
  const fromEnv = process.env.DATABASE_URL_TEST?.trim();
  if (fromEnv) return fromEnv;
  const envFile = path.join(backendDir, ".env");
  const line = fs.existsSync(envFile)
    ? fs
        .readFileSync(envFile, "utf8")
        .split(/\r?\n/)
        .find((l) => l.startsWith("DATABASE_URL_TEST="))
    : undefined;
  const value = line?.slice("DATABASE_URL_TEST=".length).trim();
  if (!value) {
    throw new Error("E2E 에는 DATABASE_URL_TEST 가 필요합니다 (환경 변수 또는 BackendServer/.env).");
  }
  return value;
}

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
      command: "npx tsx scripts/reset-schema.ts && npm run dev",
      cwd: backendDir,
      env: {
        PORT: String(BACKEND_PORT),
        DATABASE_URL: testDatabaseUrl(),
        DATABASE_SCHEMA: "e2e",
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
