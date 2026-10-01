/**
 * 마이그레이션만 적용한다(시드는 하지 않음). 배포 스크립트가 서버 재시작 전에 호출한다.
 *
 *   npm run db:migrate
 *
 * 서버(Oracle VM)도 빌드를 위해 dev 의존성까지 설치하므로 tsx 로 그대로 돌린다.
 */
import "dotenv/config";
import pg from "pg";
import { Db, databaseUrl } from "../src/db/client";
import { migrate } from "../src/db/migrate";
import { MIGRATIONS } from "../src/db/migrations";

async function main() {
  const pool = new pg.Pool({ connectionString: databaseUrl(), max: 1 });
  const client = await pool.connect();
  try {
    const applied = await migrate(new Db(client));
    const latest = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? "-";
    console.log(
      applied.length
        ? `✔ 적용: ${applied.join(", ")} (최신 ${latest})`
        : `= 이미 최신입니다 (${latest})`
    );
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(`✖ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
