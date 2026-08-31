# 076 — 재생목록 (프로필 탭 실구현)

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `076` |
| **파일명** | `076-playlists.md` |
| **Git 커밋 (short)** | `TBD` |
| **Git 커밋 (full)** | `TBD` |
| **날짜** | `2026-09-01` |
| **작성자** | `GitHub Copilot (pair)` |
| **브랜치** | `master` |
| **로드맵 항목** | Phase B — 재생목록 |

---

## 1. 커밋 내용

```
feat: 재생목록 (프로필 탭 실구현)

- playlists, playlist_items 테이블 신설
- /api/playlists CRUD + 아이템 추가/제거
- 프로필 "재생목록" 탭 실구현 (생성/목록)
- /playlists/:id 상세 페이지 (영상 그리드, 추가/제거)
- 백엔드 테스트 14건 (총 77건)
```

---

## 2. 개요

프로필 탭에 "재생목록"이 있었지만 `ProfilePageClient` 내부는 `if (tab === "playlists") list = []`
로 하드코딩돼 있어 **항상 빈 화면**이었다. 로드맵에 "재생목록 — 프로필 탭 실구현"으로 남아 있던 항목이다.

---

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `BackendServer/src/db/schema.ts` | `playlists`, `playlist_items` |
| `BackendServer/src/data/store.ts` | 재생목록 함수 8종 |
| `BackendServer/src/routes/playlists.ts` | 신규 — 라우트 6종 |
| `BackendServer/src/app.ts` | 라우터 등록 |
| `BackendServer/tests/playlists.test.ts` | 신규 14건 |
| `FrontServer/lib/api.ts` | 재생목록 메서드 6종 + 타입 |
| `FrontServer/components/profile/PlaylistTab.tsx` | 신규 — 탭 내용 |
| `FrontServer/components/profile/ProfilePageClient.tsx` | 탭 분기를 실제 컴포넌트로 교체 |
| `FrontServer/components/profile/ProfileTabs.tsx` | 재생목록 탭에서 정렬 버튼 숨김 |
| `FrontServer/components/playlists/PlaylistDetail.tsx` | 신규 — 상세 페이지 |
| `FrontServer/app/playlists/[id]/page.tsx` | 신규 |
| `FrontServer/lib/guest-routes.ts` | `/playlists/:id` 공개 경로 추가 |
| `FrontServer/tests/guest-routes.test.ts` | 위 경로 테스트 추가 |

---

## 4. 데이터 모델

```sql
CREATE TABLE playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE playlist_items (
  playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  short_id TEXT NOT NULL REFERENCES shorts(id) ON DELETE CASCADE,
  added_at TEXT NOT NULL,
  PRIMARY KEY (playlist_id, short_id)
);
```

`(playlist_id, short_id)` 복합 PK로 065·075와 같은 패턴 — 같은 영상을 두 번
추가해도 DB 차원에서 중복이 불가능하고 `INSERT OR IGNORE` 로 멱등하게 처리한다.

`itemCount` 는 매번 서브쿼리로 센다(`SELECT COUNT(*) FROM playlist_items ...`).
재생목록 개수가 많지 않은 개인 프로젝트 규모라 별도 카운터 컬럼을 두지 않았다.

---

## 5. API 설계

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| GET | `/api/playlists?ownerId=` | 공개 | 특정 유저의 재생목록 목록 |
| POST | `/api/playlists` | 필요 | 생성 `{ title }` |
| GET | `/api/playlists/:id` | 공개 | 상세 + 담긴 영상(`items`) |
| DELETE | `/api/playlists/:id` | 필요, 본인만 | 삭제 |
| POST | `/api/playlists/:id/items` | 필요, 본인만 | 영상 추가 `{ shortId }` |
| DELETE | `/api/playlists/:id/items/:shortId` | 필요, 본인만 | 영상 제거 |

목록·상세는 **공개**다. 프로필 자체가 공개이므로 재생목록도 같은 공개 수준을 따른다.
추가/제거/생성/삭제만 본인 확인이 필요하다.

### 소유권 확인 방식

```ts
const playlist = db
  .prepare("SELECT id FROM playlists WHERE id = ? AND owner_id = ?")
  .get(playlistId, ownerId);
if (!playlist) return false;
```

074(댓글)·065(팔로우)와 같은 방식: 소유자가 아니면 "없다"와 동일하게 404 처리해
다른 사람 재생목록의 존재 여부/구조를 추론하지 못하게 한다.

