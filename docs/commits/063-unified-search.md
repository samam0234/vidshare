# 063 — 통합 검색 (쇼츠·롱폼·커뮤니티·유저)

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `063` |
| **파일명** | `063-unified-search.md` |
| **Git 커밋 (short)** | `4c84a78` |
| **Git 커밋 (full)** | `4c84a78b1f26e0683ef3c2739b14b847dc9b39f2` |
| **날짜** | `2026-08-31` |
| **작성자** | `GitHub Copilot (pair)` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |
| **로드맵 항목** | Phase B — 통합 검색 |

---

## 1. 커밋 내용

```
feat: 쇼츠·롱폼·커뮤니티·유저 통합 검색

- GET /api/search?q= 신설 (4개 도메인 동시 검색)
- store.ts: searchLongform / searchCommunity / searchAuthors 추가
- /search 페이지 + 도메인별 탭 필터
- Navbar 검색을 /?q= 에서 /search?q= 로 변경
```

---

## 2. 개요

Navbar 검색창은 `/?q=` 로 이동해 **쇼츠만** 필터링했다.
롱폼·커뮤니티 글이 늘어나도 검색으로는 찾을 수 없어,
사용자가 목록을 직접 스크롤해야 했다.

아키텍처 문서에도 "검색: 쇼츠 `?q=` 만 지원"으로 한계가 적혀 있던 항목이다.

---

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `BackendServer/src/routes/search.ts` | 신규 — 통합 검색 라우트 |
| `BackendServer/src/data/store.ts` | `searchLongform`, `searchCommunity`, `searchAuthors` 추가 |
| `BackendServer/src/app.ts` | 라우터 등록 + 엔드포인트 목록 |
| `FrontServer/app/search/page.tsx` | 신규 — Suspense 경계 |
| `FrontServer/components/search/SearchResultsView.tsx` | 신규 — 결과 화면 |
| `FrontServer/lib/api.ts` | `search()` + `SearchResults` 타입 |
| `FrontServer/components/layout/Navbar.tsx` | 검색 이동 경로 변경 |

---

## 4. 백엔드 설계

### 응답 형태

```
GET /api/search?q=깃털&limit=20

{
  "success": true,
  "data": {
    "query": "깃털",
    "shorts":    [...],
    "longform":  [...],
    "community": [...],
    "users":     [...]
  }
}
```

도메인별 배열을 **분리해서** 반환한다. 하나로 합치면 프론트에서 타입 분기가 필요하고
정렬 기준(관련도)도 정의해야 하는데, 지금은 그만한 복잡도가 필요 없다.

### 검색 대상 컬럼

| 도메인 | 매칭 컬럼 |
|--------|-----------|
| 쇼츠 | `title`, `description`, 작성자 `handle` (기존 `listShorts(q)` 재사용) |
| 롱폼 | `title`, `description`, 작성자 `name` |
| 커뮤니티 | `title`, `body`, 작성자 `name` |
| 유저 | `handle`, `name` |

전부 `lower(col) LIKE '%q%'` 방식이다. `LIKE` 는 인덱스를 타지 않지만
개인 프로젝트 규모(수백 행)에서는 문제되지 않는다. FTS5 도입은 과잉이라 보류했다.

### 빈 쿼리 처리

`q` 가 없거나 공백이면 **DB를 조회하지 않고** 빈 결과를 즉시 반환한다.
`%%` LIKE 로 전체 스캔이 도는 것을 막기 위함이다.

### limit

`1~50` 으로 clamp, 기본 20. 도메인별로 각각 적용된다.

---

## 5. 프론트 설계

### 라우팅

`/search?q=...` — `useSearchParams()` 를 쓰므로 Next.js 요구에 따라
`page.tsx` 에서 `<Suspense>` 로 감쌌다.

### 탭 필터

`전체 / 쇼츠 / 롱폼 / 커뮤니티 / 유저`
서버는 한 번만 호출하고 **클라이언트에서 섹션을 보여줄지만 결정**한다.
탭마다 재요청하지 않으므로 전환이 즉시 반영된다.

### 결과 없는 섹션

`results.x.length > 0` 일 때만 렌더한다. 빈 제목만 늘어놓지 않기 위함이다.

### 각 항목 링크

| 도메인 | 이동 |
|--------|------|
| 쇼츠 | `/?id=<id>` (피드에서 해당 쇼츠로 포커스) |
| 롱폼 | `/longform/<id>` |
| 커뮤니티 | `/community/<id>` |
| 유저 | `/profile/<id>` |

---

## 6. 검증

### 정적 검사
- BackendServer `tsc --noEmit` 통과
- FrontServer `tsc --noEmit`, `npm run lint` 통과

### API 실측

| 쿼리 | shorts | longform | community | users |
|------|--------|----------|-----------|-------|
| `깃털` | 2 | 0 | 0 | 1 |
| `테스트` | 1 | 0 | 0 | 0 |
| `a` | 0 | 3 | 0 | 1 |
| `` (빈값) | 0 | 0 | 0 | 0 |
| `q` 파라미터 없음 | `success: true`, 전부 빈 배열 |

여러 도메인이 동시에 매칭되는 것(`깃털` → 쇼츠 + 유저)을 확인했다.

---

## 7. 남은 한계

1. **관련도 정렬 없음** — 각 도메인 내에서는 최신순이다. 제목 일치가 본문 일치보다
   위로 오지 않는다.
2. **부분어 검색만** — `LIKE '%q%'` 이므로 오타 보정·형태소 분석이 없다.
3. **페이지네이션 없음** — `limit` 로 자르기만 하고 "더 보기"가 없다.
4. **댓글·메시지 미포함** — 개인 정보 성격이라 의도적으로 제외했다.
5. `/?q=` 는 여전히 동작한다 — 쇼츠 피드 자체 필터로 남겨 뒀다.

---

## 8. 관련 문서

- [로드맵 Phase B](../features/roadmap.md)
- [아키텍처 개요](../architecture/overview.md)
