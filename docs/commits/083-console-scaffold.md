# 083 — 관리자 콘솔 앱 뼈대 (`console/`)

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `083` |
| **파일명** | `083-console-scaffold.md` |
| **Git 커밋 (short)** | `8f49a8c` |
| **Git 커밋 (full)** | `8f49a8c02035afab0ca14b42c07d1b17c1541f49` |
| **날짜** | `2026-09-01` |
| **작성자** | `Claude (pair)` |
| **브랜치** | `master` |
| **로드맵 항목** | 운영 — 관리자 콘솔 (3/4) |

---

## 1. 커밋 내용

```
feat: 관리자 콘솔 앱 뼈대 (console/, 포트 3200)

- FrontServer 와 형제 폴더로 별도 Next.js 앱 스캐폴드
- AdminAuthContext (useSyncExternalStore, 회원가입 없음)
- AdminRouteGuard — /login 을 제외한 전 경로를 관리자 전용으로
- AdminNav, 로그인 화면, 대시보드
```

---

## 2. 개요

### 배경
082까지 관리자 API가 다 생겼지만 부를 곳이 없다. 관리자 화면을 FrontServer
안에 `/admin` 으로 넣을 수도 있었지만, 사용자 앱 번들과 라우팅에 운영 화면이
섞이고 "비회원 허용 경로" 로직(068에서 한 번 회귀가 났던 곳)도 복잡해진다.
별도 앱으로 뺐다.

### 목표
`console/` 을 띄워서 관리자로 로그인하고 대시보드를 보는 데까지.

### 범위 (In Scope)
- Next.js 앱 스캐폴드 (포트 3200)
- 인증 컨텍스트·라우트 가드·내비게이션
- 로그인 화면, 대시보드 화면

### 범위 밖 (Out of Scope)
- **React Query**: 콘솔은 목록이 작고 재방문 패턴이 사용자 앱과 다르다.
  080에서 FrontServer에 넣은 이유(같은 목록을 자주 드나듦)가 여기엔 약해서
  plain `fetch` + `useState` 로 시작한다. 필요해지면 그때 넣는다.
- **테마 토글**: 콘솔은 다크 고정. 운영자가 사용자 사이트와 헷갈리지 않게
  액센트도 호박색으로 다르게 뒀다.
- **E2E 테스트**: 이번 범위에서 생략(사용자 결정). API 계층은 백엔드 테스트
  32건으로, 화면은 수동으로 확인한다.

---

## 3. 구현 기능 · 변경 사항

### 기능 / 동작
- [x] `npm run dev` → `http://localhost:3200`
- [x] 비로그인 상태로 아무 경로나 열면 `/login` 으로 replace
- [x] 로그인한 채 `/login` 을 열면 대시보드로 replace
- [x] 대시보드가 운영 지표 7장을 카드로 보여주고, 미처리 건이 있으면 강조
- [x] 각 카드가 해당 관리 화면으로 연결

### 주요 변경 파일·경로
| 경로 | 변경 유형 | 설명 |
|------|-----------|------|
| `console/package.json` | 추가 | `next dev -H 0.0.0.0 -p 3200` |
| `console/tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs` | 추가 | FrontServer 관례 그대로 |
| `console/app/globals.css` | 추가 | 같은 변수 이름, 다크 고정 + 호박색 액센트 |
| `console/app/layout.tsx` | 추가 | `AdminAuthProvider > AdminNav > AdminRouteGuard` |
| `console/context/AdminAuthContext.tsx` | 추가 | `useSyncExternalStore` 싱글턴 |
| `console/components/layout/AdminRouteGuard.tsx` | 추가 | `/login` 외 전 경로 보호 |
| `console/components/layout/AdminNav.tsx` | 추가 | 상단 내비 + 로그아웃 |
| `console/components/admin/LoginClient.tsx` | 추가 | 로그인 폼 |
| `console/components/admin/DashboardClient.tsx` | 추가 | 지표 카드 |
| `console/components/ui/Page.tsx` | 추가 | `PageShell`/`PageHeader`/`Panel`/`ListState` |
| `console/lib/api.ts`, `lib/adminApi.ts`, `lib/format.ts`, `types/index.ts` | 추가 | HTTP 클라이언트·타입 |

### UI/UX
- 상단 배지 `ADMIN` + 호박색 액센트로 사용자 사이트와 시각적으로 구분.
- `robots: { index: false }` — 콘솔이 검색에 잡히지 않게.

---

## 4. 기타

### 검증 방법
```bash
cd console
npm install
npm run typecheck   # 통과
npm run lint        # 폰트 경고 1건(FrontServer와 동일) 외 통과
npm run build       # 통과
```

### 트레이드오프 · 결정 이유
- **별도 앱 vs `/admin` 라우트**: 위 배경 참고. 대신 앱이 셋이 되면서 `types`,
  `lib/api.ts` 의 일부가 FrontServer와 중복된다. 공유 패키지(workspace)를
  만들 만한 규모가 아니라고 보고 **의도적으로 작은 중복을 허용**했다.
  콘솔 `types/index.ts` 에는 콘솔이 실제로 쓰는 타입만 있다.
- **`globals.css` 복사**: 심볼릭 링크나 workspace 대신 복사. 팔레트를 바꾸면
  두 파일을 함께 고쳐야 하고, 그 사실을 파일 맨 위 주석에 적어 뒀다.
- **포트 3200**: 기존에 쓰는 3000/3100/4000/3310/4310과 겹치지 않는 번호.
- **쿠키 충돌이 자동으로 해결되는 이유**: `adminApi` 는 `/api/admin/*` 만
  호출하고, 그 라우트들은 `vidshare_admin_sid` 만 읽고 쓴다(081). 이름이
  다르므로 같은 브라우저에서 두 세션이 공존한다.

### 리스크 · 알려진 이슈
- 콘솔에는 자동화 테스트가 없다. 회귀는 백엔드 테스트가 잡고, 화면은 수동 확인.
- `AdminAuthContext` 의 스토어가 모듈 스코프 싱글턴이라 FrontServer의
  `AuthContext` 와 같은 제약을 갖는다(SSR 스냅샷은 항상 비로그인).

### 후속 작업
- [x] 084 — 나머지 4개 화면
- [ ] 콘솔 E2E (지금은 생략)

### 참고 링크
- [082 — 관리자 API](./082-admin-api.md)
- [084 — 관리자 콘솔 화면](./084-console-screens.md)

---

## 작성 체크리스트

- [x] 문서 번호·파일명 규칙 준수
- [x] 인덱스 표 업데이트 (`commits/README.md`)
- [x] CHANGELOG 반영 여부 결정
- [x] Git 해시 기입 (TBD 해소)
- [x] 민감 정보(키, 비밀번호, 개인정보) 없음
