# VidShare 계획서

**최초 작성**: 2026-08-19
**고도화 개정**: 2026-10-02 (v2 — Oracle Cloud 배포 · PostgreSQL 전환 · 전체 폴더 구조)
**구현 반영**: 2026-10-02 (v2.2 — 커밋 096~105. 계획과 달라진 점은 각 장에 ▶ 로 적음)
**성격**: 소규모 개인 프로젝트

**현재 상태 (v2.2)**: **운영 중.** 백엔드는 PostgreSQL 16(테스트 151건)으로 전환했고, **Oracle Cloud 전용 VM**(ARM 2 OCPU / 11GB)에 올려
**Cloudflare Tunnel** 로 공개했다(103). OCI 보안 목록에서 80·443 이 막혀 있어 계획한 Caddy + 도메인 대신 아웃바운드 터널을 썼고,
그래서 API 주소가 임시(`*.trycloudflare.com`)이며 쿠키는 `SameSite=None` 이다. 관리자 계정 찾기·재설정 도구도 추가했다(104).
**남은 것**: 도메인으로 주소 고정, 로컬 D 드라이브 DB 계정 생성 실행(P1), 감사 로그 — 13장.

**v2 목표**: 백엔드를 **Oracle Cloud** 에 올리고, DB 를 **SQLite → PostgreSQL** 로 바꾸며, 데이터는 **D 드라이브** 에 저장·백업한다.

관련 문서: [README.md](./README.md) · [docs/architecture/overview.md](./docs/architecture/overview.md) · [docs/features/roadmap.md](./docs/features/roadmap.md) · [docs/deployment.md](./docs/deployment.md)

### 목차

1. 계기 · 2. 한 줄 정의 · 3. 핵심 시나리오 · 4. 기능 구성
5. 채택한 구현 방식 · 6. 대안 검토
7. **목표 아키텍처 (v2)**
8. **PostgreSQL 전환 계획**
9. **D 드라이브 저장 계획**
10. **Oracle Cloud 배포 계획**
11. **환경 변수**
12. **전체 폴더 구조 (파일명까지)**
13. **단계별 실행 계획 (P1~P7)**
14. **위험 요소와 대응**
15. 범위 · 16. 완료 기준

---

## 1. 계기

프론트만 있는 랜딩이 아니라, **화면 + API + 저장소**까지 한 제품처럼 보이게 만들고 싶었다.
혼자 다루는 **소규모 개인 프로젝트**로 범위를 잡았다.

그중 **VidShare**를 고른 이유는 단일이 아니라 **여러 쓰임이 한곳에 모이는 플랫폼**을 만들고 싶어서다.

- 영상을 **올린다**
- 그 영상을 **커뮤니티에 바로 공유**해서 이야기로 이어지게 한다
- 쇼츠처럼 빠르게 보기도 하고, 롱폼처럼 길게 보기도 한다
- 댓글·메시지·알림으로 **사람끼리 이어지게** 한다

즉 “영상 플레이어 하나”가 아니라, **커뮤니티 기반 영상 공유 + 멀티 기능**이 핵심이다.

---

## 2. 한 줄 정의

> VidShare는 영상을 올리고, 커뮤니티 글로 쉽게 공유해 같이 볼 수 있는 소규모 숏폼·롱폼 커뮤니티 플랫폼이다.

---

## 3. 핵심 사용자 시나리오

1. 크리에이터가 쇼츠 또는 롱폼을 올린다.
2. 같은 영상을 커뮤니티 글로 공유한다. (제목·설명·영상 번호)
3. 다른 유저가 피드·커뮤니티·프로필에서 찾아 본다.
4. 좋아요·댓글·메시지로 반응한다.
5. 해결이 안 되면 고객센터 FAQ 또는 문의 메시지를 남긴다.
6. 운영자는 관리자 콘솔에서 신고·정지·삭제·문의 답변을 처리한다.

---

## 4. 기능 구성 (멀티)

| 영역 | 역할 | 현재 |
|------|------|------|
| 쇼츠 피드 `/` | 세로 스냅, 빠르게 소비 | UI + API |
| 롱폼 `/longform` | 긴 영상 등록·상세 | API + DB |
| 커뮤니티 `/community` | 글·공유·토론 | API + DB |
| 업로드 `/upload` | 쇼츠 올리기 | 실파일 `uploads/` |
| 프로필 `/profile/[id]` | 영상 라이브러리·팔로우 | API + 세션 |
| 메시지 `/messages` | 1:1 대화 | API + WebSocket |
| 알림 `/notifications` | 이벤트 목록 | API + SSE |
| 챗봇 `/chatbot` | 이용 안내 대화 | LLM 3모델 |
| 고객센터 `/support` | FAQ + 문의 | API |
| 인증 `/login` `/register` | 가입·로그인 | DB + 쿠키 세션 |
| 이용약관 `/terms` | 서비스 이용 조건 | 정적 페이지, 비회원 |
| 개인정보처리방침 `/privacy` | 수집·이용 안내 | 정적 페이지, 비회원 |
| 사업자 정보확인 `/business` | 상호·등록 정보 | 정적 페이지, 비회원 (번호 미등록) |
| 관리자 콘솔 `console/` | 신고·정지·삭제·문의 답변 | 별도 앱 :3200 |

---

## 5. 채택한 구현 방식

혼자 유지할 수 있게 **나눠 만들되, 나중에 붙이기 쉬운 구조**를 택했다.

| 결정 | v1 (지금까지) | v2 (이 개정) | 이유 |
|------|---------------|--------------|------|
| 서버 구조 | Front / Backend / console 폴더 분리 | **유지** | 역할이 보이고 배포 단위가 갈린다 |
| 프론트 | Next.js App Router + React | **유지** | 페이지·라우트가 명확하다 |
| 프론트 호스팅 | Cloudflare Workers (OpenNext) | **유지** | 이미 배포됨 |
| 백엔드 | Express + TypeScript | **유지** | 라우트 파일이 곧 API 목록 |
| 백엔드 호스팅 | 로컬 PC + Cloudflare Tunnel | **Oracle Cloud VM** | PC를 켜 두지 않아도 되고, 고정 IP·상시 프로세스 확보 |
| DB | SQLite 파일 (`better-sqlite3`) | **PostgreSQL 16** | 동시 쓰기·마이그레이션·백업(`pg_dump`)·정식 타입 |
| DB 저장 위치 | `BackendServer/data/` | **D 드라이브 `D:\PostgreSQL\16\data`** (이미 설치된 클러스터), VM 은 별도 블록 볼륨 | 코드 폴더와 데이터를 분리, 디스크 교체·백업 쉬움 (9장) |
| 업로드 | `BackendServer/uploads/` | **데이터 폴더의 `uploads/`** (`UPLOADS_PATH`) | DB와 같은 위치에서 같이 백업 |
| 인증 | bcrypt + HttpOnly 세션 쿠키 | **유지** (`COOKIE_DOMAIN` 공유 도메인) | JWT보다 단순 |
| 마이그레이션 | `initDb()` 안 `ensureColumn` | **버전 있는 마이그레이션(TS 모듈) + `schema_migrations` 테이블** | 운영 DB 변경을 추적 |
| 실시간 | SSE + WebSocket, 단일 프로세스 `EventEmitter` | **유지 — 인스턴스 1개 고정** | 다중 인스턴스는 Redis 필요(이번 범위 밖) |

---

## 6. 대안 검토

선택의 이유를 남겨 두기 위한 표다. **v2 에서 바뀐 항목은 굵게** 표시했다.

### 6.1 제품 형태

