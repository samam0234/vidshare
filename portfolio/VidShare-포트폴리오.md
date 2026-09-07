# VidShare — 영상 공유 플랫폼

**숏폼 · 롱폼 · 커뮤니티 · 실시간 메시지 · AI 챗봇을 하나로 묶고, 운영자용 관리 콘솔까지 직접 만든 풀스택 개인 프로젝트**

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프로젝트명 | VidShare |
| 유형 | 개인 프로젝트 (기획 · 설계 · 프론트엔드 · 백엔드 · 운영 도구 전담) |
| 개발 기간 | 2026-08-14 ~ 2026-09-07 (약 3.5주) |
| 구성 | 사용자 웹앱 · 관리자 콘솔 · REST API 서버 (3개 앱) |
| 저장소 | `master` 브랜치, 커밋 162건 — 커밋마다 상세 기록 문서 동반 |
| 사용자 사이트 | https://vidshare-front.limjinheng0120.workers.dev |
| 관리자 콘솔 | https://vidshare-console.limjinheng0120.workers.dev |

### 한 줄 정의

> VidShare는 영상을 올리고, 커뮤니티 글로 공유해 같이 보고 이야기할 수 있게 만든
> 숏폼 · 롱폼 커뮤니티 플랫폼이다.

### 왜 이 주제였나

영상 플레이어 하나를 만드는 클론 과제로는 배울 것이 금방 끝난다.
그래서 **콘텐츠 소비 → 창작 → 소통 → 운영**까지 서비스가 실제로 도는 한 사이클을
전부 통과해 보는 것을 목표로 잡았다.

특히 **운영**을 범위에 넣은 것이 이 프로젝트의 성격을 결정했다. 신고가 들어오면
누가 보고 무엇을 근거로 지우는지, 정지된 계정의 세션은 언제 끊기는지 같은 질문은
사용자 화면만 만들어서는 마주칠 일이 없다. 관리자 콘솔을 별도 앱으로 분리하면서
비로소 **권한 경계**를 설계해야 했다.

### 규모

| 지표 | 값 |
|------|-----|
| TypeScript / TSX | 163개 파일, 약 15,700줄 |
| 화면 (페이지) | 사용자 27개 + 관리자 6개 |
| REST API | 82개 엔드포인트 (일반 67 · 관리자 15) + WebSocket 1 + SSE 1 |
| DB 테이블 | 22개 |
| 자동화 테스트 | 177건 (백엔드 137 · 프론트 32 · E2E 8 시나리오) |
| 문서 | 아키텍처 · 배포 · 보안 · 로드맵 + 커밋 상세 92편 |

---

## 2. 기술 스택

| 구분 | 기술 | 선택 이유 |
|------|------|-----------|
| 프론트엔드 | Next.js 16 (App Router), React 19, TypeScript | 상세 URL(`/community/1`)이 라우트 파일로 그대로 드러남 |
| 스타일 | Tailwind CSS v4 + CSS 변수 토큰 | 다크/라이트를 변수 재정의 한 곳으로 처리 |
| 서버 상태 | TanStack Query (React Query) | 목록 화면의 중복 페치·캐시 무효화 정리 |
| 백엔드 | Node.js, Express 4, TypeScript | 라우트 파일이 곧 API 목록이 되어 설명·수정이 빠름 |
| DB | SQLite (`better-sqlite3`) | 설치 없이 영속화. 동기 API라 트랜잭션 코드가 단순 |
| 실시간 | `ws` (WebSocket), SSE | 메시지는 양방향, 알림은 단방향 — 목적에 맞게 분리 |
| 인증 | bcrypt + HttpOnly 세션 쿠키 | JWT를 localStorage에 두는 방식의 XSS 노출을 피함 |
| AI | LangChain, LangGraph, Google Gemini, Groq | 모델 티어별로 체인/그래프 구조를 다르게 구성 |
| 업로드 | multer + 로컬 디스크 | MIME 화이트리스트 · UUID 파일명 |
| 테스트 | `node --test` + supertest, Playwright | 런타임 내장 러너로 의존성 최소화 |
| 배포 | Cloudflare Workers (OpenNext), Cloudflare Tunnel | 프론트 2종은 엣지, 백엔드는 로컬 노출 |

### 기술 선택에서 일부러 하지 않은 것

| 후보 | 왜 안 썼나 |
|------|-----------|
| NestJS | 소규모 개인 프로젝트에 모듈·DI 설정 비용이 큼 |
| Next Route Handler만 사용 | 한 프로세스로는 쉽지만 "프론트/백엔드 분리"를 배우는 목적에 어긋남 |
| JWT + localStorage | 토큰이 XSS에 그대로 노출됨. 세션 쿠키가 이 규모에 충분 |
| MongoDB | 유저–영상–댓글의 관계형 구조와 잘 맞지 않음 |
| S3 등 오브젝트 스토리지 | 계정·비용·설정이 현재 범위를 넘음 (로컬 디스크로 대체) |

---

## 3. 시스템 아키텍처

