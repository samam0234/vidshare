# VidShare 계획서

**최초 작성**: 2026-08-19
**고도화 개정**: 2026-10-02 (v2 — Oracle Cloud 배포 · PostgreSQL 전환 · 전체 폴더 구조)
**성격**: 소규모 개인 프로젝트

**현재 상태 (개정 시점)**: Front + console + Express/SQLite 연동 완료. 법적 페이지(`/terms` `/privacy` `/business`) 있음. Front/console 은 Cloudflare Workers, 백엔드는 로컬 PC + Tunnel 계획 단계.

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
| DB 저장 위치 | `BackendServer/data/` | **D 드라이브 `D:\vidshare-data\`** (로컬), VM 은 별도 블록 볼륨 | 코드 폴더와 데이터를 분리, 디스크 교체·백업 쉬움 (9장) |
| 업로드 | `BackendServer/uploads/` | **데이터 폴더의 `uploads/`** (`UPLOADS_PATH`) | DB와 같은 위치에서 같이 백업 |
| 인증 | bcrypt + HttpOnly 세션 쿠키 | **유지** (`COOKIE_DOMAIN` 공유 도메인) | JWT보다 단순 |
| 마이그레이션 | `initDb()` 안 `ensureColumn` | **버전 있는 SQL 파일 + `schema_migrations` 테이블** | 운영 DB 변경을 추적 |
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
        │  BackendServer :4000 (Node 20, systemd)        │
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

### 7.2 왜 Tunnel 을 버리는가

Oracle VM 은 공인 IP 가 있으므로 Cloudflare Tunnel 이 필요 없다. Caddy 가 직접 443 을 받는다. `cloudflare/config.template.yml` 은 P6 에서 제거한다.

---

## 8. PostgreSQL 전환 계획

### 8.1 현재 코드에서 건드릴 범위 (실측)

| 항목 | 현재 | 영향 |
|------|------|------|
| 드라이버 | `better-sqlite3` — **동기** API | `pg` 는 **비동기** → 호출부 전부 `await` |
| `getDb()` 사용 파일 | 6개: `auth/accounts.ts`, `auth/sessions.ts`, `chatbot/platform.ts`, `chatbot/store.ts`, `data/store.ts`, `db/client.ts` | 전부 수정 |
| `data/store.ts` | 1,621줄, `getDb()` 호출 86곳 | 가장 큰 작업. 함수 시그니처가 `Promise` 로 바뀌고 라우트까지 연쇄 |
| 스키마 | `db/schema.ts` 22개 테이블 | SQL 방언 변환 후 `migrations/0001_init.sql` |
| 마이그레이션 | `ensureColumn`, `DROP TABLE` | `schema_migrations` 기반으로 교체 |
| PRAGMA | `journal_mode=WAL`, `foreign_keys=ON` | 제거 (Postgres 는 기본 FK 강제, WAL 기본) |
| `db/dumpDoc.ts` | 쓰기 가로채기로 DB 문서 덤프 | Postgres 에서는 훅이 불가 → `npm run db:doc` 스크립트로 전환 |
| 테스트 | 임시 SQLite 파일 | 전용 테스트 DB(`vidshare_test`) + 테스트마다 `TRUNCATE` |

### 8.2 SQLite → PostgreSQL 변환 규칙

| SQLite | PostgreSQL |
|--------|------------|
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY` (연번 ID 는 기존 값 그대로 이관 후 `setval`) |
| 날짜 `TEXT` (ISO 문자열) | `TIMESTAMPTZ` |
| 불리언 `INTEGER` 0/1 | `BOOLEAN` |
| `?` 플레이스홀더 | `$1, $2, …` |
| `INSERT OR IGNORE` | `INSERT … ON CONFLICT DO NOTHING` |
| `INSERT OR REPLACE` | `INSERT … ON CONFLICT (…) DO UPDATE SET …` |
| `lastInsertRowid` | `INSERT … RETURNING id` |
| `LIKE` (대소문자 무시) | `ILIKE` |
| `db.transaction(fn)` | `BEGIN` / `COMMIT` 래퍼 `withTx(client => …)` |
| `PRAGMA table_info` | `information_schema.columns` (더 이상 필요 없음 — 마이그레이션 파일로 대체) |

> 변환 후 `ILIKE '%…%'` 검색(통합 검색)은 데이터가 늘면 느려진다. 이번 범위에서는 그대로 두고, 필요하면 `pg_trgm` 인덱스를 다음 단계로 둔다.

### 8.3 DB 접속 구성

- 패키지: `pg`, `@types/pg` 추가. (`better-sqlite3`, `@types/better-sqlite3` 는 데이터 이관이 끝난 뒤 제거)
- `src/db/pool.ts`: `new Pool({ connectionString: DATABASE_URL, max: DB_POOL_MAX })`, `query()`, `withTx()` 노출.
- `src/db/migrate.ts`: `migrations/*.sql` 을 파일명 순으로 읽어, `schema_migrations(version, applied_at)` 에 없는 것만 트랜잭션으로 실행.
- 서버 시작 순서: `loadEnv → migrate() → seedIfEmpty() → listen`.
- DB 계정은 **앱 전용 `vidshare`** (슈퍼유저 `postgres` 는 앱에서 사용 금지). DB 이름 `vidshare`, 테스트용 `vidshare_test`.

### 8.4 데이터 이관 (SQLite → Postgres)

기존 `vidshare.sqlite` 의 계정·세션·쇼츠·댓글·알림·메시지를 버리지 않는다.

