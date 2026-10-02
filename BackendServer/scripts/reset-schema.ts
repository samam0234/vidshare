/**
 * DATABASE_SCHEMA 로 지정한 스키마를 지우고 빈 상태로 다시 만든다. E2E 시작 전에 쓴다.
 *
 *   DATABASE_URL=… DATABASE_SCHEMA=e2e npx tsx scripts/reset-schema.ts
 *
 * 실수로 운영 데이터를 지우지 않도록 `public` 과 이름 형식이 이상한 스키마는 거부한다.
 * 테이블은 서버가 뜰 때 마이그레이션이 다시 만든다.
 */
import "dotenv/config";
import pg from "pg";
import { databaseUrl } from "../src/db/client";

async function main() {
  const schema = process.env.DATABASE_SCHEMA?.trim() ?? "";
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(schema) || schema === "public") {
    throw new Error(`초기화할 수 없는 스키마입니다: "${schema}"`);
  }
  const client = new pg.Client({ connectionString: databaseUrl() });
  await client.connect();
  try {
    await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await client.query(`CREATE SCHEMA ${schema}`);
    console.log(`✔ 스키마 초기화: ${schema}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(`✖ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
