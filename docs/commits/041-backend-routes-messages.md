# 커밋 041: 메시지/대화 API 라우트

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `041` |
| **파일명** | `041-backend-routes-messages.md` |
| **Git 커밋 (short)** | `645a9c1` |
| **Git 커밋 (full)** | `645a9c12e2eb27791c8ffe85892b7697819b7910` |
| **날짜** | `2026-08-24` |
| **작성자** | `Copilot` |
| **브랜치** | `main` |

---

## 1. 커밋 내용

### 제목

```
feat: 메시지/대화 API 라우트 구현
```

### 본문

```
회원 전용 메시지 대화 엔드포인트:

- GET /api/conversations (인증)
- POST /api/conversations (인증)
- GET /api/conversations/:id (인증, 대화 상세)
- POST /api/conversations/:id/lines (인증, 메시지 추가)

대화 생성 시 알림 생성. 메시지 추가 시 last_message 갱신.

상세: docs/commits/041-backend-routes-messages.md
```

---

## 2. 파일 변경

| 파일 | 라인 | 변경 |
|------|------|------|
| `BackendServer/src/routes/conversations.ts` | 신규 | ~150줄 |
| `BackendServer/src/app.ts` | +5 | 라우트 마운트 |

---

## 3. 엔드포인트 스펙

#### GET `/api/conversations`
- **권한:** 인증 필수
- **응답:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "targetName": "Alice",
        "targetHandle": "@alice",
        "lastMessage": "안녕하세요",
        "createdAt": "2026-08-24T10:00:00Z"
      }
    ]
  }
  ```

#### POST `/api/conversations`
- **권한:** 인증 필수
- **본문:**
  ```json
  { "targetName": "Alice", "targetHandle": "@alice" }
  ```
- **응답:** 생성된 대화 객체
- **부수 효과:** 알림 생성 (선택사항)

#### GET `/api/conversations/:id`
- **권한:** 인증 필수 + 대화 참여자만
- **응답:** 대화 상세 + 모든 `chat_lines`
  ```json
  {
    "success": true,
    "data": {
      "id": 1,
      "targetName": "Alice",
      "lines": [
        { "id": 1, "type": "me", "content": "안녕!", "createdAt": "..." },
        { "id": 2, "type": "other", "content": "안녕하세요!", "createdAt": "..." }
      ]
    }
  }
  ```

#### POST `/api/conversations/:id/lines`
- **권한:** 인증 필수 + 대화 참여자만
- **본문:**
  ```json
  { "content": "메시지 텍스트", "isImage": false }
  ```
- **응답:** 추가된 메시지
  ```json
  {
    "success": true,
    "data": {
      "id": 2,
      "conversationId": 1,
      "type": "me",
      "content": "메시지 텍스트",
      "isImage": false,
      "createdAt": "2026-08-24T10:05:00Z"
    }
  }
  ```
- **부수 효과:** 부모 대화의 `last_message` 갱신

---

## 4. 구현 예시

### `src/routes/conversations.ts`

```typescript
import express from 'express';
import { requireRequestUser } from '../auth/requestUser';
import * as store from '../data/store';

export const conversationsRouter = express.Router();

// GET /api/conversations
conversationsRouter.get('/', requireRequestUser(), (req, res) => {
  try {
    const conversations = store.listConversations(req.user.id);
    res.json({ success: true, data: conversations });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// POST /api/conversations
conversationsRouter.post('/', requireRequestUser(), (req, res) => {
  try {
    const { targetName, targetHandle } = req.body;
    if (!targetName) {
      return res.status(400).json({
        success: false,
        error: 'targetName required'
      });
    }
    
    const conv = store.createConversation(req.user.id, {
      targetName,
      targetHandle: targetHandle || targetName
    });
    
    res.json({ success: true, data: conv });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// GET /api/conversations/:id
conversationsRouter.get('/:id', requireRequestUser(), (req, res) => {
  try {
    const conv = store.getConversationById(
      Number(req.params.id),
      req.user.id
    );
    
    if (!conv) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    
    const lines = store.listChatLines(Number(req.params.id));
    
    res.json({
      success: true,
      data: { ...conv, lines }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// POST /api/conversations/:id/lines
conversationsRouter.post('/:id/lines', requireRequestUser(), (req, res) => {
  try {
    const conv = store.getConversationById(
      Number(req.params.id),
      req.user.id
    );
    
    if (!conv) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    
    const { content, isImage } = req.body;
    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'content required'
      });
    }
    
    const line = store.addChatLine(
      Number(req.params.id),
      'me',
      content,
      isImage ?? false
    );
    
    // 대화의 last_message 갱신
    store.updateConversation(Number(req.params.id), req.user.id, {
      lastMessage: content
    });
    
    res.json({ success: true, data: line });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});
```

---

## 5. 권한 체크

모든 엔드포인트는 `requireRequestUser()` 미들웨어로 보호.  
GET/:id와 POST/:id/lines는 추가로 `owner_id = req.user.id` 확인 (getConversationById의 두 번째 인자로)

---

## 6. 후속 커밋

- **042:** 챗봇 라우트
- **043:** 고객센터/알림 라우트
- **044:** API 클라이언트 메서드
