# 커밋 046: 챗봇 코퍼스 라이브러리 (chatbot-corpus.ts)

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `046` |
| **파일명** | `046-frontend-chatbot-corpus.md` |
| **Git 커밋 (short)** | `6a9eb39` |
| **Git 커밋 (full)** | `6a9eb39fcc8562b1372052401883893c65932627` |
| **날짜** | `2026-08-24` |
| **작성자** | `Copilot` |
| **브랜치** | `main` |

---

## 1. 커밋 내용

### 제목

```
feat: 챗봇 RAG 코퍼스 수집 라이브러리
```

### 본문

```
Shape 모델(고급 RAG) 컨텍스트 준비:

- collectChatCorpus(): 저장된 챗봇 대화 수집
- collectPlatformCorpus(): 롱폼/커뮤니티/FAQ 수집
- 각각 400/200 토큰 제한
- 포맷: {kind, title, content, threadKey?}

ChatbotWorkspace에서 Shape 선택 시 자동 호출.
Locals/Vide는 코퍼스 미사용 (API의 built-in 문맥 사용).

상세: docs/commits/046-frontend-chatbot-corpus.md
```

---

## 2. 파일 변경

| 파일 | 라인 | 변경 |
|------|------|------|
| `FrontServer/lib/chatbot-corpus.ts` | 신규 | ~80줄 |
| `FrontServer/lib/api.ts` | (이미 포함) | 데이터 조회 메서드 |

---

## 3. 배경: 챗봇 모델별 아키텍처

### Locals (무료, 로컬)
- **저장:** 없음 (세션당 휘발성)
- **문맥:** 현재 대화만 (turn-by-turn)
- **RAG:** 불필요

### Vide (회원 전용, 기본)
- **저장:** SQLite chatbot_threads/messages
- **문맥:** 현재 대화만
- **RAG:** 불필요
- **특징:** 기본 LLM 호출 (Google Gemini 또는 Groq)

### Shape (회원 전용, 고급)
- **저장:** SQLite chatbot_threads/messages
- **문맥:** 현재 대화 + RAG 코퍼스
- **RAG:** 필수
  - 사용자의 다른 챗봇 대화 (collectChatCorpus)
  - 플랫폼 콘텐츠: 롱폼/커뮤니티/FAQ (collectPlatformCorpus)
- **특징:** LangGraph + RAG (Google Gemini 또는 Groq)

---

## 4. 데이터 수집 전략

### 4.1 Chat Corpus (사용자 대화)

**수집 대상:**
- 로그인한 사용자의 **이전 챗봇 스레드** (현재 스레드 제외)
- 각 스레드의 모든 메시지

**포맷:**
```typescript
{
  kind: 'chatbot',
  title: '스레드 제목',
  threadKey: `chatbot_${threadId}`,
  role: 'user' | 'bot',
  content: '메시지 텍스트'
}
```

**제한:**
- 최대 400 토큰 (약 100 메시지)
- 최신순 정렬

**코드:**
```typescript
export async function collectChatCorpus(
  excludeThreadId?: number,
  limit: number = 400
): Promise<ChatCorpusDoc[]> {
  const threads = await api.getChatbotThreads();
  if (!threads.success) return [];
  
  const docs: ChatCorpusDoc[] = [];
  let tokenEstimate = 0;
  
  for (const thread of threads.data ?? []) {
    if (excludeThreadId && thread.id === excludeThreadId) continue;
    
    const detail = await api.getChatbotThread(thread.id);
    if (!detail.success) continue;
    
    for (const msg of detail.data?.messages ?? []) {
      const tokens = Math.ceil(msg.content.length / 4);  // 대략 추정
      if (tokenEstimate + tokens > limit) break;
      
      docs.push({
        kind: 'chatbot',
        title: thread.title,
        threadKey: `chatbot_${thread.id}`,
        role: msg.role,
        content: msg.content
      });
      
      tokenEstimate += tokens;
    }
    
    if (tokenEstimate > limit) break;
  }
  
  return docs;
}
```

### 4.2 Platform Corpus (플랫폼 콘텐츠)

**수집 대상:**
- 롱폼 비디오 (title + description)
- 커뮤니티 글 (title + body)
- FAQ (기존 chatbot_docs, 선택사항)

**포맷:**
```typescript
{
  kind: 'longform' | 'community' | 'faq',
  title: '제목',
  content: '본문'
  // (threadKey 없음, 일반 지식)
}
```

**제한:**
- 최대 200 토큰 (약 50 콘텐츠 또는 아이템)
- 최신순 정렬

**코드:**
```typescript
export async function collectPlatformCorpus(
  limit: number = 200
): Promise<PlatformCorpusDoc[]> {
  const docs: PlatformCorpusDoc[] = [];
  let tokenEstimate = 0;
  
  // 롱폼
  const longforms = await api.getLongformList();
  for (const lf of longforms.data ?? []) {
    const content = `${lf.title}\n${lf.description}`;
    const tokens = Math.ceil(content.length / 4);
    if (tokenEstimate + tokens > limit) break;
    
    docs.push({
      kind: 'longform',
      title: lf.title,
      content
    });
    tokenEstimate += tokens;
  }
  
  // 커뮤니티
  const communities = await api.getCommunityList();
  for (const cp of communities.data ?? []) {
    const content = `${cp.title}\n${cp.body}`;
    const tokens = Math.ceil(content.length / 4);
    if (tokenEstimate + tokens > limit) break;
    
    docs.push({
      kind: 'community',
      title: cp.title,
      content
    });
    tokenEstimate += tokens;
  }
  
  return docs;
}
```

