# 075 — 신고·차단 (모더레이션 기초)

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `075` |
| **파일명** | `075-moderation-basics.md` |
| **Git 커밋 (short)** | `8b7e00c` |
| **Git 커밋 (full)** | `8b7e00cea8a7d863fd476a4d2030c4bddeaab0d5` |
| **날짜** | `2026-09-01` |
| **작성자** | `GitHub Copilot (pair)` |
| **브랜치** | `master` |
| **로드맵 항목** | Phase B — 신고·차단 |

---

## 1. 커밋 내용

```
feat: 신고·차단 (모더레이션 기초)

- user_blocks, reports 테이블 신설
- POST/GET/DELETE /api/blocks — 차단 시 팔로우 관계 자동 해제
- POST /api/reports — 쇼츠/댓글/커뮤니티/유저 신고
- 차단하면 GET /api/shorts, 팔로우 요청에서 서로 제외
- 프로필 헤더에 차단/신고 버튼, 댓글에 신고 버튼
- 백엔드 테스트 13건 (총 63건)
```

---

## 2. 개요

로드맵 "신고·차단 (모더레이션 기초)" 항목. 관리자 검토 화면은 범위 밖으로 두고
**사용자가 원치 않는 콘텐츠/사람을 스스로 차단하고, 신고를 남길 수 있는 최소 기능**에 집중했다.

---

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `BackendServer/src/db/schema.ts` | `user_blocks`, `reports` 테이블 |
| `BackendServer/src/data/store.ts` | 차단/신고 함수 8종 |
| `BackendServer/src/routes/blocks.ts` | 신규 |
| `BackendServer/src/routes/reports.ts` | 신규 |
| `BackendServer/src/routes/shorts.ts` | 목록에 뷰어 기준 차단 필터 |
| `BackendServer/src/routes/follows.ts` | 차단 관계면 팔로우 403 |
| `BackendServer/src/app.ts` | 라우터 등록 |
| `BackendServer/tests/moderation.test.ts` | 신규 13건 |
| `FrontServer/lib/api.ts` | 차단/신고 메서드 6종 |
| `FrontServer/components/moderation/ReportButton.tsx` | 신규 — 재사용 신고 버튼 |
| `FrontServer/components/profile/ProfileHeader.tsx` | 차단/신고 버튼 |
| `FrontServer/components/shorts/CommentPanel.tsx` | 타인 댓글에 신고 버튼 |

---

## 4. 데이터 모델

```sql
CREATE TABLE user_blocks (
  blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE TABLE reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_id TEXT NOT NULL REFERENCES users(id),
  target_type TEXT NOT NULL,   -- short | comment | community | user
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

`user_follows`(065)와 같은 복합 PK 패턴을 그대로 따랐다 — 중복 차단이
DB 차원에서 불가능하고 `INSERT OR IGNORE` 로 멱등하게 처리된다.

`reports` 는 `target_type` + `target_id` 조합으로 어떤 콘텐츠든 가리킬 수 있게
다형적으로 설계했다. 신고 대상 테이블마다 별도 컬럼을 두지 않았다.

---

## 5. 핵심 동작

### 차단 = 관계 단절

```ts
export function blockUser(blockerId: string, blockedId: string): void {
  const tx = db.transaction(() => {
    db.prepare(`INSERT OR IGNORE INTO user_blocks ...`).run(...);
    db.prepare(
      "DELETE FROM user_follows WHERE (follower_id = ? AND following_id = ?) OR (follower_id = ? AND following_id = ?)"
    ).run(blockerId, blockedId, blockedId, blockerId);
  });
  tx();
}
```

차단 시 **양방향** 팔로우를 모두 지운다. 차단한 사람이 나를 팔로우하고 있었거나
내가 그 사람을 팔로우하고 있었거나 둘 다 정리된다.

### 팔로우 시도 차단

```ts
if (isBlockedEitherWay(user.id, target.id)) {
  throw new HttpError(403, "차단 관계에서는 팔로우할 수 없습니다.");
}
```

**어느 쪽이 차단했든** 403. "내가 차단한 사람"과 "나를 차단한 사람"을 구분해
다른 메시지를 주면, 상대가 나를 차단했는지 여부를 유추하는 정보가 된다.
그래서 방향과 무관하게 동일한 응답을 준다.

### 쇼츠 목록 필터링

```ts
const blockClause = viewerId
  ? "AND s.author_id NOT IN (SELECT blocked_id FROM user_blocks WHERE blocker_id = ?)"
  : "";
