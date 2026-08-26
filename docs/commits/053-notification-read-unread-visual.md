# 053 — 알림 읽음/안읽음 시각적 구분 강화

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `053` |
| **파일명** | `053-notification-read-unread-visual.md` |
| **Git 커밋 (short)** | `d28cda0` |
| **Git 커밋 (full)** | `d28cda0` |
| **날짜** | `2026-08-24` |
| **작성자** | `GitHub Copilot (pair)` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
feat: 알림 읽음/안읽음 시각적 구분 강화

- NotificationList: 안읽음 항목에 좌측 점 표시, NEW 배지, 굵은 글씨, 강조 배경
- 읽음 항목: opacity-70으로 후순위 표시
- 전체 탭에 안읽음 개수 배지 추가
- NotificationPopup: 헤더에 미읽 개수 표시, 각 항목에 점 인디케이터
```

---

## 2. 개요

`AppNotification.read` 필드는 이미 존재했지만 UI에서 안읽음 항목을 `ring-1 ring-[var(--accent)]/20` 하나로만
구분해, 실사용 시 읽은 알림과 안 읽은 알림이 거의 동일하게 보였다.
알림 기능의 핵심 가치가 "새로 온 것을 알아채는 것"이므로 시각적 위계를 명확히 했다.

---

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `FrontServer/components/notifications/NotificationList.tsx` | 안읽음/읽음 스타일 분기, 전체 탭 미읽 배지 |
| `FrontServer/components/layout/NotificationPopup.tsx` | 헤더 미읽 배지, 항목별 점 인디케이터 |

---

## 4. 구현 상세

### 안읽음 항목 (`!n.read`)

- 카드 좌측 상단에 `h-2 w-2` accent 색 점 (`absolute left-2 top-4`)
- `NEW` 배지 (accent 배경 + 흰 글씨)
- 메시지 텍스트 `font-semibold text-[var(--text)]`
- 카드 배경 `bg-[var(--accent)]/[0.05]` + `ring-1 ring-[var(--accent)]/30`
- 점과 겹치지 않도록 링크 영역에 `pl-3`

### 읽음 항목 (`n.read`)

- `opacity-70` 으로 다운톤 (시각적 후순위)
- 점 자리는 `bg-transparent` 로 유지해 레이아웃 흔들림 방지

### 미읽 카운트 배지

- `useNotifications()` 가 반환하는 `unreadCount` 사용
- `NotificationList`: "전체" 탭 라벨 옆
- `NotificationPopup`: 헤더 "알림" 옆

---

## 5. 검증

- `npx tsc --noEmit` 통과
- `npm run lint` 통과 (기존 `no-page-custom-font` 경고만 잔존)

---

## 6. 후속

- 054에서 스토어에 전체 읽음/삭제·수신 토글 추가
- 055에서 팝업 위치·설정 패널 개편
