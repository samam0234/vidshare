# 커밋 045: 알림 스토어 신설 (notifications-store.ts)

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `045` |
| **파일명** | `045-frontend-notifications-store.md` |
| **Git 커밋 (short)** | `3673806` |
| **Git 커밋 (full)** | `3673806eec047ee35ecad4962fb184d09808982e` |
| **날짜** | `2026-08-24` |
| **작성자** | `Copilot` |
| **브랜치** | `main` |

---

## 1. 커밋 내용

### 제목

```
feat: 알림 상태 공유 스토어 (notifications-store.ts)
```

### 본문

```
Navbar 배지, NotificationPopup, NotificationList가 동일한 알림 데이터 공유:

- useSyncExternalStore 패턴으로 구현
- API 호출로 서버의 알림 동기화
- 읽음 처리/삭제 로컬 + API 반영
- 로그인/로그아웃 시 상태 리셋

한 곳에서 읽음 처리하면 다른 모든 곳에 즉시 반영.

상세: docs/commits/045-frontend-notifications-store.md
```

---

## 2. 파일 변경

| 파일 | 라인 | 변경 |
|------|------|------|
| `FrontServer/lib/notifications-store.ts` | 신규 | ~100줄 |
| `FrontServer/lib/api.ts` | (이미 포함) | getNotifications 등 메서드 |

---

## 3. 설계 원칙

### useSyncExternalStore 패턴

외부 상태(서버 알림)를 React와 동기화:

```typescript
import { useSyncExternalStore } from 'react';

export function useNotifications() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
```

**장점:**
- 단일 진실 공급원 (서버)
- 여러 컴포넌트가 동기화된 상태 공유
- 성능 최적화 (필요할 때만 리렌더)

### 로컬 상태 + 서버 동기화

```
로컬 상태 (즉시 UI 갱신)
    ↓
서버 API 호출 (백그라운드)
    ↓
서버 응답 (상태 재동기화)
```

---

## 4. 구현

### `FrontServer/lib/notifications-store.ts`

```typescript
import { useSyncExternalStore } from 'react';
import * as api from './api';
import { ActivityNotification } from '../types/content';

// 전역 상태
let notifications: ActivityNotification[] = [];
let listeners: (() => void)[] = [];

// 구독자 등록
function subscribe(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

// 모든 구독자에게 알림
function emitChange() {
  listeners.forEach(listener => listener());
}

// 현재 스냅샷 반환
function getSnapshot(): {
  notifications: ActivityNotification[];
  unreadCount: number;
} {
  const unreadCount = notifications.filter(n => !n.read).length;
  return { notifications, unreadCount };
}

// API에서 알림 새로고침
export async function refreshNotifications() {
  const res = await api.getNotifications();
  if (res.success) {
    notifications = res.data ?? [];
    emitChange();
  }
}

// 알림 읽음 처리
export async function markNotificationRead(id: number) {
  // 로컬 상태 즉시 업데이트
  notifications = notifications.map(n =>
    n.id === id ? { ...n, read: true } : n
  );
  emitChange();
  
  // 서버에 반영 (백그라운드)
  await api.markNotificationRead(id);
}

// 알림 삭제
export async function removeNotification(id: number) {
  // 로컬 상태 즉시 업데이트
  notifications = notifications.filter(n => n.id !== id);
  emitChange();
  
  // 서버에 반영
  await api.removeNotification(id);
}

// 로그아웃 시 상태 초기화
export function resetNotifications() {
  notifications = [];
  emitChange();
}

// Hook
export function useNotifications() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);
  return {
    notifications: snapshot.notifications,
    unreadCount: snapshot.unreadCount
  };
}
```

---

## 5. 사용 예시

### Navbar에서 배지 표시

```typescript
// components/layout/Navbar.tsx
import { useNotifications, refreshNotifications } from '@/lib/notifications-store';
import { useUser } from '@/lib/auth-context';

export function Navbar() {
  const { user } = useUser();
  const { unreadCount } = useNotifications();
  
  // 사용자 변경 시 알림 새로고침
  useEffect(() => {
    if (user) {
      refreshNotifications();
    }
  }, [user?.id]);
  
  return (
    <nav>
      {/* 배지 표시 */}
      {unreadCount > 0 && (
        <span className="badge">{unreadCount}</span>
      )}
    </nav>
  );
}
```