```
[Browser — 사용자]                    [Browser — 운영자]
       │                                     │
       ▼                                     ▼
[FrontServer :3000]                   [console :3200]
  Next.js · lib/api.ts                  Next.js · lib/adminApi.ts
  쿠키 vidshare_sid                     쿠키 vidshare_admin_sid
       │                                     │
       └────── fetch(credentials: "include") ┘
                        │
                        ▼
             [BackendServer :4000]  Express REST API
                routes/ → data/store.ts → db/client.ts
                /api/*        ← requireRequestUser
                /api/admin/*  ← requireAdmin
                /ws/conversations (WebSocket)
                /api/notifications/stream (SSE)
                        │
                        ▼
             [SQLite]  data/vidshare.sqlite  (22 tables)
             [Files]   uploads/  (DB엔 /uploads/<uuid>.ext 경로만)
```

### 설계 원칙 4가지

이 네 가지는 프로젝트 내내 예외 없이 지켰고, 신규 코드 리뷰 기준으로 삼았다.

1. **모든 API 응답은 한 가지 형태다.**
   `{ success: boolean; data?: T; error?: string }` (`ApiResult<T>`).
   프론트가 응답마다 다른 분기를 만들 필요가 없다.
2. **인증이 필요한 라우트는 `requireRequestUser(req)` 로 시작한다.**
   세션이 없으면 그 자리에서 401을 throw 한다. 라우트 본문에 인증 분기가 섞이지 않는다.
3. **소유자 스코프 테이블은 전부 `WHERE owner_id = ?` 로 격리한다.**
   남의 알림·대화·재생목록이 쿼리에 섞일 수 있는 경로를 만들지 않는다.
4. **프론트는 `lib/api.ts` 를 거치지 않고 `fetch` 하지 않는다.**
   인증 쿠키·베이스 URL·에러 규약이 한 파일에만 있다.

### 데이터 흐름

```
사용자 입력
  → Client Component
  → lib/api.ts  (fetch, credentials: "include")
  → Express route  (requireRequestUser 로 인증 검사)
  → data/store.ts  (better-sqlite3 prepared statement)
  → SQLite
  → { success, data?, error? }
  → 컴포넌트 상태 갱신 → 리렌더
```

---

## 4. FrontServer — 사용자 웹앱 (:3000)

### 개요

Next.js 16 App Router 기반 사용자 웹앱. 27개 페이지가 하나의 공통 셸
(`ThemeProvider` → `QueryProvider` → `AuthProvider` → `Navbar` + `Footer`) 위에서 동작한다.

비회원도 **열람은 자유**롭게 하되 작성·메시지·업로드는 로그인을 요구한다.
이 정책은 `lib/guest-routes.ts` 한 곳에 목록으로 모아 두고, 화면마다 흩어지지 않게 했다.

### 주요 화면

| 경로 | 화면 | 인증 |
|------|------|------|
| `/` | 쇼츠 세로 스냅 피드 (좋아요·댓글·공유) | 열람 자유 |
| `/search` | 통합 검색 (쇼츠·롱폼·커뮤니티·유저) | 열람 자유 |
| `/following` | 팔로잉 피드 | 필요 |
| `/profile/[id]` | 프로필 — 탭·정렬·그리드·재생목록 | 열람 자유 |
| `/profile/[id]/followers`·`/following` | 팔로워·팔로잉 목록 | 열람 자유 |
| `/upload` | 쇼츠 업로드 (실파일) | 필요 |
| `/longform`, `/longform/[id]`, `/longform/write` | 롱폼 | 작성만 필요 |
| `/community`, `/community/[id]`, `/community/write` | 커뮤니티 | 작성만 필요 |
| `/messages`, `/messages/[id]` | 1:1 대화 (WebSocket) | 필요 |
| `/notifications`, `/notifications/[id]` | 알림 (SSE) | 필요 |
| `/chatbot`, `/chatbot/[id]` | AI 챗봇 워크스페이스 | 게스트는 Locals만 |
| `/support`, `/support/[id]` | FAQ + 문의 | 문의는 필요 |
| `/playlists/[id]` | 재생목록 상세 | 열람 자유 |
| `/login`, `/register` | 인증 | — |
| `/terms`, `/privacy`, `/business` | 법적 고지 | 열람 자유 |

### API 연동 구조

프론트의 서버 통신은 **`lib/api.ts` 단 하나의 모듈**로 모았다.
40개가 넘는 메서드가 모두 `ApiResult<T>` 를 반환하고, `credentials: "include"` 로
세션 쿠키를 실어 보낸다.

```
lib/
├── api.ts                  ← 서버 통신 단일 창구 (40+ 메서드)
├── media.ts                ← /uploads 경로에 API 호스트를 붙이는 mediaUrl(), 용량·형식 검사
├── auth.ts                 ← 인증 헬퍼
├── notifications-store.ts  ← useSyncExternalStore 기반 알림 전역 상태
├── guest-routes.ts         ← 비회원 허용 경로 목록
├── chatbot-corpus.ts       ← Shape 모델용 RAG 코퍼스 수집
├── chatbot-models.ts       ← 모델 티어 정의
└── chat-files.ts           ← 첨부 파일 → ChatbotAttachment 변환
```

