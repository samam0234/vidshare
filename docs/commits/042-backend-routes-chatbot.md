# 커밋 042: 챗봇 API 라우트

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `042` |
| **파일명** | `042-backend-routes-chatbot.md` |
| **Git 커밋 (short)** | `683f209` |
| **Git 커밋 (full)** | `683f209658ae8fdb29f3d951fedf92edf3b8cefc` |
| **날짜** | `2026-08-24` |
| **작성자** | `Copilot` |
| **브랜치** | `main` |

---

## 1. 커밋 내용

### 제목

```
feat: 챗봇 스레드 API 라우트 구현
```

### 본문

```
회원 전용 챗봇 대화 히스토리 엔드포인트:

- GET /api/chatbot/threads (회원 목록)
- POST /api/chatbot/threads (회원 생성)
- GET /api/chatbot/threads/:id (회원 상세)
- PATCH /api/chatbot/threads/:id (회원 수정)
- DELETE /api/chatbot/threads/:id (회원 삭제)
- POST /api/chatbot/threads/:id/messages (회원 메시지 추가)

게스트는 백엔드 저장 없음 (프론트 로컬 상태만 사용).

상세: docs/commits/042-backend-routes-chatbot.md
```

---

## 2. 파일 변경

| 파일 | 라인 | 변경 |
|------|------|------|
| `BackendServer/src/routes/chatbot-threads.ts` | 신규 | ~180줄 |
| `BackendServer/src/app.ts` | +5 | 라우트 마운트 |

---

## 3. 엔드포인트 스펙

#### GET `/api/chatbot/threads`
- **권한:** 인증 필수 (회원만)
- **응답:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "title": "Python 질문",
        "model": "vide",
        "createdAt": "2026-08-24T10:00:00Z",
        "updatedAt": "2026-08-24T10:05:00Z"
      }
    ]
  }
  ```

#### POST `/api/chatbot/threads`
- **권한:** 인증 필수
- **본문:**
  ```json
  { "title": "Python 질문", "model": "vide" }
  ```
  - `model`: 'locals' | 'vide' | 'shape'
  - vide/shape는 회원 전용 (프론트에서 강제)
- **응답:** 생성된 스레드 (id 포함)

#### GET `/api/chatbot/threads/:id`
- **권한:** 인증 필수 + 해당 스레드 소유자만
- **응답:** 스레드 상세 + 모든 메시지
  ```json
  {
    "success": true,
    "data": {
      "id": 1,
      "title": "Python 질문",
      "model": "vide",
      "messages": [
        {
          "id": 1,
          "role": "user",
          "content": "Python에서...",
          "createdAt": "2026-08-24T10:00:00Z"
        },
        {
          "id": 2,
          "role": "bot",
          "content": "Python의...",
          "createdAt": "2026-08-24T10:01:00Z"
        }
      ]
    }
  }
  ```

#### PATCH `/api/chatbot/threads/:id`
- **권한:** 인증 필수 + 소유자만
- **본문:** (선택적 필드)
  ```json
  { "title": "새 제목", "model": "shape" }
  ```
- **응답:** 갱신된 스레드
- **부수 효과:** `updated_at` 자동 갱신

#### DELETE `/api/chatbot/threads/:id`
- **권한:** 인증 필수 + 소유자만
- **동작:** 스레드 + 모든 메시지 삭제

#### POST `/api/chatbot/threads/:id/messages`
- **권한:** 인증 필수 + 소유자만
- **본문:**
  ```json
  { "role": "user", "content": "질문 텍스트", "attachments": [...] }
  ```
- **응답:** 추가된 메시지
- **부수 효과:** 부모 스레드의 `updated_at` 갱신

---

## 4. 구현 예시

### `src/routes/chatbot-threads.ts`

```typescript
import express from 'express';
import { requireRequestUser } from '../auth/requestUser';
import * as store from '../data/store';

export const chatbotThreadsRouter = express.Router();

// GET /api/chatbot/threads
chatbotThreadsRouter.get('/', requireRequestUser(), (req, res) => {
  try {
    const threads = store.listChatbotThreads(req.user.id);
    res.json({ success: true, data: threads });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// POST /api/chatbot/threads
chatbotThreadsRouter.post('/', requireRequestUser(), (req, res) => {
  try {
    const { title, model } = req.body;
    if (!title || !model) {
      return res.status(400).json({
        success: false,
        error: 'title and model required'
      });
    }
    
    // vide/shape는 회원 전용 (프론트에서 보호하지만 서버도 확인)
    if ((model === 'vide' || model === 'shape') && !req.user.isMember) {
      return res.status(403).json({
        success: false,
        error: 멤버만 사용 가능'
      });
    }
    
    const thread = store.createChatbotThread(req.user.id, {
      title,
      model
    });
    
    res.json({ success: true, data: thread });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// GET /api/chatbot/threads/:id
chatbotThreadsRouter.get('/:id', requireRequestUser(), (req, res) => {
  try {
    const thread = store.getChatbotThreadById(Number(req.params.id), req.user.id);
    if (!thread) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    
    const messages = store.listChatbotMessages(Number(req.params.id));
    res.json({ success: true, data: { ...thread, messages } });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// PATCH /api/chatbot/threads/:id
chatbotThreadsRouter.patch('/:id', requireRequestUser(), (req, res) => {
  try {
    const thread = store.getChatbotThreadById(Number(req.params.id), req.user.id);
    if (!thread) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    
    const { title, model } = req.body;
    const updated = store.updateChatbotThread(Number(req.params.id), req.user.id, {
      ...(title && { title }),
      ...(model && { model })
    });
    
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// DELETE /api/chatbot/threads/:id
chatbotThreadsRouter.delete('/:id', requireRequestUser(), (req, res) => {
  try {
    const thread = store.getChatbotThreadById(Number(req.params.id), req.user.id);
    if (!thread) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    
    const success = store.deleteChatbotThread(Number(req.params.id), req.user.id);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(403).json({ success: false, error: 'Unauthorized' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// POST /api/chatbot/threads/:id/messages
chatbotThreadsRouter.post('/:id/messages', requireRequestUser(), (req, res) => {
  try {
    const thread = store.getChatbotThreadById(Number(req.params.id), req.user.id);
    if (!thread) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    
    const { role, content, attachments } = req.body;
    if (!role || !content) {
      return res.status(400).json({
        success: false,
        error: 'role and content required'
      });
    }
    
    const message = store.addChatbotMessage(Number(req.params.id), {
      role,
      content,
      attachments
    });
    
    // 스레드 updated_at 갱신
    store.updateChatbotThread(Number(req.params.id), req.user.id, {});
    
    res.json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});
```

---

## 5. 게스트 vs 회원 구별

- **게스트:** 백엔드 저장 안 함. 프론트의 React 로컬 상태만 사용. "locals" 모델만 가능.
- **회원:** 모든 API 엔드포인트 사용 가능. 데이터 영속화.

프론트에서 `req.user` 존재 여부로 게스트/회원 구별. 게스트는 이 라우트들을 호출하지 않음.

---

## 6. 후속 커밋

- **043:** 고객센터/알림 라우트
- **044:** API 클라이언트 메서드
