# 커밋 049: 챗봇 컴포넌트 전면 재작성 (게스트 + 회원 통합)

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `049` |
| **파일명** | `049-frontend-chatbot-workspace.md` |
| **Git 커밋 (short)** | `0a271f1` |
| **Git 커밋 (full)** | `0a271f13f4a59cf0ee9ad6c30578e5e019b6792b` |
| **날짜** | `2026-08-24` |
| **작성자** | `Copilot` |
| **브랜치** | `main` |

---

## 1. 커밋 내용

### 제목

```
refactor: ChatbotWorkspace 전면 재작성 (게스트 + 회원 구분)
```

### 본문

```
게스트와 회원의 챗봇 경험 통합:

게스트 (로컬):
- 세션 중 "locals" 모델만 사용
- React 로컬 상태 저장 (guestThread, guestMessages)
- 새로고침 시 데이터 손실

회원 (영속화):
- 세 모델(locals, vide, shape) 사용 가능
- API로 백엔드 저장 (chatbot_threads, chatbot_messages)
- 대화 히스토리 영구 보관
- Shape 모델: RAG 코퍼스 자동 수집

통합 UI: 새 스레드 생성 → 모델 선택 → 대화 진행

상세: docs/commits/049-frontend-chatbot-workspace.md
```

---

## 2. 파일 변경

| 파일 | 라인 | 변경 |
|------|------|------|
| `FrontServer/components/chatbot/ChatbotWorkspace.tsx` | 재작성 | ~600줄 |
| `FrontServer/lib/chatbot-corpus.ts` | (049에 포함) | 코퍼스 수집 호출 |

---

## 3. 아키텍처: 게스트 vs 회원

### 게스트 (미인증)

**상태:**
```typescript
interface GuestThread {
  id: string;  // UUID 또는 local-{timestamp}
  model: 'locals';
  title: string;
  messages: {
    id: number;  // 로컬 시퀀스 카운터
    role: 'user' | 'bot';
    content: string;
  }[];
}

const [guestThread, setGuestThread] = useState<GuestThread | null>(null);
const [guestMessageCounter, setGuestMessageCounter] = useState(0);
```

**흐름:**
1. "새 대화" 버튼 클릭
2. 로컬 스레드 생성 (model='locals' 고정)
3. 메시지 입력 → 로컬 추가 → `chatbotComplete()` 호출 (no storage)
4. 응답 받아서 로컬 추가
5. 새로고침 시 모두 사라짐

**제약:**
- vide/shape 선택 불가 (선택지에서 비활성화)
- 임시 저장소만 사용
- 데이터 내보내기 불가 (향후 TBD)

---

### 회원 (인증)

**상태:**
```typescript
interface MemberThread extends ChatbotThread {
  messages: ChatbotMessage[];
}

const [savedThreads, setSavedThreads] = useState<MemberThread[]>([]);
const [currentThreadId, setCurrentThreadId] = useState<number | null>(null);
const [currentMessages, setCurrentMessages] = useState<ChatbotMessage[]>([]);
```

**흐름:**
1. "새 대화" 버튼 클릭 → 모델 선택 팝업 (locals, vide, shape)
2. 모델 선택 → `createChatbotThread()` API 호출
3. 스레드 생성됨 (id 받음) → 목록에 추가
4. 메시지 입력 → 로컬 추가 → `chatbotComplete()` 호출 (with corpus if shape)
5. 응답 받아서 → `addChatbotMessage()` API 호출로 저장
6. 새로고침해도 `getChatbotThreads()` → `getChatbotThread(id)` → 모든 메시지 복원

**모델별 특징:**
- **locals**: 무료, 로컬 처리 (vide 기본 엔진 대신 로컬 사용)
- **vide**: 기본 LLM (Google Gemini 또는 Groq)
- **shape**: 고급 LLM + RAG 코퍼스 (롱폼/커뮤니티/이전 대화)

---

## 4. 구현 상세

### 상태 정의

```typescript
interface ChatbotWorkspaceState {
  isGuest: boolean;
  
  // Guest-only
  guestThread: GuestThread | null;
  guestMessageCounter: number;
  
  // Member-only
  savedThreads: MemberThread[];
  currentThreadId: number | null;
  
  // Shared
  currentMessages: ChatbotMessage[];  // 게스트: local, 회원: API
  selectedModel: 'locals' | 'vide' | 'shape';
  inputValue: string;
  
  // UI
  showModelPicker: boolean;
  isLoading: boolean;
  error: string | null;
}

const [state, setState] = useState<ChatbotWorkspaceState>({
  isGuest: !user?.id,
  guestThread: null,
  guestMessageCounter: 0,
  savedThreads: [],
  currentThreadId: null,
  currentMessages: [],
  selectedModel: 'locals',
  inputValue: '',
  showModelPicker: false,
  isLoading: false,
  error: null
});
```

