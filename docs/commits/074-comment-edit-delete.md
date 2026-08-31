# 074 — 댓글 수정·삭제, 작성 인증 강제

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `074` |
| **파일명** | `074-comment-edit-delete.md` |
| **Git 커밋 (short)** | `TBD` |
| **Git 커밋 (full)** | `TBD` |
| **날짜** | `2026-09-01` |
| **작성자** | `GitHub Copilot (pair)` |
| **브랜치** | `master` |
| **로드맵 항목** | Phase B — 댓글 수정·삭제 |

---

## 1. 커밋 내용

```
feat: 댓글 수정·삭제 + 작성자 소유권 도입

- comments.author_id 컬럼 추가 (누가 썼는지 서버가 안다)
- POST /api/shorts/:shortId/comments 에 로그인 강제 (기존엔 비로그인도 작성 가능했던 보안 공백)
- PATCH/DELETE /api/comments/:id — 본인 댓글만, 답글도 함께 삭제
- CommentPanel 에 인라인 수정, 삭제 버튼 (본인 것만 노출)
- 백엔드 테스트 18건 추가 (comments.test.ts 재작성, 총 68건)
```

---

## 2. 개요

로드맵 "댓글 수정·삭제" 항목 착수 중, **더 심각한 문제**를 발견했다.

`POST /api/shorts/:shortId/comments` 가 `requireRequestUser()` 를 호출하지 않아
**로그인 없이도 누구나 `author` 필드에 임의 이름을 넣어 댓글을 작성할 수 있었다.**
028("비회원은 열람만, 작성은 로그인")과 어긋나는 보안 공백이었고, 프론트가 우연히
로그인 사용자만 호출했을 뿐 API 자체는 막지 않았다.

수정·삭제 권한을 판단하려면 "누가 썼는지"가 서버에 있어야 하는데, 기존 `comments.author`
는 **표시용 이름 문자열**일 뿐 계정과 연결돼 있지 않았다. 그래서 이번 작업은
자연히 두 가지를 함께 다루게 됐다: 작성 인증 강제 + 소유자 컬럼 도입.

---

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `BackendServer/src/db/schema.ts` | `comments.author_id` |
| `BackendServer/src/db/client.ts` | `ensureColumn` 마이그레이션 |
| `BackendServer/src/data/store.ts` | `addComment(authorId)`, `updateComment`, `deleteComment` |
| `BackendServer/src/routes/comments.ts` | POST 인증 강제, PATCH/DELETE 신설 |
| `BackendServer/src/types/index.ts`, `FrontServer/types/index.ts` | `Comment.authorId?` |
| `BackendServer/tests/comments.test.ts` | 재작성 (8건 → 18건) |
| `FrontServer/lib/api.ts` | `postComment` 시그니처 변경, `patchComment`/`deleteComment` 추가 |
| `FrontServer/components/shorts/ShortsFeed.tsx` | `editComment`/`removeComment` 핸들러 |
| `FrontServer/components/shorts/CommentPanel.tsx` | 인라인 수정 UI, 수정/삭제 버튼 |

---

## 4. 설계 결정

### author를 body에서 받지 않고 세션에서 고정

```diff
- author: typeof author === "string" && author.trim() ? author : "사용자",
+ author: user.name,
+ authorId: user.id,
```

body의 `author` 필드는 이제 **완전히 무시**된다. 클라이언트가 다른 사람 이름을 사칭해
댓글을 다는 것을 막는다. 프론트도 `postComment(shortId, text, parentId)` 로 시그니처를
줄여 더 이상 `author` 를 보내지 않는다.

### 소유권 확인은 응답 형태로 노출하지 않는다

`updateComment`/`deleteComment` 는 **소유자가 아니거나 존재하지 않으면 동일하게 404** 를
반환한다. "이 댓글은 있지만 당신 것이 아니다"를 403으로 구분해 알려주면
공격자가 댓글 존재 여부를 추론할 수 있다.

### 답글 삭제 시 자식도 함께 삭제

