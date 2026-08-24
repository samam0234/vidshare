# 커밋 051: 알림 컴포넌트 구현 (NotificationList/Popup/Navbar)

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `051` |
| **파일명** | `051-frontend-notification-components.md` |
| **Git 커밋 (short)** | `b5265c9` |
| **Git 커밋 (full)** | `b5265c910503172bcbb4e297ae02e0906a10a6b6` |
| **날짜** | `2026-08-24` |
| **작성자** | `Copilot` |
| **브랜치** | `main` |

---

## 1. 커밋 내용

### 제목

```
feat: 알림 컴포넌트 구현 (목록/팝업/Navbar 통합)
```

### 본문

```
활동 알림 UI 구현 및 상태 동기화:

- NotificationList: 알림 전체 목록
  - useNotifications() 훅으로 실시간 동기화
  - 필터: 모두/안 읽음
  - 읽음/삭제 버튼

- NotificationPopup: 최근 알림 팝업
  - 최근 5개 표시
  - 클릭 시 관련 페이지로 이동
  - "모두 보기" 링크

- Navbar 통합
  - 🔔 벨 아이콘 + 배지 (미읽 개수)
  - 클릭 시 팝업 토글
  - 로그인/로그아웃 시 상태 관리

상세: docs/commits/051-frontend-notification-components.md
```

---

## 2. 파일 변경

| 파일 | 라인 | 변경 |
|------|------|------|
| `FrontServer/components/notifications/NotificationList.tsx` | 신규 | ~180줄 |
| `FrontServer/components/notifications/NotificationPopup.tsx` | 신규 | ~120줄 |
| `FrontServer/components/layout/Navbar.tsx` | 수정 | +25줄 |

---

## 3. NotificationList (알림 목록)

**기능:**
- 모든 사용자 알림 표시 (useNotifications 훅)
- 탭 필터: 모두 / 안 읽음
- 각 알림: 메시지 + 시간 + 읽음/삭제 버튼
- 클릭 시 href로 이동

**상태:**
```typescript
interface NotificationListState {
  filter: 'all' | 'unread';
}

const [filter, setFilter] = useState<'all' | 'unread'>('all');
const { notifications, unreadCount } = useNotifications();
```

