# 072 — mock-data.ts 정리

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `072` |
| **파일명** | `072-mock-data-cleanup.md` |
| **Git 커밋 (short)** | `TBD` |
| **Git 커밋 (full)** | `TBD` |
| **날짜** | `2026-09-01` |
| **작성자** | `GitHub Copilot (pair)` |
| **브랜치** | `master` |
| **로드맵 항목** | Phase C — mock-data.ts 제거 |

---

## 1. 커밋 내용

```
refactor: mock-data.ts 죽은 코드 제거

- 실제 사용처(faqItems, toProfileVideos)만 남기고 전부 삭제
- currentUser, authors, shorts, initialComments, notifications,
  chatUsers, initialMessages, getAuthorById, getShortsByAuthor,
  profileVideosAll 제거 (~280줄)
```

---

## 2. 개요

`grep` 으로 실제 import 지점을 확인한 결과, 소스 코드에서 이 파일을 쓰는 곳은
**3개 컴포넌트, 2개 export** 뿐이었다.

| 사용처 | export |
|--------|--------|
| `ProfilePageClient.tsx`, `FollowingFeed.tsx` | `toProfileVideos` |
| `FaqAccordion.tsx` | `faqItems` |

나머지(`currentUser`, `authors`, `shorts`, `initialComments`, `notifications`,
`chatUsers`, `initialMessages`, `getAuthorById`, `getShortsByAuthor`, `profileVideosAll`)는
API 연동 이전 시절의 목업이며 037 이후로 아무도 참조하지 않는 죽은 코드였다.
`.next/` 빌드 캐시 안에만 옛 참조가 남아 있었을 뿐이다.

---

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `FrontServer/lib/mock-data.ts` | ~330줄 → ~65줄 |

---

## 4. 남긴 것과 이유

- **`faqItems`**: FAQ는 자주 안 바뀌는 정적 콘텐츠라 API로 옮길 실익이 적다.
  백엔드에 `/api/support/faq` 가 있지만 정적 배열 그대로 쓰는 편이 단순하다.
- **`toProfileVideos`**: `Short[]` → `ProfileVideo[]` 순수 변환 함수. API 연동 여부와 무관하게 필요하다.

---

## 5. 검증

- `npx tsc --noEmit` 통과 (미사용 import 없음)

---

## 6. 관련 문서

- [로드맵 Phase C](../features/roadmap.md)
