/**
 * SQLite(vidshare.sqlite) → PostgreSQL 1회 이관.
 *
 *   npm run db:import-sqlite -- [--from <sqlite 경로>] [--replace]
 *
 * - 대상은 DATABASE_URL (BackendServer/.env). 스키마는 마이그레이션으로 먼저 만든다.
 * - 대상 DB 에 이미 데이터가 있으면 멈춘다. `--replace` 를 주면 22개 테이블을 비우고 다시 넣는다.
 * - 전부 한 트랜잭션이라 중간에 실패하면 아무것도 남지 않는다.
 * - 끝나면 테이블별 행 수를 비교한 표를 찍고, 하나라도 다르면 종료 코드 1.
 *
 * 원본 SQLite 는 읽기 전용으로 연다. 그래도 실행 전에 파일을 복사해 두는 것을 권한다
 * (plan.md 8.4 — D:\vidshare-data\backups\sqlite-final\).
 */
import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import pg from "pg";
import { Db } from "../src/db/client";
import { migrate } from "../src/db/migrate";

type SqliteDb = InstanceType<typeof Database>;

/** FK 의존 순서. 부모 테이블이 먼저 온다. */
export const TABLES = [
  "users",
  "sessions",
  "shorts",
  "comments",
  "chat_users",
  "messages",
  "faqs",
  "chatbot_docs",
  "chatbot_summaries",
  "longform",
  "community_posts",
  "chatbot_threads",
  "chatbot_messages",
  "conversations",
  "chat_lines",
  "support_inquiries",
  "activity_notifications",
  "user_follows",
  "user_blocks",
  "reports",
  "playlists",
  "playlist_items",
] as const;

/** SQLite 의 `ORDER BY rowid` 를 대신하는 순서 컬럼. 원래 rowid 를 그대로 넣는다. */
const SEQ_TABLES = new Set(["comments", "chat_users", "messages", "faqs"]);
/** INTEGER AUTOINCREMENT → IDENTITY 로 바뀐 id 컬럼. 이관 후 시퀀스를 MAX(id) 다음으로 맞춘다. */
const IDENTITY_ID_TABLES = new Set([
  "longform",
  "community_posts",
  "chatbot_threads",
  "chatbot_messages",
  "conversations",
  "chat_lines",
  "support_inquiries",
  "activity_notifications",
  "reports",
  "playlists",
]);

const BATCH = 500;

export type ImportRow = { table: string; sqlite: number; postgres: number };

async function pgColumns(db: Db, table: string) {
  const rows = await db.all<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = current_schema() AND table_name = ?`,
    table
  );
  return new Set(rows.map((r) => r.column_name));
}

async function insertRows(
  db: Db,
  table: string,
  columns: string[],
  rows: Record<string, unknown>[]
) {
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const params: unknown[] = [];
    const values = chunk.map((row) => {
      const marks = columns.map((c) => {
        params.push(row[c] ?? null);
        return "?";
      });
      return `(${marks.join(", ")})`;
    });
    await db.run(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${values.join(", ")}`,
      ...params
    );
  }
}

async function resetSequence(db: Db, table: string, column: string) {
  await db.exec(
    `SELECT setval(pg_get_serial_sequence('${table}', '${column}'),
                   COALESCE((SELECT MAX(${column}) FROM ${table}), 0) + 1, false)`
  );
}

