# VidShare — BackendServer

프론트엔드(`../FrontServer`)와 분리된 **REST API 서버**입니다.

데이터는 **PostgreSQL 16** 에 저장됩니다. 로컬은 내 PC 의 Postgres(데이터 `D:\PostgreSQL\16\data`), 운영은 Oracle Cloud VM 입니다.  
인증은 bcrypt + HttpOnly 세션 쿠키입니다. 테스트 계정: `demo` / `demo1234`.

---

## 기술 스택

| 항목 | 기술 |
|------|------|
| 런타임 | Node.js 24 |
| 프레임워크 | Express |
| 언어 | TypeScript (`tsx` 개발 실행) |
| CORS | 개발: localhost+사설망. 프로덕션: `CORS_ORIGIN` 화이트리스트만 |
| DB | PostgreSQL 16 (`pg`) — 스키마는 `src/db/migrations/`, 버전은 `schema_migrations` |
| 라우터 | `middleware/asyncRouter.ts` — async 핸들러 실패를 에러 핸들러로 전달 |

---

## 시작하기

처음 한 번 Postgres 계정·DB 를 만듭니다 (`../deploy/windows/setup-postgres-d.ps1`, 안내대로 `.env` 작성).

```bash
cd vidshare/BackendServer
npm install
npm run db:import-sqlite   # 예전 data/vidshare.sqlite 가 있으면 (1회)
npm run dev                # 시작 시 마이그레이션 → (비어 있으면) 시드 → listen
```

기본 주소: **http://localhost:4000**