**구현:**
```typescript
// components/notifications/NotificationList.tsx
import { useState } from 'react';
import Link from 'next/link';
import {
  useNotifications,
  markNotificationRead,
  removeNotification
} from '@/lib/notifications-store';
import { formatWhen } from '@/lib/content-store';

export function NotificationList() {
  const { notifications } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filtered = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  return (
    <div className="notification-list">
      <h1>알림</h1>
      
      <div className="filter-tabs">
        <button
          className={`tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          모두 ({notifications.length})
        </button>
        <button
          className={`tab ${filter === 'unread' ? 'active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          안 읽음 ({notifications.filter(n => !n.read).length})
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="empty">
          {filter === 'unread' ? '새 알림이 없습니다.' : '알림이 없습니다.'}
        </p>
      ) : (
        <ul className="notification-items">
          {filtered.map(notif => (
            <li key={notif.id} className={notif.read ? 'read' : 'unread'}>
              <div className="content">
                <Link href={notif.href ?? '#'}>
                  <span className={`category ${notif.category}`}>
                    {notif.category}
                  </span>
                  <p>{notif.message}</p>
                </Link>
              </div>

              <div className="actions">
                {!notif.read && (
                  <button
                    className="mark-read"
                    onClick={() => markNotificationRead(notif.id)}
                    title="읽음 처리"
                  >
                    ✓
                  </button>
                )}
                <button
                  className="delete"
                  onClick={() => removeNotification(notif.id)}
                  title="삭제"
                >
                  ✕
                </button>
              </div>

              <span className="time">
                {formatWhen(notif.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## 4. NotificationPopup (알림 팝업)

**기능:**
- 최근 알림 5개 표시
- 각 알림 클릭 시 상세 페이지로 이동
- "모두 보기" 링크로 NotificationList로 이동
- Navbar에서 벨 클릭 시 표시

**구현:**
```typescript
// components/notifications/NotificationPopup.tsx
import Link from 'next/link';
import { useNotifications } from '@/lib/notifications-store';
import { formatWhen } from '@/lib/content-store';

export function NotificationPopup() {
  const { notifications } = useNotifications();
  const recent = notifications.slice(0, 5);

  return (
    <div className="notification-popup">
      <div className="popup-header">
        <h3>알림</h3>
      </div>

      {recent.length === 0 ? (
        <p className="empty">새 알림이 없습니다.</p>
      ) : (
        <ul className="popup-items">
          {recent.map(notif => (
            <li key={notif.id} className={notif.read ? 'read' : 'unread'}>
              <Link href={notif.href ?? '#'}>
                <span className="message">{notif.message}</span>
                <span className="time">{formatWhen(notif.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link href="/notifications" className="see-all">
        모든 알림 보기 →
      </Link>
    </div>
  );
}
```

**CSS:**
```css
.notification-popup {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 300px;
  max-width: 400px;
  z-index: 1000;
}

.notification-popup .popup-header {
  padding: 1rem;
  border-bottom: 1px solid #eee;
}

.notification-popup .popup-items {
  max-height: 400px;
  overflow-y: auto;
}

.notification-popup .popup-items li {
  border-bottom: 1px solid #f0f0f0;
  padding: 0.75rem 1rem;
}

.notification-popup .popup-items li.unread {
  background-color: #f8f9ff;
}

.notification-popup .see-all {
  display: block;
  padding: 0.75rem 1rem;
  text-align: center;
  border-top: 1px solid #eee;
  color: #0066cc;
  text-decoration: none;
  font-size: 0.9rem;
}

.notification-popup .see-all:hover {
  background-color: #f5f5f5;
}
```

---

## 5. Navbar 통합

**기능:**
- 벨 아이콘 (🔔) 표시
- 미읽 알림 개수 배지 표시
- 클릭 시 NotificationPopup 토글
- 사용자 로그인/로그아웃 감지 → refreshNotifications / resetNotifications

**구현:**
```typescript
// components/layout/Navbar.tsx
import { useEffect, useState } from 'react';
import {
  useNotifications,
  refreshNotifications,
  resetNotifications
} from '@/lib/notifications-store';
import { useUser } from '@/lib/auth-context';
import { NotificationPopup } from '@/components/notifications/NotificationPopup';

export function Navbar() {
  const { user } = useUser();
  const { unreadCount } = useNotifications();
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);

  // 사용자 변경 시 알림 새로고침/초기화
  useEffect(() => {
    if (user) {
      refreshNotifications();
    } else {
      resetNotifications();
    }
  }, [user?.id]);

  return (
    <nav className="navbar">
      {/* ... 기타 네비게이션 아이템 ... */}

      <div className="navbar-right">
        {user && (
          <div className="notification-bell-container">
            <button
              className="notification-bell"
              onClick={() => setShowNotificationPopup(!showNotificationPopup)}
              title="알림"
            >
              🔔
              {unreadCount > 0 && (
                <span className="badge">{unreadCount}</span>
              )}
            </button>

            {showNotificationPopup && (
              <div className="popup-wrapper">
                <NotificationPopup />
              </div>
            )}
          </div>
        )}

        {/* 로그인/프로필 아이콘 등 */}
      </div>
    </nav>
  );
}
```

**CSS (Navbar):**
```css
.notification-bell-container {
  position: relative;
}

.notification-bell {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  position: relative;
}

.notification-bell .badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background-color: #ff4444;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: bold;
}

.notification-bell:hover {
  opacity: 0.8;
}

.popup-wrapper {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
}
```

---

## 6. 라이프사이클

### 마운트 시
```typescript
useEffect(() => {
  if (user?.id) {
    refreshNotifications();  // ← API 호출, 모든 구독 컴포넌트 업데이트
  }
}, [user?.id]);
```

### 알림 상호작용
```typescript
// 읽음 처리
await markNotificationRead(id);
// → 로컬 상태 즉시 변경 (UI 업데이트)
// → 백그라운드에서 API 호출

// 삭제
await removeNotification(id);
// → 로컬에서 제거 (UI 업데이트)
// → API 호출
```

### 언마운트/로그아웃
```typescript
// Navbar에서
useEffect(() => {
  if (!user) {
    resetNotifications();  // ← 전역 상태 클리어
  }
}, [user?.id]);
```

---

## 7. 타입 정의

```typescript
export type ActivityNotification = {
  id: number;
  ownerId: string;
  category: 'system' | 'mention' | 'reply' | 'like' | 'follower';
  message: string;
  read: boolean;
  href?: string;
  createdAt: string;
};
```

---

## 8. 성능 고려사항

### 1. 불필요한 리렌더 방지

```typescript
// NotificationPopup은 unreadCount 변경해도 리렌더 안 됨
// (notifications 자체는 변경)
const { notifications } = useNotifications();
// notifications 구독만 하고, unreadCount는 구독 안 함
```

### 2. 자동 닫기 (선택사항)

```typescript
useEffect(() => {
  if (!showNotificationPopup) return;
  
  const timer = setTimeout(() => {
    setShowNotificationPopup(false);
  }, 5000);  // 5초 후 자동 닫기
  
  return () => clearTimeout(timer);
}, [showNotificationPopup]);
```

---

## 9. 테스트 계획

### 기능 테스트
- [ ] 새 알림 생성 시 Navbar 배지 업데이트
- [ ] 팝업 클릭 시 NotificationList로 이동
- [ ] NotificationList에서 읽음 처리 → Navbar 배지 감소
- [ ] 다른 탭에서 삭제 → 현재 탭에서도 반영

### UI 테스트
- [ ] 모바일 화면에서 팝업 위치 확인
- [ ] 장시간 알림 안 읽으면 배지 누적 표시
- [ ] 스크롤 시 팝업이 사라지지 않는지 확인

---

## 10. 주의사항

### ⚠️ 주의사항
1. **배경 클릭:** 팝업 닫기 처리 필요 (optional)
2. **드래그:** 팝업이 숨겨지면 안 됨
3. **모바일:** 터치 이벤트 대응

### 🤔 TBD
- [ ] 실시간 푸시 알림 (WebSocket)
- [ ] 브라우저 알림 (Notification API)
- [ ] 소리 알림
- [ ] 알림 일괄 읽음 버튼

---

## 11. 후속 커밋

- **052:** 린트/타입 수정 + 최종 마무리
