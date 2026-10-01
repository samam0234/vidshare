import type { Db } from "./client";
import { MIGRATIONS } from "./migrations";

/** 여러 프로세스가 동시에 마이그레이션하지 않도록 잡는 advisory lock 키. */
const LOCK_KEY = 4_200_917;

/**
 * `schema_migrations` 에 없는 마이그레이션만 버전 순으로 적용한다.
 * 각 마이그레이션은 자기 트랜잭션 안에서 실행되어, 중간에 실패하면 그 버전만 롤백된다.
 * 적용한 버전 목록을 돌려준다(이미 최신이면 빈 배열).
 *
 * BEGIN/COMMIT 과 advisory lock 은 커넥션 단위라, `db` 는 반드시 **커넥션 하나에 묶인** 것을 넘긴다
 * (풀에 묶인 Db 를 넘기면 문장마다 다른 커넥션으로 갈 수 있다).
 */
export async function migrate(db: Db): Promise<string[]> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const applied: string[] = [];
  await db.exec(`SELECT pg_advisory_lock(${LOCK_KEY})`);
  try {
    const done = new Set(
      (await db.all<{ version: string }>("SELECT version FROM schema_migrations")).map(
        (r) => r.version
      )
    );
    for (const m of MIGRATIONS) {
      if (done.has(m.version)) continue;
      await db.exec("BEGIN");
      try {
        await db.exec(m.sql);
        await db.run(
          "INSERT INTO schema_migrations (version, name) VALUES (?, ?)",
          m.version,
          m.name
        );
        await db.exec("COMMIT");
      } catch (err) {
        await db.exec("ROLLBACK");
        throw new Error(
          `마이그레이션 ${m.version}_${m.name} 실패: ${err instanceof Error ? err.message : err}`
        );
      }
      applied.push(m.version);
    }
  } finally {
    await db.exec(`SELECT pg_advisory_unlock(${LOCK_KEY})`);
  }
  return applied;
}