| 방식 | 설명 | 이 프로젝트에서 |
|------|------|-------------|
| A. 숏폼 전용 | 틱톡/쇼츠만 | 너무 좁음. 커뮤니티 공유가 약해짐 |
| B. 게시판 + 첨부 영상 | 커뮤니티가 중심 | 피드 경험이 약함 |
| C. 유튜브형 롱폼만 | 검색·구독 중심 | 혼자 만들기엔 검색·추천이 부담 |
| **D. 하이브리드 (채택)** | 쇼츠 + 롱폼 + 커뮤니티 공유 | 목표와 가장 잘 맞음 |

### 6.2 프론트 구성

| 방식 | 비고 |
|------|------|
| 정적 HTML (`oldplanHTML`) | 초안용. 상태·라우팅이 약함 |
| CRA / Vite SPA | SEO·라우트 구조가 단순 |
| **Next App Router (채택)** | 상세 URL(`/community/1`)이 자연스러움 |

### 6.3 백엔드 구성

| 방식 | 비고 |
|------|------|
| Next Route Handler만 | “풀스택 분리”가 안 보이고 SQLite·WS와 안 맞음 |
| NestJS | 소규모 개인 프로젝트에는 설정이 큼 |
| **Express (채택)** | 라우트 파일이 곧 API 목록 |

### 6.4 데이터 저장 (**v2 변경**)

| 방식 | 비고 |
|------|------|
| 브라우저만 (localStorage) | PC를 바꾸면 없음 |
| 서버 메모리 | 재시작 시 초기화 |
| SQLite | v1 채택. 설치 없음. **단점: 파일 하나라 서버 1대 고정, 스키마 변경 이력 없음, 동시 쓰기 한계** |
| MariaDB / MySQL | 가능하지만 Postgres 대비 이점 없음 |
| MongoDB | 유저–영상–댓글 관계와 안 맞음 |
| **PostgreSQL 16 (v2 채택)** | 정식 타입(`timestamptz`, `boolean`), 트랜잭션·인덱스·`pg_dump`, Oracle VM·Windows 모두 설치 쉬움 |
| Oracle Autonomous DB | Always Free 가 있으나 Oracle 전용 드라이버·SQL 방언. **D 드라이브 저장 요구와 맞지 않아 제외** |

### 6.5 인증

| 방식 | 비고 |
|------|------|
| UI만 로그인 | 보안 경계가 아님 |
| JWT를 localStorage | XSS에 토큰 노출 |
| **세션 쿠키 (채택)** | HttpOnly. 세션은 DB 에 저장 (Postgres 로 이관) |
| OAuth (구글 등) | 이번 범위 밖 |

### 6.6 영상 저장·공유

| 방식 | 비고 |
|------|------|
| 외부 샘플 URL | 네트워크 필요 |
| 브라우저 미리보기만 | 서버에 파일이 안 남음 |
| **로컬 디스크 `uploads/` (채택, 057)** | 개발은 D 드라이브, 운영은 VM 블록 볼륨. 경로만 `UPLOADS_PATH` 로 바뀜 |
| S3 / R2 / Oracle Object Storage | 실서비스. 계정·비용·설정이 큼. **다음 단계 후보** |
| 커뮤니티에 영상 ID만 링크 | 공유 방식. 파일 복제 없음 |

### 6.7 백엔드 호스팅 (**v2 신규**)

| 방식 | 장점 | 단점 | 결론 |
|------|------|------|------|
| 내 PC + Cloudflare Tunnel | 무료, 코드 수정 최소 | PC가 꺼지면 서비스 중단 | v1 임시안. **폐기** |
| Railway / Render / Fly.io | 설정 쉬움 | 영구 볼륨·무료 한도 제한 | 대안 |
| **Oracle Cloud VM (채택)** | Always Free 한도 안에서 VM + 블록 볼륨 + 고정 공인 IP, 상시 프로세스·WS 가능 | 직접 서버 관리, ARM 재고 부족 가능 | 채택 |
| Workers / Pages 에 백엔드 | — | SQLite·업로드·WS 모두 불가 | 하지 않음 |

---

## 7. 목표 아키텍처 (v2)

```
[Browser — 사용자]                 [Browser — 운영자]
        │                                  │
        ▼                                  ▼
 app.example.com                  console.example.com
 Cloudflare Workers               Cloudflare Workers
 (FrontServer, OpenNext)          (console, OpenNext)
        │   fetch(credentials: "include")  │
        └───────────────┬──────────────────┘
                        ▼
              api.example.com   (A 레코드 → Oracle VM 공인 IP)
                        │ 443 (HTTPS, WSS, SSE)
        ┌───────────────▼────────────────────────────────┐
        │  Oracle Cloud VM  (Ubuntu 24.04, Always Free)  │
        │                                                │
        │  Caddy :80/:443  ── 자동 HTTPS(Let's Encrypt)  │
        │     ├─ /uploads/*  → 디스크에서 직접 서빙       │
        │     └─ 그 외       → reverse_proxy :4000        │
        │                                                │
        │  BackendServer :4000 (Node 24, systemd)        │
        │     │ DATABASE_URL (localhost)                 │
        │     ▼                                          │
        │  PostgreSQL 16 :5432  (127.0.0.1 바인딩만)      │
        │                                                │
        │  블록 볼륨 /mnt/vidshare-data                   │
        │     ├─ pgdata/    ← DB 파일                     │
        │     ├─ uploads/   ← 영상·썸네일                 │
        │     └─ backups/   ← pg_dump 야간 백업            │
        └───────────────┬────────────────────────────────┘
                        │ 야간 백업 당겨오기 (scp / rsync)
                        ▼
        내 PC  D:\vidshare-data\backups\prod\   ← 운영 데이터 사본
```

> ▶ **실제 구성 (103)** — 위 그림은 계획이다. 실제로는 OCI 보안 목록이 22 만 허용해 Caddy(80·443)를 쓸 수 없었다.
>
> ```
> vidshare-front.*.workers.dev / vidshare-console.*.workers.dev   (Cloudflare Workers)
>        │ fetch(credentials: "include")
>        ▼
> <무작위>.trycloudflare.com  ══ 아웃바운드 터널 ══  Oracle VM (Ubuntu 22.04, ARM 2 OCPU / 11GB, 전용)
>                                                    ├─ cloudflared          (systemd)
>                                                    ├─ BackendServer :4000  (systemd) ─ /uploads/* 도 직접 서빙
>                                                    └─ PostgreSQL 16 :5432  /var/lib/postgresql/16/main (부트 디스크)
> 내 PC  ← 매일 04:30 운영 백업·업로드 사본 (D:\vidshare-data\backups\prod)
>        → 매시간 터널 주소 확인, 바뀌면 프론트·콘솔 재배포 (sync-tunnel-url.ps1)
> ```
>
> 블록 볼륨은 붙이지 않았다. 도메인을 마련하면 named tunnel(또는 80·443 개방 + Caddy)로 아래 7.1 의 원래 구성에 가까워진다.

### 7.1 도메인과 쿠키

Workers 의 `*.workers.dev` 주소와 백엔드 주소가 **다른 등록 도메인**이면 브라우저가 세션 쿠키를 보내지 않는다 ([deployment.md](./docs/deployment.md) 3장). 그래서 **도메인을 하나 구입**해 세 개로 나눈다.

| 호스트 | 대상 | 연결 방식 |
|--------|------|-----------|
| `app.example.com` | FrontServer | Workers Custom Domain |
| `console.example.com` | console | Workers Custom Domain |
| `api.example.com` | BackendServer | A 레코드 → Oracle VM 공인 IP (DNS only, 프록시 끔) |

