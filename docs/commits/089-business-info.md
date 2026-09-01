# 089 — 사업자 정보확인 페이지

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `089` |
| **파일명** | `089-business-info.md` |
| **Git 커밋 (short)** | `c3cf974` |
| **Git 커밋 (full)** | `c3cf97476deb41399768074ceb91c7cda6185b30` |
| **날짜** | `2026-09-02` |
| **작성자** | `Grok` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
feat: 사업자 정보확인 페이지 (/business)

상호·대표·등록번호 표를 두고, 미등록 데모임을 명시한다.
공정위 사업자등록정보 조회 링크를 넣는다. 비회원 열람 가능.
```

---

## 2. 변경 파일

| 경로 | 설명 |
|------|------|
| `FrontServer/app/business/page.tsx` | 사업자 정보 |
| `FrontServer/components/layout/Footer.tsx` | 링크 |
| `FrontServer/lib/guest-routes.ts` | 비회원 허용 |

가짜 사업자등록번호를 넣지 않았다. 등록 후 표의 값을 바꾸면 된다.
