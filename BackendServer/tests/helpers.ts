import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import type { Express } from "express";

export type TestApp = {
  app: Express;
  cleanup: () => void;
};

/**
 * 임시 SQLite 파일로 앱을 띄운다.
 * db/client 는 모듈 스코프에 커넥션을 캐시하므로 env 를 정한 뒤 동적 import 한다.
 * `node --test` 는 파일마다 별도 프로세스라 파일 간 상태가 섞이지 않는다.
 */
export async function createTestApp(): Promise<TestApp> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vidshare-test-"));
  process.env.SQLITE_PATH = path.join(dir, "test.sqlite");
  process.env.UPLOADS_PATH = path.join(dir, "uploads");

  const { initDb, closeDb } = await import("../src/db/client.js");
  const { createApp } = await import("../src/app.js");

  initDb();
  const app = createApp();

  return {
    app,
    cleanup: () => {
      closeDb();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

/** 로그인 후 세션 쿠키 문자열을 돌려준다. */
export async function loginAs(
  app: Express,
  handle: string,
  password: string
): Promise<string> {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ handle, password });
  const raw = res.headers["set-cookie"];
  if (!raw) throw new Error(`login failed for ${handle}: ${res.status}`);
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map((c) => c.split(";")[0]).join("; ");
}

export const DEMO = { handle: "demo", password: "demo1234" };
