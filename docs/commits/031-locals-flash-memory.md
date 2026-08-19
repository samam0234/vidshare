# 031 — Locals 이 방 Flash급 기억

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `031` |
| **파일명** | `031-locals-flash-memory.md` |
| **Git 커밋 (short)** | `TBD` |
| **날짜** | `2026-08-20` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
feat: Locals가 이 채팅방을 Flash급으로 기억하게
```

키워드 매칭만 하던 Locals를 핸드북+대화 기억 엔진으로 바꾸고, 키가 있으면 grok-4.3으로 이 방을 이어 답한다. 다른 방 검색은 Shape.

상세 기록: docs/commits/031-locals-flash-memory.md

## 범위

- `BackendServer/src/chatbot/locals.ts`
- `routes/chatbot.ts`, `.env.example`
- `chatbot-models.ts` 설명
