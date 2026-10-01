/**
 * DB 테이블 구조·데이터를 `data/DataBaseColumn.md` 로 덤프한다.
 *
 *   npm run db:doc
 *
 * SQLite 시절에는 쓰기가 생길 때마다 자동으로 다시 썼다(db/dumpDoc.ts).
 * Postgres 드라이버에는 그런 훅이 없어서, 필요할 때 손으로 돌리는 스크립트로 바꿨다.
 * 결과 파일은 Git 에 올리지 않는다(.gitignore).
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { closeDb, getDb, initDb } from "../src/db/client";

const REDACT_COLUMNS = new Set(["password_hash"]);
const CELL_MAX = 240;
const ROW_MAX = 200;

function escapeCell(value: unknown, column: string) {
  if (REDACT_COLUMNS.has(column)) return "(redacted)";
  if (value == null) return "";
  let text = typeof value === "string" ? value : String(value);
  text = text.replace(/\r?\n/g, "\\n").replace(/\|/g, "\\|");
  if (text.length > CELL_MAX) text = `${text.slice(0, CELL_MAX - 3)}...`;
  return text;
}

async function main() {
  await initDb();
  const db = getDb();
  try {
    const tables = (
      await db.all<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'
         ORDER BY table_name`
      )
    ).map((r) => r.table_name);

    const lines = [
      "# Postgres 테이블 · 데이터 덤프",
      "",
      "`npm run db:doc` 으로 생성한 파일입니다. 직접 고치지 마세요. Git 에 올리지 않습니다.",
      "",
      `- 갱신: ${new Date().toISOString()}`,
      `- 테이블: ${tables.length}개`,
      `- 데이터는 테이블당 최대 ${ROW_MAX}행`,
      "",
      "## 목차",
      "",
    ];
    const sections: string[] = [];

    for (const name of tables) {
      const cols = await db.all<{
        column_name: string;
        data_type: string;
        is_nullable: string;
        column_default: string | null;
      }>(
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = current_schema() AND table_name = ?
         ORDER BY ordinal_position`,
        name
      );
      const count = (await db.get<{ c: number }>(`SELECT COUNT(*) AS c FROM "${name}"`))?.c ?? 0;
      const rows = await db.all<Record<string, unknown>>(
        `SELECT * FROM "${name}" ORDER BY 1 LIMIT ${ROW_MAX}`
      );
      lines.push(`- [${name}](#${name.toLowerCase()}) (${count}행)`);

      sections.push(`## ${name}`, "", `${count}행`, "", "### 컬럼", "");
      sections.push("| 이름 | 타입 | NOT NULL | 기본값 |", "|------|------|----------|--------|");
      for (const c of cols) {
        const dflt = (c.column_default ?? "").replace(/\|/g, "\\|");
        sections.push(
          `| ${c.column_name} | ${c.data_type} | ${c.is_nullable === "NO" ? "YES" : ""} | ${dflt} |`
        );
      }
      sections.push("", "### 데이터", "");
      const names = cols.map((c) => c.column_name);
      sections.push(`| ${names.join(" | ")} |`, `| ${names.map(() => "---").join(" | ")} |`);
      for (const row of rows) {
        sections.push(`| ${names.map((c) => escapeCell(row[c], c)).join(" | ")} |`);
      }
      sections.push("");
    }

    lines.push("", ...sections);
    const out = path.resolve(process.cwd(), "data", "DataBaseColumn.md");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, `${lines.join("\n").trimEnd()}\n`, "utf8");
    console.log(`✔ ${out}`);
  } finally {
    await closeDb();
  }
}

main().catch((err) => {
  console.error(`✖ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
