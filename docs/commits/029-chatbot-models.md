# 029 — 챗봇 Locals·Vide·Shape

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `029` |
| **파일명** | `029-chatbot-models.md` |
| **Git 커밋 (short)** | `TBD` |
| **날짜** | `2026-08-20` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
feat: 챗봇에 Locals·Vide·Shape 모델을 나눔
```

비회원은 무료 Locals만. 회원은 Vide(대화 기억)와 Shape(저장 대화 검색·추론). `POST /api/chatbot/complete`.

상세 기록: docs/commits/029-chatbot-models.md

## 범위

- `ChatbotHome`, `ChatbotThread`, `lib/chatbot-models.ts`
- `BackendServer/src/routes/chatbot.ts`
