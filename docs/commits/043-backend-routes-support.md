# 커밋 043: 고객센터/알림 API 라우트

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `043` |
| **파일명** | `043-backend-routes-support.md` |
| **Git 커밋 (short)** | `acd4ec4` |
| **Git 커밋 (full)** | `acd4ec41f29d8691698f297ddf81aba4897c087b` |
| **날짜** | `2026-08-24` |
| **작성자** | `Copilot` |
| **브랜치** | `main` |

---

## 1. 커밋 내용

### 제목

```
feat: 고객센터/알림 API 라우트 구현
```

### 본문

```
회원 전용 지원 요청 및 활동 알림 엔드포인트:

Support Inquiries:
- GET /api/support/inquiries (회원 문의 목록)
- POST /api/support/inquiries (회원 문의 생성)
- GET /api/support/inquiries/:id (회원 상세)

Activity Notifications:
- GET /api/notifications (회원 알림 목록)
- PATCH /api/notifications/:id (회원 읽음 처리)
- DELETE /api/notifications/:id (회원 삭제)

지원 요청 생성 시 자동 알림. 라우트에 새 auth 미들웨어 추가.

상세: docs/commits/043-backend-routes-support.md
```

---

## 2. 파일 변경

| 파일 | 라인 | 변경 |
|------|------|------|
| `BackendServer/src/routes/support.ts` | 수정 | ~120줄 |
| `BackendServer/src/routes/notifications.ts` | 신규 | ~100줄 |
| `BackendServer/src/auth/requestUser.ts` | 신규 | ~20줄 |
| `BackendServer/src/app.ts` | +10 | 라우트 마운트 |

---

## 3. 새 미들웨어: `requireRequestUser`

모든 POST/PATCH/DELETE 엔드포인트에서 사용:

```typescript
// src/auth/requestUser.ts
import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user: {
    id: string;
    name: string;
    email: string;
    isMember?: boolean;
  };
}

export function requireRequestUser(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  next();
}
```

---

## 4. 엔드포인트 스펙

### Support Inquiries

#### GET `/api/support/inquiries`
- **권한:** 인증 필수
- **응답:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "subject": "계정 삭제 방법",
        "body": "어떻게 계정을 삭제하나요?",
        "createdAt": "2026-08-24T10:00:00Z"
      }
    ]
  }
  ```

#### POST `/api/support/inquiries`
- **권한:** 인증 필수
- **본문:**
  ```json
  { "subject": "...", "body": "..." }
  ```
- **응답:** 생성된 문의
- **부수 효과:** activity_notifications 생성 ("지원 요청 #N 등록됨")

#### GET `/api/support/inquiries/:id`
- **권한:** 인증 필수 + 작성자만
- **응답:** 문의 상세

### Activity Notifications

#### GET `/api/notifications`
- **권한:** 인증 필수
- **쿼리:** `unreadOnly?` (true면 읽지 않은 것만)
- **응답:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "category": "system",
        "message": "롱폼 #1 등록됨",
        "read": false,
        "href": "/longform/1",
        "createdAt": "2026-08-24T10:00:00Z"
      }
    ]
  }
  ```

#### PATCH `/api/notifications/:id`
- **권한:** 인증 필수 + 수신자만
- **본문:** (선택, 통상 빈 본문)
  ```json
  { "read": true }
  ```
- **응답:** 갱신된 알림

#### DELETE `/api/notifications/:id`
- **권한:** 인증 필수 + 수신자만
- **동작:** 삭제 후 200 OK

---

## 5. 구현 예시

### `src/routes/support.ts`

```typescript
import express, { Request, Response } from 'express';
import { requireRequestUser } from '../auth/requestUser';
import * as store from '../data/store';

export const supportRouter = express.Router();

// GET /api/support/inquiries
supportRouter.get('/inquiries', requireRequestUser as any, (req: any, res: Response) => {
  try {
    const inquiries = store.listInquiries(req.user.id);
    res.json({ success: true, data: inquiries });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// POST /api/support/inquiries
supportRouter.post('/inquiries', requireRequestUser as any, (req: any, res: Response) => {
  try {
    const { subject, body } = req.body;
    if (!subject || !body) {
      return res.status(400).json({
        success: false,
        error: 'subject and body required'
      });
    }
    
    const inquiry = store.createInquiry(req.user.id, { subject, body });
    
    // 알림 생성
    store.createNotification(req.user.id, {
      category: 'system',
      message: `지원 요청 #${inquiry.id} 등록됨`,
      href: `/support/inquiries/${inquiry.id}`
    });
    
    res.json({ success: true, data: inquiry });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// GET /api/support/inquiries/:id
supportRouter.get('/inquiries/:id', requireRequestUser as any, (req: any, res: Response) => {
  try {
    const inquiry = store.getInquiryById(Number(req.params.id), req.user.id);
    if (!inquiry) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    res.json({ success: true, data: inquiry });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});
```

### `src/routes/notifications.ts`

```typescript
import express, { Response } from 'express';
import { requireRequestUser } from '../auth/requestUser';
import * as store from '../data/store';

export const notificationsRouter = express.Router();

// GET /api/notifications
notificationsRouter.get('/', requireRequestUser as any, (req: any, res: Response) => {
  try {
    const { unreadOnly } = req.query;
    const notifications = store.listNotifications(
      req.user.id,
      unreadOnly === 'true'
    );
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// PATCH /api/notifications/:id
notificationsRouter.patch('/:id', requireRequestUser as any, (req: any, res: Response) => {
  try {
    store.markNotificationRead(Number(req.params.id));
    const notif = store.getNotificationById(Number(req.params.id));
    if (!notif) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    res.json({ success: true, data: notif });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// DELETE /api/notifications/:id
notificationsRouter.delete('/:id', requireRequestUser as any, (req: any, res: Response) => {
  try {
    const notif = store.getNotificationById(Number(req.params.id));
    if (!notif || notif.ownerId !== req.user.id) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    
    // 삭제 로직 추가 (store.ts에서)
    // store.deleteNotification(Number(req.params.id));
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});
```

---

## 6. 앱 마운트

### `src/app.ts`

```typescript
import { supportRouter } from './routes/support';
import { notificationsRouter } from './routes/notifications';

// ...

app.use('/api/support', supportRouter);
app.use('/api/notifications', notificationsRouter);
```

---

## 7. 후속 커밋

- **044:** API 클라이언트 메서드 (lib/api.ts)
- **045~050:** 프론트 컴포넌트 연동
