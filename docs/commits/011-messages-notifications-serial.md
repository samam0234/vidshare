# 011 — 메시지·알림 작성 기반 상세

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `011` |
| **파일명** | `011-messages-notifications-serial.md` |
| **Git 커밋 (short)** | `TBD` |
| **날짜** | `2026-08-15` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
feat: 메시지·알림을 작성 기반 상세 페이지로 전환
```

더미 상대/알림을 제거하고, 상대 추가·작성 시 일련번호 상세(`/messages/:id`, `/notifications/:id`)가 뜨게 한다.

상세 기록: docs/commits/011-messages-notifications-serial.md

## 범위

- MessagesPageClient, MessageThread, `/messages/[id]`
- NotificationList, NotificationDetail, NotificationPopup, `/notifications/[id]`