- 백엔드: `COOKIE_DOMAIN=.example.com`, `COOKIE_SAMESITE=lax`, `CORS_ORIGIN=https://app.example.com,https://console.example.com`
- 같은 등록 도메인(`example.com`) 아래라 SameSite=Lax 로 충분하다. `none` 은 쓰지 않는다.
- 세션 쿠키 이름은 그대로 `vidshare_sid`(사용자) / `vidshare_admin_sid`(관리자).
- Caddy 뒤에서 `Secure` 쿠키가 정상 발급되려면 `app.set("trust proxy", 1)` 이 필요하다 → P3 에서 반영.

### 7.2 왜 Tunnel 을 버리는가 → ▶ 결국 다시 썼다

Oracle VM 은 공인 IP 가 있으므로 Cloudflare Tunnel 이 필요 없다. Caddy 가 직접 443 을 받는다. `cloudflare/config.template.yml` 은 097 에서 제거했다.

> ▶ **103 에서 뒤집힘.** 버린 것은 "**내 PC** 를 터널로 노출"하는 안이었다(PC 가 꺼지면 서비스도 멈춤).
> 실제 VM 은 보안 목록이 22 만 열려 있어 인바운드로 443 을 받을 수 없었고, **VM 에서** `cloudflared` 를 돌리는 아웃바운드 터널로 공개했다.
> 서버는 여전히 꺼지지 않는 VM 이므로 원래 이유(상시 가동)는 지켜진다. 대가는 주소가 고정되지 않는 것과 `SameSite=None` 쿠키.

---

## 8. PostgreSQL 전환 (✅ 096 구현)

### 8.1 바꾼 범위 (실측)

| 항목 | 이전 | 지금 |
|------|------|------|
| 드라이버 | `better-sqlite3` — **동기** | `pg` — **비동기**. `better-sqlite3` 는 이관 스크립트용 devDependency 로만 남김 |
| DB 접근 | `getDb().prepare(sql).get/all/run(...)` | `await getDb().get/all/run(sql, ...params)` — `?` 를 `$n` 으로 자동 변환하는 얇은 래퍼(`db/client.ts`) |
| `getDb()` 사용 파일 | 6개 (`store.ts` 1,621줄에 86곳) | 같은 6개 + 라우트 25개를 전부 async 로 |
| 라우터 | `express.Router()` | `middleware/asyncRouter.ts` 의 `Router()` — Express 4 가 놓치는 async 실패를 `next(err)` 로 |
| 트랜잭션 | `db.transaction(fn)` | `withTx(async (tx) => …)` — 풀에서 커넥션 하나를 잡아 BEGIN/COMMIT |
| 스키마 | `db/schema.ts` + `ensureColumn` | `db/migrations/0001_init.ts` + `schema_migrations` (advisory lock) |
| PRAGMA | `journal_mode=WAL`, `foreign_keys=ON` | 제거 (Postgres 기본) |
| `db/dumpDoc.ts` | 쓰기마다 자동 덤프 | `npm run db:doc` (`scripts/dump-db-doc.ts`) |
| 테스트 | 임시 SQLite 파일 | `DATABASE_URL_TEST` DB 안에 **테스트 파일마다 임시 스키마** — 병렬 실행해도 안 섞임 |
| 서버 시작 | `initDb()` 동기 | `await initDb()` (마이그레이션 → 시드) 후 `listen`, SIGTERM 시 풀 정리 |

### 8.2 SQLite → PostgreSQL 변환 규칙

