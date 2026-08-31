# 069 — 팔로워 / 팔로잉 목록 화면

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `069` |
| **파일명** | `069-follow-list-pages.md` |
| **Git 커밋 (short)** | `TBD` |
| **Git 커밋 (full)** | `TBD` |
| **날짜** | `2026-09-01` |
| **작성자** | `GitHub Copilot (pair)` |
| **브랜치** | `master` |
| **로드맵 항목** | Phase B — 팔로워/팔로잉 목록 화면 |

---

## 1. 커밋 내용

```
feat: 팔로워/팔로잉 목록 화면

- /profile/:id/followers, /profile/:id/following
- 두 화면을 FollowList 하나로 처리 (kind prop)
- 프로필 헤더의 팔로워/팔로잉 숫자를 링크로 전환
```

---

## 2. 개요

065에서 `/api/follows/:id/followers`·`/following` 을 만들었지만
**숫자만 보이고 누가 있는지 볼 방법이 없었다.** 065 문서의 "남은 한계 2번"이다.

---

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `FrontServer/components/follows/FollowList.tsx` | 신규 |
| `FrontServer/app/profile/[id]/followers/page.tsx` | 신규 |
| `FrontServer/app/profile/[id]/following/page.tsx` | 신규 |
| `FrontServer/components/profile/ProfileHeader.tsx` | 숫자 → 링크 |

백엔드 변경 없음.

---

## 4. 구현

### 컴포넌트 하나로 두 화면

팔로워와 팔로잉은 **레이아웃이 같고 데이터 출처만 다르다.**
따라서 `kind: "followers" | "following"` prop 하나로 분기했다.

```ts
const LABEL: Record<Kind, { title: string; empty: string }> = { ... };

kind === "followers" ? api.getFollowers(id) : api.getFollowing(id)
```

두 컴포넌트로 나누면 목록 아이템·빈 상태·탭 UI가 통째로 중복된다.

### 화면 구성

```
← 프로필로
깃털유머 님의 팔로워
[팔로워] [팔로잉]        ← 서로 전환하는 탭
─────────────────────
(아바타) 이름
         @핸들
```

- 유저와 목록을 `Promise.all` 로 동시 요청 (제목에 이름을 쓰기 위해 유저 정보 필요)
- 탭은 `<Link>` 라 URL이 바뀐다. 뒤로가기로 이전 탭에 돌아갈 수 있다
- 각 항목은 해당 프로필로 이동

### 프로필 헤더

```diff
- <span>팔로워 <b>{followers}</b></span>
+ <Link href={`/profile/${author.id}/followers`}>팔로워 <b>{followers}</b></Link>
```

숫자를 누르면 목록으로 가는, 일반적인 SNS 관례를 따랐다.

---

## 5. 검증

### 정적 검사
- `npx tsc --noEmit`, `npm run lint` 통과

### 브라우저 실측

포트 3000에 다른 프로젝트가 떠 있어 **3100 포트**로 띄워 확인했다.

| 확인 | 결과 |
|------|------|
| 비회원 `/profile/u1/followers` | "깃털유머 님의 팔로워" + 빈 상태 정상 |
| 프로필 헤더 숫자 | 링크로 표시, 클릭 시 목록 이동 |
| 팔로우 버튼 클릭 | 팔로워 0 → 1, 버튼 "팔로우" → "팔로잉" 즉시 반영 |
| 팔로잉 피드(`/following`) | 팔로우한 크리에이터 영상 2건 표시 |
| 언팔로우 | 0으로 복귀 |

검증 중 **비회원 접근 차단 문제**를 발견해 별도 커밋(068)으로 먼저 고쳤다.

---

## 6. 남은 한계

1. **페이지네이션 없음** — 서버가 전체를 반환한다. 팔로워가 많아지면 문제가 된다.
2. **목록에서 바로 팔로우 못 함** — 각 항목에 팔로우 버튼이 없어 프로필로 들어가야 한다.
3. **맞팔 표시 없음** — 상대가 나를 팔로우 중인지 알 수 없다.
4. **아바타는 이니셜뿐** — `author.avatar` 를 아직 쓰지 않는다.

---

## 7. 관련 문서

- [065 — 팔로우](./065-user-follows.md) (한계 2번 해소)
- [067 — 팔로잉 피드 화면](./067-following-feed-page.md)
- [068 — 비회원 접근 경로 수정](./068-guest-route-search-fix.md)