헬스 체크: [http://localhost:4000/api/health](http://localhost:4000/api/health)

### 환경 변수

`.env.example` 을 복사해 `.env` 로 사용합니다.

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | `4000` | 서버 포트 |
| `CORS_ORIGIN` | (비움) | 개발에서 비우면 사설망 허용. **프로덕션은 프론트 오리진 필수** |
| `COOKIE_DOMAIN` | (비움) | 예: `.example.com` (서브도메인 쿠키 공유) |
| `COOKIE_SAMESITE` | `lax` | `lax` \| `strict` \| `none` (`none`은 HTTPS) |
| `DATABASE_URL` | (필수) | `postgres://vidshare:…@localhost:5432/vidshare` |
| `DATABASE_URL_TEST` | (테스트 필수) | `…/vidshare_test` — 테스트 파일마다 임시 스키마를 만들고 지움 |
| `DB_POOL_MAX` | `10` | 커넥션 풀 크기 |
| `UPLOADS_PATH` | `uploads/` | 사용자 업로드 파일 경로 (권장 `D:\vidshare-data\uploads`) |
| `TRUST_PROXY` | `0` | 앞단 프록시 홉 수 (Oracle VM 의 Caddy 뒤에서는 `1`) |
| `SQLITE_PATH` | `data/vidshare.sqlite` | `db:import-sqlite` 가 읽을 예전 SQLite (1회용) |
| `NODE_ENV` | `development` | 환경 |
| `CHAT_TIMEOUT_MS` | `45000` | 모델 호출 하나를 기다려 줄 상한 (아래 참고) |

### 챗봇 응답이 느리거나 끊길 때

`CHAT_TIMEOUT_MS` 는 **반드시 필요한 안전장치**입니다. 이게 없으면 업스트림이
응답 없이 멎었을 때 우리 쪽에서 끊지 않아, OS TCP 타임아웃이 날 때까지 몇 분을
매달린 뒤 `ETIMEDOUT` 이 사용자 화면에 그대로 뜹니다. 지금은 상한에서 잘라
`504` + 안내 문구로 바꿉니다.

주의할 점이 하나 있습니다 — `@langchain/google-genai` 는 `timeout` 도 `signal` 도
실제 요청에 전달하지 않습니다. 그래서 `llm.ts` 의 `withTimeout()` 이
`Promise.race` 로 한 겹 더 감쌉니다. **새 모델 호출을 추가할 때는 반드시
`withTimeout(llm.invoke(..., chatCallOptions()))` 형태로 감싸세요.**

`gemini-3.6-flash`(Vide 기본값)는 thinking 모델이라 같은 질문에도 5초~90초로
편차가 크고, `thinkingBudget: 0` 으로 끌 수도 없습니다. 체감이 나쁘면
`CHAT_MODEL_VIDE` 를 `gemini-3.1-flash-lite`(Locals가 쓰는 값, 1~7초)처럼
가벼운 모델로 바꾸는 게 가장 효과가 큽니다. 무료 티어 할당량(429)에 걸려도
느려지니 그쪽도 함께 확인하세요.

### 기타 명령

```bash
npm run build      # dist/ 컴파일
npm start          # 프로덕션 실행 (build 후)
npm run typecheck  # 타입만 검사 (src + tests)
npm test           # API 자동화 테스트 (DATABASE_URL_TEST 의 임시 스키마, 148건)
npm run test:watch # 테스트 진행 상태 감지
npm run db:migrate # 마이그레이션만 적용 (배포 스크립트가 사용)
npm run db:import-sqlite [-- --from <경로>] [-- --replace]  # SQLite → Postgres 1회 이관
npm run db:doc     # data/DataBaseColumn.md 로 테이블·데이터 덤프
npm run list-admins                         # 관리자 핸들 목록 (핸들을 잊었을 때)
npm run reset-password -- <handle> --generate # 비밀번호 재설정(무작위) + 그 계정 세션 전부 종료
```

### 관리자 계정 만들기

관리자는 **시드에 없습니다**(비밀번호를 소스에 남기지 않기 위해).
`console/` 앱(:3200)에 로그인하려면 먼저 여기서 만들어야 합니다.

```bash
npm run create-admin -- <handle> <password> [name]

# 이미 있는 일반 계정을 관리자로 승격 (비밀번호는 그대로 유지)
npm run create-admin -- <handle> <password> --promote
```

이미 관리자인 핸들에 다시 실행하면 아무것도 바꾸지 않고 안내만 출력합니다(멱등).

---

## API 개요

응답 형식:

```json
{ "success": true, "data": ... }
```

에러:

```json
{ "success": false, "error": "message" }
```

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/health` | 헬스 체크 |
| GET | `/api/search?q=` | 통합 검색 (쇼츠·롱폼·커뮤니티·유저) |
| GET | `/api/shorts?q=` | 쇼츠 목록 (검색 선택) |
| GET | `/api/shorts/:id` | 쇼츠 상세 |
| POST | `/api/shorts` | 쇼츠 생성 `{ title, description?, gradient?, videoUrl?, thumb? }` (로그인) |
| POST | `/api/uploads?kind=` | 파일 업로드 `multipart file` (`image` \| `video`, 로그인) |
| GET | `/uploads/:file` | 업로드된 영상·이미지 정적 파일 |
| POST | `/api/shorts/:id/like` | 좋아요 `{ action?: "unlike" }` |
| GET | `/api/shorts/:shortId/comments` | 댓글 목록 |
| POST | `/api/shorts/:shortId/comments` | 댓글 작성 `{ text, author? }` |
| POST | `/api/auth/register` | 회원가입 `{ handle, name, password }` |
| POST | `/api/auth/login` | 로그인 `{ handle, password }` |
| POST | `/api/auth/logout` | 로그아웃 (세션 쿠키 삭제) |
| GET | `/api/auth/me` | 현재 세션 사용자 (없으면 401) |
| GET | `/api/users` | 사용자 목록 |
| GET | `/api/users/me` | 현재 세션 사용자 (없으면 401) |
| GET | `/api/users/:id` | 사용자 상세 |
| GET | `/api/users/:id/shorts` | 사용자 쇼츠 |
| GET | `/api/notifications?category=` | 알림 목록 |
| GET | `/api/notifications/settings` | 알림 수신 설정 조회 (로그인) |
| PATCH | `/api/notifications/settings` | `{ enabled }` 수신 설정 변경 (로그인) |
| PATCH | `/api/notifications/read-all` | 본인 알림 전체 읽음 |
| DELETE | `/api/notifications` | 본인 알림 전체 삭제 |
| DELETE | `/api/notifications/:id` | 알림 삭제 |
| PATCH | `/api/notifications/:id` | `{ read }` |
| GET | `/api/follows/feed` | 팔로잉 피드 (로그인) |
| GET | `/api/follows/:id` | 팔로워/팔로잉 수 + 내 팔로우 여부 |
| GET | `/api/follows/:id/followers` | 팔로워 목록 |
| GET | `/api/follows/:id/following` | 팔로잉 목록 |
| POST | `/api/follows/:id` | 팔로우 (로그인, 멱등) |
| DELETE | `/api/follows/:id` | 언팔로우 (로그인) |
| GET | `/api/messages/users` | 채팅 상대 목록 |
| GET | `/api/messages/:userId` | 대화 내역 |
| POST | `/api/messages/:userId` | 메시지 전송 `{ content, isImage? }` |
| GET | `/api/support/faq` | FAQ |

### 관리자 API (`/api/admin/*`, 081~082)

전부 관리자 세션 쿠키(`vidshare_admin_sid`)가 필요합니다. 일반 세션으로는 401입니다.

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/admin/auth/login` | 관리자 로그인 `{ handle, password }` |
| POST | `/api/admin/auth/logout` | 로그아웃 |
| GET | `/api/admin/auth/me` | 현재 관리자 |
| GET | `/api/admin/dashboard/stats` | 운영 지표 8종 |
| GET | `/api/admin/reports?status=` | 전체 신고 (open/resolved/dismissed) |
| PATCH | `/api/admin/reports/:id` | 처리 상태 변경 `{ status }` |
| GET | `/api/admin/users?q=` | 전체 유저 (role·suspended·가입일) |
| PATCH | `/api/admin/users/:id/suspend` | 정지/해제 `{ suspended }` (관리자 대상은 400) |
| DELETE | `/api/admin/content/shorts/:id` | 쇼츠 삭제 (댓글·재생목록 cascade) |
| DELETE | `/api/admin/content/longform/:id` | 롱폼 삭제 |
| DELETE | `/api/admin/content/community/:id` | 커뮤니티 글 삭제 |
| DELETE | `/api/admin/content/comments/:id` | 댓글 삭제 |
| GET | `/api/admin/support/inquiries?unreplied=1` | 전체 문의 |
| GET | `/api/admin/support/inquiries/:id` | 문의 상세 |
| PATCH | `/api/admin/support/inquiries/:id/reply` | 답변 `{ reply }` (작성자에게 알림) |

루트 `GET /` 에 엔드포인트 목록이 있습니다.

---

## 폴더 구조

```
BackendServer/
├── src/
│   ├── index.ts           # 엔트리
│   ├── app.ts             # Express 앱 조립
│   ├── db/                # Postgres 풀(client.ts)·마이그레이션(migrate.ts, migrations/)·시드
│   ├── data/              # 시드 데이터 + 쿼리
│   ├── auth/              # 계정·세션
│   ├── middleware/
│   ├── routes/
│   ├── upload/            # 디스크 저장·MIME 화이트리스트
│   └── types/
├── scripts/               # create-admin · db-migrate · migrate-sqlite-to-pg · dump-db-doc
├── tests/                 # node:test + supertest (Postgres)
├── uploads/               # 사용자 파일 (Git 무시, README만 추적)
├── .env.example
├── package.json
└── README.md
```

---

## FrontServer 연동

| 서버 | 포트 | 역할 |
|------|------|------|
| FrontServer | 3000 | Next.js UI |
| BackendServer | 4000 | REST API |

프론트 환경 변수 예 (`FrontServer/.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

프론트는 `lib/api.ts` 로 이 서버를 호출합니다. 업로드된 미디어는 `/uploads/...` 상대 경로로 저장되고, 프론트는 API 호스트를 붙여 재생합니다.

---

## 다음 단계

- [x] SQLite 영속화 → **PostgreSQL 16 전환 (096)**
- [x] 인증 (세션 쿠키)
- [x] 파일 업로드 스토리지
- [x] FrontServer mock → API fetch 전환
- [x] Oracle Cloud 배포 스크립트 (`../deploy/oracle/`)
- [ ] 업로드 → 오브젝트 스토리지 (필요 시)
