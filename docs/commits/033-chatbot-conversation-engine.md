# 033 — 챗봇 Locals·Vide·Shape 대화 엔진

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `033` |
| **파일명** | `033-chatbot-conversation-engine.md` |
| **Git 커밋 (short)** | `c044ca5` |
| **날짜** | `2026-08-20` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
feat: Locals·Vide·Shape가 이어서 대화하게
```

세 모델 모두 이 방 대화를 이어 답한다. 원격 키가 있으면 LLM을 쓰고, 없어도 내장 엔진으로 끊기지 않는다. Shape는 저장 대화를 같이 본다.

상세 기록: docs/commits/033-chatbot-conversation-engine.md

## 범위

- `BackendServer/src/chatbot/{complete,engine,locals,vide,shape}.ts`
- `BackendServer/src/routes/chatbot.ts`
- `FrontServer/components/chatbot/ChatbotWorkspace.tsx`