`NEXT_PUBLIC_API_URL` 이 비어 있으면 `window.location.hostname:4000` 을 자동으로
가리키게 해서, LAN의 다른 기기에서 열어도 별도 설정 없이 API가 붙는다.

### 상태 관리 전략

한 가지 방식으로 통일하지 않고 **데이터 성격에 따라 나눴다.**

| 종류 | 방식 | 이유 |
|------|------|------|
| 서버 목록 데이터 | TanStack Query | 롱폼·커뮤니티·팔로잉 피드·프로필·메시지. 캐시·재검증이 이득 |
| 알림 | `useSyncExternalStore` 전역 스토어 | Navbar 배지·목록·팝업 셋이 같은 상태를 봐야 함 |
| 테마 | `useSyncExternalStore` + localStorage | 리렌더 없이 즉시 반영 |
| 인증 | `context/AuthContext` | 앱 전역 1회 로드 |
| 쇼츠 피드 등 | 컴포넌트 로컬 `useState` | 낙관적 업데이트가 얽혀 있어 이전 보류 (개선 예정) |

### 디자인

- **시맨틱 CSS 변수 토큰**으로 팔레트를 통일했다.
  `--bg`, `--bg-card`, `--bg-elevated`, `--text`, `--text-muted`, `--accent`,
  `--accent-hot`, `--border`, `--btn`, `--danger`, `--shadow`
- 라이트 모드는 `html.light` 에서 **변수만 재정의**한다. 컴포넌트는 손대지 않는다.
- **하드코딩 색상 금지**를 규약으로 뒀다. 새 색이 필요하면 토큰을 늘린다.
- 커스텀 유틸리티: `surface`, `glass-btn`, `logo-grad`, `shorts-snap`, `custom-scroll`
- 사용자 앱은 보라–파랑 계열(`#7c3aed` → `#3ea6ff`), 관리자 콘솔은 앰버 계열로
  **의도적으로 다른 색을 줬다.** 두 사이트를 동시에 띄워 두고 작업할 때
  지금 어느 쪽을 보고 있는지 즉시 구분된다.

### 문제점 및 개선 사항

| 항목 | 현재 상태 | 계획 |
|------|-----------|------|
| 서버 상태 일원화 | `ShortsFeed` 등은 아직 `useState` + `useEffect` | 낙관적 업데이트를 Query mutation으로 이전 |
| 컴포넌트 테스트 | 없음 (순수 함수 32건뿐) | Testing Library 도입 |
| 접근성 | 전면 점검 미실시 | 키보드 내비게이션·ARIA·대비 감사 |
| 성능 | 측정하지 않음 | Lighthouse 기준선 → 이미지·번들 최적화 |
| 페이지네이션 | 검색·팔로우 목록이 전량 반환 | 커서 기반 페이징 |
| `lib/mock-data.ts` | 시드/폴백 용도로 잔존 | 제거 |

### 미래 지향

- 무한 스크롤 + 가상 스크롤로 대량 피드 대응
- PWA·오프라인 캐시로 모바일 체감 개선
- 영상 재생 지표(시청 완료율)를 수집해 정렬에 반영
- 다국어(i18n)

---

## 5. Console — 관리자 콘솔 (:3200)

### 개요

운영자 전용 Next.js 앱. 사용자 사이트와 **같은 BackendServer(:4000)** 를 보지만
`/api/admin/*` 만 호출하고, 세션 쿠키 이름부터 다르다.

| 앱 | 포트 | 세션 쿠키 |
|----|------|-----------|
| FrontServer (사용자) | 3000 | `vidshare_sid` |
| console (관리자) | 3200 | `vidshare_admin_sid` |

쿠키 이름이 달라 **같은 브라우저에서 두 사이트에 동시에 로그인해 있어도
서로를 로그아웃시키지 않는다.** 운영 중 사용자 화면과 관리 화면을 나란히 놓고
확인해야 하는 실제 작업 방식을 그대로 반영한 결정이다.

### 화면

| 경로 | 하는 일 |
|------|---------|
| `/login` | 관리자 로그인 (유일하게 비로그인 접근 가능) |
| `/` | 대시보드 — 미처리 신고·미답변 문의·정지 계정·콘텐츠 수 등 지표 |
| `/reports` | 신고 조회, 조치함/반려 처리 |
| `/users` | 유저 검색, 계정 정지·해제 |
| `/content` | 쇼츠·롱폼·커뮤니티 삭제 |
| `/support` | 고객센터 문의 조회·답변 |

`/login` 을 제외한 모든 경로는 `AdminRouteGuard` 가 막는다.

### API 연동 구조

```
console/
├── app/                            ← 라우트 (App Router)
├── components/
│   ├── admin/                      ← 화면별 클라이언트 컴포넌트
│   ├── layout/                     ← AdminNav, AdminRouteGuard
│   └── ui/Page.tsx                 ← PageShell / PageHeader / Panel / ListState
├── context/AdminAuthContext.tsx    ← useSyncExternalStore 기반 세션
└── lib/
    ├── api.ts                      ← fetch 래퍼 (credentials: include)
    └── adminApi.ts                 ← /api/admin/* 타입 있는 메서드
```

