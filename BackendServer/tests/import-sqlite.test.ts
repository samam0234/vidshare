import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { createTestSchemaDb } from "./helpers";
import type { Db } from "../src/db/client";
import { importSqlite } from "../scripts/migrate-sqlite-to-pg";

/** 이관에 필요한 만큼만 흉내 낸 SQLite 시절 스키마 + 레거시 테이블 하나. */
function buildSqlite(file: string) {
  const s = new Database(file);
  s.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY, handle TEXT NOT NULL, name TEXT NOT NULL,
      bio TEXT NOT NULL DEFAULT '', avatar TEXT, password_hash TEXT,
      notifications_enabled INTEGER NOT NULL DEFAULT 1,
      role TEXT NOT NULL DEFAULT 'user', suspended INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE shorts (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
      author_id TEXT NOT NULL, likes INTEGER NOT NULL DEFAULT 0,
      comment_count INTEGER NOT NULL DEFAULT 0, views TEXT NOT NULL DEFAULT '0',
      video_url TEXT, thumb TEXT, gradient TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE comments (
      id TEXT PRIMARY KEY, short_id TEXT NOT NULL, author TEXT NOT NULL,
      text TEXT NOT NULL, time TEXT NOT NULL, parent_id TEXT, author_id TEXT
    );
    CREATE TABLE longform (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '', video_url TEXT NOT NULL DEFAULT '',
      thumb TEXT, gradient TEXT NOT NULL, author_id TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE notifications (id INTEGER PRIMARY KEY, message TEXT);
  `);
  s.prepare(
    "INSERT INTO users (id, handle, name, created_at) VALUES ('u-a', 'alice', 'Alice', '2026-01-01')"
  ).run();
  s.prepare(
    "INSERT INTO shorts (id, title, author_id, gradient, created_at) VALUES ('s-1', 'hello', 'u-a', 'g', '2026-01-02')"
  ).run();
  // 답글(c-z)이 부모(c-y)보다 rowid 가 앞서도 이관되어야 한다.
  s.prepare(
    "INSERT INTO comments (id, short_id, author, text, time, parent_id) VALUES ('c-z', 's-1', 'A', 'reply', '방금', 'c-y')"
  ).run();
  s.prepare(
    "INSERT INTO comments (id, short_id, author, text, time) VALUES ('c-y', 's-1', 'A', 'root', '방금')"
  ).run();
  s.prepare(
    "INSERT INTO longform (id, title, gradient, author_id, created_at) VALUES (3, 'L3', 'g', 'u-a', '2026-01-03'), (7, 'L7', 'g', 'u-a', '2026-01-04')"
  ).run();
  s.prepare("INSERT INTO notifications (message) VALUES ('legacy')").run();
  return s;
}

describe("SQLite → Postgres 이관", () => {
  let db: Db;
  let cleanup: () => Promise<void>;
  let sqlite: InstanceType<typeof Database>;
  let dir: string;

  before(async () => {
    ({ db, cleanup } = await createTestSchemaDb());
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "vidshare-import-"));
    sqlite = buildSqlite(path.join(dir, "src.sqlite"));
  });
  after(async () => {
    sqlite.close();
    fs.rmSync(dir, { recursive: true, force: true });
    await cleanup();
  });

  it("행 수가 원본과 같고 모르는 테이블은 건너뛴다", async () => {
    const { report, skipped } = await importSqlite(db, sqlite, { replace: false });
    for (const row of report) assert.equal(row.postgres, row.sqlite, row.table);
    const byTable = Object.fromEntries(report.map((r) => [r.table, r.postgres]));
    assert.equal(byTable.users, 1);
    assert.equal(byTable.comments, 2);
    assert.equal(byTable.longform, 2);
    assert.deepEqual(skipped, ["notifications"]);
  });

  it("답글의 parent_id 와 원래 삽입 순서(seq)를 지킨다", async () => {
    const rows = await db.all<{ id: string; parent_id: string | null }>(
      "SELECT id, parent_id FROM comments ORDER BY seq"
    );
    assert.deepEqual(rows, [
      { id: "c-z", parent_id: "c-y" },
      { id: "c-y", parent_id: null },
    ]);
  });

  it("IDENTITY 시퀀스를 기존 최대값 다음으로 맞춘다", async () => {
    const info = await db.run<{ id: number }>(
      "INSERT INTO longform (title, gradient, author_id, created_at) VALUES ('new', 'g', 'u-a', 'now') RETURNING id"
    );
    assert.equal(info.rows[0].id, 8);
  });

  it("이미 데이터가 있으면 --replace 없이 멈춘다", async () => {
    await assert.rejects(importSqlite(db, sqlite, { replace: false }), /--replace/);
  });

  it("--replace 면 비우고 다시 넣는다", async () => {
    const { report } = await importSqlite(db, sqlite, { replace: true });
    const longform = report.find((r) => r.table === "longform");
    assert.equal(longform?.postgres, 2);
  });
});