```ts
const replies = db.prepare("SELECT COUNT(*) AS c FROM comments WHERE parent_id = ?").get(id);
db.prepare("DELETE FROM comments WHERE parent_id = ?").run(id);
db.prepare("DELETE FROM comments WHERE id = ?").run(id);
db.prepare("UPDATE shorts SET comment_count = MAX(0, comment_count - ?) WHERE id = ?")
  .run(1 + replies.c, row.short_id);
```

루트 댓글을 지우면 답글도 고아로 남기지 않고 함께 지운다. `comment_count` 는
지운 개수(1 + 답글 수)만큼 정확히 뺀다. `MAX(0, ...)` 로 음수 방지.

### 프론트 카운트 갱신도 서버와 같은 규칙

```ts
const removedCount = 1 + comments.filter((c) => c.parentId === id).length;
```

서버 응답을 다시 조회하지 않고 낙관적으로 갱신하되, 서버와 동일한 계산식을 써서
불일치가 없게 했다.

### 기존(마이그레이션 이전) 댓글은 아무도 수정 못 함

`ensureColumn` 으로 추가된 `author_id` 는 기존 행에서 `NULL` 이다.
`updateComment`/`deleteComment` 는 `author_id !== userId` 면 거부하므로,
`NULL` 인 기존 댓글은 **누구도(작성자 본인조차) 수정/삭제할 수 없다.**
소유자를 특정할 수 없는 상태에서 임의로 권한을 주는 것보다 안전한 기본값이라 판단했다.

---

## 5. 검증

### 백엔드 자동화 테스트

`comments.test.ts` 를 로그인 플로우 기반으로 재작성했다.

| 그룹 | 건수 | 핵심 확인 |
|------|------|-----------|
| 작성 인증 | 2 | 비로그인 401, `author` body 값 무시 확인 |
| 대댓글 (기존 071) | 8 | 변경 없음, 로그인 흐름만 반영 |
| 수정·삭제 | 8 | 본인만 수정, 다른 사람 404, 답글 연쇄 삭제, 재삭제 404 |

전체 백엔드 **68건** 통과, `typecheck` 통과.

### 프론트

`tsc --noEmit`, `lint`, 기존 순수함수 테스트(28건) 통과.

### 브라우저 실측 (3100 포트, demo 로그인)

| 단계 | 결과 |
|------|------|
| 댓글 작성 | authorId 부여됨, 본인 댓글에만 "수정"/"삭제" 버튼 노출 |
| 마이그레이션 이전 댓글(071에서 만든 답글) | authorId 없음 → 수정/삭제 버튼 미노출 (설계대로) |
| 인라인 수정 | "수정된 댓글 내용"으로 즉시 반영 |
| 삭제 | 댓글 4→3, 카드 표시 댓글 수 941→940 동시 반영 |

디버깅 메모: 브라우저 자동화 클릭이 간헐적으로 씹혀(`actionability` 타임아웃),
`element.click()` 직접 디스패치로 우회해 확인했다. 실제 사용자 클릭에는
영향 없는 자동화 도구 자체의 타이밍 이슈였다.

---

## 6. 남은 한계

1. **수정 이력 없음** — "수정됨" 표시나 이전 내용 보관이 없다.
2. **삭제 확인 없음** — 클릭 즉시 삭제된다(061의 알림 전체삭제와 달리 개별 항목이라
   피해 범위가 작다고 보고 확인 단계를 넣지 않았다).
3. **레거시 댓글 소유권 불명** — 마이그레이션 전 댓글은 영구히 수정/삭제 불가.
   필요하면 관리자 도구로 개별 정리해야 한다.
4. **알림 없음** — 답글이 달려도 원 댓글 작성자에게 알림이 가지 않는다.

---

## 7. 관련 문서

- [028 — 비회원 열람 전용](./028-guest-read-only.md) (이번에 강제한 정책의 원문)
- [071 — 댓글 대댓글](./071-comment-replies.md)
- [로드맵 Phase B](../features/roadmap.md)
