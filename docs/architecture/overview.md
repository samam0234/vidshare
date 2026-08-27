# 아키텍처 개요

**상태**: 구현됨 — FrontServer(Next.js) + BackendServer(Express + SQLite) 전면 연동 완료
**최종 갱신**: 2026-08-26
**대상 독자**: 이 저장소를 처음 인수받는 개발자/에이전트

---

## 1. 한 줄 요약

VidShare는 **쇼츠 + 롱폼 + 커뮤니티 + 메시지 + AI 챗봇**을 한 앱에 담은 영상 공유 플랫폼이며,
프론트(Next.js)와 백엔드(Express + SQLite)를 폴더로 분리한 모노레포다.

```
[Browser]
    │
    ▼
[FrontServer :3000]  Next.js 15 App Router
    │  app/ (라우트) · components/ (UI) · context/ (전역) · lib/ (API·스토어)
    │  lib/api.ts  ── 모든 서버 통신의 단일 창구
    │
    ▼ fetch(credentials: "include")
[BackendServer :4000]  Express REST API
    │  routes/ → data/store.ts → db/client.ts
    ▼
[SQLite]  BackendServer/data/vidshare.sqlite  (18개 테이블)
[Files]   BackendServer/uploads/  ← 영상·썸네일. DB에는 /uploads/<uuid>.ext 만 저장
```

| 폴더 | 역할 | 포트 |
|------|------|------|
| `vidshare/FrontServer/` | Next.js UI | 3000 |
| `vidshare/BackendServer/` | Express API + SQLite | 4000 |
| `vidshare/docs/` | 설계·이력·커밋 상세 | — |

---

## 2. 현재 구현 상태 (2026-08-26 기준)

### ✅ 완료

| 영역 | 상태 |
|------|------|
| 인증 | 회원가입·로그인·세션 (bcrypt + HttpOnly 쿠키 + SQLite) |
| 쇼츠 | 목록·상세·생성·좋아요·댓글, 실파일 업로드 (API 연동) |
| 롱폼 | 목록·작성·상세 (API 연동) |
| 커뮤니티 | 목록·작성·상세 (API 연동) |
| 메시지 | 대화 목록·스레드·전송 (API 연동) |
| 고객센터 | FAQ, 문의 작성·목록·상세 (API 연동) |
| 알림 | 목록·상세·읽음·삭제·수신 토글 (API 연동) |
| 챗봇 | Locals/Vide/Shape 3모델, RAG, 멀티모달 첨부, 스레드 영속화 |
| 게스트 정책 | 비회원 열람 전용 (작성·메시지·업로드는 로그인 필요) |
| localStorage 탈피 | 콘텐츠 상태를 전부 SQLite로 이관 (커밋 038~052) |

### ⚠️ 미완 / 알려진 한계

| 항목 | 설명 |
|------|------|
| 실파일 업로드 | **057에서 로컬 `uploads/` 도입.** 트랜스코딩·비공개 URL·오브젝트 스토리지는 없음 |
| 실시간성 | 알림·메시지 모두 폴링/수동 새로고침. WebSocket/SSE 없음 |
| 벌크 API | **058에서 도입.** 개별 `/:id` 도 유지 |
| 알림 수신 거부 | 클라이언트 localStorage 전용. 서버는 계속 알림 생성 |
| 검색 | Navbar 검색이 쇼츠 `?q=` 만 지원. 롱폼·커뮤니티·유저 미지원 |
| 테스트 | 자동화 테스트 없음 (수동 검증만) |
| `lib/mock-data.ts` | 잔존. 일부 시드/폴백 용도로만 남아 있음 |

---

## 3. 데이터 흐름 (현재)

```
사용자 입력
    │
    ▼
Client Component (useState)
    │
    ▼
lib/api.ts  ─── fetch(credentials: "include")
    │
    ▼
Express route  ── requireRequestUser(req) 로 인증 검사
    │
    ▼
data/store.ts  ── better-sqlite3 prepared statement
    │
    ▼
SQLite (vidshare.sqlite)
    │
    ▼
{ success, data?, error? }  ← 모든 응답의 고정 형태
    │
    ▼
컴포넌트 상태 갱신 → 리렌더
```

**핵심 규약**

1. 모든 API 응답은 `{ success: boolean; data?: T; error?: string }` 형태(`ApiResult<T>`)
2. 인증이 필요한 라우트는 `requireRequestUser(req)` 로 시작 (없으면 401 throw)
3. 소유자 스코프 테이블은 전부 `WHERE owner_id = ?` 로 격리
4. 프론트는 **`lib/api.ts` 를 거치지 않고 fetch 하지 않는다**

---

## 4. FrontServer 구조

### 라우트 맵

