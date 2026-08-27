# 055 — 알림 팝업 위치 및 설정 UI 개편

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `055` |
| **파일명** | `055-notification-popup-settings-ui.md` |
| **Git 커밋 (short)** | `034ec73` |
| **Git 커밋 (full)** | `034ec73` |
| **날짜** | `2026-08-24` |
| **작성자** | `GitHub Copilot (pair)` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
feat: 알림 팝업 위치 및 설정 UI 개편

- 포털/fixed 위치 대신 벨 버튼 컨테이너 기준 absolute 배치 (버튼 근처 고정)
- 좌측 문서 아이콘: 알림 목록 페이지로 이동
- 톱니바퀴: 설정 패널 토글 (알림 받기 on/off, 모두 읽음 처리, 전체 삭제)
```

---

## 2. 개요

기존 팝업은 `createPortal(..., document.body)` + `fixed right-3 top-16` 이라
Navbar 벨 버튼과 물리적으로 분리돼 있었다. 화면 폭이나 스크롤 상황에 따라 버튼과 팝업이 떨어져 보였고,
"이 버튼이 연 창"이라는 시각적 연결이 약했다.

또한 톱니바퀴 아이콘이 실제로는 `/notifications` 링크여서 아이콘 의미와 동작이 어긋나 있었다.

---

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `FrontServer/components/layout/NotificationPopup.tsx` | +130 / -58 (배치 방식, 설정 뷰 신설) |

`Navbar.tsx` 는 이미 `<div className="relative" ref={notifRef}>` 로 감싸고 있어 수정 불필요했다.

---

## 4. 구현 상세

### 4.1 배치 방식 변경

```diff
- return createPortal(
-   <div className="fixed right-3 top-16 z-[400] ...">
+ return (
+   <div className="absolute right-0 top-full z-50 mt-2 ...">
```

- `react-dom` 포털 제거 → Navbar 벨 버튼의 `relative` 컨테이너 기준 배치
- `top-full mt-2` 로 버튼 바로 아래 8px 간격
- Navbar 헤더가 `sticky ... z-[300]`, 아이콘 영역이 `z-[310]` 이라 팝업 `z-50` 로 충분
- 포털 제거로 `typeof document === "undefined"` 가드도 불필요해짐

### 4.2 헤더 아이콘 재정의

| 위치 | 아이콘 | 동작 |
|------|--------|------|
| 좌측 | `FileText` | `/notifications` 상세 목록 페이지 이동 |
| 우측 | `Settings` | 리스트 ↔ 설정 뷰 토글 (`aria-pressed`) |
| 우측 | `X` | 팝업 닫기 |

설정 뷰일 때 헤더 제목이 "알림" → "알림 설정" 으로 바뀐다.

### 4.3 설정 뷰 (3개 항목)

```
┌──────────────────────────────┐
│ 알림 받기            [ ●━━ ] │  ← role="switch" 토글
│ ✓✓ 모든 알림 읽음 처리        │  ← unreadCount === 0 이면 disabled
│ 🗑 알림 전체 삭제             │  ← 알림 0개면 disabled, danger 색상
└──────────────────────────────┘
```

- 스위치: `role="switch"` + `aria-checked`, `setNotificationsEnabled()` 호출
- 나머지 두 버튼: 054에서 만든 `markAllNotificationsRead()` / `clearAllNotifications()` 호출
- 비활성 상태: `disabled:cursor-not-allowed disabled:opacity-40`

### 4.4 뷰 상태 초기화

팝업을 닫았다 다시 열면 항상 리스트 뷰부터 보이도록:

```ts
useEffect(() => {
  if (open) queueMicrotask(() => setView("list"));
}, [open]);
```

`queueMicrotask` 로 감싼 이유는 `react-hooks/set-state-in-effect` 린트 규칙 때문이다
(이 저장소 전반에서 쓰는 패턴).

---

## 5. 알려진 한계 (인수인계 포인트)

1. **바깥 클릭으로 닫기** — ~~미구현~~ → **059에서 `notifRef` 밖 pointerdown 으로 해소**.
2. **전체 삭제에 확인 절차 없음** — 즉시 삭제된다. confirm 모달 필요.
3. **모바일 대응** — `w-[min(20rem,calc(100vw-1.5rem))]` 로 폭은 잡히지만
   아주 좁은 화면에서 `right-0` 기준 오버플로 검증은 미완.

---

## 6. 검증

- `npx tsc --noEmit` 통과
- `npm run lint` 통과 (`queueMicrotask` 적용 후 에러 0)
