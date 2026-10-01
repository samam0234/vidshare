import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTestSchemaDb } from "./helpers";
import { toPgPlaceholders, type Db } from "../src/db/client";
import { migrate } from "../src/db/migrate";
import { MIGRATIONS } from "../src/db/migrations";

describe("toPgPlaceholders", () => {
  it("? 를 순서대로 $n 으로 바꾼다", () => {
    assert.equal(
      toPgPlaceholders("SELECT * FROM t WHERE a = ? AND b = ? LIMIT ?"),
      "SELECT * FROM t WHERE a = $1 AND b = $2 LIMIT $3"
    );
  });

  it("작은따옴표 문자열 안의 ? 는 그대로 둔다", () => {
    assert.equal(
      toPgPlaceholders("INSERT INTO t (a, b) VALUES (?, 'why?')"),
      "INSERT INTO t (a, b) VALUES ($1, 'why?')"
    );
  });
});

describe("마이그레이션", () => {
  let db: Db;
  let cleanup: () => Promise<void>;

  before(async () => {
    ({ db, cleanup } = await createTestSchemaDb());
  });
  after(() => cleanup());

  it("빈 스키마에 전부 적용하고 버전을 기록한다", async () => {
    const applied = await migrate(db);
    assert.deepEqual(
      applied,
      MIGRATIONS.map((m) => m.version)
    );
    const rows = await db.all<{ version: string }>(
      "SELECT version FROM schema_migrations ORDER BY version"
    );
    assert.deepEqual(
      rows.map((r) => r.version),
      MIGRATIONS.map((m) => m.version)
    );
  });

  it("두 번째 실행은 아무것도 적용하지 않는다(멱등)", async () => {
    assert.deepEqual(await migrate(db), []);
  });

  it("22개 업무 테이블을 만든다", async () => {
    const row = await db.get<{ c: number }>(
      `SELECT COUNT(*) AS c FROM information_schema.tables
       WHERE table_schema = current_schema() AND table_name <> 'schema_migrations'`
    );
    assert.equal(row?.c, 22);
  });

  it("handle 은 대소문자를 무시하고 유일하다", async () => {
    const now = new Date().toISOString();
    await db.run(
      "INSERT INTO users (id, handle, name, created_at) VALUES (?, ?, ?, ?)",
      "u-1",
      "Alice",
      "A",
      now
    );
    await assert.rejects(
      db.run(
        "INSERT INTO users (id, handle, name, created_at) VALUES (?, ?, ?, ?)",
        "u-2",
        "alice",
        "A2",
        now
      ),
      (err: { code?: string }) => err.code === "23505"
    );
  });
});
