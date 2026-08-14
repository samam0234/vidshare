# 015 — 고객센터 문의 메시지

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `015` |
| **파일명** | `015-support-inquiry-message.md` |
| **Git 커밋 (short)** | `TBD` |
| **날짜** | `2026-08-15` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
feat: 고객센터에서 문의 메시지를 보낼 수 있게 추가
```

FAQ로 해결이 안 되면 제목·내용을 보내 문의 번호를 받고 `/support/:id` 상세에서 확인한다.

상세 기록: docs/commits/015-support-inquiry-message.md

## 범위

- content-store `addInquiry` + `SupportInquiry` 타입
- `SupportContact`, `InquiryDetail`, `/support/[id]`
- FAQ 하단에 폼 연결
