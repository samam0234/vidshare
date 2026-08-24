# 커밋 040: 롱폼/커뮤니티 API 라우트

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `040` |
| **파일명** | `040-backend-routes-content.md` |
| **Git 커밋 (short)** | `9b11cc5` |
| **Git 커밋 (full)** | `9b11cc596134b13c59f77a91f33c04c35c9ca75a` |
| **날짜** | `2026-08-24` |
| **작성자** | `Copilot` |
| **브랜치** | `main` |

---

## 1. 커밋 내용

### 제목

```
feat: 롱폼/커뮤니티 API 라우트 구현
```

### 본문

```
공개 갤러리 + 회원 작성 엔드포인트:

- GET /api/longform (공개 목록)
- POST /api/longform (인증 필요)
- GET /api/longform/:id (공개 상세)
- DELETE /api/longform/:id (회원 삭제)

- GET /api/community (공개 목록)
- POST /api/community (인증 필요)
- GET /api/community/:id (공개 상세)
- DELETE /api/community/:id (회원 삭제)

생성 시 자동으로 activity_notifications 생성.

상세: docs/commits/040-backend-routes-content.md
```

---

## 2. 파일 변경

| 파일 | 라인 | 변경 |
|------|------|------|
| `BackendServer/src/routes/longform.ts` | 신규 | ~130줄 |
| `BackendServer/src/routes/community.ts` | 신규 | ~130줄 |
| `BackendServer/src/app.ts` | +10 | 라우트 마운트 추가 |

---

## 3. 엔드포인트 스펙

### Longform

#### GET `/api/longform`
- **권한:** 공개
- **쿼리:** `ownerId?` (지정하면 사용자별 필터)
- **응답:**
  ```json
  { "success": true, "data": [LongformVideo, ...] }
  ```

#### POST `/api/longform`
- **권한:** 인증 필수 (req.user 필요)
- **본문:**
  ```json
  { "title": "...", "description": "...", "videoUrl": "...", "gradient": "..." }
  ```
- **응답:**
  ```json
  { "success": true, "data": { "id": 1, "title": "...", ... } }
  ```
- **부수 효과:** `createActivityNotification(ownerId, { category: 'system', message: '롱폼 #1 등록' })`

#### GET `/api/longform/:id`
- **권한:** 공개
- **응답:** 해당 롱폼 또는 404

#### DELETE `/api/longform/:id`
- **권한:** 인증 필요 + 작성자만
- **동작:** 삭제 후 HTTP 200 또는 401/404

### Community

동일한 패턴으로 `/api/community` 엔드포인트

---

## 4. 구현 예시

### `src/routes/longform.ts`

```typescript
import express from 'express';
import { requireRequestUser } from '../auth/requestUser';
import * as store from '../data/store';

export const longformRouter = express.Router();

// GET /api/longform
longformRouter.get('/', (req, res) => {
  try {
    const { ownerId } = req.query;
    const videos = store.listLongform(
      typeof ownerId === 'string' ? ownerId : undefined
    );
    res.json({ success: true, data: videos });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// POST /api/longform
longformRouter.post('/', requireRequestUser(), (req, res) => {
  try {
    const { title, description, videoUrl, gradient } = req.body;
    if (!title || !description || !videoUrl || !gradient) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    const video = store.createLongform(req.user.id, {
      title,
      description,
      videoUrl,
      gradient
    });
    
    // 알림 생성
    store.createNotification(req.user.id, {
      category: 'system',
      message: `롱폼 #${video.id} 등록됨`,
      href: `/longform/${video.id}`
    });
    
    res.json({ success: true, data: video });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// GET /api/longform/:id
longformRouter.get('/:id', (req, res) => {
  try {
    const video = store.getLongformById(Number(req.params.id));
    if (!video) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    res.json({ success: true, data: video });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// DELETE /api/longform/:id
longformRouter.delete('/:id', requireRequestUser(), (req, res) => {
  try {
    const video = store.getLongformById(Number(req.params.id), req.user.id);
    if (!video) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    
    const success = store.deleteLongform(Number(req.params.id), req.user.id);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(403).json({ success: false, error: 'Unauthorized' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});
```

---

## 5. 테스트 계획

### 엔드포인트 테스트
```bash
# 목록 조회
curl http://localhost:4000/api/longform

# 생성 (인증 필요)
curl -X POST http://localhost:4000/api/longform \
  -H "Content-Type: application/json" \
  -d '{"title":"...","description":"...","videoUrl":"...","gradient":"..."}'

# 상세
curl http://localhost:4000/api/longform/1

# 삭제
curl -X DELETE http://localhost:4000/api/longform/1
```

### 권한 검사
- [ ] 미인증 POST 요청 → 401
- [ ] 다른 사용자의 롱폼 삭제 시도 → 403 또는 404
- [ ] 존재하지 않는 롱폼 삭제 → 404

---

## 6. 후속 커밋

- **041:** 커뮤니티 라우트
- **042:** 대화/메시지 라우트
- **043:** 챗봇 라우트
- **044:** 고객센터/알림 라우트
