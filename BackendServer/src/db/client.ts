import pg, { type PoolClient } from "pg";
import { migrate } from "./migrate";
import { seedIfEmpty } from "./seed";

const { Pool, types } = pg;

// int8(COUNT(*), BIGINT) 은 기본이 문자열이다. 이 앱의 값은 안전 정수 범위 안이라 number 로 받는다.
types.setTypeParser(20, (value: string) => Number(value));

type Queryable = pg.Pool | PoolClient | pg.Client;

export type RunResult<T> = { changes: number; rows: T[] };

/**
 * `?` 자리표시자를 Postgres 의 `$1, $2 …` 로 바꾼다.
 * 작은따옴표 문자열 안의 `?` 는 건드리지 않는다.
 */
export function toPgPlaceholders(sql: string) {
  let out = "";
  let n = 0;
  let inString = false;
  for (const ch of sql) {
    if (ch === "'") inString = !inString;
    if (ch === "?" && !inString) {
      n += 1;
      out += `$${n}`;
    } else {
      out += ch;
    }
  }
  return out;
}

/** better-sqlite3 시절의 `prepare().get/all/run` 모양을 async 로 옮긴 얇은 래퍼. */
export class Db {
  constructor(private readonly q: Queryable) {}

  async all<T>(sql: string, ...params: unknown[]): Promise<T[]> {
    const res = await this.q.query(toPgPlaceholders(sql), params);
    return res.rows as T[];
  }

  async get<T>(sql: string, ...params: unknown[]): Promise<T | undefined> {
    const rows = await this.all<T>(sql, ...params);
    return rows[0];
  }

  /** INSERT … RETURNING 을 쓰면 `rows` 로 새 행을 돌려받는다. */
  async run<T = Record<string, unknown>>(
    sql: string,
    ...params: unknown[]
  ): Promise<RunResult<T>> {
    const res = await this.q.query(toPgPlaceholders(sql), params);
    return { changes: res.rowCount ?? 0, rows: res.rows as T[] };
  }

  /** 자리표시자 없는 여러 문장(마이그레이션 SQL 등)을 그대로 실행. */
  async exec(sql: string): Promise<void> {
    await this.q.query(sql);
  }
}

let pool: pg.Pool | null = null;
let db: Db | null = null;

const SCHEMA_RE = /^[a-z_][a-z0-9_]{0,62}$/;

export function databaseUrl() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL 이 비어 있습니다. BackendServer/.env 에 Postgres 접속 문자열을 넣으세요."
    );
  }
  return url;
}

/** 테스트가 파일마다 별도 스키마를 쓰도록 `DATABASE_SCHEMA` 를 읽는다. 운영에서는 비운다. */
function databaseSchema() {
  const schema = process.env.DATABASE_SCHEMA?.trim();
  if (!schema) return null;
  if (!SCHEMA_RE.test(schema)) {
    throw new Error(`DATABASE_SCHEMA 형식이 올바르지 않습니다: ${schema}`);
  }
  return schema;
}

export function getDb(): Db {
  if (!db) {
    throw new Error("Postgres 가 아직 연결되지 않았습니다. initDb()를 먼저 호출하세요.");
  }
  return db;
}

/** 트랜잭션 하나를 잡아 fn 에 넘긴다. fn 이 던지면 ROLLBACK. */
export async function withTx<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
  if (!pool) getDb();
  const client = await pool!.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(new Db(client));
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/** 테스트 정리·CLI 종료 시 사용. */
export async function closeDb() {
  if (pool) {
    const p = pool;
    pool = null;
    db = null;
    await p.end();
  }
}

export async function initDb(): Promise<Db> {
  if (db) return db;

  const schema = databaseSchema();
  pool = new Pool({
    connectionString: databaseUrl(),
    max: Number(process.env.DB_POOL_MAX) || 10,
    ...(schema ? { options: `-c search_path=${schema}` } : {}),
  });
  db = new Db(pool);

  if (schema) await db.exec(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
  const client = await pool.connect();
  let applied: string[];
  try {
    applied = await migrate(new Db(client));
  } finally {
    client.release();
  }
  await seedIfEmpty();

  if (process.env.NODE_ENV !== "test") {
    // data_directory 는 슈퍼유저만 읽을 수 있어 앱 계정으로는 DB 이름만 찍는다.
    const info = await db.get<{ db: string }>("SELECT current_database() AS db");
    console.log(
      `  Postgres: ${info?.db}` +
        (applied.length ? ` · 마이그레이션 ${applied.join(", ")}` : "")
    );
  }
  return db;
}
