import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { SCHEMA_SQL } from "./schema";
import { seedIfEmpty } from "./seed";
import {
  flushDatabaseDocDump,
  interceptDatabaseWrites,
} from "./dumpDoc";

type SqliteDb = InstanceType<typeof Database>;

let db: SqliteDb | null = null;

export function defaultDbPath() {
  const fromEnv = process.env.SQLITE_PATH?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.resolve(process.cwd(), "data", "vidshare.sqlite");
}

export function getDb(): SqliteDb {
  if (!db) {
    throw new Error("SQLite가 아직 열리지 않았습니다. initDb()를 먼저 호출하세요.");
  }
  return db;
}

/** 테스트에서 임시 DB를 정리할 때 사용. */
export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

function ensureColumn(
  database: SqliteDb,
  table: string,
  column: string,
  sqlType: string
) {
  const cols = database
    .prepare(`PRAGMA table_info(${table})`)
    .all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${sqlType}`);
  }
}

export function initDb(): SqliteDb {
  if (db) return db;

  const file = defaultDbPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });

  db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  ensureColumn(db, "shorts", "thumb", "TEXT");
  ensureColumn(db, "comments", "parent_id", "TEXT");
  ensureColumn(db, "comments", "author_id", "TEXT");
  ensureColumn(
    db,
    "users",
    "notifications_enabled",
    "INTEGER NOT NULL DEFAULT 1"
  );
  ensureColumn(db, "users", "role", "TEXT NOT NULL DEFAULT 'user'");
  ensureColumn(db, "users", "suspended", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "reports", "status", "TEXT NOT NULL DEFAULT 'open'");
  ensureColumn(db, "support_inquiries", "admin_reply", "TEXT");
  ensureColumn(db, "support_inquiries", "replied_at", "TEXT");
  // 레거시 목 알림 테이블. 지금은 activity_notifications 만 쓴다.
  db.exec("DROP TABLE IF EXISTS notifications");
  interceptDatabaseWrites(db);
  seedIfEmpty(db);
  flushDatabaseDocDump(db);

  console.log(`  SQLite: ${file}`);
  return db;
}
