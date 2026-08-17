# 018 — 알림 팝업·테마 전환 클릭 복구

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `018` |
| **파일명** | `018-notif-theme-click.md` |
| **Git 커밋 (short)** | `TBD` |
| **날짜** | `2026-08-15` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
fix: 알림 팝업과 테마 전환이 클릭되게 복구
```

닫힌 댓글 패널이 오른쪽 헤더를 가리던 문제를 없애고, 알림은 body 포털로 띄우며 테마는 `theme-light` 래퍼로 적용한다.

상세 기록: docs/commits/018-notif-theme-click.md

## 범위

- Navbar, NotificationPopup, CommentPanel, ThemeContext, globals.css, layout.tsx
