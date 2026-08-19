# 030 — 챗봇 왼쪽 기록·아래 입력줄

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `030` |
| **파일명** | `030-chatbot-workspace.md` |
| **Git 커밋 (short)** | `a974e9e` |
| **날짜** | `2026-08-20` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
feat: 챗봇을 왼쪽 저장 기록과 아래 입력줄로 개편
```

왼쪽에 채팅방 목록, 아래에 파일 첨부·입력·모델 선택·전송. 비회원은 목록/새 방 없이 Locals 한 칸만 쓴다.

상세 기록: docs/commits/030-chatbot-workspace.md

## 범위

- `ChatbotWorkspace.tsx`
- 첨부 타입, 게스트 스레드, Footer는 챗봇에서 숨김