---

## 5. 사용 흐름 (ChatbotWorkspace)

### Shape 모델 선택 시

```typescript
// components/chatbot/ChatbotWorkspace.tsx
if (selectedModel === 'shape') {
  // 1. 코퍼스 수집
  const chatCorpus = await collectChatCorpus(currentThreadId);
  const platformCorpus = await collectPlatformCorpus();
  
  // 2. 메시지 + 코퍼스와 함께 전송
  const response = await api.chatbotComplete({
    threadId: currentThreadId,
    messages: [...currentMessages, { role: 'user', content: userInput }],
    model: 'shape',
    corpusDocs: [...chatCorpus, ...platformCorpus]  // ← RAG 입력
  });
  
  // 3. 응답 저장
  await api.addChatbotMessage(currentThreadId, {
    role: 'bot',
    content: response.data
  });
}
```

### Locals/Vide 선택 시

코퍼스 수집 **불필요** (생략):

```typescript
if (selectedModel === 'vide') {
  // 코퍼스 없이 직접 전송
  const response = await api.chatbotComplete({
    threadId: currentThreadId,
    messages: [...],
    model: 'vide'
    // corpusDocs 생략
  });
}
```

---

## 6. 타입 정의

### `types/chatbot.ts` (또는 content.ts에 추가)

```typescript
export type ChatCorpusDoc = {
  kind: 'chatbot';
  title: string;
  threadKey: string;  // 'chatbot_123'
  role: 'user' | 'bot';
  content: string;
};

export type PlatformCorpusDoc = {
  kind: 'longform' | 'community' | 'faq';
  title: string;
  content: string;
};

export type CorpusDoc = ChatCorpusDoc | PlatformCorpusDoc;

export type ChatbotCompleteInput = {
  threadId: number;
  messages: ChatbotMessage[];
  model: 'locals' | 'vide' | 'shape';
  corpusDocs?: CorpusDoc[];  // Shape만 필수
};
```

---

## 7. 성능 고려사항

### 토큰 추정 공식

```typescript
const tokens = Math.ceil(content.length / 4);  // 대략 1 토큰 ≈ 4 글자
```

더 정확한 계산은 `js-tiktoken` 라이브러리 사용:

```typescript
import { encoding_for_model } from 'js-tiktoken';
const enc = encoding_for_model('gpt-3.5-turbo');
const tokens = enc.encode(content).length;
```

### 캐싱 (선택사항)

```typescript
let cachedPlatformCorpus: PlatformCorpusDoc[] | null = null;
let cacheTime = 0;

export async function collectPlatformCorpus(): Promise<PlatformCorpusDoc[]> {
  const now = Date.now();
  if (cachedPlatformCorpus && now - cacheTime < 5 * 60 * 1000) {
    return cachedPlatformCorpus;  // 5분 내 재사용
  }
  
  // ... 수집 로직
  cachedPlatformCorpus = docs;
  cacheTime = now;
  return docs;
}
```

---

## 8. 에러 처리

```typescript
export async function collectChatCorpus(
  excludeThreadId?: number
): Promise<ChatCorpusDoc[]> {
  try {
    // ... 수집 로직
  } catch (err) {
    console.error('Failed to collect chat corpus:', err);
    return [];  // 빈 배열 반환 (Shape 모델도 코퍼스 없이 동작)
  }
}
```

---

## 9. 테스트 계획

### 유닛 테스트
```typescript
describe('chatbot-corpus', () => {
  test('collectPlatformCorpus: 최대 200 토큰 준수', async () => {
    const docs = await collectPlatformCorpus(200);
    const totalTokens = docs.reduce(
      (sum, doc) => sum + Math.ceil(doc.content.length / 4),
      0
    );
    expect(totalTokens).toBeLessThanOrEqual(200);
  });
  
  test('collectChatCorpus: excludeThreadId 제외', async () => {
    const docs = await collectChatCorpus(1);  // 스레드 1 제외
    const threadKeys = docs.map(d => d.threadKey);
    expect(threadKeys).not.toContain('chatbot_1');
  });
});
```

### 통합 테스트
1. Shape 모델 선택 시 코퍼스 자동 수집 확인
2. 코퍼스 포함 응답이 일반 응답보다 관련성 높은지 검증

---

## 10. 주의사항

### ⚠️ 주의사항
1. **API 호출 수:** 코퍼스 수집에 여러 API 호출 필요 (최적화 고려)
2. **토큰 제한:** 모델별 컨텍스트 윈도우 초과 주의
3. **개인정보:** 다른 사용자 대화 절대 포함 X (owner_id 범위 지정 필수)

### 🤔 TBD
- [ ] 벡터 DB로 의미 검색 (현재는 선형 검색)
- [ ] 사용자 대화 자동 임베딩 저장
- [ ] 플랫폼 콘텐츠 사전 요약 (토큰 절약)

---

## 11. 관련 파일

- `FrontServer/lib/chatbot-corpus.ts` — 수집 함수
- `FrontServer/components/chatbot/ChatbotWorkspace.tsx` — 사용
- `FrontServer/lib/api.ts` — 데이터 조회

---

## 12. 후속 커밋

- **047:** 롱폼/커뮤니티 컴포넌트 API 연동
- **048:** 메시지/채팅 컴포넌트 API 연동
- **049:** 챗봇 컴포넌트 재작성
- **050:** 린트/타입 수정 마무리
