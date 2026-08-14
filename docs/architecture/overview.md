# 아키텍처 개요

**상태**: 구현됨 (FrontServer + BackendServer 분리)  
**최종 갱신**: 2026-08-14

---

## 1. 한 줄 요약

VidShare는 **프론트(FrontServer)** 와 **백엔드(BackendServer)** 를 폴더로 나눈 구조입니다.

```
[Browser]
    │
    ▼
[FrontServer :3000]  Next.js App Router
    │  layout / pages / components
    │  lib/mock-data.ts  ← UI가 아직 주로 사용
    │  lib/api.ts        ← BackendServer 호출 스텁
    │
    ▼ (예정: 전면 연동)
[BackendServer :4000]  Express REST API
    │  routes + in-memory store
    └── (예정) DB / Auth / Storage
```

| 폴더 | 역할 | 포트 |
|------|------|------|
| `vidshare/FrontServer/` | Next.js UI | 3000 |
| `vidshare/BackendServer/` | Express API | 4000 |
| `oldplanHTML/` | 구 HTML 예시 (project 루트) | — |

---

## 2. 레이어 구분

| 레이어 | 위치 | 역할 |
|--------|------|------|
| 라우팅·페이지 | `app/` | URL ↔ 화면 매핑, 메타데이터 |
| 프레젠테이션 | `components/` | UI 조각, 클라이언트 인터랙션 |
| 전역 상태 | `context/` | 테마 등 앱 전역 |
| 도메인 타입 | `types/` | Short, Comment, Notification 등 |
| 데이터(임시) | `lib/mock-data.ts` | 정적 시드 데이터 |
| 유틸 | `lib/utils.ts` | `cn`, 숫자 포맷, 랜덤 그라데이션 등 |

---

## 3. 라우팅 맵

| Route | 주 컴포넌트 | 렌더 특성 |
|-------|-------------|-----------|
| `/` | `ShortsFeed` | 서버 페이지 + 클라이언트 피드 (`searchParams`) |
| `/profile/[id]` | `ProfilePageClient` | 동적 세그먼트 |
| `/upload` | `UploadForm` | 클라이언트 폼 |
| `/messages` | `MessagesPageClient` | 클라이언트 상태 |
| `/notifications` | `NotificationList` | 클라이언트 필터 |
| `/support` | `FaqAccordion` | 클라이언트 아코디언 |

공통: `app/layout.tsx` → `ThemeProvider` + `Navbar` + `Footer`

---

## 4. 폴더 역할 상세

### `app/`
- App Router 규칙: `page.tsx` = 라우트, `layout.tsx` = 공통 셸
- `globals.css`: Tailwind import + 디자인 토큰(CSS 변수)

### `components/`
도메인별 분리:
- `layout/` — Navbar, Footer, NotificationPopup
- `shorts/` — 피드·카드·댓글·스크롤 네비
- `profile/` — 프로필 헤더·탭·그리드
- `upload/` — 폼·미리보기
- `messages/` — 채팅·유저 리스트
- `notifications/` — 알림 리스트
- `support/` — FAQ

### `context/ThemeContext.tsx`
- `useSyncExternalStore` 기반 테마 스토어
- `localStorage` 키: `vidshare-theme`
- DOM class: `html.dark` / `html.light`

### `lib/mock-data.ts`
현재 UI가 **주로 사용하는** 콘텐츠 소스.

### `lib/api.ts`
BackendServer (`NEXT_PUBLIC_API_URL`, 기본 `http://localhost:4000`) HTTP 클라이언트.  
점진적으로 mock 대신 이 모듈을 쓰도록 교체합니다.

### `BackendServer/` (형제 폴더)
Express + TypeScript. 인메모리 `store` 로 쇼츠·댓글·알림·메시지·FAQ API 제공.  
상세: [`../BackendServer/README.md`](../BackendServer/README.md) (`vidshare/BackendServer`)

---

## 5. 데이터 흐름 (현재)

```
mock-data ──import──► Client Components ──useState──► UI
                              │
                              └── 사용자 입력 (댓글, 좋아요 등)
                                    (메모리만, 새로고침 시 소실)
```

### 목표 데이터 흐름 (미구현)

```
Browser → Route Handler / API → DB / Storage
                ↑
         auth session
```

---

## 6. 스타일 아키텍처

- **Tailwind CSS v4** (`@import "tailwindcss"`)
- 시맨틱 토큰: `--bg`, `--text`, `--accent`, `--border` 등
- 라이트 모드: `html.light` 에서 변수 재정의
- 유틸 클래스: `surface`, `glass-btn`, `logo-grad`, `shorts-snap`

---

## 7. 클라이언트 vs 서버

| 구분 | 예시 |
|------|------|
| Server Component (기본) | `app/**/page.tsx` 일부, layout 골격 |
| Client Component (`"use client"`) | Navbar, ShortsFeed, 폼, 테마 |

상호작용·브라우저 API(`localStorage`, video, clipboard)가 필요한 곳은 클라이언트로 분리합니다.

---

## 8. 확장 시 권장 경계

1. **`lib/api/`** — HTTP 클라이언트 (mock 구현체 ↔ 실제 구현체 교체)
2. **`app/api/`** — Route Handlers (BFF)
3. **서버 상태** — React Query / SWR 등 (목록·캐시)
4. **인증 컨텍스트** — 세션 사용자 (`currentUser` mock 대체)

이 경계를 지키면 UI 컴포넌트 변경을 최소화하고 백엔드만 붙일 수 있습니다.

---

## 9. 관련 문서

- [기능 로드맵](../features/roadmap.md)
- [보안 노트](../security/security-notes.md)
- [변경 이력](../changelog/CHANGELOG.md)
