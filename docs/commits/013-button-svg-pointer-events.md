# 013 — 버튼 안 SVG 클릭 수정

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `013` |
| **파일명** | `013-button-svg-pointer-events.md` |
| **Git 커밋 (short)** | `TBD` |
| **날짜** | `2026-08-15` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
fix: 버튼 안 SVG 클릭이 빠지지 않도록 수정
```

SVG 기본 pointer-events가 선만 맞아서 햄버거 줄 사이 클릭이 버튼을 놓친다. 아이콘은 통과시키고 버튼이 받게 한다.

상세 기록: docs/commits/013-button-svg-pointer-events.md

## 범위

- `FrontServer/app/globals.css`
