# 096 — SQLite → PostgreSQL 16 전환

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `096` |
| **파일명** | `096-postgres-migration.md` |
| **Git 커밋 (short)** | `1f6dbff` |
| **Git 커밋 (full)** | `1f6dbffc817fcf600b931f53a3d350ddd03093c4` |
| **날짜** | `2026-10-02` |
| **작성자** | `Claude` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` — Added / Changed / Removed |

---

## 1. 커밋 내용

```
feat(backend): SQLite 를 PostgreSQL 16 으로 전환

better-sqlite3(동기)를 pg(비동기)로 바꾸고 store·auth·chatbot·라우트 25개를
async 로 옮긴다. 라우터는 async 실패를 에러 핸들러로 넘기는 asyncRouter 로 만든다.
스키마는 버전 관리 마이그레이션(0001_init, schema_migrations)으로, 테스트는
파일마다 임시 스키마로 격리한다. SQLite 데이터 이관 스크립트(db:import-sqlite)를
추가하고 로컬 실데이터 151행으로 검증했다. 1차 전환은 컬럼 타입을 보존한다.

상세 기록: docs/commits/096-postgres-migration.md
```

---

## 2. 개요

### 배경

plan.md v2(095)에서 백엔드를 Oracle Cloud VM 에 올리고 DB 를 PostgreSQL 로 바꾸기로 했다.
SQLite 파일 하나로는 스키마 변경 이력이 없고(`ensureColumn` 누적), 백업·복원 도구가 빈약하다.
이 PC 에는 PostgreSQL 16.15 가 이미 `D:\PostgreSQL\16` 에 설치되어 있고 데이터 디렉터리도
`D:\PostgreSQL\16\data` 라, “데이터를 D 드라이브에 둔다”는 요구는 기존 클러스터로 충족된다.

### 목표

- 백엔드가 Postgres 위에서 기존과 **같은 API 응답**을 낸다 — 기존 테스트 137건이 수정 없이 통과
- 기존 SQLite 데이터를 잃지 않고 옮길 수 있다

### 범위 밖

- 날짜 `timestamptz`·불리언 `boolean` 같은 타입 정교화 (4장)
- Oracle VM·배포 스크립트 (097), 문서 갱신 (098)
- 로컬 D 드라이브 클러스터에 실제 계정·DB 생성 — `postgres` 비밀번호가 필요해 사용자가 실행

---

## 3. 변경 파일

| 경로 | 변경 | 설명 |
|------|------|------|
| `src/db/client.ts` | 재작성 | `pg` Pool + `Db`(all/get/run/exec, `?`→`$n`) + `withTx` + `initDb`/`closeDb`. int8 → number 파서 |
| `src/db/migrate.ts` | 추가 | `schema_migrations` 러너, 버전별 트랜잭션, advisory lock |
| `src/db/migrations/0001_init.ts`, `index.ts` | 추가 | 22개 테이블. SQLite `schema.ts` + `ensureColumn` 을 합침 |
| `src/db/schema.ts`, `src/db/dumpDoc.ts` | 삭제 | 마이그레이션·`scripts/dump-db-doc.ts` 로 대체 |
| `src/db/seed.ts` | 수정 | async, 한 트랜잭션 |
| `src/data/store.ts` | 수정 | 전 함수 async. `RETURNING id`, `ON CONFLICT DO NOTHING`, `GREATEST`, `ORDER BY seq`, `withTx` |
| `src/auth/*.ts` | 수정 | sessions·accounts·requestUser·requireAdmin async |
| `src/chatbot/store.ts`, `platform.ts`, `locals.ts`, `shape.ts`, `vide.ts` | 수정 | async + 호출부 await |
| `src/middleware/asyncRouter.ts` | 추가 | `Router()` — 핸들러가 reject 하면 `next(err)` |
| `src/routes/**` (25개) | 수정 | `asyncRouter` 사용, 핸들러 async, 호출부 await |
| `src/routes/health.ts` | 수정 | `SELECT 1` 확인, 실패 시 503 `db: down` |
| `src/realtime/chatSocket.ts` | 수정 | 업그레이드 시 세션 확인·메시지 저장을 Promise 로 |
| `src/index.ts` | 수정 | `await initDb()` 후 listen, SIGTERM/SIGINT 에 풀 정리 |
| `src/app.ts` | 수정 | `TRUST_PROXY` → `app.set("trust proxy")` |
| `scripts/create-admin.ts` | 수정 | async, dotenv |
| `scripts/db-migrate.ts` | 추가 | 마이그레이션만 적용 (`npm run db:migrate`) |
| `scripts/migrate-sqlite-to-pg.ts` | 추가 | SQLite → Postgres 이관 (`npm run db:import-sqlite`) |
| `scripts/dump-db-doc.ts` | 추가 | `DataBaseColumn.md` 덤프 (`npm run db:doc`) |
| `tests/helpers.ts` | 수정 | 테스트 파일마다 `t_<pid>_<rand>` 스키마, `createTestSchemaDb` |
| `tests/db-migrate.test.ts`, `tests/import-sqlite.test.ts` | 추가 | 11건 |
| `package.json` | 수정 | `pg`, `@types/pg`, 스크립트 3개, `better-sqlite3` → devDependency |
| `.env.example`, `data/README.md`, `uploads/README.md` | 수정 | `DATABASE_URL(_TEST)`, `DB_POOL_MAX`, `TRUST_PROXY`, D 드라이브 권장 경로 |

---

## 4. 결정과 트레이드오프

### 타입을 보존한 이유

SQLite 의 날짜는 ISO 문자열, 불리언은 0/1 이다. `timestamptz` 로 바꾸면 `pg` 가 `Date` 객체를 돌려주고
JSON 직렬화 형식이 달라져 프론트까지 흔들린다(쇼츠 `createdAt` 은 `YYYY-MM-DD` 만 저장하는 등 형식도 섞여 있다).
**DB 엔진 교체와 타입 정교화를 한 커밋에 섞지 않았다.** 그 덕에 기존 테스트 137건이 한 줄도 바뀌지 않고 통과했다.

### `?` 자리표시자를 유지한 래퍼

store.ts 의 SQL 은 거의 표준이라 문장은 그대로 두고 호출 모양만 바꿨다.
`Db.all/get/run(sql, ...params)` 이 작은따옴표 밖의 `?` 를 `$1, $2 …` 로 바꾼다. diff 가 “await 추가”로 읽히게 하려는 목적이다.

### `rowid` 와 정렬

- `ORDER BY rowid` 를 쓰던 `comments`·`chat_users`·`messages`·`faqs` 에 `seq` identity 컬럼을 두고, 이관 때 원래 rowid 를 넣는다.
- Postgres 의 TEXT 정렬은 DB 로캘을 따른다. SQLite 처럼 바이트 순서가 되도록 id·시각 컬럼에 `COLLATE "C"`.
- `handle COLLATE NOCASE UNIQUE` → `lower(handle)` 유니크 인덱스.

### asyncRouter

Express 4 는 async 핸들러의 rejected promise 를 잡지 못한다. `requireRequestUser` 의 401 이 응답 없이 매달리고
unhandledRejection 이 난다. Express 5 업그레이드는 경로 문법 등 다른 변화가 커서, 라우터 생성 지점에서 감싸는 쪽을 택했다.

### 테스트 격리

`node --test` 는 파일을 병렬 프로세스로 돌린다. 한 DB 를 TRUNCATE 하며 공유하면 서로 지운다.
파일마다 고유 스키마를 만들고(`search_path`), 끝나면 `DROP SCHEMA … CASCADE`. 실행 후 남은 스키마 0개 확인.

### 마이그레이션이 `.sql` 이 아닌 이유

`tsc` 는 `.sql` 을 `dist/` 로 복사하지 않는다. 빌드 단계를 늘리지 않으려고 SQL 문자열을 내보내는 TS 모듈로 뒀다.

---

## 5. 작업 중 잡은 버그

| 버그 | 원인 | 처리 |
|------|------|------|
| 재생목록 응답의 `id`·`title` 이 빠짐 | `{ ...getPlaylistById(id) }` — Promise 를 spread 하면 `{}`. 자동 변환 정규식이 `...` 뒤를 건너뜀. **tsc 도 잡지 못함** | `{ ...(await getPlaylistById(id)) }`. 미-await 호출 전수 검사 스크립트로 같은 패턴 0건 확인 |
| `listShorts(q).slice` | `await` 우선순위 | `(await listShorts(q)).slice(...)` |
| 마이그레이션 BEGIN/COMMIT 이 엉뚱한 커넥션으로 | 풀에 묶인 `Db` 로 실행하면 문장마다 다른 커넥션 | `migrate()` 는 커넥션 하나에 묶인 `Db` 만 받도록 하고 호출부에서 `pool.connect()` |
| 앱 계정으로 시작 로그 실패 | `current_setting('data_directory')` 는 슈퍼유저 권한 필요 | DB 이름만 출력 |

---

## 6. 검증

```bash
npm run typecheck                       # src + tests + scripts
DATABASE_URL_TEST=… npm test            # 148 pass (기존 137 + 신규 11)
npm run build
```

- 임시 Postgres 16 클러스터(scratchpad, 포트 5433)에서 실행. 사용자의 `D:\PostgreSQL\16\data` 클러스터는 건드리지 않았다.
- **실데이터 이관**: `data/vidshare.sqlite`(+WAL) **사본** → 22개 테이블 151행 전부 일치.
  이관 DB 로 서버를 띄워 health·로그인·알림·검색·커뮤니티 작성 확인, 새 글 id 가 기존 최대 + 1.
  `--replace` 없이 재실행 시 중단, `--replace` 로 재실행 성공.

---

## 7. 후속

- [ ] 사용자: `deploy/windows/setup-postgres-d.ps1` 실행 → `.env` → `npm run db:import-sqlite`
- [ ] 타입 정교화 마이그레이션 (`timestamptz`, `boolean`)
- [ ] `errorHandler` 에 pg 오류 코드 매핑 (23505 → 409)