1. 서버 중지 → `vidshare.sqlite` 를 `D:\vidshare-data\backups\sqlite-final\` 에 복사 (되돌리기용 원본).
2. `npm run db:migrate` 로 빈 Postgres 에 스키마 생성.
3. `npm run db:import-sqlite -- --from <경로>` 실행 (`scripts/migrate-sqlite-to-pg.ts`).
   - 테이블을 **FK 의존 순서**(users → sessions → shorts → comments → …)로 읽어 `INSERT`.
   - 날짜 문자열 → `timestamptz`, 0/1 → boolean 변환.
   - 끝나면 IDENTITY 시퀀스를 `setval(pg_get_serial_sequence(…), MAX(id))` 로 맞춤.
4. 검증: 테이블별 행 수 비교(SQLite `COUNT(*)` ↔ Postgres `COUNT(*)`) 를 스크립트가 표로 출력, 불일치 시 비정상 종료.
5. `npm test` (백엔드 127건) 가 Postgres 위에서 통과해야 전환 완료.

### 8.5 코드 전환 순서 (회귀를 막기 위한 작은 단계)

1. `pool.ts` · `migrate.ts` · `0001_init.sql` 추가 (SQLite 와 **공존**, 아직 연결 안 함)
2. 가장 작은 모듈부터 async 전환: `auth/sessions.ts` → `auth/accounts.ts`
3. `chatbot/store.ts`, `chatbot/platform.ts`
4. `data/store.ts` 를 도메인별로 쪼개며 전환 (쇼츠 → 롱폼 → 커뮤니티 → 댓글 → 메시지 → 알림 → 팔로우·차단·신고 → 재생목록 → 고객센터)
5. 라우트·미들웨어의 `await` 누락 점검 (`tsc --noEmit` 이 잡아 준다)
6. 테스트 헬퍼를 Postgres 로 교체, 전체 통과 확인
7. SQLite 코드(`db/client.ts` 의 sqlite 부분, `schema.ts`, `dumpDoc.ts`) 제거

---

## 9. D 드라이브 저장 계획

### 9.1 먼저 짚어 둘 점 — “D 드라이브”와 “Oracle Cloud”는 서로 다른 컴퓨터다

Oracle Cloud VM 은 원격 서버라 **내 PC 의 D 드라이브를 직접 쓸 수 없다.** 그래서 두 환경으로 나눈다.

| 환경 | DB 가 사는 곳 | 파일(영상)이 사는 곳 | 용도 |
|------|---------------|---------------------|------|
| **로컬 (내 PC)** | **`D:\vidshare-data\pgdata`** | **`D:\vidshare-data\uploads`** | 개발·테스트·이관 연습 |
| **운영 (Oracle VM)** | VM 의 **별도 블록 볼륨** `/mnt/vidshare-data/pgdata` | `/mnt/vidshare-data/uploads` | 실서비스 |
| **운영 → D 드라이브 사본** | — | — | 야간 `pg_dump` + 업로드를 내 PC `D:\vidshare-data\backups\prod\` 로 당겨 저장 |

즉 “D 드라이브에 저장”은 **로컬 DB 와 운영 백업 사본**에 해당하고, 운영 DB 자체는 VM 디스크에 둔다(블록 볼륨은 VM 을 재생성해도 남는 D 드라이브 역할).

**검토 후 채택하지 않은 안 — 운영 백엔드가 내 PC 의 D 드라이브 Postgres 에 직접 접속**

| 문제 | 설명 |
|------|------|
| PC 상시 가동 | PC 가 꺼지거나 절전이면 서비스 전체가 멈춘다 (Oracle 로 옮기는 이유가 사라짐) |
| 포트 노출 | 집 공유기 포트포워딩 또는 VPN(Tailscale 등)이 필요하고, 5432 를 인터넷에 열면 위험 |
| 지연 | 매 쿼리가 집↔Oracle 구간을 왕복해 응답이 느려짐 |

### 9.2 D 드라이브 폴더 구조

```
D:\vidshare-data\
├── pgdata\                      PostgreSQL 데이터 디렉터리 (initdb 로 생성)
├── uploads\                     영상·썸네일  (UPLOADS_PATH)
├── backups\
│   ├── local\                   로컬 DB 의 pg_dump  (vidshare-YYYYMMDD-HHmm.dump)
│   ├── prod\                    Oracle VM 에서 당겨온 야간 백업 + uploads 사본
│   └── sqlite-final\            전환 직전 vidshare.sqlite 원본 (1회, 되돌리기용)
└── logs\
    └── postgresql\              Postgres 로그
