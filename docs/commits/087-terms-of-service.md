# 087 — 이용약관 페이지

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `087` |
| **파일명** | `087-terms-of-service.md` |
| **Git 커밋 (short)** | `e78bbb6` |
| **Git 커밋 (full)** | `e78bbb66179f22c01c730f566a26cccd7b1dbea9` |
| **날짜** | `2026-09-02` |
| **작성자** | `Grok` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
feat: 이용약관 페이지 (/terms)

푸터 이용약관 링크를 실제 페이지로 연결한다. 비회원 열람 가능.
```

---

## 2. 개요

푸터에 `href="#"` 로만 있던 이용약관을 `/terms` 로 연결한다.
공통 레이아웃 `LegalPage` 를 이 커밋에서 추가한다.

---

## 3. 변경 파일

| 경로 | 설명 |
|------|------|
| `FrontServer/app/terms/page.tsx` | 이용약관 |
| `FrontServer/components/legal/LegalPage.tsx` | 공통 본문 셸 |
| `FrontServer/components/layout/Footer.tsx` | 링크 |
| `FrontServer/lib/guest-routes.ts` | 비회원 허용 |
