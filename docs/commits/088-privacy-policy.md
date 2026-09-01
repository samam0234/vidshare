# 088 — 개인정보처리방침 페이지

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `088` |
| **파일명** | `088-privacy-policy.md` |
| **Git 커밋 (short)** | `57af1e6` |
| **Git 커밋 (full)** | `57af1e607cd989b9b778566d04deb865faae7045` |
| **날짜** | `2026-09-02` |
| **작성자** | `Grok` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
feat: 개인정보처리방침 페이지 (/privacy)

수집 항목·목적·보유·쿠키·제3자(챗봇 LLM)를 안내한다. 비회원 열람 가능.
```

---

## 2. 변경 파일

| 경로 | 설명 |
|------|------|
| `FrontServer/app/privacy/page.tsx` | 개인정보처리방침 |
| `FrontServer/components/layout/Footer.tsx` | 링크 |
| `FrontServer/lib/guest-routes.ts` | 비회원 허용 |
