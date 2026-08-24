# 커밋 038: SQLite 스키마 확장 (콘텐츠/대화 테이블)

> **사용법**  
> 1. 이 파일을 복사해 `docs/commits/NNN-짧은-slug.md` 로 저장  
> 2. `{{...}}` 및 안내 문구를 실제 내용으로 교체  
> 3. `docs/commits/README.md` 인덱스 표에 한 줄 추가  
> 4. 코드와 함께 커밋

---

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `038` |
| **파일명** | `038-sqlite-schema-extend.md` |
| **Git 커밋 (short)** | `f1b0388` |
| **Git 커밋 (full)** | `f1b0388e48baf4ce16034803a0362e75d450df63` |
| **날짜** | `2026-08-24` |
| **작성자** | `Copilot` |
| **브랜치** | `main` |
| **관련 이슈/PR** | `없음` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

### 제목

```
feat: SQLite 스키마 확장 (롱폼, 커뮤니티, 대화, 챗봇, 문의)
```

### 본문

```
콘텐츠와 사용자 상호작용을 SQLite에 영속화하기 위해 8개 테이블 추가:

- longform: 롱폼 비디오 (id, title, description, videoUrl, thumb, gradient, owner_id)
- community_posts: 커뮤니티 글 (id, title, body, owner_id)
- chatbot_threads: 챗봇 저장 기록 (id, owner_id, title, model, created_at, updated_at)
- chatbot_messages: 챗봇 메시지 (id, thread_id, role, content, attachments JSON, created_at)
- conversations: 메시지 대화상대 (id, owner_id, target_name, target_handle, last_message, created_at)
- chat_lines: 메시지 일련번호 채팅 (id, conversation_id, type, content, is_image, created_at)
- support_inquiries: 고객센터 문의 (id, owner_id, subject, body, created_at)
- activity_notifications: 활동 알림 (id, owner_id, category, message, read, href, created_at)

모든 테이블은 owner_id로 사용자별 범위 지정, INTEGER AUTOINCREMENT id로 일련번호 지원.

상세: docs/commits/038-sqlite-schema-extend.md
```

---

## 2. 개요

### 배경

지금까지 롱폼, 커뮤니티, 대화, 챗봇 저장 기록, 고객센터 문의는 **프론트엔드 localStorage**에만 저장되었습니다.  
이로 인해:

1. **데이터 영속성 부족** — 새로 고침·다른 기기·브라우저 이동 시 데이터 손실
2. **멀티디바이스 미지원** — 한 기기에서만 이용 가능
3. **서버 권한 관리 불가** — 백엔드에서 사용자 데이터 통제 불가
4. **API 기반 렌더링 불가** — SSR/정적 생성 미지원
5. **검색/RAG 어려움** — 커뮤니티·롱폼이 서버 RAG에 포함 불가

이를 해결하기 위해 모든 콘텐츠를 **SQLite 테이블로 마이그레이션**합니다.

### 목표

✅ 사용자별로 격리된 9개 새 테이블 추가  
✅ 각 테이블에 `owner_id` 범위 지정 + `INTEGER AUTOINCREMENT id` 일련번호 지원  
✅ 기존 `users`, `sessions`, `shorts`, `comments`, `notifications` 등은 유지  
✅ 마이그레이션 스크립트 없음 (신규 테이블만 생성)

---

## 3. 상세 스키마

### 3.1 롱폼 (`longform`)

```sql
CREATE TABLE IF NOT EXISTS longform (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumb TEXT,
  gradient TEXT NOT NULL,
  author_name TEXT,  -- owner.name 복사본
  created_at TEXT NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);
```

**열 설명:**
- `id`: 일련번호 (UI SerialBadge에 표시)
- `owner_id`: 작성자 사용자 ID
- `title`: 제목 (최대 200자)
- `description`: 설명 (최대 1000자)
- `video_url`: 비디오 URL (선택)
- `thumb`: 썸네일 이미지 URL
- `gradient`: CSS 그래디언트 (선택 시)
- `author_name`: 작성자명 (정규화 위해 복사)
- `created_at`: ISO 8601 타임스탐프

