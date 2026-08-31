# 073 — 에러 바운더리 (error.tsx, global-error.tsx, not-found.tsx)

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `073` |
| **파일명** | `073-error-boundaries.md` |
| **Git 커밋 (short)** | `1a69105` |
| **Git 커밋 (full)** | `1a691051b602cb83280b695bfe0e2a1674258ca7` |
| **날짜** | `2026-09-01` |
| **작성자** | `GitHub Copilot (pair)` |
| **브랜치** | `master` |
| **로드맵 항목** | Phase C — 에러 바운더리 |

---

## 1. 커밋 내용

```
feat: 페이지 단위 에러 바운더리 추가

- app/error.tsx: 일반 렌더링 에러, 다시 시도/홈으로
- app/global-error.tsx: 루트 레이아웃 자체 실패 시 (독립 html/body)
- app/not-found.tsx: 커스텀 404
```

---

## 2. 개요

이전에는 컴포넌트 렌더링 중 에러가 나면 **Next.js 기본 에러 화면**(개발 모드 스택 트레이스,
프로덕션에서는 흰 화면)이 떴다. 서비스 톤과 맞지 않고, 사용자가 복구할 방법도 없었다.

---

## 3. 변경 파일

| 파일 | 역할 |
|------|------|
| `FrontServer/app/error.tsx` | 라우트 트리 안에서 발생한 에러 (Client Component 필수) |
| `FrontServer/app/global-error.tsx` | 루트 레이아웃 자체가 던지는 에러 |
| `FrontServer/app/not-found.tsx` | `notFound()` 호출 또는 매칭 라우트 없음 |

---

## 4. 설계

### `error.tsx`

- "use client" 필수 (Next.js 요구사항)
- `reset()` 으로 같은 라우트 재시도, 홈으로 나가는 링크 병행
- `useEffect` 로 콘솔에 원본 에러 로깅 (`error.digest` 포함)
- 기존 프로젝트 CSS 변수(`var(--accent)`, `var(--danger)` 등) 그대로 사용

### `global-error.tsx` — 별도로 만든 이유

루트 `layout.tsx` 자체가 실패하면 `<html>/<body>` 가 통째로 대체된다.
**`ThemeProvider` 가 설정하는 CSS 변수가 살아있다는 보장이 없으므로**
Tailwind 클래스나 `var(--accent)` 를 쓰지 않고 인라인 스타일로만 작성했다.
이 파일이 실제로 렌더될 확률은 낮지만(레이아웃엔 로직이 거의 없음), Next.js 요구사항상
`error.tsx` 만으로는 레이아웃 실패를 못 잡는다.

### `not-found.tsx`

서버 컴포넌트로 충분하다(훅 불필요). `GuestRouteGuard` 가 모든 children 을 감싸므로
비회원이 존재하지 않는 URL에 접근하면 **허용 목록에 없어 로그인으로 리다이렉트되고,
로그인 후에야 이 404 화면을 보게 된다.** 이는 기존 가드 설계의 부수 효과이며
이번 커밋의 범위 밖이라 손대지 않았다.

---

## 5. 검증

### 정적 검사
- `npx tsc --noEmit`, `npm run lint` 통과

### 브라우저 실측 (로그인 상태, 3100 포트)

| 경로 | 결과 |
|------|------|
| `/this-page-does-not-exist` | "페이지를 찾을 수 없습니다" + 홈으로 링크 정상 렌더 |

`error.tsx`/`global-error.tsx` 는 실제 런타임 에러를 강제로 유발하지 않고
코드 리뷰 + 타입체크로만 검증했다. Next.js 규약(파일명, export 시그니처, `"use client"`)을
따랐으므로 동작은 프레임워크가 보장한다.

---

## 6. 남은 한계

1. **에러 리포팅 없음** — `console.error` 만 하고 Sentry 등 외부 전송이 없다.
2. **`global-error` 미검증** — 루트 레이아웃을 실제로 깨뜨려 확인하지 않았다.
   로직이 거의 없는 파일이라 위험도가 낮다고 판단해 스킵했다.
3. **가드-404 상호작용** — 위에서 설명한 대로 비회원은 오탈자 URL에서도 로그인 화면을 먼저 본다.

---

## 7. 관련 문서

- [로드맵 Phase C](../features/roadmap.md)
