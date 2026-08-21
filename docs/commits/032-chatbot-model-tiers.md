# 032 — 챗봇 Locals·Vide·Shape 프롬프트

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `032` |
| **파일명** | `032-chatbot-model-tiers.md` |
| **Git 커밋 (short)** | `c044ca5` |
| **날짜** | `2026-08-20` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
feat: Locals·Vide·Shape 시스템 프롬프트를 나눔
```

Locals·Vide·Shape만 쓰고, 외부 AI 모델명은 프롬프트·UI·안내에 넣지 않는다.

상세 기록: docs/commits/032-chatbot-model-tiers.md

## 범위

- `BackendServer/src/chatbot/{locals,vide,shape}.ts`
- `BackendServer/src/routes/chatbot.ts`, `.env.example`
- `FrontServer/lib/chatbot-models.ts`, `ChatbotWorkspace.tsx`
