import { randomBytes } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import dotenv from "dotenv";
import request from "supertest";
import type { Express } from "express";

export type TestApp = {
  app: Express;
  cleanup: () => Promise<void>;
};

/**
 * 테스트 전용 Postgres 접속 문자열. 환경 변수가 우선이고, 없으면 BackendServer/.env 의
 * `DATABASE_URL_TEST` 만 읽는다(.env 전체를 읽으면 COOKIE_DOMAIN 같은 값이 테스트에 섞인다).
 */
export function testDatabaseUrl(): string {
  const fromEnv = process.env.DATABASE_URL_TEST?.trim();
  if (fromEnv) return fromEnv;
  const envFile = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envFile)) {
    const parsed = dotenv.parse(fs.readFileSync(envFile));
    if (parsed.DATABASE_URL_TEST?.trim()) return parsed.DATABASE_URL_TEST.trim();
  }
  throw new Error(
    "DATABASE_URL_TEST 가 없습니다. 테스트용 Postgres DB(예: vidshare_test) 접속 문자열을 " +
      "환경 변수나 BackendServer/.env 에 넣으세요."
  );
}

/**
 * 테스트 파일마다 **고유 스키마**를 만들어 앱을 띄운다.
 * `node --test` 는 파일을 병렬 프로세스로 돌리므로, 같은 DB 를 쓰더라도 스키마로 격리한다.
 * db/client 는 모듈 스코프에 풀을 캐시하므로 env 를 정한 뒤 동적 import 한다.
 */
export async function createTestApp(): Promise<TestApp> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vidshare-test-"));
  const schema = `t_${process.pid}_${randomBytes(4).toString("hex")}`;
  process.env.DATABASE_URL = testDatabaseUrl();
  process.env.DATABASE_SCHEMA = schema;
  process.env.UPLOADS_PATH = path.join(dir, "uploads");

  const { initDb, closeDb, getDb } = await import("../src/db/client.js");
  const { createApp } = await import("../src/app.js");

  await initDb();
  const app = createApp();

  return {
    app,
    cleanup: async () => {
      try {
        await getDb().exec(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      } finally {
        await closeDb();
        fs.rmSync(dir, { recursive: true, force: true });
      }
    },
  };
}

/**
 * 앱 없이 DB 만 필요한 테스트용. 고유 스키마를 만들고 search_path 를 거기에 맞춘
 * **커넥션 하나**를 `Db` 로 감싸 돌려준다(마이그레이션·이관처럼 BEGIN/COMMIT 을 쓰는 코드용).
 */
export async function createTestSchemaDb() {
  const pg = (await import("pg")).default;
  const { Db } = await import("../src/db/client.js");
  const schema = `t_${process.pid}_${randomBytes(4).toString("hex")}`;
  const client = new pg.Client({ connectionString: testDatabaseUrl() });
  await client.connect();
  await client.query(`CREATE SCHEMA ${schema}`);
  await client.query(`SET search_path TO ${schema}`);
  return {
    db: new Db(client),
    schema,
    cleanup: async () => {
      try {
        await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      } finally {
        await client.end();
      }
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

/**
 * 관리자 계정을 만들고 콘솔 세션 쿠키를 돌려준다.
 * 관리자는 시드에 없으므로(비밀번호를 소스에 두지 않기 위해) 테스트에서도
 * create-admin 스크립트와 같은 경로 — `createAccount({ role: "admin" })` — 를 쓴다.
 */
export async function createAdminAndLogin(
  app: Express,
  handle = "root",
  password = "admin1234"
): Promise<{ jar: string; id: string }> {
  const { createAccount } = await import("../src/auth/accounts.js");
  const account = await createAccount({ handle, name: handle, password, role: "admin" });
  const res = await request(app)
    .post("/api/admin/auth/login")
    .send({ handle, password });
  const raw = res.headers["set-cookie"];
  if (!raw) throw new Error(`admin login failed: ${res.status}`);
  const list = Array.isArray(raw) ? raw : [raw];
  return { jar: list.map((c) => c.split(";")[0]).join("; "), id: account.id };
}

export const DEMO = { handle: "demo", password: "demo1234" };
