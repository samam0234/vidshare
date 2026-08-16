# 017 — 네비 넓은 화면 메뉴 + 햄버거 클릭

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `017` |
| **파일명** | `017-navbar-lg-hamburger-click.md` |
| **Git 커밋 (short)** | `5be7e28` |
| **날짜** | `2026-08-15` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
fix: 넓은 화면은 메뉴 노출, 좁을 때만 클릭 가능한 햄버거
```

JS 너비 측정이 세 줄 모드에 고정되던 문제를 없애고, `lg` 이상에서는 메뉴를 바로 보이게 한다. 좁은 화면 세 줄 버튼은 클릭되게 한다.

상세 기록: docs/commits/017-navbar-lg-hamburger-click.md

## 범위

- `FrontServer/components/layout/Navbar.tsx`
