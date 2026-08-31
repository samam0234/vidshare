# 065 — 팔로우 / 언팔로우 및 팔로잉 피드

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `065` |
| **파일명** | `065-user-follows.md` |
| **Git 커밋 (short)** | `TBD` |
| **Git 커밋 (full)** | `TBD` |
| **날짜** | `2026-08-31` |
| **작성자** | `GitHub Copilot (pair)` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |
| **로드맵 항목** | Phase B — 팔로우 |

---

## 1. 커밋 내용

```
feat: 팔로우/언팔로우, 팔로워 목록, 팔로잉 피드

- user_follows 테이블 추가 (복합 PK)
- /api/follows 라우트 6종
- 프로필 헤더의 팔로우 버튼을 실제 API에 연결
- 팔로우 시 상대에게 알림 생성
```

---

## 2. 개요

프로필 화면에 "팔로우" 버튼이 있었지만 **`onClick` 이 없는 장식**이었다.
누르면 아무 일도 일어나지 않았고, 팔로워 수를 볼 방법도 없었다.

---

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `BackendServer/src/db/schema.ts` | `user_follows` 테이블 + 인덱스 |
| `BackendServer/src/data/store.ts` | 팔로우 함수 7종 |
| `BackendServer/src/routes/follows.ts` | 신규 — 라우트 6종 |
| `BackendServer/src/app.ts` | 라우터 등록 + 엔드포인트 목록 |
| `FrontServer/lib/api.ts` | 팔로우 메서드 6종 + `FollowStatus` 타입 |
| `FrontServer/components/profile/ProfileHeader.tsx` | 버튼 동작 + 카운트 표시 |

---

## 4. 데이터 모델

```sql
CREATE TABLE user_follows (
  follower_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TEXT NOT NULL,
  PRIMARY KEY (follower_id, following_id)
);
CREATE INDEX idx_user_follows_following ON user_follows(following_id);
```

### 복합 기본키를 쓴 이유

`(follower_id, following_id)` 를 PK로 두면 **중복 팔로우가 DB 차원에서 불가능**하다.
애플리케이션에서 "이미 팔로우했나" 검사 후 INSERT 하는 방식은 경쟁 조건이 생길 수 있다.

`INSERT OR IGNORE` 와 함께 쓰므로 같은 요청이 여러 번 와도 안전하다(멱등).

### 인덱스

PK가 `follower_id` 로 시작하므로 "내가 팔로우한 사람" 조회는 PK 인덱스를 탄다.
반대 방향(팔로워 목록)은 타지 못하므로 `following_id` 인덱스를 따로 뒀다.

### `ON DELETE CASCADE`

사용자 삭제 기능은 아직 없지만, 생기면 관계가 자동 정리되도록 미리 걸었다.
`PRAGMA foreign_keys = ON` 이 이미 켜져 있다.

---

## 5. API

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| GET | `/api/follows/feed` | 필요 | 내가 팔로우한 사람들의 쇼츠 |
| GET | `/api/follows/:id` | 선택 | 카운트 + 내 팔로우 여부 |
| GET | `/api/follows/:id/followers` | — | 팔로워 목록 |
| GET | `/api/follows/:id/following` | — | 팔로잉 목록 |
| POST | `/api/follows/:id` | 필요 | 팔로우 |
| DELETE | `/api/follows/:id` | 필요 | 언팔로우 |

### 라우트 순서

`/feed` 를 `/:id` 보다 위에 뒀다. 아래에 두면 `id="feed"` 로 잡혀 404가 난다.
058(`/read-all`), 064(`/settings`) 와 같은 패턴이다.

### 공통 응답

팔로우/언팔로우/상태조회가 **모두 같은 형태**를 돌려준다.

```json
{ "followers": 3, "following": 1, "isFollowing": true }
```

프론트가 응답만 그대로 상태에 넣으면 되므로 재조회가 필요 없다.

### 비로그인 상태 조회

`GET /api/follows/:id` 는 `getRequestPublicUser` 를 쓴다(401 안 냄).
비로그인이면 `isFollowing: false` 로 응답해, 로그인 없이도 팔로워 수를 볼 수 있다.

### 알림

새로 팔로우할 때만 상대에게 `follower` 카테고리 알림을 만든다.
`isFollowing()` 을 먼저 확인하므로, 버튼 연타로 알림이 쌓이지 않는다.
알림 생성은 064의 수신 설정을 그대로 따른다(상대가 껐으면 안 생김).

---

## 6. 프론트

`ProfileHeader` 가 마운트 시 `getFollowStatus()` 로 카운트를 읽고,
버튼 클릭 시 팔로우/언팔로우를 호출한 뒤 응답으로 상태를 갱신한다.

| 상태 | 버튼 |
|------|------|
| 팔로우 안 함 | `팔로우` (accent 채움) |
| 팔로우 중 | `팔로잉` (외곽선) |
| 요청 중 | `disabled` + 반투명 |

프로필 상단에 `영상 N개 · 팔로워 N · 팔로잉 N` 을 함께 표시한다.

---

## 7. 검증

### 정적 검사
- BackendServer `tsc --noEmit` 통과
- FrontServer `tsc --noEmit`, `npm run lint` 통과

### API 실측

| # | 시나리오 | 결과 |
|---|----------|------|
| 1 | 초기 상태 | `followers:0, isFollowing:false` |
| 2 | 팔로우 | `followers:1, isFollowing:true` |
| 3 | **중복 팔로우** | `followers:1` (증가 없음 — 멱등 확인) |
| 4 | 팔로워 목록 | `demo` |
| 5 | 자기 자신 팔로우 | `400` |
| 6 | 언팔로우 | `followers:0, isFollowing:false` |
| 7 | 비로그인 팔로우 | `401` |
| 8 | 없는 유저 | `404` |

### 팔로잉 피드 실측

| 단계 | 결과 |
|------|------|
| 쇼츠 1건 보유한 `sqluser` 팔로우 | 피드 **1건** |
| 피드 작성자 확인 | `sqluser` 만 |
| 언팔로우 후 | 피드 **0건** |

---

## 8. 남은 한계

1. **팔로잉 피드 화면이 없다** — API만 있고 이를 쓰는 페이지를 만들지 않았다.
   쇼츠 피드에 "팔로잉" 탭을 붙이는 것이 다음 단계다.
2. **팔로워/팔로잉 목록 화면 없음** — 숫자만 보이고 누가 있는지 볼 수 없다.
   API(`/followers`, `/following`)는 준비돼 있다.
3. **페이지네이션 없음** — 목록이 전부 반환된다. 피드만 `limit 50`.
4. **맞팔 표시 없음** — 상대가 나를 팔로우하는지는 응답에 없다.
5. **차단 없음** — 원치 않는 팔로우를 막을 수 없다.

---

## 9. 관련 문서

- [064 — 알림 수신 거부 서버 반영](./064-notification-settings-server.md) (알림 생성 규칙)
- [로드맵 Phase B](../features/roadmap.md)
