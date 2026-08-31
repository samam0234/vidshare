# 071 — 댓글 대댓글 (1단계)

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `071` |
| **파일명** | `071-comment-replies.md` |
| **Git 커밋 (short)** | `7fc0237` |
| **Git 커밋 (full)** | `7fc0237ae2cb24cf2e827c5fdad80d1f8b63e9b4` |
| **날짜** | `2026-09-01` |
| **작성자** | `GitHub Copilot (pair)` |
| **브랜치** | `master` |
| **로드맵 항목** | Phase B — 댓글 대댓글 |

---

## 1. 커밋 내용

```
feat: 댓글 대댓글 (1단계 스레드)

- comments.parent_id 추가 + ensureColumn 마이그레이션
- POST 시 parentId 검증 (같은 쇼츠, 존재 여부)
- 2단계 이상 답글은 최상위 부모로 평탄화
- CommentPanel 에 답글 트리와 답글 입력 UI
- 백엔드 테스트 8건
```

---

## 2. 개요

댓글이 평면 목록이라 **어느 댓글에 대한 반응인지 알 수 없었다.**
로드맵의 "댓글 대댓글" 항목이다.

---

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `BackendServer/src/db/schema.ts` | `comments.parent_id` |
| `BackendServer/src/db/client.ts` | `ensureColumn` 마이그레이션 |
| `BackendServer/src/data/store.ts` | 조회·생성에 부모 반영 + 검증 |
| `BackendServer/src/routes/comments.ts` | `parentId` 수용·검증 |
| `BackendServer/src/types/index.ts` | `Comment.parentId?` |
| `BackendServer/tests/comments.test.ts` | 신규 8건 |
| `FrontServer/types/index.ts` | `Comment.parentId?` |
| `FrontServer/lib/api.ts` | `postComment(..., parentId?)` |
| `FrontServer/components/shorts/CommentPanel.tsx` | 트리 렌더 + 답글 UI |
| `FrontServer/components/shorts/ShortsFeed.tsx` | `parentId` 전달 |

---

## 4. 설계 결정

### 왜 1단계만 허용하나

무한 중첩을 허용하면 좁은 댓글 패널에서 들여쓰기가 화면을 넘어가고,
조회 시 재귀 쿼리나 트리 조립이 필요하다.
유튜브·인스타그램도 실질적으로 1단계만 쓴다.

**답글의 답글은 최상위 부모에 붙인다(평탄화).**

```ts
// 1단계까지만 허용. 대대댓글은 최상위 부모에 붙인다.
parentId = parent.parent_id ?? parent.id;
```

이렇게 하면 클라이언트가 어떤 `parentId` 를 보내도 트리 깊이는 항상 2단이다.

### 검증

| 조건 | 응답 |
|------|------|
| `parentId` 가 문자열이 아님 | 400 |
| 부모 댓글이 없음 | 404 |
| 부모가 **다른 쇼츠**의 댓글 | 404 |

교차 참조를 막지 않으면 A 영상 댓글에 B 영상 댓글이 답글로 붙어
목록 조회 시 고아 노드가 생긴다.

### 마이그레이션 한계

새 DB는 스키마에 `REFERENCES comments(id) ON DELETE CASCADE` 가 걸리지만,
**기존 DB는 `ensureColumn` 이 `ALTER TABLE ... ADD COLUMN parent_id TEXT` 만 실행**하므로
외래키 제약이 없다. SQLite 는 `ALTER TABLE` 로 FK를 추가할 수 없다.

실사용상 문제는 없다(코드에서 검증하므로). 엄밀히 하려면 테이블 재생성이 필요하다.

---

## 5. 프론트 구현

### 트리 조립

서버는 여전히 **평면 배열**을 준다. 클라이언트가 `useMemo` 로 묶는다.

```ts
const roots = comments.filter((c) => !c.parentId);
const byParent = new Map<string, Comment[]>();
```

API 형태를 바꾸지 않아 기존 호출부가 그대로 동작한다.

### 답글 UI

- 각 댓글 아래 `답글` 버튼 → 입력창 위에 "○○ 님에게 답글" 배지 표시
- 배지의 `취소` 또는 `Escape` 로 해제
- 플레이스홀더가 "댓글을 입력하세요" → "답글을 입력하세요" 로 바뀜
- 답글에 다시 `답글` 을 눌러도 **루트 기준**으로 잡는다 (평탄화와 일치)
- 답글은 왼쪽 세로선 + 들여쓰기, 아바타가 한 단계 작다

---

## 6. 검증

### 백엔드 자동화 테스트 (8건)

| # | 확인 | 결과 |
|---|------|------|
| 1 | 최상위 댓글에 `parentId` 없음 | ✅ |
| 2 | 답글에 `parentId` 부여 | ✅ |
| 3 | **대대댓글이 루트로 평탄화** | ✅ |
| 4 | 목록에 부모·답글 함께 조회 | ✅ |
| 5 | 없는 부모 → 404 | ✅ |
| 6 | `parentId` 타입 오류 → 400 | ✅ |
| 7 | **다른 쇼츠 댓글에 답글 → 404** | ✅ |
| 8 | 빈 본문 → 400 | ✅ |

전체 백엔드 40건 통과, `typecheck` 통과.

### 브라우저 실측

`localhost:3100` (3000은 다른 프로젝트 점유) 에서 demo 로그인 후:

- 댓글 패널에 각 댓글마다 `답글` 버튼 노출
- 클릭 시 "웃긴사람 님에게 답글" 배지 + 플레이스홀더 변경 확인
- 답글 등록 → **부모 바로 아래 들여쓰기로 렌더**, 댓글 수 2 → 3, 피드 카운트 939 → 940

프론트 `tsc`, `lint`, 테스트(28건) 통과.

---

## 7. 남은 한계

1. **댓글 수는 답글도 합산** — `comment_count` 가 답글까지 센다.
   "댓글 3"이 실제로는 루트 2 + 답글 1이다.
2. **답글 접기 없음** — 답글이 많으면 패널이 길어진다.
3. **멘션 없음** — 누구에게 다는 답글인지 본문에 남지 않는다.
4. **삭제·수정 없음** — 댓글 자체에 아직 없는 기능이다.
5. **작성자가 문자열** — `comments.author` 가 유저 ID가 아니라 이름 문자열이라
   프로필로 연결할 수 없다. 기존 구조상 한계다.

---

## 8. 관련 문서

- [066 — 백엔드 자동화 테스트](./066-backend-automated-tests.md)
- [로드맵 Phase B](../features/roadmap.md)