`types/index.ts` 와 `lib/api.ts` 는 FrontServer와 일부 겹친다.
앱 세 개가 공유 패키지를 둘 만한 규모가 아니라고 판단해 **의도적으로 작은 중복을
허용**했다. 대신 `globals.css` 파일 상단에 "팔레트를 바꾸면 두 파일을 함께 고쳐야
한다"는 주석을 남겨 두었다. 추상화를 미루더라도 그 사실이 코드에 적혀 있어야
다음 사람이 놀라지 않는다.

### 보안 설계

관리자 콘솔에서 **의식적으로 지킨 것**:

- 관리자 세션 쿠키를 사용자 세션과 **이름부터 분리**했다.
  일반 로그인으로는 관리자 라우트에 도달할 수 없다.
- `requireAdmin` 실패는 비로그인·일반 유저·정지된 관리자를 **구분하지 않고 동일한 401**.
  관리자 로그인 실패 메시지도 하나로 통일했다.
  핸들을 넣어 보며 "이 계정이 관리자인가"를 떠보는 것을 막기 위해서다.
- 관리자 계정은 **시드에 없다.** `npm run create-admin` 으로 각 환경에서 직접 만든다.
  비밀번호가 소스나 저장소에 남지 않는다.
- 관리자가 자기 자신이나 다른 관리자를 정지시키는 것은 **400으로 차단**한다.
  콘솔에 아무도 들어갈 수 없는 상태를 만들 수 없게 했다.
- 유저를 정지하면 그 유저의 `sessions` 행을 **즉시 전부 삭제**하고, 재로그인은 403.
  정지가 다음 로그인까지 미뤄지지 않는다.
- 콘솔 페이지는 `robots: index:false`.

### 디자인

사용자 앱과 같은 CSS 변수 토큰 체계를 쓰되 **강조색을 앰버로 바꿨다.**
목록·지표는 `PageShell` / `PageHeader` / `Panel` / `ListState` 네 개의 UI 프리미티브로
통일해서, 새 관리 화면을 추가할 때 레이아웃을 다시 고민하지 않게 했다.

### 문제점 및 개선 사항

| 항목 | 현재 상태 | 계획 |
|------|-----------|------|
| **감사 로그 없음** | 누가 무엇을 지웠는지 추적 불가 | `admin_audit_logs` 테이블 — 최우선 과제 |
| 2FA·IP 제한 없음 | 비밀번호 하나가 전부 | 운영 배포 시 VPN/IP 허용 목록 뒤에 배치 |
| 페이지네이션 없음 | 유저·신고 목록이 전량 응답에 실림 | 커서 페이징 |
| 자동화 테스트 없음 | API 계층만 백엔드 테스트 44건이 검증 | 콘솔 E2E 시나리오 |
| 업로드 파일 미삭제 | 콘텐츠를 지워도 원본 파일이 남음 | 삭제 시 파일 정리 배치 |

### 미래 지향

- 감사 로그 기반 **조치 이력 타임라인** 화면
- 신고 유형별 통계·추이 차트
- 역할 세분화 (읽기 전용 운영자 / 콘텐츠 관리자 / 최고 관리자)
- 정지 사유·기간 입력과 사용자 고지 자동화

---

## 6. BackendServer — REST API 서버 (:4000)

### 개요

Express 4 + TypeScript 기반 REST API 서버. 데이터는 SQLite(`data/vidshare.sqlite`)에
저장되고, 업로드 파일은 `uploads/` 디스크에 UUID 이름으로 떨어진다.
DB에는 `/uploads/<uuid>.ext` 경로 문자열만 들어간다.

`GET /` 로 요청하면 **서버가 자기 엔드포인트 목록을 JSON으로 응답**한다.
별도 API 문서를 유지하는 대신 서버가 스스로 목록을 말하게 해서, 라우트를 추가하고
문서 갱신을 잊는 상황을 없앴다.

### 폴더 구조

