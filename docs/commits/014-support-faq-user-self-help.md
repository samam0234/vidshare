# 014 — 고객센터 FAQ를 유저 자가해결 안내로 변경

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `014` |
| **파일명** | `014-support-faq-user-self-help.md` |
| **Git 커밋 (short)** | `6c409b5` |
| **날짜** | `2026-08-15` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
fix: 고객센터 FAQ를 유저가 직접 할 수 있는 안내로 변경
```

관리자 조치(캐시·점검 대기) 대신, 스와이프·새로고침·메뉴 버튼처럼 유저가 바로 해볼 수 있는 짧은 방법으로 바꾼다.

상세 기록: docs/commits/014-support-faq-user-self-help.md

## 범위

- `FrontServer/lib/mock-data.ts` FAQ 문구
- `FrontServer/components/support/FaqAccordion.tsx` 제목·안내문