| Route | 컴포넌트 | 인증 |
|-------|----------|------|
| `/` | `ShortsFeed` | 열람 자유 |
| `/profile/[id]` | `ProfilePageClient` | 열람 자유 |
| `/upload` | `UploadForm` | 필요 |
| `/longform`, `/longform/[id]` | `LongformList`, `LongformDetail` | 열람 자유 |
| `/longform/write` | `LongformForm` | 필요 |
| `/community`, `/community/[id]` | `CommunityList`, `CommunityDetail` | 열람 자유 |
| `/community/write` | `CommunityForm` | 필요 |
| `/messages`, `/messages/[id]` | `MessagesPageClient`, `MessageThread` | 필요 |
| `/notifications`, `/notifications/[id]` | `NotificationList`, `NotificationDetail` | 필요 |
| `/chatbot`, `/chatbot/[id]` | `ChatbotWorkspace` | 게스트=Locals만 |
| `/support`, `/support/[id]` | `FaqAccordion`+`SupportContact`, `InquiryDetail` | 문의는 로그인 |
| `/login`, `/register` | 인증 폼 | — |

공통 셸: `app/layout.tsx` → `ThemeProvider` + `AuthProvider` + `Navbar` + `Footer`

### `lib/` 모듈 역할

| 파일 | 역할 |
|------|------|
| `api.ts` | **서버 통신 단일 창구**. 40+ 메서드, `ApiResult<T>` 반환. `uploadFile` 은 FormData |
| `media.ts` | `/uploads` 를 API 호스트에 붙이는 `mediaUrl()`, 용량·형식 검사 |
| `auth.ts` | 인증 헬퍼 |
| `notifications-store.ts` | `useSyncExternalStore` 기반 알림 전역 상태 |
| `content-store.ts` | `formatSerial()`, `formatWhen()` 두 유틸만 (localStorage 로직 제거됨) |
| `chatbot-corpus.ts` | Shape 모델용 RAG 코퍼스 수집 |
| `chatbot-models.ts` | 모델 티어 정의 (locals/vide/shape) |
| `chat-files.ts` | 첨부 파일 → `ChatbotAttachment` 변환 |
| `guest-routes.ts` | 비회원 리다이렉트 경로 |
| `utils.ts` | `cn()`, 숫자 포맷 등 |
| `mock-data.ts` | ⚠️ 잔존 시드. 신규 코드에서 사용 금지 |

### 상태 관리 전략

| 종류 | 방식 |
|------|------|
| 서버 데이터 | 컴포넌트 로컬 `useState` + `useEffect` 페치 (React Query 미도입) |
| 알림 | `useSyncExternalStore` 전역 스토어 (Navbar·목록·팝업이 공유) |
| 테마 | `useSyncExternalStore` + localStorage |
| 인증 | `context/AuthContext` |
| 챗봇 게스트 | 컴포넌트 로컬 state (영속화 없음, 새로고침 시 소실) |

> **린트 규약**: `useEffect` 안에서 `setState` 를 직접 호출하면
> `react-hooks/set-state-in-effect` 에러가 난다. 이 저장소는 `queueMicrotask(() => setX(...))`
> 로 감싸는 패턴을 일관되게 사용한다.

---

## 5. BackendServer 구조

```
src/
├── app.ts               ← Express 앱 조립 + 라우트 등록 + 엔드포인트 목록 응답
├── index.ts             ← 서버 부팅 (LAN IP 출력 포함)
├── auth/
│   ├── accounts.ts      ← bcrypt 해시, 계정 생성/조회
│   ├── sessions.ts      ← 세션 발급/검증
│   └── requestUser.ts   ← requireRequestUser() 인증 미들웨어
├── chatbot/
│   ├── complete.ts      ← POST /api/chatbot/complete 진입점
│   ├── llm.ts           ← 원격 LLM 호출 래퍼
│   ├── locals.ts / vide.ts / shape.ts   ← 모델별 체인·그래프
│   ├── platform.ts      ← 플랫폼 JSON 스냅샷 RAG
│   └── store.ts         ← 챗봇 문서·요약 저장
├── data/
│   ├── store.ts         ← ★ 모든 CRUD 함수 (~1500줄)
│   └── seedData.ts
├── db/
│   ├── client.ts        ← better-sqlite3 커넥션
│   ├── schema.ts        ← CREATE TABLE 18개
│   └── seed.ts
├── middleware/errorHandler.ts   ← HttpError → JSON 변환
├── routes/              ← 13개 라우터
├── upload/files.ts      ← 디스크 경로·MIME 화이트리스트
└── types/index.ts
```

### 라우트 목록