```
src/
├── app.ts                  ← Express 앱 조립 + 라우트 등록 + 엔드포인트 목록 응답
├── index.ts                ← 부팅 (LAN IP 출력, http.createServer + attachChatSocket)
├── auth/
│   ├── accounts.ts         ← bcrypt 해시, 계정 생성/조회
│   ├── sessions.ts         ← 사용자 세션 (vidshare_sid)
│   ├── adminSession.ts     ← 관리자 세션 (vidshare_admin_sid)
│   ├── requestUser.ts      ← requireRequestUser()
│   └── requireAdmin.ts     ← requireAdmin()
├── chatbot/
│   ├── complete.ts         ← POST /api/chatbot/complete 진입점
│   ├── llm.ts              ← 모델 스펙 + 원격 호출 래퍼 (타임아웃 포함)
│   ├── locals.ts / vide.ts / shape.ts   ← 모델별 체인·그래프
│   ├── platform.ts         ← 플랫폼 JSON 스냅샷 RAG
│   └── store.ts            ← 챗봇 문서·요약 저장
├── data/
│   ├── store.ts            ← 모든 CRUD 함수 (~1,500줄)
│   └── seedData.ts
├── db/
│   ├── client.ts           ← better-sqlite3 커넥션
│   ├── schema.ts           ← CREATE TABLE 22개
│   └── seed.ts
├── middleware/errorHandler.ts   ← HttpError → JSON 변환
├── realtime/
│   ├── notificationBus.ts  ← 알림 SSE용 owner_id 채널 EventEmitter
│   ├── chatBus.ts          ← 메시지 WS용 owner_id 채널 EventEmitter
│   └── chatSocket.ts       ← /ws/conversations 업그레이드·인증·송수신
├── routes/                 ← 19개 라우터 + admin/ 6개
├── scripts/create-admin.ts ← 관리자 계정 생성·승격 CLI
├── upload/files.ts         ← 디스크 경로·MIME 화이트리스트
└── types/index.ts
```

### API 구성 (82개 엔드포인트)

| 그룹 | 대표 엔드포인트 | 인증 |
|------|-----------------|------|
| 헬스 | `GET /api/health` | — |
| 인증 | `POST /api/auth/register` · `login` · `logout`, `GET /api/auth/me` | 일부 |
| 검색 | `GET /api/search?q=` | — |
| 쇼츠 | `GET/POST /api/shorts`, `POST /api/shorts/:id/like` | 생성 시 필요 |
| 댓글 | `GET/POST /api/shorts/:shortId/comments` | 작성 시 필요 |
| 유저 | `GET /api/users`, `/api/users/:id`, `/api/users/:id/shorts` | — |
| 팔로우 | `GET /api/follows/feed`, `POST/DELETE /api/follows/:id` | 필요 |
| 차단·신고 | `GET/POST/DELETE /api/blocks`, `POST /api/reports` | 필요 |
| 재생목록 | `GET/POST /api/playlists`, `POST /api/playlists/:id/items` | 필요 |
| 알림 | `GET /api/notifications`, `PATCH /read-all`, `DELETE /` | 필요 |
| 알림 실시간 | `GET /api/notifications/stream` (SSE) | 필요 |
| 대화·메시지 | `GET/POST /api/conversations`, `/api/messages/:userId` | 필요 |
| 메시지 실시간 | `WS /ws/conversations` | 필요 |
| 롱폼·커뮤니티 | `GET/POST /api/longform`, `/api/community` | 생성 시 필요 |
| 고객센터 | `GET /api/support/faq`, `GET/POST /api/support/inquiries` | 문의는 필요 |
| 챗봇 | `POST /api/chatbot/complete`, `/api/chatbot/threads/*` | 일부 |
| 업로드 | `POST /api/uploads?kind=image\|video`, `GET /uploads/:file` | 업로드는 필요 |
| **관리자 (15개)** | `/api/admin/auth/*`, `reports`, `users`, `content`, `support`, `dashboard` | 관리자 |

응답 규약:

```json
{ "success": true,  "data": ... }
{ "success": false, "error": "message" }
```

### 데이터 모델 (22개 테이블)

| 그룹 | 테이블 |
|------|--------|
| 인증 | `users`, `sessions` |
| 쇼츠 | `shorts`, `comments` |
| 콘텐츠 | `longform`, `community_posts` |
| 대화 | `conversations`, `chat_lines` |
| 레거시 메시지 | `chat_users`, `messages` |
| 알림 | `activity_notifications` |
| 고객센터 | `faqs`, `support_inquiries` |
| 챗봇 | `chatbot_docs`, `chatbot_summaries`, `chatbot_threads`, `chatbot_messages` |
| 소셜 | `user_follows` |
| 모더레이션 | `user_blocks`, `reports` |
| 재생목록 | `playlists`, `playlist_items` |

관리자 기능은 **테이블을 늘리지 않고 기존 테이블에 컬럼을 붙였다.**
`users.role` / `users.suspended`, `reports.status`,
`support_inquiries.admin_reply` / `replied_at`.
운영 개념을 새 도메인으로 분리할 만큼 크지 않다고 봤다.

### 고급 기술 1 — AI 챗봇 (LangChain / LangGraph)

세 가지 모델 티어를 두고, **티어마다 파이프라인 구조 자체를 다르게** 만들었다.

| 모델 | 접근 | 기본 모델 | 파이프라인 | 영속화 | RAG |
|------|------|-----------|-----------|--------|-----|
| **Locals** | 무료 · 비회원 가능 | `gemini-3.1-flash-lite` (Google) | LangChain 단순 체인 | 게스트는 메모리만 | 없음 |
| **Vide** | 회원 전용 | `gemini-3.6-flash` (Google) | **LangGraph 요약 그래프** | SQLite | 부분 |
| **Shape** | 회원 전용 | `openai/gpt-oss-120b` (Groq) | 고급 체인 | SQLite | 저장 대화 + 플랫폼 코퍼스 |

