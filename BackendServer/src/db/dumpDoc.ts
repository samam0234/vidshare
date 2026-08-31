import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";

type SqliteDb = InstanceType<typeof Database>;

type TableInfoCol = {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: unknown;
  pk: number;
};

const REDACT_COLUMNS = new Set(["password_hash"]);
const CELL_MAX = 240;
const DUMP_DELAY_MS = 200;

let dumpTimer: ReturnType<typeof setTimeout> | null = null;

export function databaseDocPath() {
  return path.resolve(process.cwd(), "data", "DataBaseColumn.md");
}

function isWriteSql(sql: string) {
  return /^\s*(INSERT|UPDATE|DELETE|REPLACE|CREATE|ALTER|DROP)\b/i.test(sql);
}

function quoteIdent(name: string) {
  return `"${name.replace(/"/g, '""')}"`;
}

function escapeCell(value: unknown, column: string) {
  if (REDACT_COLUMNS.has(column)) return "(redacted)";
  if (value == null) return "";
  let text = typeof value === "string" ? value : String(value);
  text = text.replace(/\r?\n/g, "\\n").replace(/\|/g, "\\|");
  if (text.length > CELL_MAX) text = `${text.slice(0, CELL_MAX - 3)}...`;
  return text;
}

function dumpOnce(database: SqliteDb) {
  const tables = database
    .prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
       ORDER BY name`
    )
    .all() as { name: string }[];

  const lines: string[] = [
    "# SQLite 테이블 · 데이터 덤프",
    "",
    "이 파일은 서버가 SQLite에 쓰기가 생길 때마다 자동으로 다시 씁니다. 직접 고치지 마세요.",
    "Git에 올리지 않습니다 (`DataBaseColumn.md` ignore).",
    "",
    `- 갱신: ${new Date().toISOString()}`,
    `- 테이블: ${tables.length}개`,
    "",
    "## 목차",
    "",
  ];

  const sections: string[] = [];

  for (const { name } of tables) {
    if (!/^[A-Za-z0-9_]+$/.test(name)) continue;
    const cols = database.prepare(`PRAGMA table_info(${quoteIdent(name)})`).all() as TableInfoCol[];
    const countRow = database
      .prepare(`SELECT COUNT(*) AS c FROM ${quoteIdent(name)}`)
      .get() as { c: number };
    const count = countRow.c;
    lines.push(`- [${name}](#${name.toLowerCase()}) (${count}행)`);

    const pk = cols
      .filter((c) => c.pk > 0)
      .sort((a, b) => a.pk - b.pk)
      .map((c) => quoteIdent(c.name));
    const orderBy = pk.length ? pk.join(", ") : "rowid";
    const rows = database
      .prepare(`SELECT * FROM ${quoteIdent(name)} ORDER BY ${orderBy}`)
      .all() as Record<string, unknown>[];

    sections.push(`## ${name}`);
    sections.push("");
    sections.push(`${count}행`);
    sections.push("");
    sections.push("### 컬럼");
    sections.push("");
    sections.push("| 이름 | 타입 | NOT NULL | PK | 기본값 |");
    sections.push("|------|------|----------|----|--------|");
    for (const col of cols) {
      const dflt =
        col.dflt_value == null ? "" : String(col.dflt_value).replace(/\|/g, "\\|");
      sections.push(
        `| ${col.name} | ${col.type || ""} | ${col.notnull ? "YES" : ""} | ${col.pk || ""} | ${dflt} |`
      );
    }
    sections.push("");
    sections.push("### 데이터");
    sections.push("");
    if (!cols.length) {
      sections.push("(컬럼 없음)");
      sections.push("");
      continue;
    }
    const names = cols.map((c) => c.name);
    sections.push(`| ${names.join(" | ")} |`);
    sections.push(`| ${names.map(() => "---").join(" | ")} |`);
    if (!rows.length) {
      sections.push("");
      continue;
    }
    for (const row of rows) {
      sections.push(
        `| ${names.map((col) => escapeCell(row[col], col)).join(" | ")} |`
      );
    }
    sections.push("");
  }

  lines.push("");
  lines.push(...sections);

  const out = databaseDocPath();
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${lines.join("\n").trimEnd()}\n`, "utf8");
}

export function scheduleDatabaseDocDump(database: SqliteDb) {
  if (dumpTimer) clearTimeout(dumpTimer);
  dumpTimer = setTimeout(() => {
    dumpTimer = null;
    // 대기 중에 커넥션이 닫힐 수 있다(테스트 종료 등).
    if (!database.open) return;
    try {
      dumpOnce(database);
    } catch (err) {
      console.error("DataBaseColumn.md 갱신 실패:", err);
    }
  }, DUMP_DELAY_MS);
}

export function flushDatabaseDocDump(database: SqliteDb) {
  if (dumpTimer) {
    clearTimeout(dumpTimer);
    dumpTimer = null;
  }
  dumpOnce(database);
}

/** INSERT/UPDATE/DELETE 등이 끝나면 덤프를 예약한다. */
export function interceptDatabaseWrites(database: SqliteDb) {
  const originalPrepare = database.prepare.bind(database);
  database.prepare = ((sql: string) => {
    const stmt = originalPrepare(sql);
    if (!isWriteSql(sql)) return stmt;
    const originalRun = stmt.run.bind(stmt);
    stmt.run = ((...args: Parameters<typeof stmt.run>) => {
      const result = originalRun(...args);
      scheduleDatabaseDocDump(database);
      return result;
    }) as typeof stmt.run;
    return stmt;
  }) as typeof database.prepare;

  const originalExec = database.exec.bind(database);
  database.exec = ((sql: string) => {
    const result = originalExec(sql);
    if (isWriteSql(sql)) scheduleDatabaseDocDump(database);
    return result;
  }) as typeof database.exec;
}