```

> 이 경로는 저장소 **밖** 이다. 코드(`D:\vscode\project\vidshare`)와 데이터를 섞지 않아 `git` 에도 안 잡힌다.

### 9.3 로컬 PostgreSQL 설치 절차 (Windows, 최초 1회)

`deploy/windows/setup-postgres-d.ps1` 로 자동화한다. 수동 절차는 다음과 같다.

1. PostgreSQL **16** 설치 (바이너리는 기본 `C:\Program Files\PostgreSQL\16` 에 두고, 데이터만 D 로).
2. 설치 마법사의 데이터 디렉터리를 `D:\vidshare-data\pgdata` 로 지정. (이미 기본 위치에 만들었다면 `initdb` 로 새로 만들고 서비스 재등록)
   ```powershell
   & "C:\Program Files\PostgreSQL\16\bin\initdb.exe" -D "D:\vidshare-data\pgdata" -U postgres -E UTF8 -A scram-sha-256 --pwprompt
   & "C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" register -N postgresql-vidshare -D "D:\vidshare-data\pgdata"
   Start-Service postgresql-vidshare
   ```
3. `postgresql.conf`: `listen_addresses = 'localhost'`, `port = 5432`, `log_directory = 'D:/vidshare-data/logs/postgresql'`.
4. 앱 전용 계정·DB 생성:
   ```sql
   CREATE ROLE vidshare LOGIN PASSWORD '<강한 비밀번호>';
   CREATE DATABASE vidshare      OWNER vidshare ENCODING 'UTF8';
   CREATE DATABASE vidshare_test OWNER vidshare ENCODING 'UTF8';
   ```
5. `BackendServer/.env`:
   ```
   DATABASE_URL=postgres://vidshare:<비밀번호>@localhost:5432/vidshare
   UPLOADS_PATH=D:\vidshare-data\uploads
   ```
6. 확인: `psql -U vidshare -d vidshare -c "SHOW data_directory;"` → `D:/vidshare-data/pgdata`

### 9.4 백업 정책

| 대상 | 방법 | 주기 | 보관 |
|------|------|------|------|
| 로컬 DB | `deploy/windows/backup-local.ps1` — `pg_dump -Fc` → `D:\vidshare-data\backups\local\` | 작업 스케줄러 매일 | 14일 |
| 운영 DB | VM 의 `deploy/oracle/backup.sh` — `pg_dump -Fc` → `/mnt/vidshare-data/backups/` | cron 매일 03:00 | 14일 |
| 운영 → D 사본 | `deploy/windows/backup-pull.ps1` — `scp`/`rsync` 로 `backups/` 와 `uploads/` 를 `D:\vidshare-data\backups\prod\` 로 | 작업 스케줄러 매일 | 30일 |
| 복원 연습 | `pg_restore -d vidshare_restore <dump>` 로 빈 DB 에 복원 후 행 수 확인 | 분기 1회 | — |

> 복원해 본 적 없는 백업은 백업이 아니다. 복원 연습을 P7 완료 기준에 넣는다.

---

## 10. Oracle Cloud 배포 계획

### 10.1 리소스

| 항목 | 선택 | 비고 |
|------|------|------|
| 리전 | 서울(`ap-seoul-1`) 또는 춘천 | 한국 사용자 지연 최소 |
| VM | Always Free **Ampere A1 (ARM)** 1~2 OCPU / 6~12GB | 재고 부족(“Out of capacity”) 시 AMD `VM.Standard.E2.1.Micro` 로 대체 (RAM 1GB 라 Postgres+Node 에 빡빡함) |
| OS | Ubuntu 24.04 LTS (ARM64) | |
| 부트 볼륨 | 50GB | OS·코드 |
| **블록 볼륨** | **100GB** (Always Free 총 200GB 한도 내) | `/mnt/vidshare-data` 로 마운트 — DB·uploads·backups |
| 네트워크 | 공인 IP 예약(Reserved Public IP) | VM 재시작해도 IP 고정 |
| 한도 확인 | 콘솔에서 현재 Always Free 한도·유휴 회수 정책 확인 | 정책이 바뀔 수 있어 구축 전 재확인 |

> ARM 이므로 `bcrypt` 등 네이티브 모듈은 arm64 prebuilt 로 설치되는지 `npm ci` 로 확인한다. (`better-sqlite3` 는 전환 후 제거되므로 문제 없음)

### 10.2 네트워크·보안

| 계층 | 규칙 |
|------|------|
| OCI 보안 목록(Security List) | Ingress: **TCP 80, 443** 전체 허용 / **TCP 22 는 내 IP 만** / 그 외 전부 차단 |
| VM 방화벽 | Oracle 의 Ubuntu 이미지는 기본 `iptables` 규칙이 80·443 을 막고 있다 → `iptables`/`netfilter-persistent` 로 80·443 허용 후 저장 |
| PostgreSQL | `listen_addresses = 'localhost'`. **5432 는 외부에 열지 않는다** |
| SSH | 키 인증만, 비밀번호 로그인 끔, 루트 로그인 끔 |
| 계정 | 앱 실행 전용 `vidshare` 사용자 (sudo 없음) |
| 비밀값 | `/etc/vidshare/backend.env` (권한 600, 소유 `vidshare`). 저장소 커밋 금지 |

### 10.3 서버 구성

| 구성요소 | 설정 |
|----------|------|
| Caddy | `/etc/caddy/Caddyfile` — `api.example.com` 자동 HTTPS, `/uploads/*` 를 `/mnt/vidshare-data/uploads` 에서 서빙, 나머지 `reverse_proxy 127.0.0.1:4000` (`flush_interval -1` 로 SSE 버퍼링 방지, WebSocket 은 자동 업그레이드) |
| BackendServer | systemd 서비스 `vidshare-backend.service` — `ExecStart=/usr/bin/node dist/index.js`, `EnvironmentFile=/etc/vidshare/backend.env`, `Restart=always`, **인스턴스 1개** |
| PostgreSQL | PGDG apt 저장소의 16, `data_directory=/mnt/vidshare-data/pgdata` |
| 시간대·로케일 | `Asia/Seoul`, `ko_KR.UTF-8` |
| 로그 | `journalctl -u vidshare-backend`, Caddy 는 `/var/log/caddy/` |

### 10.4 배포 절차 (최초)

1. OCI 에서 VM·블록 볼륨·예약 IP 생성, 보안 목록 설정.
2. `deploy/oracle/setup-vm.sh` 실행: 패키지 설치(Node 20, Postgres 16, Caddy), 블록 볼륨 포맷·`/etc/fstab` 마운트, 사용자·폴더 생성, 방화벽 설정.
3. Postgres 에 `vidshare` 계정·DB 생성 (`data_directory` 가 블록 볼륨인지 확인).
4. DNS: `api.example.com` A 레코드 → 예약 IP. (Cloudflare 사용 시 **DNS only**)
5. `/etc/vidshare/backend.env` 작성 (11장).
6. 코드 배치: `git clone` → `deploy/oracle/deploy.sh`.
7. 데이터 이관: 로컬 `pg_dump` → `scp` → VM 에서 `pg_restore`. (또는 8.4 의 SQLite 가져오기를 VM 에서 실행) `uploads/` 는 `rsync`.
8. Caddy 시작 → 인증서 자동 발급 확인 → `curl https://api.example.com/api/health`.
9. FrontServer·console 을 새 도메인으로 재배포 (`NEXT_PUBLIC_API_URL=https://api.example.com`).
10. 브라우저에서 가입 → 로그인 → 업로드 → 알림(SSE) → 메시지(WebSocket) 확인.

### 10.5 이후 배포 (반복)

`deploy/oracle/deploy.sh` 한 번이면 된다.

```
git pull --ff-only
npm ci
npm run build          # tsc → dist/
npm run db:migrate     # 새 마이그레이션만 적용
sudo systemctl restart vidshare-backend
curl -fsS https://api.example.com/api/health
```

실패 시: `git checkout <이전 커밋>` → `deploy.sh` 재실행. DB 마이그레이션은 **되돌리기 어렵기 때문에** 배포 전 `backup.sh` 를 먼저 실행한다.

---

## 11. 환경 변수

### 11.1 BackendServer

| 변수 | 로컬 | 운영(Oracle) | 설명 |
|------|------|-------------|------|
| `PORT` | `4000` | `4000` | |
| `NODE_ENV` | `development` | `production` | |
| `DATABASE_URL` | `postgres://vidshare:…@localhost:5432/vidshare` | `postgres://vidshare:…@127.0.0.1:5432/vidshare` | **신규** (`SQLITE_PATH` 대체) |
| `DATABASE_URL_TEST` | `postgres://vidshare:…@localhost:5432/vidshare_test` | — | **신규** 테스트 전용 |
| `DB_POOL_MAX` | `10` | `10` | **신규** 커넥션 풀 크기 |
| `UPLOADS_PATH` | `D:\vidshare-data\uploads` | `/mnt/vidshare-data/uploads` | 기존 변수, 값만 변경 |
| `CORS_ORIGIN` | 비움(사설망 허용) | `https://app.example.com,https://console.example.com` | |
| `COOKIE_DOMAIN` | 비움 | `.example.com` | |
| `COOKIE_SAMESITE` | `lax` | `lax` | |
| `TRUST_PROXY` | `0` | `1` | **신규** Caddy 뒤에서 `Secure` 쿠키·실제 IP 인식 |
| `GOOGLE_API_KEY` `GROQ_API_KEY` | 개인 키 | 서버 전용 키 | 챗봇 |
| `CHAT_MODEL_*` `CHAT_TIMEOUT_MS` | 그대로 | 그대로 | |

`SQLITE_PATH` 는 P5 에서 제거한다.

### 11.2 FrontServer / console

| 변수 | 운영 값 |
|------|---------|
| `NEXT_PUBLIC_API_URL` | `https://api.example.com` |
| (console) `NEXT_PUBLIC_API_URL` | `https://api.example.com` |

---

## 12. 전체 폴더 구조 (파일명까지)

범례: **[신규]** 새로 만들 파일 · **[변경]** 내용이 바뀌는 파일 · **[삭제]** 제거 예정 · 표시 없음 = 그대로.
(`node_modules/`, `.next/`, `.open-next/`, `dist/` 등 생성물과 이미지 자산은 생략)

### 12.1 저장소 `D:\vscode\project\vidshare\`

```
vidshare/
├── .gitignore                                  [변경] D 경로·deploy 비밀 파일 무시 추가
├── plan.md                                     ← 이 계획서  [변경]
├── README.md                                   [변경] Postgres 실행법·D 드라이브 안내
│
├── BackendServer/                              Express :4000  (Oracle VM 에서 실행)
│   ├── .env.example                            [변경] DATABASE_URL 등 11장 반영
│   ├── .gitignore
│   ├── README.md                               [변경]
│   ├── package.json                            [변경] pg 추가, db:* 스크립트 추가
│   ├── package-lock.json                       [변경]
│   ├── tsconfig.json
│   ├── tsconfig.test.json
│   ├── data/
│   │   ├── .gitkeep                            [삭제] SQLite 파일 위치였음 (P5)
│   │   └── README.md                           [삭제 또는 변경] D 드라이브 안내로 대체
│   ├── uploads/
│   │   └── README.md                           [변경] 실제 경로는 UPLOADS_PATH 임을 명시
│   ├── scripts/
│   │   ├── create-admin.ts                     [변경] async DB
│   │   ├── migrate-sqlite-to-pg.ts             [신규] SQLite → Postgres 1회 이관 + 행 수 검증
│   │   └── dump-db-doc.ts                      [신규] DB 구조 문서 생성 (dumpDoc.ts 대체)
│   ├── src/
│   │   ├── index.ts                            [변경] migrate → seed → listen, trust proxy
│   │   ├── app.ts                              [변경] trust proxy 설정
│   │   ├── auth/
│   │   │   ├── accounts.ts                     [변경] async
│   │   │   ├── adminSession.ts
│   │   │   ├── cookieOptions.ts
│   │   │   ├── requestUser.ts                  [변경] async
│   │   │   ├── requireAdmin.ts                 [변경] async
│   │   │   └── sessions.ts                     [변경] async
│   │   ├── chatbot/
│   │   │   ├── complete.ts
│   │   │   ├── llm.ts
│   │   │   ├── locals.ts
│   │   │   ├── platform.ts                     [변경] async
│   │   │   ├── shape.ts
│   │   │   ├── store.ts                        [변경] async
│   │   │   ├── types.ts
│   │   │   └── vide.ts
│   │   ├── data/
│   │   │   ├── seedData.ts
│   │   │   └── store.ts                        [변경] 1,621줄 async 전환 (필요 시 도메인별 분리)
│   │   ├── db/
│   │   │   ├── client.ts                       [변경] Pool 래퍼로 교체 (getDb → query/withTx)
│   │   │   ├── pool.ts                         [신규] pg Pool, query(), withTx()
│   │   │   ├── migrate.ts                      [신규] schema_migrations 기반 마이그레이션 러너
│   │   │   ├── migrations/
│   │   │   │   ├── 0001_init.sql               [신규] 22개 테이블 (schema.ts 변환)
│   │   │   │   ├── 0002_indexes.sql            [신규] 검색·조회용 인덱스
│   │   │   │   └── 0003_audit_log.sql          [신규] 관리자 조치 감사 로그 (P7)
│   │   │   ├── schema.ts                       [삭제] 0001_init.sql 로 대체 (P5)
│   │   │   ├── dumpDoc.ts                      [삭제] scripts/dump-db-doc.ts 로 대체 (P5)
│   │   │   └── seed.ts                         [변경] async
│   │   ├── middleware/
│   │   │   └── errorHandler.ts                 [변경] pg 오류 코드(23505 등) 매핑
│   │   ├── realtime/
│   │   │   ├── chatBus.ts
│   │   │   ├── chatSocket.ts                   [변경] async DB 호출
│   │   │   └── notificationBus.ts
│   │   ├── routes/
│   │   │   ├── admin/
│   │   │   │   ├── auth.ts                     [변경] async
│   │   │   │   ├── content.ts                  [변경] async
│   │   │   │   ├── dashboard.ts                [변경] async
│   │   │   │   ├── reports.ts                  [변경] async
│   │   │   │   ├── support.ts                  [변경] async
│   │   │   │   └── users.ts                    [변경] async
│   │   │   ├── auth.ts                         [변경] async
│   │   │   ├── blocks.ts                       [변경] async
│   │   │   ├── chatbot-threads.ts              [변경] async
│   │   │   ├── chatbot.ts                      [변경] async
│   │   │   ├── comments.ts                     [변경] async
│   │   │   ├── community.ts                    [변경] async
│   │   │   ├── conversations.ts                [변경] async
│   │   │   ├── follows.ts                      [변경] async
│   │   │   ├── health.ts                       [변경] DB 연결 확인(SELECT 1) 포함
│   │   │   ├── longform.ts                     [변경] async
│   │   │   ├── messages.ts                     [변경] async
│   │   │   ├── notifications.ts                [변경] async
│   │   │   ├── playlists.ts                    [변경] async
│   │   │   ├── reports.ts                      [변경] async
│   │   │   ├── search.ts                       [변경] ILIKE
│   │   │   ├── shorts.ts                       [변경] async
│   │   │   ├── support.ts                      [변경] async
│   │   │   ├── uploads.ts
│   │   │   └── users.ts                        [변경] async
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── upload/
│   │       └── files.ts
│   └── tests/
│       ├── helpers.ts                          [변경] Postgres 테스트 DB + TRUNCATE
│       ├── admin-api.test.ts
│       ├── admin-auth.test.ts
│       ├── chat-socket.test.ts
│       ├── chatbot-errors.test.ts
│       ├── comments.test.ts
│       ├── cors-cookies.test.ts
│       ├── db-migrate.test.ts                  [신규] 마이그레이션 멱등성·순서
│       ├── follows.test.ts
│       ├── import-sqlite.test.ts               [신규] 이관 스크립트(소형 샘플)
│       ├── moderation.test.ts
│       ├── notifications.test.ts
│       ├── playlists.test.ts
│       ├── search.test.ts
│       └── smoke.test.ts
│
├── FrontServer/                                Next.js :3000  (Cloudflare Workers)
│   ├── .dev.vars
│   ├── .env.local.example                      [변경] API URL 예시 갱신
│   ├── .gitignore
│   ├── AGENTS.md
│   ├── CLAUDE.md
│   ├── README.md
│   ├── eslint.config.mjs
│   ├── next.config.ts                          [변경] 이미지·미디어 허용 호스트에 api 도메인
│   ├── open-next.config.ts
│   ├── package.json
│   ├── package-lock.json
│   ├── playwright.config.ts
│   ├── postcss.config.mjs
│   ├── tsconfig.json
│   ├── wrangler.jsonc                          [변경] Custom Domain(app.example.com)
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx                            쇼츠 피드 `/`
│   │   ├── error.tsx
│   │   ├── global-error.tsx
│   │   ├── not-found.tsx
│   │   ├── business/page.tsx
│   │   ├── privacy/page.tsx
│   │   ├── terms/page.tsx
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── following/page.tsx
│   │   ├── search/page.tsx
│   │   ├── upload/page.tsx
│   │   ├── chatbot/page.tsx
│   │   ├── chatbot/[id]/page.tsx
│   │   ├── community/page.tsx
│   │   ├── community/write/page.tsx
│   │   ├── community/[id]/page.tsx
│   │   ├── longform/page.tsx
│   │   ├── longform/write/page.tsx
│   │   ├── longform/[id]/page.tsx
│   │   ├── messages/page.tsx
│   │   ├── messages/[id]/page.tsx
│   │   ├── notifications/page.tsx
│   │   ├── notifications/[id]/page.tsx
│   │   ├── playlists/[id]/page.tsx
│   │   ├── profile/[id]/page.tsx
│   │   ├── profile/[id]/followers/page.tsx
│   │   ├── profile/[id]/following/page.tsx
│   │   ├── support/page.tsx
│   │   └── support/[id]/page.tsx
│   ├── components/
│   │   ├── auth/            GuestRouteGuard.tsx · LoginForm.tsx · RegisterForm.tsx
│   │   ├── chatbot/         ChatMarkdown.tsx · ChatbotHome.tsx · ChatbotThread.tsx · ChatbotWorkspace.tsx
│   │   ├── community/       CommunityDetail.tsx · CommunityForm.tsx · CommunityList.tsx
│   │   ├── follows/         FollowList.tsx · FollowingFeed.tsx
│   │   ├── layout/          Footer.tsx · Navbar.tsx · NotificationPopup.tsx
│   │   ├── legal/           LegalPage.tsx
│   │   ├── longform/        LongformDetail.tsx · LongformForm.tsx · LongformList.tsx
│   │   ├── messages/        ChatArea.tsx · MessageThread.tsx · MessagesPageClient.tsx · UserList.tsx
│   │   ├── moderation/      ReportButton.tsx
│   │   ├── notifications/   NotificationDetail.tsx · NotificationList.tsx
│   │   ├── playlists/       PlaylistDetail.tsx
│   │   ├── profile/         PlaylistTab.tsx · ProfileHeader.tsx · ProfilePageClient.tsx · ProfileTabs.tsx · VideoGrid.tsx
│   │   ├── search/          SearchResultsView.tsx
│   │   ├── shorts/          CommentPanel.tsx · ScrollNav.tsx · ShortActions.tsx · ShortCard.tsx · ShortsFeed.tsx
│   │   ├── support/         FaqAccordion.tsx · InquiryDetail.tsx · SupportContact.tsx
│   │   ├── ui/              SerialBadge.tsx
│   │   └── upload/          UploadForm.tsx · UploadPreview.tsx
│   ├── context/             AuthContext.tsx · QueryProvider.tsx · ThemeContext.tsx
│   ├── lib/
│   │   ├── api.ts           [변경] 운영 API URL 폴백 점검
│   │   ├── auth.ts · chat-files.ts · chat-socket.ts [변경] wss:// 주소 · chatbot-corpus.ts
│   │   ├── chatbot-models.ts · content-store.ts · guest-routes.ts · media.ts
│   │   ├── mock-data.ts · notifications-store.ts · query-keys.ts · utils.ts
│   ├── types/               content.ts · index.ts
│   ├── e2e/                 auth.spec.ts · community.spec.ts · guest.spec.ts · helpers.ts · messages.spec.ts
│   ├── tests/               guest-routes.test.ts
│   ├── scripts/             capture-portfolio.ts · sync-portfolio.mjs
│   └── public/              _headers · portfolio/ (소개 사이트 동기본) · 아이콘 svg
│
├── console/                                    Next.js :3200  (Cloudflare Workers)
│   ├── .dev.vars
│   ├── .env.local.example                      [변경]
│   ├── .gitignore
│   ├── AGENTS.md · CLAUDE.md · README.md
│   ├── eslint.config.mjs · next.config.ts · open-next.config.ts
│   ├── package.json · package-lock.json · postcss.config.mjs · tsconfig.json
│   ├── tsconfig.tsbuildinfo                    [삭제 권장] 생성물인데 추적 중 → .gitignore 로 이동
│   ├── wrangler.jsonc                          [변경] Custom Domain(console.example.com)
│   ├── app/
│   │   ├── globals.css · layout.tsx · page.tsx
│   │   ├── content/page.tsx
│   │   ├── login/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── support/page.tsx
│   │   ├── users/page.tsx
│   │   └── audit/page.tsx                      [신규] 관리자 조치 감사 로그 (P7)
│   ├── components/
│   │   ├── admin/           ContentClient.tsx · DashboardClient.tsx · LoginClient.tsx · ReportsClient.tsx · SupportClient.tsx · UsersClient.tsx
│   │   │                    AuditClient.tsx  [신규]
│   │   ├── layout/          AdminNav.tsx [변경] 감사 로그 메뉴 · AdminRouteGuard.tsx
│   │   └── ui/              Page.tsx
│   ├── context/             AdminAuthContext.tsx
│   ├── lib/                 adminApi.ts [변경] · api.ts · format.ts
│   └── types/               index.ts
│
├── deploy/                                     [신규] 배포·운영 스크립트 모음
│   ├── README.md                               [신규] 실행 순서 요약
│   ├── oracle/                                 Oracle VM 에서 쓰는 파일
│   │   ├── setup-vm.sh                         [신규] 패키지·볼륨 마운트·사용자·방화벽 초기 설정
│   │   ├── Caddyfile                           [신규] api.example.com HTTPS + /uploads + reverse_proxy
│   │   ├── vidshare-backend.service            [신규] systemd 유닛
│   │   ├── postgresql.conf.snippet             [신규] data_directory·listen_addresses·메모리 설정
│   │   ├── pg_hba.conf.snippet                 [신규] 로컬 접속만 허용
│   │   ├── backend.env.example                 [신규] /etc/vidshare/backend.env 견본
│   │   ├── deploy.sh                           [신규] pull → ci → build → migrate → restart → health
│   │   └── backup.sh                           [신규] pg_dump -Fc + 14일 보관 정리
│   └── windows/                                내 PC(D 드라이브)에서 쓰는 파일
│       ├── setup-postgres-d.ps1                [신규] D:\vidshare-data 생성·initdb·서비스 등록·계정/DB 생성
│       ├── backup-local.ps1                    [신규] 로컬 pg_dump → D:\vidshare-data\backups\local
│       └── backup-pull.ps1                     [신규] 운영 백업·uploads 를 D:\...\backups\prod 로 가져오기
│
├── cloudflare/
│   └── config.template.yml                     [삭제] Tunnel 폐기 (P6)
│
├── .github/
│   └── workflows/
│       └── ci.yml                              [신규] PR 마다 3개 앱 typecheck·test (Postgres 서비스 컨테이너)
│
├── docs/
│   ├── README.md                               [변경] 인덱스에 신규 문서 추가
│   ├── deployment.md                           [변경] Oracle + Postgres 기준으로 개정
│   ├── architecture/
│   │   └── overview.md                         [변경] 구조도·테이블·데이터 흐름 갱신
│   ├── features/
│   │   └── roadmap.md                          [변경] 단계 갱신
│   ├── security/
│   │   └── security-notes.md                   [변경] 방화벽·SSH·백업 항목 추가
│   ├── ops/                                    [신규]
│   │   ├── oracle-setup.md                     [신규] OCI 콘솔 스크린샷 수준 절차서
│   │   ├── postgres-d-drive.md                 [신규] D 드라이브 Postgres 설치·복구
│   │   └── backup-restore.md                   [신규] 백업·복원 연습 절차
│   ├── changelog/
│   │   └── CHANGELOG.md                        [변경]
│   └── commits/
│       ├── README.md · TEMPLATE.md
│       ├── 001-initial-create-next-app.md … 094-portfolio-pptx.md   (현재 94건)
│       └── 095-… 이후                          [신규] 이번 계획의 커밋 상세 (13장)
│
└── portfolio/
    ├── README.md
    ├── VidShare-포트폴리오.md · .docx · .pptx   [변경] 배포 구조 갱신 시 재생성
    ├── build_docx.py · build_pptx.py · serve.py
    └── site/                                   정적 소개 사이트
```

### 12.2 내 PC 데이터 폴더 `D:\vidshare-data\` (저장소 밖)

```
D:\vidshare-data\
├── pgdata\                  PostgreSQL 데이터 (PG_VERSION, base\, global\, pg_wal\, postgresql.conf, pg_hba.conf …)
├── uploads\                 <uuid>.mp4 / .webm / .mov / .jpg / .png / .webp / .gif
├── logs\postgresql\         postgresql-YYYY-MM-DD.log
└── backups\
    ├── local\               vidshare-YYYYMMDD-HHmm.dump
    ├── prod\
    │   ├── db\              vidshare-YYYYMMDD-0300.dump
    │   └── uploads\         운영 uploads 사본
    └── sqlite-final\        vidshare.sqlite  (전환 직전 원본)
```

### 12.3 Oracle VM `/mnt/vidshare-data/` 및 시스템 파일

```
/mnt/vidshare-data/                  ← 블록 볼륨 (fstab 마운트, nofail)
├── pgdata/                          PostgreSQL 16 데이터 (소유 postgres)
├── uploads/                         영상·썸네일 (소유 vidshare, Caddy 읽기)
└── backups/                         pg_dump 야간 백업 (14일)

/opt/vidshare/                       ← git clone 위치 (소유 vidshare)
└── BackendServer/ (dist/, node_modules/ …)

/etc/vidshare/backend.env            ← 비밀값 (600)
/etc/caddy/Caddyfile
/etc/systemd/system/vidshare-backend.service
```

---

## 13. 단계별 실행 계획 (P1~P7)

번호는 `docs/commits/` 규칙(095부터)을 따른다. 각 단계는 **작은 커밋으로 쪼개고, 단계마다 `npm test` 통과를 확인**한다.

### 끝난 것 (v1)
- 화면 흐름 (쇼츠, 롱폼, 커뮤니티, 메시지, 알림, 고객센터, 챗봇)
- Front / Backend / console 폴더 분리, REST + 로그인 세션
- Backend SQLite 영속화, 로컬 디스크 업로드
- 통합 검색, 팔로우, 신고·차단, 재생목록, 댓글 대댓글·수정삭제
- 실시간화 (알림 SSE, 메시지 WebSocket)
- 테스트 (백엔드 127건, 프론트 29건, E2E 8건)
- 관리자 콘솔 `console/`, 법적 페이지, Front/console Cloudflare Workers
- 포트폴리오 문서·소개 사이트·발표 슬라이드

### P1. 로컬 Postgres 준비 (D 드라이브) — 준비 단계
- [ ] `deploy/windows/setup-postgres-d.ps1` 작성·실행 → `D:\vidshare-data\pgdata` 에 클러스터 생성
- [ ] `vidshare` 계정, `vidshare` / `vidshare_test` DB 생성
- [ ] `SHOW data_directory;` 가 D 경로인지 확인
- [ ] `deploy/windows/backup-local.ps1` 작성, 작업 스케줄러 등록
- [ ] `docs/ops/postgres-d-drive.md` 작성

### P2. 스키마·마이그레이션 기반 (SQLite 와 공존)
- [ ] `pg`, `@types/pg` 설치
- [ ] `db/pool.ts`, `db/migrate.ts` 작성
- [ ] `schema.ts` 22개 테이블을 `migrations/0001_init.sql` 로 변환 (8.2 규칙)
- [ ] `0002_indexes.sql` (외래키 컬럼·`owner_id`·`created_at` 정렬용)
- [ ] `tests/db-migrate.test.ts` — 빈 DB 에 두 번 실행해도 안전한지

### P3. 코드 async 전환 (가장 큰 단계)
- [ ] 8.5 의 순서대로 모듈별 전환 (`sessions` → `accounts` → `chatbot` → `store` 도메인별 → 라우트)
- [ ] `app.set("trust proxy", 1)` 와 `TRUST_PROXY` 환경 변수
- [ ] `errorHandler.ts` 에 유니크 위반(`23505`)·FK 위반(`23503`) 매핑
- [ ] `tests/helpers.ts` 를 Postgres 로 교체, **백엔드 127건 전부 통과**
- [ ] `health.ts` 가 DB 연결까지 확인

### P4. 데이터 이관
- [ ] `scripts/migrate-sqlite-to-pg.ts` + `tests/import-sqlite.test.ts`
- [ ] 로컬 SQLite → D 드라이브 Postgres 이관, 행 수 검증 표 통과
- [ ] `D:\vidshare-data\backups\sqlite-final\` 에 원본 보관
- [ ] `UPLOADS_PATH=D:\vidshare-data\uploads` 로 기존 `uploads/` 복사 이동
- [ ] 로컬에서 Front·console 을 붙여 수동 점검 (로그인·업로드·알림·메시지)

### P5. SQLite 제거
- [ ] `better-sqlite3`, `@types/better-sqlite3` 삭제
- [ ] `db/schema.ts`, `db/dumpDoc.ts`, `data/.gitkeep` 삭제, `scripts/dump-db-doc.ts` 로 대체
- [ ] `.env.example` 에서 `SQLITE_PATH` 제거, `.gitignore` 의 `*.sqlite*` 항목은 안전장치로 유지
- [ ] `docs/architecture/overview.md` 의 SQLite 서술을 Postgres 로 갱신

### P6. Oracle Cloud 구축·배포
- [ ] OCI 계정, VM(A1)·블록 볼륨 100GB·예약 IP·보안 목록 (10.1, 10.2)
- [ ] 도메인 구입, `api.` A 레코드, Workers Custom Domain (`app.`, `console.`)
- [ ] `deploy/oracle/*` 6개 파일 작성 → `setup-vm.sh` 실행
- [ ] Postgres 데이터 디렉터리를 블록 볼륨으로 확인
- [ ] 로컬 데이터 `pg_dump` → VM `pg_restore`, `uploads/` rsync
- [ ] Caddy 인증서 발급, `/api/health` 응답 확인
- [ ] Front·console 재배포 (`NEXT_PUBLIC_API_URL`), 실제 도메인에서 로그인·WS·SSE 확인
- [ ] `cloudflare/config.template.yml` 삭제, `docs/deployment.md` 개정, `docs/ops/oracle-setup.md` 작성

### P7. 운영 안정화
- [ ] `deploy/oracle/backup.sh` cron 등록, `deploy/windows/backup-pull.ps1` 스케줄러 등록
- [ ] **복원 연습 1회** — 운영 백업을 `D:\` 에서 빈 DB 로 복원, 행 수 비교
- [ ] `.github/workflows/ci.yml` — PR 마다 3개 앱 검증 (Postgres 서비스 컨테이너)
- [ ] 관리자 조치 감사 로그 (`0003_audit_log.sql`, `console/app/audit/page.tsx`)
- [ ] 사업자등록 후 `/business` 실정보 기입
- [ ] `docs/security/security-notes.md`, `docs/ops/backup-restore.md`, `portfolio/` 갱신

### 그다음 (이번 범위 밖)
- 업로드 → Oracle Object Storage / R2, 영상 트랜스코딩
- 통합 검색 `pg_trgm` 인덱스·관련도 정렬·페이지네이션
- 다중 인스턴스(Redis 브로커), 모니터링·알림(Uptime 체크)

---

## 14. 위험 요소와 대응

| 위험 | 가능성 | 영향 | 대응 |
|------|--------|------|------|
| `store.ts` async 전환 중 `await` 누락 → 조용한 버그 | 높음 | 높음 | `tsc --noEmit` + `@typescript-eslint/no-floating-promises` 규칙, 도메인별로 쪼개 커밋 |
| SQLite 의 느슨한 타입 때문에 이관 시 변환 실패 (날짜·불리언) | 중 | 중 | 이관 스크립트에서 변환 함수 분리, 행 수·샘플 값 검증, 원본 보관 |
| 시퀀스 미보정으로 신규 INSERT 시 PK 충돌 | 중 | 높음 | 이관 끝에 `setval` 을 항상 실행하고 테스트로 검증 |
| Oracle ARM 인스턴스 “Out of capacity” | 중 | 중 | 시간대 바꿔 재시도, 리전 변경, 안 되면 AMD Micro 로 시작 후 이전 |
| Always Free 유휴 인스턴스 회수 정책 | 낮음~중 | 높음 | 헬스체크로 주기 호출, 최신 정책 확인, 백업을 D 드라이브에 이중 보관 |
| Ubuntu `iptables` 로 80·443 이 막혀 접속 불가 | 높음 (흔함) | 낮음 | `setup-vm.sh` 에서 규칙 추가·저장, 체크리스트에 명시 |
| 크로스 도메인 쿠키 미전송 | 중 | 높음 | 같은 등록 도메인 + `COOKIE_DOMAIN`, `cors-cookies.test.ts` 로 회귀 방지 |
| 블록 볼륨 미마운트 상태로 Postgres 시작 → 빈 DB 생성 | 낮음 | 높음 | fstab `nofail` 대신 systemd `RequiresMountsFor=/mnt/vidshare-data` 를 Postgres·백엔드 유닛에 지정 |
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

v2 는 아래가 **모두** 참일 때 끝난 것으로 본다.

1. `https://app.example.com` 에서 가입 → 로그인 → 영상 업로드 → 커뮤니티 공유 → 댓글·알림(SSE)·메시지(WebSocket)가 동작한다.
2. `https://console.example.com` 에서 관리자 로그인과 신고·정지·삭제·문의 답변이 동작한다.
3. 백엔드는 Oracle VM 에서 `systemd` 로 상시 실행되고, 재부팅 후 자동으로 올라온다.
4. 운영 DB 는 PostgreSQL 이고 데이터 디렉터리가 블록 볼륨(`/mnt/vidshare-data/pgdata`)에 있다.
5. 로컬 개발 DB 는 PostgreSQL 이고 `SHOW data_directory;` 가 `D:/vidshare-data/pgdata` 이다.
6. 코드에 SQLite 의존성(`better-sqlite3`)이 없다.
7. 백엔드 테스트 127건 이상, 프론트 29건, E2E 8건이 통과한다 (백엔드는 Postgres 위에서).
8. 운영 백업이 매일 `D:\vidshare-data\backups\prod\` 에 쌓이고, **복원 연습을 1회 이상 성공**했다.
9. 5432 가 외부에서 접근되지 않고(포트 스캔 확인), SSH 는 키 인증·내 IP 만 허용한다.
10. `docs/deployment.md`, `docs/architecture/overview.md`, `docs/ops/*` 가 새 구조를 설명한다.