---

## 6. 프론트 구현

### 탭 구조

`ProfilePageClient` 의 `tab === "playlists"` 분기에서 `VideoGrid` 대신
`PlaylistTab` 을 렌더한다. 정렬 버튼(최신/인기/오래된순)은 재생목록에는
의미가 없어 `ProfileTabs` 에서 해당 탭일 때 숨겼다.

### 재생목록 만들기 (본인 프로필만)

인라인 폼(제목 입력 + 만들기/취소)으로, 별도 모달 없이 탭 안에서 바로 처리한다.

### 상세 페이지의 "영상 추가"

플랫폼 전체 영상 검색 대신 **본인이 올린 영상 중 아직 없는 것만** 골라 추가하는
방식으로 범위를 좁혔다. 남의 영상을 내 재생목록에 넣는 기능은 이번에 포함하지 않았다
(아래 8절 한계).

---

## 7. 검증

### 백엔드 자동화 테스트 (14건)

| 확인 | 결과 |
|------|------|
| 빈 목록에서 시작 | ✅ |
| 비로그인 생성 401 | ✅ |
| 제목 공백 400 | ✅ |
| 생성 시 `itemCount: 0` | ✅ |
| 소유자 목록에 반영 | ✅ |
| 영상 추가 시 상세 반영 | ✅ |
| **중복 추가해도 1개만(멱등)** | ✅ |
| 없는 영상 추가 404 | ✅ |
| **다른 사람은 내 재생목록에 추가 불가** | ✅ |
| 제거 후 상세에서 사라짐 | ✅ |
| 없는 재생목록 상세 404 | ✅ |
| 없는 유저의 목록 조회 404 | ✅ |
| 삭제 후 목록에서 사라짐 | ✅ |
| 재삭제 404 | ✅ |

전체 백엔드 **77건** 통과, `typecheck` 통과. (도중 테스트 계정 handle 길이 초과로
실패한 것을 20자 제한에 맞게 줄여 수정했다 — `pl_other_${Date.now()}` → `po${Date.now()}`.)

### 프론트

`tsc --noEmit`, `lint`(1건 수정: `let list` → `const list`, 재할당 없어짐), 순수함수 테스트 29건 통과.

### 브라우저 실측 (3100 포트, demo 로그인)

| 단계 | 결과 |
|------|------|
| 프로필 "재생목록" 탭 | "재생목록이 아직 없습니다" + "새 재생목록" 버튼 |
| 생성("자동화 테스트 재생목록") | 카드로 즉시 표시, "영상 0개" |
| 상세 페이지 이동 | 제목·개수 정상 표시 |
| "영상 추가" → 내 영상에서 추가 | "영상 1개"로 반영, 그리드에 카드 표시 |
| "재생목록에서 빼기" | "영상 0개"로 복귀, "추가 가능" 목록에 다시 노출 |

디버깅 메모: 이번 세션 도중 **백엔드 프로세스가 한 번 죽어 있었다**
(`ERR_CONNECTION_REFUSED`, 이후 재기동한 새 인스턴스는 `EADDRINUSE` — 다른 PID가
이미 4000을 잡고 있었음). 재기동 후 `GET /api/health` 확인하고 이어서 검증했다.
이번 기능 구현과는 무관한 개발 환경 이슈였다.

---

## 8. 남은 한계

1. **남의 영상을 내 재생목록에 못 넣는다** — "추가"가 본인 업로드 영상으로만 제한된다.
   유튜브식 "다른 사람 영상도 내 재생목록에" 는 이번 범위 밖.
2. **순서 변경 없음** — `added_at DESC` 로 고정. 드래그 정렬 없음.
3. **비공개 재생목록 없음** — 전부 공개다. 비공개 옵션이 없다.
4. **재생목록 이름 수정 없음** — 생성 후 제목을 바꿀 수 없다(삭제 후 재생성만 가능).
5. **쇼츠 액션 열에 "재생목록에 추가" 없음** — 075와 같은 이유로, 피드에서 바로
   담는 UI는 이번에 넣지 않고 재생목록 상세 페이지에서만 담을 수 있다.

---

## 9. 관련 문서

- [065 — 팔로우](./065-user-follows.md), [075 — 신고/차단](./075-moderation-basics.md) (같은 복합 PK·소유권 패턴)
- [로드맵 Phase B](../features/roadmap.md)
