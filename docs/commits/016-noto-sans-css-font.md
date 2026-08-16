# 016 — Turbopack next/font 오류 우회

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `016` |
| **파일명** | `016-noto-sans-css-font.md` |
| **Git 커밋 (short)** | `c0ed3f7` |
| **날짜** | `2026-08-15` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
fix: Turbopack next/font 오류를 Google Fonts CSS로 우회
```

`next/font/google`가 Turbopack에서 `@vercel/turbopack-next/internal/font/google/font`를 못 찾는 문제를, Noto Sans KR CSS 링크로 우회한다.

상세 기록: docs/commits/016-noto-sans-css-font.md

## 범위

- `FrontServer/app/layout.tsx`
- `FrontServer/app/globals.css`
