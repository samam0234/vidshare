# 054 — 알림 스토어 수신 on/off 및 전체 읽음/삭제

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `054` |
| **파일명** | `054-notification-store-settings.md` |
| **Git 커밋 (short)** | `2be566d` |
| **Git 커밋 (full)** | `2be566d` |
| **날짜** | `2026-08-24` |
| **작성자** | `GitHub Copilot (pair)` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
feat: 알림 스토어에 수신 on/off 및 전체 읽음/삭제 기능 추가

- isNotificationsEnabled/setNotificationsEnabled: localStorage 기반 알림 수신 토글
- markAllNotificationsRead: 안읽음 전체 읽음 처리
- clearAllNotifications: 알림 전체 삭제
```

---

## 2. 개요

알림 팝업에 설정 패널을 붙이기 위해(→ 055) 먼저 스토어 레이어에 필요한 동작을 정의했다.
UI를 먼저 만들면 스토어 API 형태가 UI에 끌려가므로, 상태 규칙을 스토어에서 확정하고 UI는 소비만 하도록 분리했다.

---

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `FrontServer/lib/notifications-store.ts` | +88줄 (수신 토글 스토어, 일괄 동작 2종) |

---

## 4. 구현 상세

### 수신 on/off (별도 external store)

알림 목록(`items`)과 수신 여부(`enabled`)는 갱신 주기가 다르므로
**리스너 셋을 분리**해 불필요한 리렌더를 막았다.

```ts
const ENABLED_KEY = "vidshare:notifications-enabled";

let enabled = readEnabled();               // localStorage "0" 이면 false
const enabledListeners = new Set<() => void>();

export function setNotificationsEnabled(next: boolean) { ... }
export function useNotificationsEnabled() { ... }   // useSyncExternalStore
```

동작 규칙:

| 전환 | 결과 |
|------|------|
| on → off | `items = EMPTY` + emit (배지·목록 즉시 비움), localStorage `"0"` |
| off → on | `refreshNotifications()` 즉시 호출, localStorage `"1"` |

`refreshNotifications()` 는 `enabled === false` 일 때 **API 호출 없이** 목록을 비우고 조기 반환한다.

> ⚠️ 현재는 **클라이언트 전용 설정**이다. 서버는 여전히 알림을 생성하며,
> 다시 켜면 그동안 쌓인 알림이 한 번에 보인다. 서버 측 수신 거부는 미구현(→ 로드맵).

### 일괄 동작

```ts
export async function markAllNotificationsRead()   // 낙관적 갱신 → 실패 시 refresh
export async function clearAllNotifications()      // 낙관적 갱신 → 실패 시 롤백
```

- 두 함수 모두 **낙관적 업데이트**: 먼저 로컬 상태를 바꾸고 emit → 그다음 API 호출
- 백엔드에 일괄 처리 엔드포인트가 없어 `Promise.all` 로 개별 요청을 병렬 전송
- `markAll`: 하나라도 실패하면 `refreshNotifications()` 로 서버 상태에 재동기화
- `clearAll`: 하나라도 실패하면 이전 배열(`prev`)로 롤백

---

## 5. 알려진 한계 (인수인계 포인트)

1. **N+1 요청**: 알림이 50개면 DELETE 요청 50개가 나간다.
   → `PATCH /api/notifications/read-all`, `DELETE /api/notifications` 벌크 엔드포인트 필요.
2. **부분 실패**: `Promise.all` 이라 일부만 성공해도 전체 롤백/재동기화한다.
3. **수신 거부가 서버에 없음**: 위 ⚠️ 참고.

---

## 6. 검증

- `npx tsc --noEmit` 통과
- `npm run lint` 통과
