# 068 — 비회원 접근 경로 수정 (검색 회귀)

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `068` |
| **파일명** | `068-guest-route-search-fix.md` |
| **Git 커밋 (short)** | `d3a43f0` |
| **Git 커밋 (full)** | `d3a43f062c83d619de0a234b2bbdc6e78318200b` |
| **날짜** | `2026-09-01` |
| **작성자** | `GitHub Copilot (pair)` |
| **브랜치** | `master` |

---

## 1. 커밋 내용

```
fix: 비회원이 검색·팔로우 목록 페이지에 접근하지 못하던 문제

- isGuestAllowedPath 에 /search 추가 (063 회귀)
- /profile/:id/followers, /profile/:id/following 추가
```

---

## 2. 개요 (회귀 경위)

커밋 063에서 `/search` 페이지를 만들면서 **`lib/guest-routes.ts` 의 허용 목록에 추가하지 않았다.**
그 결과 비회원이 Navbar 검색을 하면 결과 대신 로그인 화면으로 리다이렉트됐다.

검색 결과에는 공개 콘텐츠(쇼츠·롱폼·커뮤니티·유저)만 담기므로 로그인을 요구할 이유가 없다.

### 왜 063에서 못 잡았나

063에서는 **API만 실측**하고 페이지는 타입체크·린트만 통과시켰다.
`GuestRouteGuard` 는 레이아웃 레벨에서 동작하므로 컴포넌트 단위 검사로는 드러나지 않는다.

브라우저로 비회원 상태에서 `/search?q=깃털` 을 열어 보고서야 발견했다.

---

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `FrontServer/lib/guest-routes.ts` | 허용 경로 2종 추가 |

---

## 4. 변경 내용

```diff
  if (/^\/chatbot\/\d+$/.test(pathname)) return true;
+ if (pathname === "/search") return true;
  if (/^\/profile\/[^/]+$/.test(pathname)) return true;
+ if (/^\/profile\/[^/]+\/(followers|following)$/.test(pathname)) return true;
  return false;
```

### 판단 근거

| 경로 | 비회원 허용? | 이유 |
|------|-------------|------|
| `/search` | ✅ | 공개 콘텐츠만 노출. 프로필·롱폼·커뮤니티가 이미 공개 |
| `/profile/:id/followers` | ✅ | 프로필 본문(`/profile/:id`)이 이미 공개 |
| `/profile/:id/following` | ✅ | 위와 동일 |
| `/following` (내 피드) | ❌ | 개인화된 피드. 로그인 필요가 맞다 |

`/following` 은 의도적으로 제외했다.

---

## 5. 검증 (브라우저)

비회원 상태에서 확인:

| 경로 | 이전 | 이후 |
|------|------|------|
| `/search?q=깃털` | 로그인 화면 | 쇼츠 2건 + 유저 1건 정상 표시 |
| `/profile/u1/followers` | 로그인 화면 | "깃털유머 님의 팔로워" 정상 표시 |
| `/following` | 로그인 화면 | 로그인 화면 (의도대로 유지) |

`npx tsc --noEmit`, `npm run lint` 통과.

---

## 6. 남은 한계

**허용 목록이 코드에 흩어진 정규식이라 새 공개 페이지를 추가할 때 빠뜨리기 쉽다.**
이번이 그 사례다. 페이지 파일 옆에 메타데이터로 선언하거나,
비회원 접근을 테스트로 강제하는 편이 안전하다.

---

## 7. 관련 문서

- [063 — 통합 검색](./063-unified-search.md) (회귀 원인)
- [028 — 비회원 열람 전용](./028-guest-read-only.md)