### 게스트 스레드 생성

```typescript
const handleCreateGuestThread = () => {
  const newThread: GuestThread = {
    id: `local-${Date.now()}`,
    model: 'locals',
    title: '새 대화',
    messages: []
  };
  
  setState(s => ({
    ...s,
    guestThread: newThread,
    currentMessages: [],
    guestMessageCounter: 0
  }));
};
```

### 회원 스레드 생성

```typescript
const handleCreateMemberThread = async (model: 'locals' | 'vide' | 'shape') => {
  setState(s => ({ ...s, isLoading: true }));
  
  const res = await api.createChatbotThread({
    title: `${model} 대화 ${new Date().toLocaleTimeString()}`,
    model
  });
  
  if (res.success) {
    setState(s => ({
      ...s,
      savedThreads: [...s.savedThreads, { ...res.data!, messages: [] }],
      currentThreadId: res.data!.id,
      currentMessages: [],
      selectedModel: model,
      showModelPicker: false
    }));
  } else if (res.error === 'loginRequired') {
    router.push('/login');
  } else {
    setState(s => ({ ...s, error: res.error }));
  }
  
  setState(s => ({ ...s, isLoading: false }));
};
```

### 메시지 전송 (게스트)

```typescript
const handleSendMessageGuest = async () => {
  if (!state.guestThread || !state.inputValue.trim()) return;
  
  const userMessage = {
    id: state.guestMessageCounter,
    role: 'user' as const,
    content: state.inputValue
  };
  
  setState(s => ({
    ...s,
    currentMessages: [...s.currentMessages, userMessage],
    inputValue: '',
    isLoading: true
  }));
  
  try {
    const res = await api.chatbotComplete({
      messages: [...state.currentMessages, userMessage],
      model: 'locals'
      // no corpus for guest
    });
    
    if (res.success) {
      const botMessage = {
        id: state.guestMessageCounter + 1,
        role: 'bot' as const,
        content: res.data!
      };
      
      setState(s => ({
        ...s,
        currentMessages: [...s.currentMessages, botMessage],
        guestMessageCounter: s.guestMessageCounter + 2,
        error: null
      }));
    } else {
      setState(s => ({ ...s, error: res.error }));
    }
  } finally {
    setState(s => ({ ...s, isLoading: false }));
  }
};
```

### 메시지 전송 (회원)

```typescript
const handleSendMessageMember = async () => {
  if (!state.currentThreadId || !state.inputValue.trim()) return;
  
  const userMessage = {
    role: 'user' as const,
    content: state.inputValue
  };
  
  setState(s => ({
    ...s,
    currentMessages: [...s.currentMessages, userMessage as any],
    inputValue: '',
    isLoading: true
  }));
  
  try {
    // Shape 모델: 코퍼스 수집
    let corpusDocs: CorpusDoc[] = [];
    if (state.selectedModel === 'shape') {
      const chatCorpus = await collectChatCorpus(state.currentThreadId);
      const platformCorpus = await collectPlatformCorpus();
      corpusDocs = [...chatCorpus, ...platformCorpus];
    }
    
    // LLM 호출
    const res = await api.chatbotComplete({
      threadId: state.currentThreadId,
      messages: [...state.currentMessages, userMessage] as any,
      model: state.selectedModel,
      corpusDocs
    });
    
    if (res.success) {
      const botMessage: ChatbotMessage = {
        id: 0,  // API에서 할당받음
        threadId: state.currentThreadId,
        role: 'bot',
        content: res.data!,
        createdAt: new Date().toISOString()
      };
      
      // 메시지 저장
      const saveRes = await api.addChatbotMessage(state.currentThreadId, {
        role: 'bot',
        content: res.data!
      });
      
      if (saveRes.success) {
        setState(s => ({
          ...s,
          currentMessages: [...s.currentMessages, saveRes.data!],
          error: null
        }));
      }
    } else if (res.error === 'loginRequired') {
      router.push('/login');
    } else {
      setState(s => ({ ...s, error: res.error }));
    }
  } finally {
    setState(s => ({ ...s, isLoading: false }));
  }
};
```

### 스레드 목록 로드 (회원)

```typescript
useEffect(() => {
  if (state.isGuest) return;
  
  let isMounted = true;
  
  (async () => {
    const res = await api.getChatbotThreads();
    
    if (isMounted) {
      if (res.success) {
        setState(s => ({
          ...s,
          savedThreads: (res.data ?? []).map(t => ({
            ...t,
            messages: []  // 상세 조회 시 별도로 로드
          }))
        }));
      } else if (res.error === 'loginRequired') {
        router.push('/login');
      }
    }
  })();
  
  return () => { isMounted = false; };
}, [state.isGuest, user?.id]);
```

