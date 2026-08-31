# 070 — 프론트 비회원 경로 테스트

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `070` |
| **파일명** | `070-frontend-guest-route-tests.md` |
| **Git 커밋 (short)** | `db8198d` |
| **Git 커밋 (full)** | `db8198d22fed9d75eb72e74c337603a571a20b41` |
| **날짜** | `2026-09-01` |
| **작성자** | `GitHub Copilot (pair)` |
| **브랜치** | `master` |
| **로드맵 항목** | Phase C — 프론트 테스트 (일부) |

---

## 1. 커밋 내용

```
test: 비회원 접근 경로 회귀 테스트 28건

- FrontServer 에 node:test + tsx 도입
- isGuestAllowedPath / loginHref / safeNextPath 커버
- npm test, npm run typecheck 추가
```

---

## 2. 개요

068에서 고친 회귀(`/search` 가 비회원에게 막힘)는
**새 공개 페이지를 만들 때 허용 목록 갱신을 잊으면 반복된다.**
068 문서에도 "허용 목록이 흩어진 정규식이라 빠뜨리기 쉽다"고 적어 뒀다.

`isGuestAllowedPath` 는 의존성 없는 순수 함수이므로
무거운 컴포넌트 테스트 환경 없이도 바로 테스트할 수 있다.

---

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `FrontServer/tests/guest-routes.test.ts` | 신규 — 28건 |
| `FrontServer/package.json` | `test`, `typecheck` 스크립트 + `tsx` |

---

## 4. 러너

백엔드(066)와 동일하게 **`node:test` + `tsx`** 를 썼다.
`tsx` 하나만 추가했고 별도 설정 파일이 없다.

React 컴포넌트 테스트는 이번 범위가 아니다. 그건 jsdom·RTL 등
별도 도입이 필요해 로드맵에 남겨 뒀다.

---

## 5. 커버리지

| 그룹 | 건수 | 내용 |
|------|------|------|
| 공개 경로 | 13 | `/`, `/login`, `/register`, `/longform`, `/longform/:id`, `/community`, `/community/:id`, `/chatbot`, `/chatbot/:id`, **`/search`**, `/profile/:id`, **`/profile/:id/followers`**, **`/profile/:id/following`** |
| 로그인 필요 경로 | 9 | `/upload`, `/messages`, `/notifications`, `/support`, **`/following`** 등 |
| `loginHref` | 3 | 인코딩, 외부 URL 차단, 로그인 순환 방지 |
| `safeNextPath` | 3 | 내부 경로 통과, `//` 차단, 빈 값 |
| **합계** | **28** | |

굵게 표시한 것이 이번에 문제됐거나 새로 추가된 경로다.

`/following`(개인 피드)과 `/profile/:id/following`(공개 목록)을
혼동하지 않는지 확인하는 테스트를 따로 뒀다. 이름이 비슷해 실수하기 쉽다.

### 보안 관련

`loginHref`·`safeNextPath` 의 오픈 리다이렉트 방지도 함께 검증한다.
`//evil.example` 이나 `https://evil.example` 이 `next` 로 들어와도 `/` 로 떨어진다.

---

## 6. 검증 (테스트가 실제로 잡는지 확인)

테스트를 믿을 수 있는지 보려고 **068 수정을 일부러 되돌려 봤다.**

```diff
- if (pathname === "/search") return true;
```

```
actual: false
expected: true
Command exited with code 1
```

정확히 실패했다. 되돌린 뒤 28/28 통과, `tsc --noEmit` 도 통과.
(FrontServer `tsconfig.json` 의 `include` 가 `**/*.ts` 라 테스트도 타입 검사 대상이다.)

---

## 7. 남은 한계

1. **컴포넌트 렌더링은 검증 안 됨** — 순수 함수만 다룬다.
   `GuestRouteGuard` 가 이 함수를 실제로 쓰는지는 테스트가 보장하지 않는다.
2. **E2E 없음** — 브라우저에서 실제 리다이렉트가 일어나는지는 수동 확인했다.
3. **다른 lib 함수 미커버** — `media.ts`, `content-store.ts` 등은 아직 테스트가 없다.

---

## 8. 관련 문서

- [066 — 백엔드 자동화 테스트](./066-backend-automated-tests.md) (같은 러너)
- [068 — 비회원 접근 경로 수정](./068-guest-route-search-fix.md) (이 테스트가 막는 회귀)
