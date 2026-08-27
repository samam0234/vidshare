# 059 — 알림 팝업 바깥 클릭 닫기

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `059` |
| **파일명** | `059-notification-popup-outside-click.md` |
| **Git 커밋 (short)** | `fb4f119` |
| **Git 커밋 (full)** | `fb4f119bd253361e21f4431af2a06299e693b375` |
| **날짜** | `2026-08-27` |
| **작성자** | `Grok` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
feat: 알림 팝업을 바깥 클릭으로 닫기

Navbar notifRef 밖 pointerdown 시 팝업을 닫는다.
Escape / X / 라우트 이동 닫기는 그대로 둔다.

상세: docs/commits/059-notification-popup-outside-click.md
```

---

## 2. 개요

### 배경
055에서 알림 팝업을 벨 옆에 붙였지만, 닫기는 Escape·X·페이지 이동뿐이었다.
`notifRef` 는 이미 벨+팝업을 감싸고 있어 바깥 클릭만 빠져 있었다.

### 목표
팝업이 열린 뒤 벨·팝업 밖을 누르면 닫힌다. 팝업 안 클릭·설정 토글은 닫히지 않는다.

### 범위 (In Scope)
- `Navbar.tsx` 에 `pointerdown` 핸들러

### 범위 밖 (Out of Scope)
- 햄버거 메뉴 바깥 클릭 (A3 범위 아님)
- 전체 삭제 확인 모달 (A4)

---

## 3. 구현 기능 · 변경 사항

### 기능 / 동작
- [x] 팝업이 열린 뒤에만 document `pointerdown` 리스너 등록
- [x] `notifRef.contains(target)` 이면 무시 (벨 토글·팝업 내부)
- [x] 그 외는 `setNotifOpen(false)`
- [x] Escape 닫기는 기존과 동일

### 주요 변경 파일·경로

| 경로 | 변경 유형 | 설명 |
|------|-----------|------|
| `FrontServer/components/layout/Navbar.tsx` | 수정 | 바깥 클릭 닫기 |

리스너를 팝업이 열린 다음에 붙이므로, 벨을 눌러 여는 그 클릭이 바로 닫힘으로 이어지지 않는다.

---

## 4. 기타

### 검증 방법
```bash
cd FrontServer && npx tsc --noEmit && npm run lint
```

로그인 → 벨 클릭으로 열림 → 팝업 안 클릭은 유지 → 본문/테마 버튼 클릭 시 닫힘 → Escape/X 는 기존대로.

### 트레이드오프 · 결정 이유
- `click` 대신 `pointerdown`: 누르는 즉시 닫혀 다음 클릭이 아래 요소로 새지 않음.
- 햄버거는 `menuRef`가 버튼만 감싸 드롭다운과 분리돼 있어 이번엔 손대지 않음.

### 후속 작업
- [ ] A4 전체 삭제 확인 모달
- [ ] 좁은 화면 팝업 오버플로 (055 잔여)