| 경로 | 파일 | 인증 |
|------|------|------|
| `/api/health` | `health.ts` | — |
| `/api/auth/*` | `auth.ts` | 일부 |
| `/api/shorts`, `/api/shorts/:id` | `shorts.ts` | 생성 시 필요 |
| `/api/shorts/:id/comments` | `comments.ts` | 작성 시 필요 |
| `/api/users/:id` | `users.ts` | — |
| `/api/longform` | `longform.ts` | 생성 시 필요 |
| `/api/community` | `community.ts` | 생성 시 필요 |
| `/api/conversations` | `conversations.ts` | 필요 |
| `/api/messages` | `messages.ts` | 필요 |
| `/api/notifications` | `notifications.ts` | 필요 (`GET`, `PATCH /read-all`, `DELETE /`, `/:id`) |
| `/api/support/faq`, `/api/support/inquiries` | `support.ts` | 문의는 필요 |
| `/api/chatbot/complete` | `chatbot.ts` | — |
| `/api/chatbot/threads` | `chatbot-threads.ts` | 필요 |
| `/api/uploads` | `uploads.ts` | 필요 |
| `/uploads/:file` | `express.static` | 공개 (재생용) |

### SQLite 테이블 (18개)

| 그룹 | 테이블 |
|------|--------|
| 인증 | `users`, `sessions` |
| 쇼츠 | `shorts`, `comments` |
| 레거시 메시지/알림 | `notifications`, `chat_users`, `messages` |
| 고객센터 | `faqs`, `support_inquiries` |
| 챗봇 | `chatbot_docs`, `chatbot_summaries`, `chatbot_threads`, `chatbot_messages` |
| 콘텐츠 (038 추가) | `longform`, `community_posts` |
| 대화 (038 추가) | `conversations`, `chat_lines` |
| 알림 (038 추가) | `activity_notifications` |

> ⚠️ `notifications` (레거시) 와 `activity_notifications` (신규) 가 공존한다.
> 프론트가 쓰는 `/api/notifications` 는 **`activity_notifications`** 를 읽는다.
> 레거시 테이블 정리는 미완 과제.

---

## 6. 챗봇 아키텍처

| 모델 | 접근 | LLM | 영속화 | RAG |
|------|------|-----|--------|-----|
| **Locals** | 무료·비회원 가능 | 단순 체인 | ❌ (게스트는 메모리만) | ❌ |
| **Vide** | 회원 전용 | 요약 그래프 (LangGraph) | ✅ SQLite | 부분 |
| **Shape** | 회원 전용 | 고급 체인 | ✅ SQLite | ✅ 저장 대화 + 플랫폼 코퍼스 |

- Shape 는 전송 전 프론트에서 `collectChatCorpus()` + `collectPlatformCorpus()` 로 컨텍스트를 모은다
- 첨부: 이미지/PDF/DOCX → Locals·Vide 는 Gemini 비전 직봉, Shape 는 Gemini 설명 경유
- 봇 답변은 `ChatMarkdown` 으로 렌더 (굵게·이탤릭·취소선·목록)

---

## 7. 스타일 아키텍처

- **Tailwind CSS v4** (`@import "tailwindcss"`)
- 시맨틱 CSS 변수 토큰: `--bg`, `--bg-card`, `--bg-elevated`, `--text`, `--text-muted`, `--accent`, `--accent-hot`, `--border`, `--btn`, `--danger`, `--shadow`
- 라이트 모드는 `html.light` 에서 변수 재정의
- 커스텀 유틸: `surface`, `glass-btn`, `logo-grad`, `shorts-snap`, `custom-scroll`
- **하드코딩 색상 금지** — 반드시 CSS 변수 사용

---

## 8. 로컬 실행

```powershell
# 백엔드 (터미널 1)
cd vidshare/BackendServer
npm install
npm run dev          # http://localhost:4000

# 프론트 (터미널 2)
cd vidshare/FrontServer
npm install
npm run dev          # http://localhost:3000
```

- 데모 계정: `demo` / `demo1234`
- LAN 접속 시 프론트는 `window.location.hostname:4000` 으로 API를 자동 지정한다
- 검증 명령: `npx tsc --noEmit` + `npm run lint`
  (`app/layout.tsx` 의 `no-page-custom-font` 경고 1건은 기존 이슈로 무시)

---

## 9. 다음 작업자가 알아야 할 것

1. **새 기능을 붙일 때 순서**
   `db/schema.ts` → `data/store.ts` → `routes/*.ts` → `app.ts` 등록 → `lib/api.ts` → 컴포넌트
2. **커밋 규칙**: 기능 단위로 잘게 쪼개고, `docs/commits/NNN-*.md` 에 상세를 남긴 뒤
   `docs/commits/README.md` 인덱스에 한 줄 추가한다 (해시는 커밋 후 채움)
3. **한글 파일 편집 주의**: PowerShell `Get-Content | Set-Content` 는 UTF-8 한글을 깨뜨린다.
   에디터 도구로 편집할 것
4. SQLite 현재 내용은 `BackendServer/data/DataBaseColumn.md` 에 자동 덤프된다 (gitignore).
5. 남은 과제 목록은 [features/roadmap.md](../features/roadmap.md) 참고

---

## 10. 관련 문서

- [기능 로드맵 (다음 할 일)](../features/roadmap.md)
- [변경 이력](../changelog/CHANGELOG.md)
- [보안 노트](../security/security-notes.md)
- [커밋 상세 기록](../commits/README.md)