### 스레드 선택 (회원)

```typescript
const handleSelectThread = async (threadId: number) => {
  setState(s => ({ ...s, isLoading: true }));
  
  const res = await api.getChatbotThread(threadId);
  
  if (res.success) {
    const thread = res.data!;
    setState(s => ({
      ...s,
      currentThreadId: threadId,
      currentMessages: thread.messages ?? [],
      selectedModel: thread.model
    }));
  } else {
    setState(s => ({ ...s, error: res.error }));
  }
  
  setState(s => ({ ...s, isLoading: false }));
};
```

---

## 5. UI 렌더링

### 초기 상태 (스레드 없음)

```typescript
<div className="chatbot-welcome">
  <h2>챗봇 도우미</h2>
  <p>
    {state.isGuest
      ? '로그인하면 대화를 저장할 수 있습니다.'
      : '새 대화를 시작하세요.'}
  </p>
  <button onClick={() => {
    if (state.isGuest) {
      handleCreateGuestThread();
    } else {
      setState(s => ({ ...s, showModelPicker: true }));
    }
  }}>
    대화 시작
  </button>
</div>
```

### 모델 선택 팝업 (회원)

```typescript
{state.showModelPicker && (
  <div className="modal">
    <h3>모델 선택</h3>
    <button onClick={() => handleCreateMemberThread('locals')}>
      🟢 Locals (무료)
    </button>
    <button onClick={() => handleCreateMemberThread('vide')}>
      🔵 Vide (회원)
    </button>
    <button onClick={() => handleCreateMemberThread('shape')}>
      ⭐ Shape (회원, RAG)
    </button>
    <button onClick={() => setState(s => ({ ...s, showModelPicker: false }))}>
      취소
    </button>
  </div>
)}
```

### 대화 UI

```typescript
{state.currentMessages.length > 0 && (
  <div className="chatbot-messages">
    {state.currentMessages.map((msg, idx) => (
      <div key={idx} className={`message ${msg.role}`}>
        <p>{msg.content}</p>
        {msg.role === 'bot' && (
          <ChatMarkdown content={msg.content} />
        )}
      </div>
    ))}
    {state.isLoading && <div className="loading">응답 대기 중...</div>}
  </div>
)}

<div className="input-area">
  <input
    type="text"
    value={state.inputValue}
    onChange={e => setState(s => ({ ...s, inputValue: e.target.value }))}
    onKeyPress={e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        state.isGuest
          ? handleSendMessageGuest()
          : handleSendMessageMember();
      }
    }}
    disabled={state.isLoading}
    placeholder="메시지를 입력하세요..."
  />
  <button
    onClick={state.isGuest ? handleSendMessageGuest : handleSendMessageMember}
    disabled={state.isLoading || !state.inputValue.trim()}
  >
    {state.isLoading ? '대기 중...' : '전송'}
  </button>
</div>
```

### 회원 스레드 목록 (사이드바)

```typescript
{!state.isGuest && (
  <aside className="thread-sidebar">
    <div className="threads">
      {state.savedThreads.map(thread => (
        <div
          key={thread.id}
          className={`thread-item ${
            state.currentThreadId === thread.id ? 'active' : ''
          }`}
          onClick={() => handleSelectThread(thread.id)}
        >
          <span className="model-badge">{thread.model}</span>
          <p>{thread.title}</p>
        </div>
      ))}
    </div>
  </aside>
)}
```

---

## 6. 에러 처리

### 로그인 필요

```typescript
if (res.error === 'loginRequired') {
  router.push('/login');
  return;
}
```

### 모델 권한

```typescript
// Shape는 회원만 → 프론트에서 disabled, 서버에서도 확인
if (state.selectedModel === 'shape' && !user?.isMember) {
  setState(s => ({ ...s, error: '회원만 이용 가능합니다.' }));
  return;
}
```

### 일반 에러

```typescript
if (state.error) {
  return <div className="error">{state.error}</div>;
}
```

---

## 7. 타입 정의

```typescript
interface GuestThread {
  id: string;
  model: 'locals';
  title: string;
  messages: Array<{
    id: number;
    role: 'user' | 'bot';
    content: string;
  }>;
}

interface ChatbotMessage {
  id: number;
  threadId: number;
  role: 'user' | 'bot';
  content: string;
  attachments?: ChatbotAttachment[];
  createdAt: string;
}

type CorpusDoc = ChatCorpusDoc | PlatformCorpusDoc;
```

---

## 8. 후속 커밋

- **050:** 린트/타입 수정 + 고객센터/알림 컴포넌트 통합
