# 커밋 039: store.ts CRUD 함수 구현 (8개 테이블)

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `039` |
| **파일명** | `039-store-crud-functions.md` |
| **Git 커밋 (short)** | `88b7c2e` |
| **Git 커밋 (full)** | `88b7c2e74437c077252f35ed68f911f1a3377642` |
| **날짜** | `2026-08-24` |
| **작성자** | `Copilot` |
| **브랜치** | `main` |
| **관련 이슈/PR** | `없음` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

### 제목

```
feat: store.ts CRUD 함수 구현 (롱폼, 커뮤니티, 대화, 챗봇, 문의, 알림)
```

### 본문

```
038에서 추가된 8개 테이블에 대한 CRUD 함수 세트 구현:

- Longform (list, get, create, update)
- CommunityPost (list, get, create, update)
- ChatbotThread (list, get, create, update, delete)
- ChatbotMessage (list, get, create, add to thread)
- Conversation (list, get, create)
- ChatLine (list, get, create by conversation)
- SupportInquiry (list, get, create)
- ActivityNotification (list, get, create, mark read)

각 함수는 owner_id 범위 지정, 트랜잭션 활용, 부수 효과(알림 생성 등)는
라우트 핸들러에 위임하는 원칙 따름.

상세: docs/commits/039-store-crud-functions.md
```

---

## 2. 개요

### 배경

038에서 SQLite 스키마를 확장했으므로, 이제 각 테이블과 상호작용할 CRUD 함수를 `store.ts`에 구현해야 합니다.

### 목표

✅ 각 테이블당 기본 CRUD 함수 (create, list, get, update, delete)  
✅ `owner_id` 기반 범위 지정 쿼리  
✅ 타입 안전성 (TypeScript 인터페이스 + 행 매핑 함수)  
✅ 트랜잭션 및 에러 처리  
✅ 성능 최적화 (인덱스 기반 조회)

---

## 3. 코드 변경 요약

### 파일 변경

| 파일 | 라인 | 변경 |
|------|------|------|
| `BackendServer/src/data/store.ts` | +800~1200 | 8개 테이블 CRUD 함수 섹션 추가 |

### 함수 목록 (총 ~35개)

#### Longform
- `listLongform(ownerId?: string): LongformVideo[]` — 모든 롱폼 또는 사용자별
- `getLongformById(id: number, ownerId?: string): LongformVideo | undefined`
- `createLongform(ownerId: string, input: CreateLongformInput): LongformVideo`
- `updateLongform(id: number, ownerId: string, input: Partial<LongformVideo>): LongformVideo`

#### CommunityPost
- `listCommunityPosts(ownerId?: string): CommunityPost[]`
- `getCommunityPostById(id: number, ownerId?: string): CommunityPost | undefined`
- `createCommunityPost(ownerId: string, input: CreateCommunityInput): CommunityPost`

#### ChatbotThread
- `listChatbotThreads(ownerId: string): ChatbotThread[]`
- `getChatbotThreadById(id: number, ownerId?: string): ChatbotThread | undefined`
- `createChatbotThread(ownerId: string, input: CreateChatbotThreadInput): ChatbotThread`
- `updateChatbotThread(id: number, ownerId: string, input: Partial<ChatbotThread>): ChatbotThread`
- `deleteChatbotThread(id: number, ownerId: string): boolean`

#### ChatbotMessage
- `listChatbotMessages(threadId: number): ChatbotMessage[]`
- `getChatbotMessageById(id: number): ChatbotMessage | undefined`
- `addChatbotMessage(threadId: number, input: CreateChatbotMessageInput): ChatbotMessage`

#### Conversation
- `listConversations(ownerId: string): Conversation[]`
- `getConversationById(id: number, ownerId: string): Conversation | undefined`
- `createConversation(ownerId: string, input: CreateConversationInput): Conversation`

#### ChatLine
- `listChatLines(conversationId: number, limit?: number): ChatLine[]`
- `getChatLineById(id: number): ChatLine | undefined`
- `addChatLine(conversationId: number, type: 'me' | 'other', content: string, isImage?: boolean): ChatLine`

#### SupportInquiry
- `listInquiries(ownerId: string): SupportInquiry[]`
- `getInquiryById(id: number, ownerId: string): SupportInquiry | undefined`
- `createInquiry(ownerId: string, input: CreateInquiryInput): SupportInquiry`

#### ActivityNotification
- `listNotifications(ownerId: string, unreadOnly?: boolean): ActivityNotification[]`
- `getNotificationById(id: number): ActivityNotification | undefined`
- `createNotification(ownerId: string, input: CreateNotificationInput): ActivityNotification`
- `markNotificationRead(id: number): void`
- `markAllNotificationsRead(ownerId: string): void`

---

## 4. 설계 원칙

### 4.1 범위 지정 (Scoping)