| SQLite | PostgreSQL |
|--------|------------|
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY` (BY DEFAULT 라 이관 때 기존 번호를 그대로 넣고 `setval`) |
| `ORDER BY rowid` (4곳) | 해당 테이블(`comments`, `chat_users`, `messages`, `faqs`)에 `seq` identity 컬럼, 이관 때 원래 rowid 를 넣음 |
| `handle … COLLATE NOCASE UNIQUE` | `lower(handle)` 유니크 인덱스 |
| TEXT 정렬 (바이트 순서) | id·시각 컬럼에 `COLLATE "C"` |
| `?` | `$1, $2, …` (래퍼가 자동 변환, 작은따옴표 안은 제외) |
| `INSERT OR IGNORE` | `INSERT … ON CONFLICT DO NOTHING` |
| `lastInsertRowid` | `INSERT … RETURNING id` (필요하면 행 전체를 RETURNING) |
| `MAX(0, x)` (스칼라) | `GREATEST(0, x)` |
| `COUNT(*)` → number | int8 를 number 로 받도록 타입 파서 등록 |

**결정 — 1차 전환은 컬럼 타입을 보존했다.** 날짜는 ISO 문자열 `TEXT`, 불리언은 0/1 `INTEGER` 그대로다.
`timestamptz`·`boolean` 으로 바꾸면 API 응답(`createdAt` 문자열 형식 등)과 프론트가 함께 흔들리기 때문에,
DB 엔진 교체와 타입 정교화를 한 번에 하지 않는다. 정교화는 후속 마이그레이션으로 남긴다(로드맵 P2).

> `LIKE` 검색은 `lower(col) LIKE ?` 그대로 둔다. 데이터가 늘면 `pg_trgm` 인덱스를 후속으로 붙인다.

### 8.3 DB 접속 구성

- `src/db/client.ts`: `Pool` + `Db`(all/get/run/exec) + `withTx` + `initDb`/`closeDb`. `DATABASE_SCHEMA` 가 있으면 `search_path` 를 그 스키마로(테스트 격리용).
- `src/db/migrate.ts`: `MIGRATIONS` 중 `schema_migrations` 에 없는 것만 버전 순으로, 각자 트랜잭션에서. `pg_advisory_lock` 으로 동시 실행 방지. **커넥션 하나에 묶인 `Db`** 로만 호출한다.
- `src/db/migrations/*.ts`: SQL 문자열을 내보내는 TS 모듈. `.sql` 이 아닌 이유 — `tsc` 빌드가 `.sql` 을 `dist/` 로 복사하지 않는다.
- DB 계정은 앱 전용 `vidshare` (슈퍼유저 `postgres` 는 앱에서 쓰지 않음). DB 는 `vidshare`, 테스트 `vidshare_test`.

### 8.4 데이터 이관 (SQLite → Postgres)

`npm run db:import-sqlite [-- --from <경로>] [-- --replace]` (`scripts/migrate-sqlite-to-pg.ts`)

1. 원본 SQLite 를 **읽기 전용**으로 연다. (`setup-postgres-d.ps1` 이 원본을 `D:\vidshare-data\backups\sqlite-final\` 에 먼저 보관)
2. 마이그레이션 적용 → 대상이 비어 있지 않으면 중단(`--replace` 면 22개 테이블 TRUNCATE).
3. **한 트랜잭션**에서 FK 의존 순서(users → sessions → shorts → comments → …)로 500행씩 INSERT.
   `comments` 는 자기 참조 FK 때문에 `parent_id` 를 비우고 넣은 뒤 채운다.
4. IDENTITY·`seq` 시퀀스를 `MAX + 1` 로 맞춘다.
5. 테이블별 `sqlite` / `postgres` 행 수 표를 찍고, 다르면 종료 코드 1.

**검증 결과 (2026-10-02)**: 로컬 `vidshare.sqlite`(WAL 포함) 사본 → 22개 테이블 **151행 전부 일치**, 이관된 DB 로
서버를 띄워 로그인·알림·검색·글 작성 확인(새 글 id = 기존 최대 + 1). 이 DB 를 `pg_dump` → 빈 DB 에 `pg_restore` 해 행 수 일치까지 확인.

### 8.5 전환 순서 (실제 진행)

1. ✅ `pg` 설치, `client.ts` · `migrate.ts` · `migrations/0001_init.ts` · async `seed.ts`
2. ✅ `auth/sessions.ts` → `accounts.ts` → `requestUser.ts` → `requireAdmin.ts`
3. ✅ `data/store.ts` 전체, `chatbot/store.ts` · `platform.ts` 와 호출부(`locals`/`vide`/`shape`)
4. ✅ 라우트 25개 async + `asyncRouter`, `chatSocket` 업그레이드·전송, `index.ts` 시작 순서
5. ✅ `await` 누락 점검 — `tsc` 가 못 잡는 패턴(`{ ...promise }`, `res.json({ data: promise })`)을 스크립트로 전수 검사해 2곳 수정
6. ✅ 테스트 헬퍼 Postgres 전환 → **기존 137건 + 신규 11건 = 148건 통과**
7. ✅ `schema.ts` · `dumpDoc.ts` 삭제, `better-sqlite3` devDependency 로 이동

---

## 9. D 드라이브 저장

### 9.1 먼저 짚어 둘 점 — “D 드라이브”와 “Oracle Cloud”는 서로 다른 컴퓨터다

Oracle Cloud VM 은 원격 서버라 **내 PC 의 D 드라이브를 직접 쓸 수 없다.** 그래서 두 환경으로 나눈다.

| 환경 | DB 가 사는 곳 | 파일(영상)이 사는 곳 | 용도 |
|------|---------------|---------------------|------|
| **로컬 (내 PC)** | **`D:\PostgreSQL\16\data`** (이미 설치된 Postgres 16 서비스) | **`D:\vidshare-data\uploads`** | 개발·테스트·이관 |
| **운영 (Oracle VM)** | 계획: 블록 볼륨 `/mnt/vidshare-data/pgdata` → ▶ **실제: 부트 디스크 `/var/lib/postgresql/16/main`** | `/mnt/vidshare-data/uploads` (부트 디스크 위 폴더) | 실서비스 |
| **운영 → D 드라이브 사본** | — | — | 야간 `pg_dump` + 업로드를 `D:\vidshare-data\backups\prod\` 로 |

**확인한 사실 (2026-10-02)**: 이 PC 에는 PostgreSQL 16.15 가 `D:\PostgreSQL\16` 에 설치되어 있고, 서비스
`postgresql-x64-16` 의 데이터 디렉터리가 `D:\PostgreSQL\16\data` 다. 그래서 v2 초안의 “새 클러스터를
`D:\vidshare-data\pgdata` 에 initdb” 대신 **기존 클러스터에 `vidshare` 계정·DB 만 추가**한다. DB 파일은 이미 D 드라이브에 있다.

**검토 후 채택하지 않은 안 — 운영 백엔드가 내 PC 의 D 드라이브 Postgres 에 직접 접속**

| 문제 | 설명 |
|------|------|
| PC 상시 가동 | PC 가 꺼지거나 절전이면 서비스 전체가 멈춘다 |
| 포트 노출 | 공유기 포트포워딩 또는 VPN 이 필요하고, 5432 를 인터넷에 열면 위험 |
| 지연 | 매 쿼리가 집↔Oracle 구간을 왕복 |

### 9.2 D 드라이브 폴더 구조

```
D:\PostgreSQL\16\
├── bin\                         psql · pg_dump · pg_restore …
└── data\                        PostgreSQL 클러스터 (vidshare · vidshare_test DB 포함)

D:\vidshare-data\                (setup-postgres-d.ps1 이 생성, 저장소 밖)
├── uploads\                     영상·썸네일  (UPLOADS_PATH)
├── backups\
│   ├── local\                   로컬 DB pg_dump   vidshare-YYYYMMDD-HHmm.dump
│   ├── prod\
│   │   ├── db\                  Oracle VM 에서 가져온 야간 백업
│   │   └── uploads\             운영 업로드 사본
│   └── sqlite-final\            전환 직전 vidshare.sqlite (+ -wal, -shm) 원본
└── logs\
```

### 9.3 로컬 설정 절차

```powershell
powershell -ExecutionPolicy Bypass -File deploy\windows\setup-postgres-d.ps1
```

1. 서비스 상태와 데이터 디렉터리가 D 드라이브인지 확인 (`sc qc`)
2. `D:\vidshare-data` 폴더 생성, SQLite 원본 보관
3. `vidshare` 계정(비밀번호는 영문·숫자·`_-` 12자 이상 — URL 에 그대로 들어감), `vidshare` · `vidshare_test` DB 생성.
   psql 이 `postgres` 슈퍼유저 비밀번호를 한 번 묻는다. 여러 번 실행해도 안전(비밀번호만 재설정).
4. 출력된 `DATABASE_URL` · `DATABASE_URL_TEST` · `UPLOADS_PATH` 를 `BackendServer\.env` 에 넣는다.

상세·문제 해결: [docs/ops/postgres-d-drive.md](./docs/ops/postgres-d-drive.md)

### 9.4 백업 정책

| 대상 | 방법 | 주기 | 보관 |
|------|------|------|------|
| 로컬 DB | `deploy\windows\backup-local.ps1` (`-Register` 로 작업 스케줄러) | 매일 03:30 | 14일 |
| 운영 DB | VM `/usr/local/bin/vidshare-backup` (cron) | 매일 03:00 + 배포 직전 | 14일 |
| 운영 → D 사본 | `deploy\windows\backup-pull.ps1 -SshHost vidshare-vm` (`-Register`) | 매일 04:30 | 30일 |
| 복원 연습 | 빈 DB 에 `pg_restore` 후 행 수 비교 | 분기 1회 | — |

> 복원해 본 적 없는 백업은 백업이 아니다. `backup-local.ps1` → `pg_restore` → 행 수 비교를 2026-10-02 에 한 번 통과했다. 절차: [docs/ops/backup-restore.md](./docs/ops/backup-restore.md)

---

## 10. Oracle Cloud 배포 (스크립트 ✅ 097 · 구축 ✅ 103)

> ▶ **실제 (103)**: 서울 리전 **ARM(A1) 2 OCPU / 11GB**, **Ubuntu 22.04**(Postgres 16 은 PGDG 저장소), 부트 50GB, **블록 볼륨·예약 IP·보안 목록 변경 없음**.
> 설치는 `setup-vm-tunnel.sh` — 10.2~10.4 의 Caddy · iptables 80/443 · 볼륨 마운트 단계가 빠지고 `cloudflared` 서비스가 들어간다.

### 10.1 리소스

| 항목 | 선택 | 비고 |
|------|------|------|
| 리전 | 서울(`ap-seoul-1`) 또는 춘천 | 한국 사용자 지연 최소 |
| VM | Always Free **Ampere A1 (ARM)** 1~2 OCPU / 6~12GB | 재고 부족 시 AMD `E2.1.Micro` (RAM 1GB, 빠듯함) |
| OS | Ubuntu 24.04 LTS | Postgres 16 이 기본 저장소에 있다 |
| 런타임 | **Node 24 LTS** | Node 20 은 2026-04 지원 종료. 로컬(v24)·CI 와 맞춤 |
| 부트 볼륨 | 50GB | OS·코드 |
| **블록 볼륨** | **100GB** (Paravirtualized) | `/mnt/vidshare-data` — pgdata · uploads · backups |
| 네트워크 | 예약 공인 IP | VM 을 다시 만들어도 IP 유지 |
| 한도 확인 | Always Free 한도·유휴 회수 정책 | 구축 전 OCI 문서에서 재확인 |

### 10.2 네트워크·보안

| 계층 | 규칙 | 담당 |
|------|------|------|
| OCI 보안 목록 | Ingress 80·443 전체, 22 는 내 IP 만 | 직접 (콘솔) |
| VM 방화벽 | Oracle Ubuntu 이미지의 iptables REJECT 앞에 80·443 ACCEPT 삽입 후 저장 | `setup-vm.sh` |
| PostgreSQL | `listen_addresses = 'localhost'`, 기본 `pg_hba` (로컬만) | `setup-vm.sh` (`postgresql.vidshare.conf`) |
| SSH | 키 인증만, 비밀번호·루트 로그인 끔 | 직접 ([ops/oracle-setup.md](./docs/ops/oracle-setup.md) 9장) |
| 계정 | 앱 실행 전용 시스템 계정 `vidshare` | `setup-vm.sh` |
| 비밀값 | `/etc/vidshare/backend.env` (600, 소유 vidshare) | `setup-vm.sh` 가 견본으로 생성 |

### 10.3 서버 구성

| 구성요소 | 설정 |
|----------|------|
| Caddy | `deploy/oracle/Caddyfile` — 자동 HTTPS, `/uploads/*` 를 디스크에서 직접(`nosniff`, 7일 캐시), 나머지 `reverse_proxy 127.0.0.1:4000` + `flush_interval -1`(SSE), 본문 110MB |
| BackendServer | `vidshare-backend.service` — `node dist/index.js`, `Restart=always`, `RequiresMountsFor=/mnt/vidshare-data`, `ProtectSystem=full`, 인스턴스 1개 |
| PostgreSQL | `data_directory=/mnt/vidshare-data/pgdata`, 블록 볼륨 마운트를 systemd 로 요구 |
| 백업 | `/usr/local/bin/vidshare-backup` + `/etc/cron.d/vidshare-backup` |
| 시간대 | `Asia/Seoul` |

### 10.4 최초 구축

1. OCI: VM · 블록 볼륨 · 예약 IP · 보안 목록
2. DNS: `api.example.com` A → 예약 IP
3. VM: `git clone … ~/vidshare && sudo bash ~/vidshare/deploy/oracle/setup-vm.sh --domain api.example.com --device /dev/sdb --format`
4. `/etc/vidshare/backend.env` 에 API 키
5. 데이터 이전: 로컬 `pg_dump -Fc` → `scp` → VM `pg_restore --role=vidshare`, 업로드 `scp -r` ([deployment.md 5장](./docs/deployment.md))
6. `sudo bash /opt/vidshare/deploy/oracle/deploy.sh` → `/api/health` 의 `"db":"ok"`
7. 관리자 계정 `npm run create-admin`, 시드 계정 `demo` 정지
8. Front/console 을 `NEXT_PUBLIC_API_URL=https://api.example.com` 으로 재배포, Workers Custom Domain 연결

### 10.5 이후 배포

```bash
sudo bash /opt/vidshare/deploy/oracle/deploy.sh [커밋]
# 백업 → git pull(또는 checkout) → npm ci → build → db:migrate → restart → health
```

---

## 11. 환경 변수

### 11.1 BackendServer

| 변수 | 로컬 | 운영(Oracle) | 설명 |
|------|------|-------------|------|
| `PORT` | `4000` | `4000` | |
| `NODE_ENV` | `development` | `production` | |
| `DATABASE_URL` | `postgres://vidshare:…@localhost:5432/vidshare` | `postgres://vidshare:…@127.0.0.1:5432/vidshare` | **필수** |
| `DATABASE_URL_TEST` | `postgres://vidshare:…@localhost:5432/vidshare_test` | — | `npm test` 전용 |
| `DB_POOL_MAX` | `10` | `10` | 커넥션 풀 크기 |
| `UPLOADS_PATH` | `D:\vidshare-data\uploads` | `/mnt/vidshare-data/uploads` | |
| `CORS_ORIGIN` | 비움(사설망 허용) | `https://app.<도메인>,https://console.<도메인>` ▶ 지금은 두 `*.workers.dev` 주소 | |
| `COOKIE_DOMAIN` | 비움 | `.<도메인>` ▶ 지금은 비움 | |
| `COOKIE_SAMESITE` | `lax` | `lax` ▶ 지금은 `none` (프론트·API 가 다른 사이트) | |
| `TRUST_PROXY` | `0` | `1` | Caddy 또는 Cloudflare Tunnel 한 단계 뒤 |
| `GOOGLE_API_KEY` `GROQ_API_KEY` | 개인 키 | 서버 전용 키 | 챗봇 |
| `CHAT_MODEL_*` `CHAT_TIMEOUT_MS` | 그대로 | 그대로 | |
| `SQLITE_PATH` | (선택) | — | `db:import-sqlite` 원본만. 서버는 더 이상 읽지 않음 |
| `DATABASE_SCHEMA` | — | — | 테스트 헬퍼가 설정. 직접 쓰지 않음 |

견본: `BackendServer/.env.example`, `deploy/oracle/backend.env.example`

### 11.2 FrontServer / console

| 변수 | 운영 값 |
|------|---------|
| `NEXT_PUBLIC_API_URL` | `https://api.<도메인>` (WebSocket 은 프론트가 `wss://` 로 바꿔 씀) |

---

## 12. 전체 폴더 구조 (파일명까지)

범례: **[신규]** 096~098 에서 추가 · **[변경]** 096~098 에서 수정 · **[삭제]** 096~098 에서 제거 · **⏳** 아직 안 함 · 표시 없음 = 그대로.
(`node_modules/`, `.next/`, `.open-next/`, `dist/` 등 생성물과 이미지 자산은 생략)

### 12.1 저장소 `D:\vscode\project\vidshare\`

```
vidshare/
├── .gitattributes                              [신규] *.sh·deploy/oracle LF, *.ps1 CRLF
├── .gitignore                                  [변경] *.tsbuildinfo, *.dump, backend.env, cloudflare/
├── plan.md                                     ← 이 계획서  [변경]
├── README.md                                   [변경] Postgres 실행법·배포·배지
│
├── .github/
│   └── workflows/
│       └── ci.yml                              [신규] backend(Postgres 16 서비스)·front·console
│
├── BackendServer/                              Express :4000  (Oracle VM 에서 실행)
│   ├── .env.example                            [변경] DATABASE_URL(_TEST), DB_POOL_MAX, TRUST_PROXY
│   ├── .gitignore
│   ├── README.md                               [변경]
│   ├── package.json                            [변경] pg, db:migrate/db:import-sqlite/db:doc, better-sqlite3→dev
│   ├── package-lock.json                       [변경]
│   ├── tsconfig.json
│   ├── tsconfig.test.json
│   ├── data/
│   │   ├── .gitkeep                            (db:doc 출력·예전 SQLite 원본 위치로 유지)
│   │   └── README.md                           [변경] Postgres 위치·이관 안내
│   ├── uploads/
│   │   └── README.md                           [변경] UPLOADS_PATH 권장값
│   ├── scripts/
│   │   ├── create-admin.ts                     [변경] async, dotenv
│   │   ├── list-admins.ts                      [신규 104] 관리자 핸들 목록
│   │   ├── reset-password.ts                   [신규 104] 비밀번호 재설정 + 세션 전부 종료 (--generate / --stdin)
│   │   ├── db-migrate.ts                       [신규] 마이그레이션만 적용
│   │   ├── migrate-sqlite-to-pg.ts             [신규] SQLite → Postgres 이관 + 행 수 검증 (importSqlite 함수 export)
│   │   └── dump-db-doc.ts                      [신규] DataBaseColumn.md 덤프
│   ├── src/
│   │   ├── index.ts                            [변경] await initDb → listen, SIGTERM 정리
│   │   ├── app.ts                              [변경] TRUST_PROXY
│   │   ├── auth/
│   │   │   ├── accounts.ts                     [변경] async
│   │   │   ├── adminSession.ts
│   │   │   ├── cookieOptions.ts
│   │   │   ├── requestUser.ts                  [변경] async
│   │   │   ├── requireAdmin.ts                 [변경] async
│   │   │   └── sessions.ts                     [변경] async
│   │   ├── chatbot/
│   │   │   ├── complete.ts · llm.ts · types.ts
│   │   │   ├── locals.ts · shape.ts · vide.ts  [변경] await
│   │   │   ├── platform.ts                     [변경] async
│   │   │   └── store.ts                        [변경] async, ON CONFLICT
│   │   ├── data/
│   │   │   ├── seedData.ts
│   │   │   └── store.ts                        [변경] 전 함수 async, RETURNING, withTx
│   │   ├── db/
│   │   │   ├── client.ts                       [변경] pg Pool + Db 래퍼 + withTx + initDb/closeDb
│   │   │   ├── migrate.ts                      [신규] schema_migrations 러너 (advisory lock)
│   │   │   ├── migrations/
│   │   │   │   ├── index.ts                    [신규] MIGRATIONS 목록
│   │   │   │   ├── 0001_init.ts                [신규] 22개 테이블 + 인덱스 (타입 보존, seq, COLLATE "C")
│   │   │   │   └── 0002_*.ts                   ⏳ 감사 로그 / 타입 정교화 (필요할 때 새 번호로)
│   │   │   ├── schema.ts                       [삭제] → migrations/0001_init.ts
│   │   │   ├── dumpDoc.ts                      [삭제] → scripts/dump-db-doc.ts
│   │   │   └── seed.ts                         [변경] async, withTx
│   │   ├── middleware/
│   │   │   ├── asyncRouter.ts                  [신규] async 핸들러 실패 → next(err)
│   │   │   └── errorHandler.ts
│   │   ├── realtime/
│   │   │   ├── chatBus.ts · notificationBus.ts
│   │   │   └── chatSocket.ts                   [변경] 업그레이드·전송 비동기 처리
│   │   ├── routes/                             [변경] 25개 전부 asyncRouter + await
│   │   │   ├── admin/   auth.ts · content.ts · dashboard.ts · reports.ts · support.ts · users.ts
│   │   │   ├── auth.ts · blocks.ts · chatbot-threads.ts · chatbot.ts · comments.ts · community.ts
│   │   │   ├── conversations.ts · follows.ts · longform.ts · messages.ts · notifications.ts
│   │   │   ├── playlists.ts · reports.ts · search.ts · shorts.ts · support.ts · uploads.ts · users.ts
│   │   │   └── health.ts                       [변경] DB SELECT 1, 실패 시 503
│   │   ├── types/index.ts
│   │   └── upload/files.ts
│   └── tests/
│       ├── helpers.ts                          [변경] 파일마다 임시 스키마, createTestSchemaDb
│       ├── db-migrate.test.ts                  [신규] 멱등성·22개 테이블·handle 대소문자 유니크·? 변환
│       ├── import-sqlite.test.ts               [신규] 행 수·parent_id·seq·시퀀스·--replace
│       └── admin-api · admin-auth · chat-socket · chatbot-errors · comments · cors-cookies
│           · follows · moderation · notifications · playlists · search · smoke  (.test.ts)
│
├── FrontServer/                                Next.js :3000  (Cloudflare Workers) — 096~098 변경 없음
│   ├── .dev.vars · .env.local.example · .gitignore · AGENTS.md · CLAUDE.md · README.md
│   ├── eslint.config.mjs · next.config.ts · open-next.config.ts · playwright.config.ts · postcss.config.mjs
│   ├── package.json · package-lock.json · tsconfig.json
│   ├── wrangler.jsonc                          ⏳ 도메인 확보 후 Custom Domain(app.<도메인>)
│   ├── app/            page.tsx · layout.tsx · globals.css · error.tsx · global-error.tsx · not-found.tsx
│   │                   business/ · privacy/ · terms/ · login/ · register/ · following/ · search/ · upload/
│   │                   chatbot/[id] · community/{write,[id]} · longform/{write,[id]} · messages/[id]
│   │                   notifications/[id] · playlists/[id] · profile/[id]/{followers,following} · support/[id]
│   ├── components/     auth · chatbot · community · follows · layout · legal · longform · messages
│   │                   moderation · notifications · playlists · profile · search · shorts · support · ui · upload
│   ├── context/        AuthContext.tsx · QueryProvider.tsx · ThemeContext.tsx
│   ├── lib/            api.ts · auth.ts · chat-files.ts · chat-socket.ts (https→wss 자동) · chatbot-corpus.ts
│   │                   chatbot-models.ts · content-store.ts · guest-routes.ts · media.ts · mock-data.ts
│   │                   notifications-store.ts · query-keys.ts · utils.ts
│   ├── types/          content.ts · index.ts
│   ├── e2e/            auth · community · guest · messages (.spec.ts) · helpers.ts
│   ├── tests/          guest-routes.test.ts
│   ├── scripts/        capture-portfolio.ts · sync-portfolio.mjs
│   └── public/         _headers · portfolio/ · *.svg
│
├── console/                                    Next.js :3200  (Cloudflare Workers)
│   ├── .dev.vars · .env.local.example · .gitignore · AGENTS.md · CLAUDE.md · README.md
│   ├── eslint.config.mjs · next.config.ts · open-next.config.ts · postcss.config.mjs
│   ├── package.json · package-lock.json · tsconfig.json
│   ├── tsconfig.tsbuildinfo                    [삭제] 추적 해제 (빌드 캐시, *.tsbuildinfo ignore)
│   ├── wrangler.jsonc                          ⏳ Custom Domain(console.<도메인>)
│   ├── app/            page.tsx · layout.tsx · globals.css · content/ · login/ · reports/ · support/ · users/
│   │                   audit/page.tsx  ⏳ 감사 로그 (P7)
│   ├── components/     admin/ (Content·Dashboard·Login·Reports·Support·Users Client.tsx) · layout/ (AdminNav·AdminRouteGuard) · ui/Page.tsx
│   ├── context/        AdminAuthContext.tsx
│   ├── lib/            adminApi.ts · api.ts · format.ts
│   └── types/          index.ts
│
├── deploy/                                     [신규] 배포·운영 스크립트
│   ├── README.md                               [신규] 순서 요약
│   ├── oracle/                                 VM(Ubuntu 24.04)에서 실행
│   │   ├── setup-vm.sh                         [신규] 패키지·볼륨·Postgres 이전·계정·Caddy·systemd·cron·iptables (도메인 경로)
│   │   ├── setup-vm-tunnel.sh                  [신규 103] 현재 운영: Node·Postgres·cloudflared, systemd(백엔드·터널)·cron
│   │   ├── get-tunnel-url.sh                   [신규 103] 현재 터널 주소 (/usr/local/bin/vidshare-tunnel-url)
│   │   ├── setup-shared-nginx.sh               [신규 102] 공유 nginx VM 용 — 103 에서 사용 중단
│   │   ├── nginx-vidshare.conf                 [신규 102] 위 스크립트용 사이트 설정
│   │   ├── deploy.sh                           [신규] 백업 → pull → ci → build → db:migrate → restart → health
│   │   ├── backup.sh                           [신규] pg_dump -Fc, root:adm 640, 14일
│   │   ├── Caddyfile                           [신규] HTTPS + /uploads 직접 서빙 + reverse_proxy
│   │   ├── vidshare-backend.service            [신규] systemd (RequiresMountsFor)
│   │   ├── postgresql.vidshare.conf            [신규] conf.d 드롭인 (localhost, 메모리)
│   │   └── backend.env.example                 [신규] /etc/vidshare/backend.env 견본
│   └── windows/                                내 PC 에서 실행 (PowerShell 5.1, UTF-8 BOM)
│       ├── setup-postgres-d.ps1                [신규] 기존 D:\PostgreSQL\16 에 계정·DB, D:\vidshare-data
│       ├── backup-local.ps1                    [신규] 로컬 pg_dump, -Register
│       ├── backup-pull.ps1                     [신규] 운영 백업·업로드 가져오기, -Register
│       ├── sync-tunnel-url.ps1                 [신규 103] 터널 주소 바뀌면 프론트·콘솔 재배포, -Register(매시간)
│       └── admin-tools.ps1                     [신규 104] 운영 관리자 찾기(-List) · 비밀번호 재설정(-Reset)
│
├── cloudflare/
│   └── config.template.yml                     [삭제] Tunnel → Oracle VM + Caddy
│
├── docs/
│   ├── README.md                               [변경] ops/ 추가
│   ├── deployment.md                           [변경] Oracle + Postgres + D 드라이브 기준으로 재작성
│   ├── architecture/overview.md                [변경]
│   ├── features/roadmap.md                     [변경]
│   ├── security/security-notes.md              [변경] 5-3 Oracle·Postgres 운영
│   ├── ops/                                    [신규]
│   │   ├── oracle-setup.md                     [신규] OCI 콘솔 절차·문제 해결
│   │   ├── postgres-d-drive.md                 [신규] D 드라이브 Postgres
│   │   └── backup-restore.md                   [신규] 백업·복원 연습·장애 복구
│   ├── changelog/CHANGELOG.md                  [변경]
│   └── commits/
│       ├── README.md · TEMPLATE.md
│       ├── 001-initial-create-next-app.md … 094-portfolio-pptx.md
│       ├── 095-plan-v2-oracle-postgres.md
│       ├── 096-postgres-migration.md           [신규]
│       ├── 097-oracle-deploy-scripts-ci.md     [신규]
│       └── 098-docs-postgres-oracle.md         [신규]
│
└── portfolio/
    ├── README.md · build_docx.py · build_pptx.py · serve.py · site/
    └── VidShare-포트폴리오.md · .docx · .pptx   ⏳ 배포 구조 반영해 재생성
```

### 12.2 내 PC

```
D:\PostgreSQL\16\data\           PostgreSQL 클러스터 (기존 설치, vidshare · vidshare_test DB)
D:\vidshare-data\                uploads\ · backups\{local, prod\db, prod\uploads, sqlite-final} · logs\
```

### 12.3 Oracle VM

▶ **현재 운영 (터널 구성, 103)**

```
/var/lib/postgresql/16/main/     PostgreSQL 16 데이터 (부트 디스크)
/mnt/vidshare-data/              부트 디스크 위 폴더 (블록 볼륨 없음)
├── uploads/                     vidshare — 백엔드가 /uploads/* 로 서빙
└── backups/                     cron 03:00 vidshare-YYYYMMDD-HHMM.dump (14일)
/opt/vidshare/                   git clone
/etc/vidshare/backend.env        비밀값 (600)
/etc/systemd/system/vidshare-backend.service · vidshare-tunnel.service
/usr/local/bin/vidshare-backup · vidshare-tunnel-url
```

계획했던 구성 (Caddy + 블록 볼륨, `setup-vm.sh`)

```
/mnt/vidshare-data/              블록 볼륨 (fstab UUID, nofail; 서비스는 RequiresMountsFor)
├── pgdata/                      PostgreSQL 16 (postgres 700)
├── uploads/                     vidshare 755 — Caddy 가 직접 서빙
└── backups/                     root:adm 750 — vidshare-YYYYMMDD-HHMM.dump

/opt/vidshare/                   git clone (vidshare 소유)
/etc/vidshare/backend.env        비밀값 (vidshare 600)
/etc/caddy/Caddyfile
/etc/systemd/system/vidshare-backend.service
/etc/systemd/system/postgresql@.service.d/vidshare-mount.conf
/etc/postgresql/16/main/conf.d/vidshare.conf
/etc/cron.d/vidshare-backup      → /usr/local/bin/vidshare-backup
```

---

## 13. 단계별 실행 계획 (P1~P7)

### 끝난 것 (v1)
- 화면 흐름, Front / Backend / console 분리, REST + 세션, SQLite 영속화, 업로드
- 검색·팔로우·신고·차단·재생목록·대댓글, SSE·WebSocket 실시간
- 테스트(백엔드 137 · 프론트 29 · E2E 8), 관리자 콘솔, 법적 페이지, Front/console Workers
- 포트폴리오 문서·사이트·슬라이드

### P1. 로컬 Postgres 준비 (D 드라이브)
- [x] `deploy/windows/setup-postgres-d.ps1` 작성 — 기존 `D:\PostgreSQL\16\data` 클러스터 재사용 (097)
- [ ] **직접**: 스크립트 실행 (postgres 비밀번호 입력) → `.env` 작성
- [x] `backup-local.ps1` 작성·실행 검증 (임시 클러스터 대상)
- [x] `docs/ops/postgres-d-drive.md` (098)

### P2. 스키마·마이그레이션 기반
- [x] `pg` 설치, `db/client.ts` · `db/migrate.ts`
- [x] `migrations/0001_init.ts` (22개 테이블, 인덱스 포함 — 별도 0002_indexes 는 만들지 않음)
- [x] `tests/db-migrate.test.ts`

### P3. 코드 async 전환
- [x] store · auth · chatbot · 라우트 25개 · chatSocket · index (096)
- [x] `TRUST_PROXY`, health DB 확인
- [x] 백엔드 테스트 Postgres 위에서 148건 통과 (이후 104 까지 151건)
- [ ] `errorHandler` 에 pg 오류 코드(23505 → 409 등) 매핑 — 지금은 라우트가 사전 검사로 막고 있어 보류

### P4. 데이터 이관
- [x] `scripts/migrate-sqlite-to-pg.ts` + `tests/import-sqlite.test.ts`
- [x] 실데이터 사본으로 검증 (151행 일치, 서버 기동·API 확인)
- [ ] **직접**: P1 이후 `npm run db:import-sqlite` 로 D 드라이브 DB 에 실제 이관, `uploads` 를 `D:\vidshare-data\uploads` 로 복사

### P5. SQLite 제거
- [x] `schema.ts` · `dumpDoc.ts` 삭제, `better-sqlite3` → devDependency
- [x] `.env.example` 정리 (`SQLITE_PATH` 는 이관 전용으로만 남김)
- [x] 문서 갱신 (098)

### P6. Oracle Cloud 구축·배포
- [x] `deploy/oracle/*` 7개 파일 (097) — `bash -n` 문법 검사 통과
- [x] `cloudflare/config.template.yml` 삭제, `docs/deployment.md` 재작성, `docs/ops/oracle-setup.md`
- [x] **운영 배포 (2026-10-02, 103)** — 전용 VM `161.33.186.255`(ARM 11GB)에 `setup-vm-tunnel.sh` 로 설치, Cloudflare Tunnel 로 공개(80·443 막혀도 동작). 데이터 복원, 프론트·콘솔 재배포, 브라우저로 로그인·SSE·WebSocket 확인
- [x] 102 에서 human-bug-tier VM 에 함께 올린 것 제거 (103)
- [x] 터널 주소 변경 시 프론트·콘솔 자동 재배포 (`sync-tunnel-url.ps1`, 매시간)
- [ ] 도메인 + Cloudflare named tunnel(또는 80·443 개방 + Caddy), Workers Custom Domain — 현재 `*.trycloudflare.com` 임시 주소

### P7. 운영 안정화
- [x] `backup.sh` + cron (setup-vm.sh 가 등록), `backup-pull.ps1`
- [x] 복원 연습 1회 (로컬: 덤프 → 빈 DB 복원 → 행 수 일치)
- [x] `.github/workflows/ci.yml` (097)
- [x] 운영 백업으로 복원 (103 — 운영 덤프를 새 전용 VM 에 `pg_restore --clean`, 행 수 확인)
- [x] 관리자 계정 찾기 · 비밀번호 재설정 (104) — `list-admins` · `reset-password` · `admin-tools.ps1`, 운영에서 검증
- [ ] 관리자 조치 감사 로그 (`0002_audit_log` + `console/app/audit`)
- [ ] 사업자등록 후 `/business` 실정보
- [x] `portfolio/` 배포 구조 반영해 재생성 (100, 105) · Notion 동기화
- [ ] 블록 볼륨으로 DB·업로드 이전 — 지금은 한 디스크라 D 드라이브 사본이 유일한 외부 백업

### 그다음 (이번 범위 밖)
- DB 타입 정교화 (`timestamptz`, `boolean`)
- 업로드 → Oracle Object Storage / R2, 트랜스코딩
- 검색 `pg_trgm`·관련도·페이지네이션
- 다중 인스턴스(Redis), 모니터링

---

## 14. 위험 요소와 대응

| 위험 | 가능성 | 영향 | 대응 |
|------|--------|------|------|
| `store.ts` async 전환 중 `await` 누락 → 조용한 버그 | 높음 | 높음 | `tsc` + 미-await 호출 전수 검사 스크립트 + 151건 테스트 (096 에서 `{ ...promise }` 2곳 발견·수정) |
| SQLite 의 느슨한 타입 때문에 이관 시 변환 실패 (날짜·불리언) | 중 | 중 | 이관 스크립트에서 변환 함수 분리, 행 수·샘플 값 검증, 원본 보관 |
| 시퀀스 미보정으로 신규 INSERT 시 PK 충돌 | 중 | 높음 | 이관 끝에 `setval` 을 항상 실행하고 테스트로 검증 |
| Oracle ARM 인스턴스 “Out of capacity” | 중 | 중 | 시간대 바꿔 재시도, 리전 변경, 안 되면 AMD Micro 로 시작 후 이전 |
| Always Free 유휴 인스턴스 회수 정책 | 낮음~중 | 높음 | 헬스체크로 주기 호출, 최신 정책 확인, 백업을 D 드라이브에 이중 보관 |
| Ubuntu `iptables` 로 80·443 이 막혀 접속 불가 | 높음 (흔함) | 낮음 | `setup-vm.sh` 에서 규칙 추가·저장, 체크리스트에 명시 |
| ▶ OCI 보안 목록이 80·443 을 막고 있음 (103 에서 실제 발생) | — | 높음 | 아웃바운드 Cloudflare Tunnel 로 우회 (`setup-vm-tunnel.sh`) |
| ▶ 터널 주소가 바뀌어 프론트가 옛 API 를 봄 | 중 | 중 | `sync-tunnel-url.ps1` 매시간 자동 재배포. 근본 해결은 도메인 + named tunnel |
| ▶ `SameSite=None` 쿠키 — Safari 로그인 불가 · CSRF 표면 증가 | 중 | 중 | CORS 화이트리스트 2개 오리진. 근본 해결은 같은 등록 도메인 + `Lax` |
| ▶ 블록 볼륨 없음 — 디스크 장애 시 서버 쪽 백업도 함께 소실 | 낮음 | 높음 | 매일 D 드라이브로 사본. 블록 볼륨 추가 검토 |
| ▶ 관리자 비밀번호 분실 | 중 | 중 | 해시라 복구 불가 → `reset-password` 재설정 (104) |
| 크로스 도메인 쿠키 미전송 | 중 | 높음 | 같은 등록 도메인 + `COOKIE_DOMAIN`, `cors-cookies.test.ts` 로 회귀 방지 ▶ 지금은 `SameSite=None` 으로 대응 |
| 블록 볼륨 미마운트 상태로 Postgres 시작 → 빈 DB 생성 | 낮음 | 높음 | fstab `nofail` + systemd `RequiresMountsFor=/mnt/vidshare-data` 를 Postgres·백엔드 유닛에 지정 (097 반영) |
| 디스크 가득 참 (업로드 100MB 상한 × 다수) | 중 | 중 | 볼륨 사용량 80% 알림, 업로드 총량 점검 스크립트, 오브젝트 스토리지 이전 계획 |
| 백업이 있어도 복원 불가 | 중 | 높음 | P7 복원 연습을 완료 기준에 포함 |
| 비밀값 유출 (`.env`, DB 비밀번호) | 낮음 | 높음 | `.gitignore`, 서버 `600` 권한, 키 분리, 공개 전 `git log` 점검 |
| WebSocket·SSE 가 프록시에서 끊김 | 중 | 중 | Caddy `flush_interval -1`, 하트비트, 배포 후 장시간 연결 테스트 |
| 단일 서버 장애 = 서비스 중단 | 높음 | 중 | 개인 프로젝트 범위에서 수용. 복구 절차를 문서화 (`oracle-setup.md`) |

---

## 15. 소규모 개인 프로젝트로서의 범위

**한다**
- 회원가입/로그인, 영상 올리기, 커뮤니티 공유, 보기, 댓글·알림
- 프론트와 백엔드를 나눠 혼자 유지하기 쉽게
- **Oracle VM 1대 + Postgres + 야간 백업**으로 “켜 두면 계속 돌아가는” 운영

**지금은 안 한다**
- 추천 알고리즘, 실시간 대규모 채팅, CDN, 결제
- 구글 로그인, 이메일 인증
- 다중 서버·무중단 배포·DB 복제(replica)·쿠버네티스

한 줄:
“영상만 올리는 사이트가 아니라, **올린 영상을 커뮤니티에서 같이 보고 이야기할 수 있게** 만든 소규모 개인 프로젝트입니다.”

---

## 16. 완료 기준

v2 는 아래가 **모두** 참일 때 끝난 것으로 본다. ▶ 2026-10-02 기준 상태를 각 줄 끝에 적었다.

1. `https://app.example.com` 에서 가입 → 로그인 → 영상 업로드 → 커뮤니티 공유 → 댓글·알림(SSE)·메시지(WebSocket)가 동작한다. ▶ **`workers.dev` 주소에서 충족**(Chrome·Edge), 도메인은 미정
2. `https://console.example.com` 에서 관리자 로그인과 신고·정지·삭제·문의 답변이 동작한다. ▶ **`workers.dev` 주소에서 충족**
3. 백엔드는 Oracle VM 에서 `systemd` 로 상시 실행되고, 재부팅 후 자동으로 올라온다. ▶ **충족**
4. 운영 DB 는 PostgreSQL 이고 데이터 디렉터리가 블록 볼륨(`/mnt/vidshare-data/pgdata`)에 있다. ▶ **부분** — PostgreSQL 은 맞고, 위치는 부트 디스크
5. 로컬 개발 DB 는 PostgreSQL 이고 데이터 디렉터리가 D 드라이브(`D:\PostgreSQL\16\data`)다. ▶ **미완** — 클러스터는 D 드라이브에 있으나 `setup-postgres-d.ps1` 실행·`.env` 작성 전
6. 코드에 SQLite 의존성(`better-sqlite3`)이 없다. ▶ **충족** — 이관 스크립트용 devDependency 로만 남음
7. 백엔드 테스트 148건, 프론트 29건, E2E 8건이 통과한다 (백엔드는 Postgres 위에서, CI 포함). ▶ **충족** — 현재 151 · 32 · 8
8. 운영 백업이 매일 `D:\vidshare-data\backups\prod\` 에 쌓이고, **복원 연습을 1회 이상 성공**했다. ▶ **충족** — 04:30 작업 등록, 103 에서 운영 덤프로 복원
9. 5432 가 외부에서 접근되지 않고(포트 스캔 확인), SSH 는 키 인증·내 IP 만 허용한다. ▶ **부분** — 인바운드는 22 만 열림. SSH 를 내 IP 로 좁히는 것은 OCI 콘솔 작업으로 남음
10. `docs/deployment.md`, `docs/architecture/overview.md`, `docs/ops/*` 가 새 구조를 설명한다. ▶ **충족** (106)
