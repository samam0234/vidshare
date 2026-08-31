# 064 — 알림 수신 거부를 서버에 반영

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `064` |
| **파일명** | `064-notification-settings-server.md` |
| **Git 커밋 (short)** | `6d381ac` |
| **Git 커밋 (full)** | `6d381acfd87a545466244149e759ae01c0008e1f` |
| **날짜** | `2026-08-31` |
| **작성자** | `GitHub Copilot (pair)` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |
| **로드맵 항목** | Phase B — 알림 수신 거부 서버 반영 |

---

## 1. 커밋 내용

```
feat: 알림 수신 거부를 서버에 저장하고 생성 단계에서 차단

- users.notifications_enabled 컬럼 추가 (기본 1)
- GET/PATCH /api/notifications/settings 신설
- createActivityNotification 이 수신 거부 시 저장하지 않음
- 프론트 스토어를 localStorage 에서 서버 설정으로 교체
```

---

## 2. 개요

커밋 054에서 알림 수신 on/off 를 넣었지만 **localStorage 전용**이었다.
그래서 실제로는 이런 문제가 있었다.

| 상황 | 054까지의 동작 |
|------|----------------|
| 수신을 끔 | 화면에서만 숨김. 서버는 계속 알림을 쌓음 |
| 다시 켬 | 그동안 쌓인 알림이 한꺼번에 쏟아짐 |
| 다른 기기/브라우저 | 설정이 공유되지 않음 |
| 브라우저 데이터 삭제 | 설정이 초기화됨 |

"수신 거부"라는 이름과 달리 실제로는 **표시 거부**였다. 054 문서에 ⚠️로 남겨 둔 항목이다.

---

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `BackendServer/src/db/schema.ts` | `users.notifications_enabled` 컬럼 |
| `BackendServer/src/db/client.ts` | 기존 DB용 `ensureColumn` 마이그레이션 |
| `BackendServer/src/data/store.ts` | `getNotificationsEnabled`, `setNotificationsEnabled`, 생성부 분기 |
| `BackendServer/src/routes/notifications.ts` | `GET`/`PATCH /settings` |
| `BackendServer/src/app.ts` | 엔드포인트 목록 |
| `FrontServer/lib/api.ts` | `getNotificationSettings`, `patchNotificationSettings` |
| `FrontServer/lib/notifications-store.ts` | localStorage → 서버 연동 |
| `FrontServer/components/layout/Navbar.tsx` | 로그인 시 설정 먼저 로드 |
| `FrontServer/components/layout/NotificationPopup.tsx` | async 토글 호출 |

---

## 4. 백엔드 설계

### 스키마

```sql
notifications_enabled INTEGER NOT NULL DEFAULT 1
```

`users` 에 컬럼을 둔 이유는 설정 항목이 아직 하나뿐이기 때문이다.
알림 종류별 on/off 처럼 항목이 늘어나면 별도 `user_settings` 테이블로 분리하는 편이 낫다.

기존 DB에는 `initDb()` 의 `ensureColumn()` 으로 추가된다
(`PRAGMA table_info` 확인 후 `ALTER TABLE`, 이미 있으면 건너뜀).

### 생성 단계 차단

```ts
export function createActivityNotification(...): AppNotification | undefined {
  if (!getNotificationsEnabled(ownerId)) return undefined;
  ...
}
```

**표시가 아니라 저장 자체를 막는다.** 껐다 켜도 그 사이 알림은 존재하지 않는다.

반환 타입이 `AppNotification` → `AppNotification | undefined` 로 바뀌었지만,
호출부 4곳(`community`, `longform`, `conversations`, `support`)은 모두
반환값을 쓰지 않는 fire-and-forget 이라 영향이 없다.

### 라우트 순서

`/settings` 를 `/:id` 보다 **위에** 등록했다. 아래에 두면
`PATCH /api/notifications/settings` 가 `id="settings"` 로 잡혀 `Number()` 변환에 실패한다.
058에서 `/read-all` 을 다룰 때와 같은 이유다.

### 검증

`enabled` 가 boolean 이 아니면 400. 문자열 `"false"` 를 참으로 오해하는 것을 막는다.

---

## 5. 프론트 설계

### 스토어

```ts
let enabled = true;                              // localStorage 읽기 제거

export async function refreshNotificationSettings()  // 서버에서 로드
export async function setNotificationsEnabled(next)  // 낙관적 갱신 + 실패 시 롤백
```

토글은 UI 반응성을 위해 먼저 로컬 상태를 바꾸고, API 실패 시 이전 값으로 되돌린다.

### 로그인 시 순서

```ts
void refreshNotificationSettings().then(() => refreshNotifications());
```

설정을 **먼저** 읽는다. 순서가 뒤집히면 수신을 꺼 둔 사용자가
로그인 직후 잠깐 이전 알림을 보게 된다.

### 로그아웃

`resetNotifications()` 에서 `enabled` 를 `true` 로 되돌린다.
설정은 계정 소유이므로, 다른 계정으로 로그인할 때 이전 사용자의 값이 남으면 안 된다.

---

## 6. 검증

### 정적 검사
- BackendServer `tsc --noEmit` 통과
- FrontServer `tsc --noEmit`, `npm run lint` 통과

### API 실측 (demo 계정)

| # | 시나리오 | 결과 |
|---|----------|------|
| 1 | 기본 설정 조회 | `true` |
| 2 | 수신 ON 상태로 커뮤니티 글 작성 | 알림 0 → 1 **증가** |
| 3 | `PATCH {enabled:false}` | `{"enabled":false}` |
| 4 | 수신 OFF 상태로 글 작성 | 알림 1 → 1 **불변** |
| 5 | `PATCH {enabled:"yes"}` | `400` |
| 6 | 비로그인 `GET /settings` | `401` |
| 7 | 다시 `true` 로 원복 | `true` |

4번이 이번 변경의 핵심이다. 054까지는 여기서 알림이 쌓였다.

---

## 7. 남은 한계

1. **전역 on/off 하나뿐** — 카테고리별(댓글만 끄기 등) 설정은 없다.
2. **끈 동안의 알림은 복구 불가** — 저장 자체를 안 하므로 의도된 동작이지만,
   "놓친 알림"을 원하는 사용자에겐 아쉬울 수 있다.
3. **설정 UI 위치** — 알림 팝업 안에만 있다. 계정 설정 페이지가 생기면 옮기는 편이 낫다.
4. **컬럼 방식** — 설정이 늘어나면 `user_settings` 테이블 분리 필요.

---

## 8. 관련 문서

- [054 — 알림 스토어 수신 on/off](./054-notification-store-settings.md) (한계 해소)
- [058 — 알림 벌크 API](./058-notification-bulk-endpoints.md) (라우트 순서 선례)
- [로드맵 Phase B](../features/roadmap.md)