```

`GET /api/shorts` 는 세션이 있으면(`getRequestPublicUser`) **내가 차단한 사람의 영상만** 뺀다.
비로그인이거나 다른 사용자가 보면 그대로 보인다 — "나만 안 보이게" 이지
"플랫폼에서 삭제"가 아니다. 검색(`/api/search`)에는 이 필터를 적용하지 않았다
(검색은 탐색 목적이 강해 범위를 좁혔다).

### 신고는 즉시 조치 없음

`POST /api/reports` 는 기록만 남기고 자동 숨김·경고 등 조치를 하지 않는다.
관리자 검토 화면이 없는 상태에서 자동 조치를 넣으면 오남용(허위 신고로 콘텐츠 숨김)
위험이 더 크다고 판단했다.

---

## 6. 프론트 구현

### `ReportButton` (재사용 컴포넌트)

```
[🚩 신고]  --클릭-->  [입력창______] [제출] [취소]  --제출-->  "신고 접수됨"
```

- 댓글(`CommentPanel`)과 프로필(`ProfileHeader`) 양쪽에서 그대로 재사용
- `targetType` prop 으로 `short`/`comment`/`community`/`user` 구분
- 본인 댓글에는 신고 버튼 대신 수정/삭제가 뜨도록 `canManage` 로 분기(074에서 만든 구조 재사용)

### 프로필 헤더

- 팔로우 버튼 옆에 차단(🚫)/신고 아이콘 추가 (본인 프로필·비로그인 제외)
- 차단 상태면 팔로우 버튼이 `disabled` — 서버가 403 낼 것을 미리 막는다
- 차단하면 로컬 상태도 즉시 `isFollowing: false` 로 낙관적 갱신

### 쇼츠 액션(좋아요/댓글/공유) 아이콘 열에는 추가하지 않음

플로팅 원형 아이콘 4개가 이미 꽉 찬 레이아웃이라, `ReportButton` 의 텍스트+입력창 UI를
그대로 넣으면 시각적으로 어울리지 않는다. 아이콘 전용 변형을 새로 만드는 대신
**이번 범위에서는 제외**하고 한계로 남겼다(아래 8절).

---

## 7. 검증

### 백엔드 자동화 테스트 (13건)

| 그룹 | 확인 |
|------|------|
| 차단 | 초기 상태, 차단 후 목록 반영, **쇼츠 필터링**(차단한 나에게만 안 보임, 타인/비로그인엔 보임), **차단 시 팔로우 자동 해제**, **차단 중 팔로우 403**, 해제 후 재팔로우 가능, 자기 차단 400, 비로그인 401, 없는 유저 404 |
| 신고 | 정상 201, 잘못된 targetType 400, 빈 사유 400, 비로그인 401 |

첫 시도에서 1건 실패했다 — `otherId` 를 `/api/users` 첫 항목으로 뽑았더니
쇼츠가 없는 유저(`u-me`)가 걸려 "차단 시 쇼츠 필터링" 검증이 무의미해졌다.
`/api/shorts` 응답에서 실제로 영상을 가진 작성자로 바꿔 수정했다.

전체 백엔드 **63건** 통과, `typecheck` 통과.

### 프론트

`tsc --noEmit`, `lint` 통과.

### 브라우저 실측 (3100 포트, demo 로그인, `/profile/u1`)

| 단계 | 결과 |
|------|------|
| 차단 클릭 | 버튼 "차단"→"차단 해제", 팔로우 버튼 비활성화 |
| `GET /api/blocks` | `[{ handle: "깃털유머", ... }]` |
| `GET /api/shorts` | 작성자 목록에서 `깃털유머` **제외** 확인 (`demo, sqluser, 오피스유머, 일상드립, 오피스유머`) |
| 차단 해제 | `GET /api/shorts` 에 `깃털유머` 다시 포함 |
| 신고 | 입력창 → 사유 입력 → 제출 → "신고 접수됨" |

---

## 8. 남은 한계

1. **관리자 검토 화면 없음** — `reports` 테이블에 쌓이기만 하고 확인할 UI가 없다.
2. **쇼츠 액션 열에 신고 없음** — 위에서 설명한 레이아웃 문제로 이번엔 제외.
   커뮤니티 글 신고도 아직 UI가 없다(백엔드 `targetType: "community"` 는 준비돼 있음).
3. **차단 알림 없음** — 상대는 자신이 차단됐는지 알 수 없다(의도된 설계에 가깝다).
4. **자동 조치 없음** — 신고가 누적돼도 아무 일도 일어나지 않는다.
5. **검색 결과는 필터링 안 됨** — 차단해도 검색으로는 여전히 보인다.

---

## 9. 관련 문서

- [065 — 팔로우](./065-user-follows.md) (차단이 팔로우에 미치는 영향)
- [074 — 댓글 수정·삭제](./074-comment-edit-delete.md) (`canManage` 분기 재사용)
- [로드맵 Phase B](../features/roadmap.md)