**회원 전용 테이블** (owner_id 필수 조회):
```typescript
export function listChatbotThreads(ownerId: string): ChatbotThread[] {
  const rows = getDb()
    .prepare('SELECT * FROM chatbot_threads WHERE owner_id = ? ORDER BY updated_at DESC')
    .all(ownerId) as ChatbotThreadRow[];
  return rows.map(toChatbotThread);
}
```

**공개 읽기, 회원 쓰기** (롱폼·커뮤니티):
```typescript
export function listLongform(ownerId?: string): LongformVideo[] {
  let query = 'SELECT * FROM longform ORDER BY created_at DESC';
  const params = [];
  if (ownerId) {
    query += ' WHERE owner_id = ?';
    params.push(ownerId);
  }
  return getDb().prepare(query).all(...params) as LongformVideo[];
}
```

### 4.2 타입 안전성

각 테이블마다:
1. **데이터베이스 행 타입** (snake_case):
   ```typescript
   type LongformRow = {
     id: number;
     owner_id: string;
     title: string;
     // ...
   };
   ```

2. **공용 도메인 타입** (camelCase, 프론트엔드에도 전달):
   ```typescript
   export type LongformVideo = {
     id: number;
     title: string;
     // ...
   };
   ```

3. **변환 함수**:
   ```typescript
   function toLongformVideo(row: LongformRow): LongformVideo {
     return {
       id: row.id,
       title: row.title,
       // ...
     };
   }
   ```

### 4.3 입력 타입

생성/수정용 입력:
```typescript
export type CreateLongformInput = {
  title: string;
  description: string;
  videoUrl: string;
  thumb?: string;
  gradient: string;
};

export type CreateChatbotMessageInput = {
  role: 'user' | 'bot';
  content: string;
  attachments?: ChatbotAttachment[];
};
```

### 4.4 부수 효과 (Side Effects) 분리

**금지:** store.ts 내에서 알림 생성
```typescript
// ❌ 하지 말 것
export function createCommunityPost(...) {
  // ... insert
  // createNotification(...) // ← 여기서 호출 X
}
```

**허용:** 라우트 핸들러에서 조정
```typescript
// ✅ 할 것 (routes/community.ts)
router.post('/api/community', requireRequestUser(), (req, res) => {
  const post = createCommunityPost(userId, input);
  createNotification(userId, { message: `커뮤니티 글 #${post.id} 등록됨` });
  res.json({ success: true, data: post });
});
```

### 4.5 에러 처리

- 존재하지 않는 레코드: `undefined` 반환 (라우트에서 404)
- 권한 없음: 쿼리 자체를 제한 (WHERE owner_id = ?)
- DB 오류: try-catch로 라우트에서 처리

---

## 5. 구현 패턴

### SELECT 쿼리 (읽기)

```typescript
const LONGFORM_SELECT = `
  SELECT id, owner_id, title, description, video_url,
         thumb, gradient, author_name, created_at
  FROM longform
`;