### NotificationList에서 읽음 처리

```typescript
// components/notifications/NotificationList.tsx
import { useNotifications, markNotificationRead, removeNotification } from '@/lib/notifications-store';

export function NotificationList() {
  const { notifications } = useNotifications();
  
  return (
    <ul>
      {notifications.map(notif => (
        <li key={notif.id}>
          <p>{notif.message}</p>
          {!notif.read && (
            <button onClick={() => markNotificationRead(notif.id)}>
              읽음
            </button>
          )}
          <button onClick={() => removeNotification(notif.id)}>
            삭제
          </button>
        </li>
      ))}
    </ul>
  );
}
```

### NotificationPopup에서 최근 알림 표시

```typescript
// components/notifications/NotificationPopup.tsx
import { useNotifications } from '@/lib/notifications-store';

export function NotificationPopup() {
  const { notifications } = useNotifications();
  
  const recent = notifications.slice(0, 5);  // 최근 5개
  
  return (
    <div className="popup">
      {recent.map(notif => (
        <div key={notif.id} className={notif.read ? 'read' : 'unread'}>
          <Link href={notif.href ?? '#'}>{notif.message}</Link>
        </div>
      ))}
    </div>
  );
}
```

---

## 6. 상태 라이프사이클

### 초기화
1. 사용자 로그인 → `useEffect` → `refreshNotifications()` 호출
2. 서버에서 알림 목록 받아옴
3. 로컬 상태 갱신 → 모든 구독 컴포넌트 리렌더

### 업데이트
1. NotificationList에서 "읽음" 클릭
2. `markNotificationRead(id)` → 로컬 상태 즉시 변경 → 모든 컴포넌트 반영
3. 동시에 `api.markNotificationRead()` 호출 (백그라운드)

### 정리
1. 사용자 로그아웃 → `resetNotifications()` 호출
2. 전역 상태 클리어
3. 구독자들에게 알림 → 빈 목록 표시

---

## 7. 성능 최적화

### 1. 불필요한 리렌더 방지
```typescript
// 컴포넌트는 unreadCount만 필요하면 notifications 전체를 가져오지 않음
export function NotificationBadge() {
  const { unreadCount } = useNotifications();
  // notifications 변경해도 리렌더 안 됨 (unreadCount가 같으면)
  return <span>{unreadCount}</span>;
}
```

### 2. 배치 업데이트
```typescript
export async function markAllRead(ids: number[]) {
  // 로컬: 한 번에 모두 업데이트
  notifications = notifications.map(n =>
    ids.includes(n.id) ? { ...n, read: true } : n
  );
  emitChange();  // 한 번만 호출
  
  // 서버: 각각 호출 또는 배치 엔드포인트
  for (const id of ids) {
    await api.markNotificationRead(id);
  }
}
```

---

## 8. 타입 정의

### `types/content.ts`

```typescript
export type ActivityNotification = {
  id: number;
  category: 'system' | 'mention' | 'reply' | 'like' | 'follower';
  message: string;
  read: boolean;
  href?: string;
  createdAt: string;
};

export type CreateNotificationInput = {
  category: ActivityNotification['category'];
  message: string;
  href?: string;
};
```

---

## 9. 주의사항

### ⚠️ 주의사항
1. **경쟁 조건:** 빠른 연속 업데이트 시 서버와 로컬 상태 불일치 가능 (TBD: 큐 시스템)
2. **재시작 시 상태 손실:** 새로고침 후 `refreshNotifications()` 필수
3. **타이머 구독:** 리스너 정리 잘못하면 메모리 누수

### 🤔 TBD
- [ ] 폴링 vs 웹소켓 (실시간 알림)
- [ ] 알림 필터링 (카테고리별)
- [ ] 사운드/데스크톱 알림
- [ ] 배치 API 엔드포인트 (여러 알림 한 번에)

---

## 10. 후속 커밋

- **046:** 챗봇 코퍼스 라이브러리
- **047~050:** 컴포넌트 연동
