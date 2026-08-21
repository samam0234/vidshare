# 034 — 챗봇 실제 LLM 호출

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `034` |
| **파일명** | `034-chatbot-real-llm.md` |
| **Git 커밋 (short)** | `TBD` |
| **날짜** | `2026-08-20` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
feat: Locals·Vide·Shape가 핸드북 없이 LLM을 직접 호출하게
```

카드 매칭 엔진을 제거하고 `POST /api/chatbot/complete`가 원격 LLM만 호출한다. Locals는 이 방 기억, Vide는 더 긴 맥락, Shape는 저장 대화 검색을 프롬프트에 실어 보낸다.

상세 기록: docs/commits/034-chatbot-real-llm.md