export function getLongformById(id: number): LongformVideo | undefined {
  const row = getDb()
    .prepare(`${LONGFORM_SELECT} WHERE id = ?`)
    .get(id) as LongformRow | undefined;
  return row ? toLongformVideo(row) : undefined;
}
```

### INSERT 쿼리 (생성)

```typescript
export function createLongform(
  ownerId: string,
  input: CreateLongformInput
): LongformVideo {
  const createdAt = new Date().toISOString();
  const authorName = getUserById(ownerId)?.name ?? 'Unknown';
  
  const info = getDb()
    .prepare(`
      INSERT INTO longform (
        owner_id, title, description, video_url,
        thumb, gradient, author_name, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      ownerId, input.title, input.description,
      input.videoUrl, input.thumb ?? null,
      input.gradient, authorName, createdAt
    );
  
  return getLongformById(Number(info.lastInsertRowid))!;
}
```

### UPDATE 쿼리 (수정)

```typescript
export function updateLongform(
  id: number,
  ownerId: string,
  input: Partial<CreateLongformInput>
): LongformVideo {
  const updates: string[] = [];
  const values: any[] = [];
  
  if (input.title !== undefined) {
    updates.push('title = ?');
    values.push(input.title);
  }
  if (input.description !== undefined) {
    updates.push('description = ?');
    values.push(input.description);
  }
  // ... 나머지 필드
  
  if (updates.length === 0) return getLongformById(id, ownerId)!;
  
  values.push(id, ownerId);
  getDb()
    .prepare(
      `UPDATE longform SET ${updates.join(', ')}
       WHERE id = ? AND owner_id = ?`
    )
    .run(...values);
  
  return getLongformById(id, ownerId)!;
}
```

### DELETE 쿼리 (삭제)

```typescript
export function deleteChatbotThread(id: number, ownerId: string): boolean {
  const info = getDb()
    .prepare('DELETE FROM chatbot_threads WHERE id = ? AND owner_id = ?')
    .run(id, ownerId);
  return info.changes > 0;
}
```

---

## 6. 함수별 상세 스펙

### 6.1 Longform

#### `listLongform(ownerId?: string)`
- **인자:** `ownerId` — 선택 (undefined면 모든 롱폼)
- **반환:** `LongformVideo[]`
- **정렬:** `created_at DESC`
- **용도:** 공개 갤러리 또는 마이 갤러리

#### `createLongform(ownerId, input)`
- **인자:** `ownerId` (필수), `input.title`, `input.description`, `input.videoUrl`, `input.gradient`
- **반환:** 생성된 `LongformVideo` (id 포함)
- **부수 효과:** activity_notifications 테이블에 알림 추가 (라우트에서)

### 6.2 CommunityPost

#### `createCommunityPost(ownerId, input)`
- **인자:** `ownerId`, `input.title`, `input.body`
- **반환:** `CommunityPost`
- **알림:** "커뮤니티 글 #{id} 작성됨" (라우트)

### 6.3 ChatbotThread

#### `updateChatbotThread(id, ownerId, input)`
- **변경 가능:** `title`, `model` (선택적)
- **업데이트:** `updated_at` 자동 갱신

#### `deleteChatbotThread(id, ownerId)`
- **동작:** 해당 스레드의 모든 `chatbot_messages`도 카스케이드 삭제 (또는 ON DELETE CASCADE)

### 6.4 ChatbotMessage

#### `addChatbotMessage(threadId, input)`
- **인자:** `threadId` (필수), `role`, `content`, `attachments?`
- **반환:** `ChatbotMessage` (id 포함)
- **참고:** 스레드의 `updated_at` 갱신은 라우트에서 수행

### 6.5 Conversation

#### `createConversation(ownerId, input)`
- **인자:** `ownerId`, `input.targetName`
- **targetHandle:** `targetName`으로 초기화 (후에 실제 핸들과 연결 가능)

### 6.6 ChatLine

#### `addChatLine(conversationId, type, content, isImage?)`
- **인자:** `conversationId`, `type` ('me'/'other'), `content`, `isImage` (기본 false)
- **반환:** `ChatLine` (id 포함)
- **부수 효과:** 부모 `conversations.last_message` 갱신 (라우트에서)

### 6.7 SupportInquiry

#### `createInquiry(ownerId, input)`
- **인자:** `ownerId`, `input.subject`, `input.body`
- **반환:** `SupportInquiry`

### 6.8 ActivityNotification

#### `createNotification(ownerId, input)`
- **인자:** `ownerId`, `input.category`, `input.message`, `input.href?`
- **반환:** `ActivityNotification` (id 포함, read = false)

#### `listNotifications(ownerId, unreadOnly?)`
- **인자:** `ownerId`, `unreadOnly` (true면 read=false인 것만)
- **반환:** `ActivityNotification[]` (최신순)
- **정렬:** `created_at DESC`

#### `markNotificationRead(id)`
- **동작:** 해당 알림의 `read = true`

#### `markAllNotificationsRead(ownerId)`
- **동작:** 해당 사용자의 모든 알림 읽음 처리

---

## 7. 테스트 계획

### 단위 테스트 (예시)
```typescript
describe('store.ts CRUD', () => {
  describe('Longform', () => {
    test('createLongform: id는 1부터 증가', () => {
      const v1 = createLongform('demo', { title: 'A', ... });
      const v2 = createLongform('demo', { title: 'B', ... });
      expect(v2.id).toBe(v1.id + 1);
    });
    
    test('getLongformById: 다른 사용자는 조회 불가', () => {
      const v = createLongform('user1', { ... });
      const result = getLongformById(v.id, 'user2');
      expect(result).toBeUndefined();
    });
  });
});
```

### 수동 테스트
- [ ] 각 create 함수로 첫 데이터 생성 → id = 1 확인
- [ ] 동일 테이블 2개 데이터 생성 → id 자동 증가 확인
- [ ] owner_id 범위 지정 쿼리 동작 확인
- [ ] 존재하지 않는 레코드 조회 → undefined 반환 확인
- [ ] update/delete 권한 검사 (owner_id 일치 확인)

---

## 8. 주의사항

### ⚠️ 주의사항
1. **자동 생성 id:** lastInsertRowid 사용으로 일련번호 보장
2. **타임스탬프:** 모두 ISO 8601 (`new Date().toISOString()`)
3. **NULL 처리:** 선택 필드는 `?? null`로 명시적 NULL 저장
4. **트랜잭션:** 부수 효과는 라우트에서 관리 (store는 쿼리만)

### 🤔 TBD
- [ ] 벌크 삽입 (여러 메시지를 한 번에 추가) 최적화
- [ ] 페이지네이션 지원 (limit/offset)
- [ ] 검색 기능 (fulltext search)

---

## 9. 관련 파일

- `BackendServer/src/data/store.ts` — CRUD 함수 구현
- `BackendServer/src/types/` — 타입 정의 (이번 커밋 또는 별도)
- `docs/commits/038-sqlite-schema-extend.md` — 스키마 정의

---

## 10. 후속 커밋

- **040~044:** 라우트에서 이 함수들을 호출하여 API 엔드포인트 구현
- **045:** `lib/api.ts`에서 라우트 호출