- **Shape의 RAG**: 전송 전에 프론트에서 `collectChatCorpus()`(과거 대화)와
  `collectPlatformCorpus()`(플랫폼 데이터 스냅샷)로 컨텍스트를 모은다.
  덕분에 "내가 올린 영상이 몇 개냐" 같은 서비스 문맥 질문에 답할 수 있다.
- **멀티모달 첨부**: 이미지 / PDF / DOCX 를 받는다.
  Locals·Vide 는 Gemini 비전으로 직접 넣고, Shape 는 Gemini로 먼저 설명을 만든 뒤
  그 텍스트를 Groq 모델에 넘긴다 (모델별 입력 능력 차이를 흡수).
- 봇 답변은 `ChatMarkdown` 으로 렌더 (굵게·이탤릭·취소선·목록).

### 고급 기술 2 — 실시간 (SSE + WebSocket)

**두 프로토콜을 목적에 따라 나눠 썼다.**

| 기능 | 프로토콜 | 이유 |
|------|----------|------|
| 알림 | SSE (`GET /api/notifications/stream`) | 서버→클라이언트 단방향. HTTP 그대로라 재연결이 공짜 |
| 메시지 | WebSocket (`/ws/conversations`) | 양방향 송수신. 입력 즉시 상대에게 전달 |

둘 다 `owner_id` 를 채널 키로 쓰는 `EventEmitter` 버스
(`notificationBus`, `chatBus`)를 거친다. 라우트는 DB에 쓰고 버스에 이벤트를
던지기만 하고, 연결 관리는 버스 구독자 쪽에서 한다.

WebSocket 업그레이드 시점에도 **세션 쿠키로 인증**한다.
소켓이 열렸다는 이유로 인증을 건너뛰지 않는다.
메시지 전송은 WebSocket이 끊겨도 동작하도록 **REST 폴백을 유지**했다.

### 고급 기술 3 — 인증·세션

- 비밀번호는 bcrypt 해시. 평문은 어디에도 남기지 않는다.
- 세션은 SQLite `sessions` 테이블에 저장하고, 쿠키는 `HttpOnly`.
- 사용자/관리자 세션을 **쿠키 이름과 검증 함수 모두 분리**
  (`requireRequestUser` / `requireAdmin`).
- 계정 정지 시 해당 유저의 세션 행을 즉시 삭제 → 이미 로그인한 창도 다음 요청에서 끊긴다.

### 업로드

- `POST /api/uploads?kind=image|video`, 로그인 필수
- MIME 화이트리스트, 용량 제한 (이미지 8MB / 영상 100MB)
- UUID 파일명으로 경로 추측 불가
- `nosniff`, 디렉터리 리스팅 없음
- DB에는 경로 문자열만 저장 — 파일 위치를 바꿔도 스키마를 건드리지 않는다

### 테스트

```
npm test        # 137건 통과 (임시 SQLite에 시드 후 supertest)
npm run typecheck
```

각 테스트는 임시 디렉터리에 새 SQLite 파일을 만들어 시드하므로,
개발 DB를 오염시키지 않고 **서로 독립적으로** 돈다.

### 문제점 및 개선 사항

| 항목 | 현재 상태 | 계획 |
|------|-----------|------|
| **Rate limiting 없음** | 로그인 무차별 대입을 막지 못함 | `express-rate-limit` — 최우선 |
| **입력 검증 스키마 없음** | 라우트마다 수동 검사 | zod 스키마 미들웨어 (의존성은 이미 있음) |
| **보안 헤더 없음** | CSP · Referrer-Policy 미설정 | `helmet` 도입 |
| 마이그레이션 체계 없음 | `initDb()` 에서 `ensureColumn` 개별 처리 | 버전 테이블 기반 마이그레이션 |
| 실시간 단일 프로세스 전제 | `EventEmitter` 라 다중 인스턴스에서 안 퍼짐 | Redis Pub/Sub 브로커 |
| 업로드 파일 공개 | `GET /uploads/:file` 은 인증 없이 재생 | 서명 URL + 비공개 영상 |
| 검색 품질 | 관련도 정렬·페이지네이션 없음 | FTS5 인덱스 |
| `data/store.ts` 비대 | 약 1,500줄 단일 파일 | 도메인별 분할 |

### 추가할 백엔드 서버 (예정)

현재는 단일 Express 프로세스다. 아래는 **부하 특성이 다른 작업을 떼어낼 순서**로 정리했다.

| 순위 | 서버 | 역할 | 필요해지는 시점 |
|------|------|------|-----------------|
| 1 | **미디어 처리 워커** | 트랜스코딩, 썸네일 추출, 용량 최적화 | 업로드가 늘어 요청 스레드를 막기 시작할 때 |
| 2 | **실시간 브로커 (Redis)** | SSE/WS 이벤트를 인스턴스 간 전파 | API를 2대 이상으로 늘리는 순간 |
| 3 | **AI 게이트웨이** | LLM 호출 큐·재시도·비용 계측 분리 | 챗봇 호출이 API 응답 시간을 흔들 때 |
| 4 | **오브젝트 스토리지 (S3/R2)** | 업로드 원본 보관 + CDN | 디스크 용량·다중 인스턴스 공유가 필요할 때 |
| 5 | **RDBMS 전환 (Postgres)** | 동시 쓰기·복제 | SQLite 단일 파일 쓰기 락이 병목이 될 때 |
| 6 | **작업 스케줄러** | 파일 정리, 통계 집계, 정지 만료 처리 | 배치 작업이 3개를 넘을 때 |