async function copyTable(db: Db, sqlite: SqliteDb, table: string): Promise<ImportRow> {
  const target = await pgColumns(db, table);
  const sourceCols = (
    sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  ).map((c) => c.name);
  const columns = sourceCols.filter((c) => target.has(c));
  const withSeq = SEQ_TABLES.has(table);

  const rows = sqlite
    .prepare(
      `SELECT ${withSeq ? "rowid AS __rowid, " : ""}${columns.join(", ")} FROM ${table} ORDER BY rowid`
    )
    .all() as Record<string, unknown>[];
  if (withSeq) for (const r of rows) r.seq = r.__rowid;
  const insertCols = withSeq ? [...columns, "seq"] : columns;

  if (table === "comments") {
    // 자기 참조(parent_id) FK 때문에 부모 없이 먼저 넣고, 그다음 parent_id 를 채운다.
    await insertRows(db, table, insertCols, rows.map((r) => ({ ...r, parent_id: null })));
    for (const r of rows) {
      if (r.parent_id) {
        await db.run("UPDATE comments SET parent_id = ? WHERE id = ?", r.parent_id, r.id);
      }
    }
  } else {
    await insertRows(db, table, insertCols, rows);
  }

  if (IDENTITY_ID_TABLES.has(table)) await resetSequence(db, table, "id");
  if (withSeq) await resetSequence(db, table, "seq");

  const pgCount = (await db.get<{ c: number }>(`SELECT COUNT(*) AS c FROM ${table}`))?.c ?? 0;
  return { table, sqlite: rows.length, postgres: pgCount };
}

/**
 * 열린 SQLite 를 **커넥션 하나에 묶인** `db` 로 옮긴다. 마이그레이션도 여기서 적용한다.
 * 테이블별 원본/대상 행 수와, 옮기지 않은 SQLite 테이블 목록을 돌려준다.
 * 실패하면 전부 롤백하고 던진다.
 */
export async function importSqlite(
  db: Db,
  sqlite: SqliteDb,
  options: { replace: boolean }
): Promise<{ report: ImportRow[]; skipped: string[] }> {
  await migrate(db);

  const existing = (await db.get<{ c: number }>("SELECT COUNT(*) AS c FROM users"))?.c ?? 0;
  if (existing > 0 && !options.replace) {
    throw new Error(
      `대상 DB 에 이미 users ${existing}행이 있습니다. 비우고 다시 넣으려면 --replace 를 주세요.`
    );
  }

  const sqliteTables = new Set(
    (
      sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as {
        name: string;
      }[]
    ).map((r) => r.name)
  );

  const report: ImportRow[] = [];
  await db.exec("BEGIN");
  try {
    if (options.replace) {
      await db.exec(`TRUNCATE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`);
    }
    for (const table of TABLES) {
      report.push(
        sqliteTables.has(table)
          ? await copyTable(db, sqlite, table)
          : { table, sqlite: 0, postgres: 0 }
      );
    }
    await db.exec("COMMIT");
  } catch (err) {
    await db.exec("ROLLBACK");
    throw err;
  }

  const skipped = [...sqliteTables].filter(
    (t) => !(TABLES as readonly string[]).includes(t) && !t.startsWith("sqlite_")
  );
  return { report, skipped };
}

function parseArgs(argv: string[]) {
  const fromIdx = argv.indexOf("--from");
  const from =
    fromIdx >= 0 && argv[fromIdx + 1]
      ? argv[fromIdx + 1]
      : process.env.SQLITE_PATH?.trim() || path.join("data", "vidshare.sqlite");
  return { from: path.resolve(from), replace: argv.includes("--replace") };
}

async function main() {
  const { from, replace } = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(from)) throw new Error(`SQLite 파일이 없습니다: ${from}`);
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL 이 비어 있습니다 (BackendServer/.env).");

  const sqlite = new Database(from, { readonly: true, fileMustExist: true });
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const client = await pool.connect();
  try {
    console.log(`원본: ${from}`);
    const { report, skipped } = await importSqlite(new Db(client), sqlite, { replace });

    console.log("");
    console.table(report);
    if (skipped.length) console.log(`옮기지 않은 SQLite 테이블: ${skipped.join(", ")}`);

    const mismatched = report.filter((r) => r.sqlite !== r.postgres);
    if (mismatched.length) {
      console.error(`✖ 행 수 불일치: ${mismatched.map((r) => r.table).join(", ")}`);
      process.exitCode = 1;
      return;
    }
    const total = report.reduce((n, r) => n + r.postgres, 0);
    console.log(`✔ 이관 완료 — ${report.length}개 테이블, ${total}행`);
  } finally {
    client.release();
    await pool.end();
    sqlite.close();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`✖ ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  });
}
