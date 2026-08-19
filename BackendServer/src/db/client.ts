import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { SCHEMA_SQL } from "./schema";
import { seedIfEmpty } from "./seed";

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

export function initDb(): SqliteDb {
  if (db) return db;

  const file = defaultDbPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });

  db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  seedIfEmpty(db);

  console.log(`  SQLite: ${file}`);
  return db;
}