### 미래 지향

- 이벤트 기반 알림 파이프라인 (생성 → 큐 → 팬아웃)
- OpenAPI 스펙 자동 생성 → 프론트 타입 자동 동기화
- 구조적 로깅 + 추적 ID로 요청 단위 관측
- 챗봇 응답 스트리밍 (현재는 완성 후 일괄 반환)

---

## 7. 문제 해결 사례

### 7.1 LangChain이 타임아웃을 무시해 챗봇이 몇 분씩 멈추던 문제

**증상** — 챗봇이 응답 없이 몇 분을 매달린 뒤, 사용자 화면에 `ETIMEDOUT` 이
그대로 노출됐다.

**원인** — `@langchain/google-genai` 는 `timeout` 옵션도 `AbortSignal` 도
실제 HTTP 요청에 전달하지 않는다. 우리 쪽에서 끊는 수단이 없으니 OS TCP 타임아웃이
날 때까지 기다린 것이다.

**해결** — `llm.ts` 에 `withTimeout()` 을 만들어 `Promise.race` 로 한 겹 더 감쌌다.
`CHAT_TIMEOUT_MS`(기본 45초) 상한에서 잘라내고, 내부 오류 문자열 대신
`504` + 안내 문구로 바꿔 응답한다.

**남긴 것** — 새 모델 호출을 추가할 때 반드시
`withTimeout(llm.invoke(..., chatCallOptions()))` 형태로 감싸라는 규칙을
`BackendServer/README.md` 에 명시했다. 라이브러리가 고쳐질 때까지 유효한 제약이라,
코드가 아니라 문서에 남겨야 다음 사람이 안다.

### 7.2 비회원이 임의의 이름으로 댓글을 달 수 있던 보안 결함

**증상** — 댓글 작성 API가 `author` 를 요청 본문에서 그대로 받고 있었다.
로그인하지 않아도 아무 이름으로 댓글을 쓸 수 있었다.

**해결** — 댓글 작성에 `requireRequestUser()` 를 강제하고, 작성자를 **세션에서만**
가져오도록 바꿨다. 클라이언트가 보낸 `author` 는 무시한다.

**배운 것** — "클라이언트 상태는 신뢰할 수 없다"는 원칙을 알고 있었는데도,
UI에 로그인 버튼이 있다는 이유로 서버 검사를 빠뜨렸다.
**UI의 존재는 보안 경계가 아니다.** 이 사건 이후 쓰기 API를 전부 훑어
`requireRequestUser()` 누락을 점검했다.

### 7.3 크로스 도메인에서 세션 쿠키가 실리지 않던 문제

**증상** — Cloudflare Workers에 프론트를 올리자 로컬에서 되던 로그인이 실패했다.

**원인** — 세션 쿠키가 `SameSite=Lax` 였다. 프론트와 API의 도메인이 다르면
브라우저가 쿠키를 싣지 않는다. 개발에서는 둘 다 `localhost` 라 드러나지 않았다.

**해결** — `COOKIE_DOMAIN` / `COOKIE_SAMESITE` 를 환경 변수로 빼고,
`NODE_ENV=production` 이면 CORS를 화이트리스트로만 열도록 바꿨다.
개발 편의(사설망 전체 허용)와 운영 안전을 환경으로 갈랐다.

**남긴 것** — 배포 전에 반드시 읽어야 할 항목으로 `docs/deployment.md` 3장에
정리했다. "지금 설정 그대로 올리면 로그인이 되지 않는다"고 명시해 뒀다.

### 7.4 localStorage에 쌓인 상태를 SQLite로 옮긴 대공사

**배경** — 초기에는 콘텐츠 상태를 브라우저 localStorage에 두었다.
PC를 바꾸면 사라지고, 두 사람이 같은 데이터를 볼 수 없었다.

**작업** — 커밋 038~052에 걸쳐 콘텐츠·대화·알림을 전부 SQLite로 이관하고,
`lib/content-store.ts` 에 남아 있던 localStorage 로직을 걷어냈다.
지금 그 파일에는 포맷 유틸 두 개(`formatSerial`, `formatWhen`)만 남아 있다.

**배운 것** — 저장소를 바꾸는 일은 데이터 이동보다 **호출부를 한 곳으로 모으는 일**이
먼저였다. `lib/api.ts` 단일 창구 규약이 없었다면 화면마다 흩어진 localStorage 접근을
찾아다녀야 했을 것이다.

### 7.5 `useEffect` 안 `setState` 린트 에러

**증상** — React 19 / Next 16 환경에서 `react-hooks/set-state-in-effect` 가 에러로 뜬다.