### 3.2 커뮤니티 (`community_posts`)

```sql
CREATE TABLE IF NOT EXISTS community_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  author_name TEXT,  -- owner.name 복사본
  created_at TEXT NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);
```

**열 설명:**
- `id`: 일련번호
- `owner_id`: 작성자 사용자 ID
- `title`: 제목
- `body`: 본문 (마크다운 지원 여부 TBD)
- `author_name`: 작성자명
- `created_at`: 작성 시각

### 3.3 챗봇 스레드 (`chatbot_threads`)

```sql
CREATE TABLE IF NOT EXISTS chatbot_threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  model TEXT NOT NULL,  -- 'locals', 'vide', 'shape'
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);
```

**열 설명:**
- `id`: 대화 일련번호
- `owner_id`: 회원 사용자 ID (로컬 대화는 백엔드 미저장)
- `title`: 사용자가 지은 대화 제목
- `model`: 사용 모델 (locals/vide/shape)
- `created_at`: 생성 시각
- `updated_at`: 마지막 수정 시각

### 3.4 챗봇 메시지 (`chatbot_messages`)

```sql
CREATE TABLE IF NOT EXISTS chatbot_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL,
  role TEXT NOT NULL,  -- 'user' or 'bot'
  content TEXT NOT NULL,
  attachments TEXT,  -- JSON array [{name, mime, size, dataUrl?, text?}]
  created_at TEXT NOT NULL,
  FOREIGN KEY (thread_id) REFERENCES chatbot_threads(id)
);
```

**열 설명:**
- `id`: 메시지 일련번호
- `thread_id`: 속한 스레드 ID
- `role`: 화자 ('user' / 'bot')
- `content`: 메시지 텍스트
- `attachments`: JSON 직렬화 첨부 배열 (파일 메타데이터)
- `created_at`: 발송 시각

### 3.5 메시지 대화 (`conversations`)

```sql
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL,
  target_name TEXT NOT NULL,
  target_handle TEXT NOT NULL,
  last_message TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);
```

**열 설명:**
- `id`: 대화 일련번호
- `owner_id`: 로그인한 사용자 ID
- `target_name`: 상대방 표시명
- `target_handle`: 상대방 핸들 (나중에 실제 사용자와 연결 가능)
- `last_message`: 최근 메시지 미리보기
- `created_at`: 대화 생성 시각

### 3.6 메시지 채팅 (`chat_lines`)

```sql
CREATE TABLE IF NOT EXISTS chat_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  type TEXT NOT NULL,  -- 'me', 'other'
  content TEXT NOT NULL,
  is_image BOOLEAN,  -- 이미지인 경우 content는 data URL
  created_at TEXT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);
```

**열 설명:**
- `id`: 메시지 일련번호
- `conversation_id`: 속한 대화 ID
- `type`: 발신자 ('me' / 'other')
- `content`: 메시지 텍스트 또는 이미지 data URL
- `is_image`: 이미지 여부
- `created_at`: 발송 시각

### 3.7 고객센터 문의 (`support_inquiries`)

```sql
CREATE TABLE IF NOT EXISTS support_inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);
```

**열 설명:**
- `id`: 문의 일련번호
- `owner_id`: 발신자 사용자 ID
- `subject`: 제목
- `body`: 본문 (마크다운 지원 여부 TBD)
- `created_at`: 발송 시각

### 3.8 활동 알림 (`activity_notifications`)

```sql
CREATE TABLE IF NOT EXISTS activity_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL,
  category TEXT NOT NULL,  -- 'system', 'mention', 'reply' 등
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT 0,
  href TEXT,  -- 클릭 시 이동할 상대 경로 ('/longform/3' 등)
  created_at TEXT NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);
```

