# 027 — 메시지 상대 클릭 시 대화창 열기

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `027` |
| **파일명** | `027-message-thread-open.md` |
| **Git 커밋 (short)** | `TBD` |
| **날짜** | `2026-08-20` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
fix: 메시지 상대를 누르면 대화창이 열리게
```

상세는 서버에서 빈 localStorage로 그려져 ‘상대를 찾을 수 없음’이 떴다. 클라이언트 하이드 뒤에만 열고, 목록은 prefetch 없이 이동한다.

상세 기록: docs/commits/027-message-thread-open.md

## 범위

- `MessageThread.tsx`, `MessagesPageClient.tsx`
- `content-store` `useStoreHydrated`