**해결** — `queueMicrotask(() => setX(...))` 로 감싸는 패턴을 저장소 전체에서
**일관되게** 사용하기로 정하고, 그 규약을 `docs/architecture/overview.md` 에 적었다.
같은 문제를 각자 다른 방식으로 우회하면 나중에 어느 쪽이 의도된 것인지 알 수 없다.

---

## 8. 테스트 · 품질 관리

| 계층 | 도구 | 건수 | 대상 |
|------|------|------|------|
| 백엔드 API | `node --test` + supertest | 137 | 인증·쇼츠·댓글·팔로우·재생목록·검색·관리자 API 등 |
| 프론트 단위 | `node --test` | 32 | 비회원 경로 판정, 오픈 리다이렉트 방지 등 순수 함수 |
| E2E | Playwright | 8 시나리오 | 게스트 접근, 로그인/로그아웃, 커뮤니티 작성, 메시지 실시간(WS) |
| 정적 검사 | `tsc --noEmit`, ESLint | 3개 앱 전부 | — |

E2E는 격리된 포트(백엔드 4310 / 프론트 3310)와 임시 SQLite로 서버를 직접 띄운다.
개발 중인 서버 상태에 영향을 받지 않는다.

### 커밋·문서 규약

- 기능 단위로 커밋을 잘게 나눈다.
- 커밋마다 `docs/commits/NNN-slug.md` 에 **배경 · 범위 · 트레이드오프 · 검증 방법 ·
  알려진 리스크**를 남기고 인덱스에 한 줄 추가한다. 현재 92편.
- 커밋 메시지는 짧게, 판단의 근거는 문서에. `git log` 로 훑는 용도와
  인수인계용 설명을 분리했다.

---

## 9. 배포

| 대상 | 방식 | 주소 |
|------|------|------|
| FrontServer | Cloudflare Workers (OpenNext) | https://vidshare-front.limjinheng0120.workers.dev |
| console | Cloudflare Workers (OpenNext) | https://vidshare-console.limjinheng0120.workers.dev |
| BackendServer | Cloudflare Tunnel (Workers 부적합) | 미공개 |

백엔드를 Workers에 올리지 않은 이유는 명확하다.
`better-sqlite3` 는 **네이티브 바인딩 + 로컬 파일 시스템**을 요구하고,
업로드 파일도 디스크에 쓴다. Workers 런타임에는 둘 다 없다.
그래서 백엔드는 Tunnel로 노출하는 경로를 택했다.

**현재 상태**: 프론트 2종은 배포되어 있으나 공개 백엔드 주소가 연결되기 전이라
**UI 확인용**이다. 전체 기능은 로컬 실행으로 확인할 수 있다.

---

## 10. 회고

### 잘한 결정

1. **관리자 콘솔을 별도 앱으로 분리한 것.**
   사용자 앱에 관리 기능을 넣었다면 권한 경계를 진지하게 설계하지 않았을 것이다.
   쿠키 이름을 나눈 사소한 결정 하나가 "두 세션이 공존해야 한다"는 요구를 드러냈다.
2. **`lib/api.ts` 단일 창구 규약.**
   localStorage → SQLite 이관, 크로스 도메인 쿠키 대응 모두 이 규약 덕분에
   고칠 지점이 한 곳이었다.
3. **한계를 문서에 적어 둔 것.**
   Rate limit 없음, 감사 로그 없음, 실시간 단일 프로세스 전제 —
   모르는 것과 알고 미룬 것은 다르다. `docs/security/security-notes.md` 에
   체크리스트로 남겼다.

### 아쉬운 점

1. **CI를 마지막까지 미룬 것.** 테스트는 177건을 만들어 놓고 자동 실행은 수동이다.
   PR마다 세 앱을 검증하는 파이프라인을 먼저 깔았어야 했다.
2. **`data/store.ts` 가 1,500줄이 되도록 방치한 것.**
   초반에 도메인별로 나눴다면 지금 분할 비용이 없었다.
3. **성능·접근성을 측정한 적이 없다.** 기능이 안정된 지금이 기준선을 잡을 시점이다.

### 다음 목표 (우선순위)

1. 백엔드 공개 배포 → 프론트 재배포로 **동작하는 라이브 데모** 완성
2. CI 파이프라인 (PR마다 3개 앱 typecheck / lint / test)
3. Rate limiting + 보안 헤더 + 입력 검증 스키마
4. 관리자 조치 감사 로그
5. 접근성·성능 기준선 측정

---

## 부록 — 로컬 실행

```bash
# 1. 백엔드
cd BackendServer && npm install && npm run dev      # :4000

# 2. 사용자 사이트
cd FrontServer && npm install && npm run dev        # :3000

# 3. 관리자 콘솔 (선택)
cd console && npm install && npm run dev            # :3200
cd BackendServer && npm run create-admin -- <handle> <password>
```

데모 계정: `demo` / `demo1234`

관리자 계정은 시드에 없으므로 위 CLI로 직접 만든다.

### 검증

```bash
cd BackendServer && npm test && npm run typecheck
cd FrontServer   && npm test && npm run lint
cd console       && npm run typecheck && npm run lint
```