**열 설명:**
- `id`: 알림 일련번호
- `owner_id`: 수신자 사용자 ID
- `category`: 알림 분류 ('system' = 자신의 활동, 'mention' = 언급, 'reply' = 댓글 등)
- `message`: 알림 텍스트 (마크다운 미포함, 순수 문자)
- `read`: 읽음 여부
- `href`: 연관 페이지 경로
- `created_at`: 생성 시각

---

## 4. 영향 범위

### 백엔드
- **신규:** `BackendServer/src/db/schema.ts` 에 8개 테이블 추가
- **기존 테이블 유지:**
  - `users`, `sessions`, `shorts`, `comments`
  - `notifications` (구 형식, 미사용 상태로 두기)
  - `chat_users`, `messages`, `faqs`
  - `chatbot_docs`, `chatbot_summaries` (RAG 전용, 메시지 히스토리 아님)

### 프론트엔드
- **제거 대기:** `lib/content-store.ts` 의 `ContentState` (즉시 제거하지 말고 utils는 유지)
- **신규:** `lib/api.ts`, `lib/notifications-store.ts`, `lib/chatbot-corpus.ts`

### 데이터 마이그레이션
- **자동 스키마 생성:** `schema.ts` 초기화 루틴이 앱 시작 시 자동 생성 (기존 shortsFeed처럼)
- **기존 사용자 데이터:** localStorage는 아무것도 접촉하지 않음 (필요시 브라우저 콘솔에서 수동 지우기)

---

## 5. 코드 변경

### 파일 변경 목록

| 파일 | 변경 | 라인 |
|------|------|------|
| `BackendServer/src/db/schema.ts` | 수정 | ~600-800 |

### 예시

`BackendServer/src/db/schema.ts` 에 다음을 `initializeDatabase()` 안 또는 별도 함수로 추가:

```typescript
// 롱폼
CREATE TABLE IF NOT EXISTS longform (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumb TEXT,
  gradient TEXT NOT NULL,
  author_name TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

// 커뮤니티
CREATE TABLE IF NOT EXISTS community_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  author_name TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

// ... 나머지 6개 테이블
```

---

## 6. 테스트 계획

### 자동 테스트
- [ ] 백엔드 시작 시 모든 8개 테이블 생성 확인
- [ ] 각 테이블의 스키마 검증 (컬럼 명, 타입, 제약조건)
- [ ] 중복 시작 시 FAIL이 아닌 IF NOT EXISTS 동작

### 수동 테스트 (다음 커밋들에서 수행)
- [ ] CRUD 함수가 올바르게 삽입/조회/수정/삭제
- [ ] 범위 지정 쿼리 (WHERE owner_id = ?)
- [ ] 일련번호가 1부터 연속 증가

---

## 7. 주의사항 및 TBD

### ⚠️ 주의사항
1. **마이그레이션 스크립트 없음:** 기존 localStorage 데이터는 수동으로 이동해야 함 (자동화 고려)
2. **Nullable 컬럼:** `thumb`, `gradient`, `last_message`, `href`, `attachments` 등은 NULL 허용
3. **timestamp 형식:** ISO 8601 문자열 (`new Date().toISOString()`) 통일

### 🤔 TBD (향후 논의)
- [ ] 커뮤니티·롱폼 본문에 마크다운 지원 여부
- [ ] 대화·메시지에 이모지 반응 기능 추가
- [ ] 문의에 상태 추적 (opened / pending / resolved)
- [ ] 알림 삭제 정책 (모두 보관 vs 자동 삭제)
- [ ] 초안 저장 기능 (별도 `drafts` 테이블)

---

## 8. 관련 파일 목록

- `BackendServer/src/db/schema.ts` — 스키마 정의
- `docs/commits/TEMPLATE.md` — 커밋 문서 템플릿
- `docs/architecture/overview.md` — 아키텍처 개요 (업데이트 필요)

---

## 9. 후속 커밋

- **039:** `store.ts` CRUD 함수 구현
- **040~044:** 라우트 구현 (routes/longform.ts 등)
- **045:** `lib/api.ts` 클라이언트 메서드
- **048~050:** 컴포넌트 연동 및 타입/린트 수정
