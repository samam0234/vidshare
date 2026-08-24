# 커밋 048: 메시지/채팅 컴포넌트 API 연동

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `048` |
| **파일명** | `048-frontend-components-messages.md` |
| **Git 커밋 (short)** | `40a202f` |
| **Git 커밋 (full)** | `40a202f419196a3c6ed240e92e1e2b91cd0474d0` |
| **날짜** | `2026-08-24` |
| **작성자** | `Copilot` |
| **브랜치** | `main` |

---

## 1. 커밋 내용

### 제목

```
feat: 메시지/대화 컴포넌트 API 연동
```

### 본문

```
사용자 간 메시지 대화를 SQLite 기반으로 재작성:

- MessagesPageClient (대화 목록 + 생성 폼)
  - GET /api/conversations 목록
  - POST /api/conversations 신규 생성
  
- MessageThread (개별 대화 상세)
  - GET /api/conversations/:id 상세 조회
  - POST /api/conversations/:id/lines 메시지 추가

Chat UI: 사용자 메시지 우측, 상대방 좌측 렌더링.
이미지 업로드 지원 (data URL로 저장).

상세: docs/commits/048-frontend-components-messages.md
```

---

## 2. 파일 변경

| 파일 | 라인 | 변경 |
|------|------|------|
| `FrontServer/components/messages/MessagesPageClient.tsx` | 재작성 | ~150줄 |
| `FrontServer/components/messages/MessageThread.tsx` | 재작성 | ~200줄 |

---

## 3. 컴포넌트 설계

### MessagesPageClient

**기능:**
1. 대화 목록 조회 (GET /api/conversations)
2. 새 대화 생성 폼 (targetName 입력)
3. 목록에서 각 대화 클릭 → MessageThread로 이동

**상태:**
```typescript
interface ConversationItem extends Conversation {
  isSelected?: boolean;
}

const [conversations, setConversations] = useState<ConversationItem[]>([]);
const [newTargetName, setNewTargetName] = useState('');
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

**라이프사이클:**
```typescript
useEffect(() => {
  let isMounted = true;
  (async () => {
    setState(s => ({ ...s, loading: true }));
    const res = await api.getConversations();
    
    if (isMounted) {
      queueMicrotask(() => {
        if (res.success) {
          setState(s => ({ ...s, data: res.data, error: null }));
        } else if (res.error === 'loginRequired') {
          router.push('/login');
        } else {
          setState(s => ({ ...s, error: res.error }));
        }
        setState(s => ({ ...s, loading: false }));
      });
    }
  })();
  
  return () => { isMounted = false; };
}, []);
```

**생성 폼:**
```typescript
const handleCreateConversation = async (e) => {
  e.preventDefault();
  if (!newTargetName.trim()) return;
  
  const res = await api.createConversation({
    targetName: newTargetName
  });
  
  if (res.success) {
    // /messages/:id로 자동 리다이렉트
    router.push(`/messages/${res.data!.id}`);
  } else if (res.error === 'loginRequired') {
    router.push('/login');
  } else {
    setError(res.error ?? '생성 실패');
  }
};
```

**목록 렌더:**
```typescript
<div className="conversation-list">
  {conversations.map(conv => (
    <div
      key={conv.id}
      className="conversation-item"
      onClick={() => router.push(`/messages/${conv.id}`)}
    >
      <h4>{conv.targetName}</h4>
      <p className="preview">{conv.lastMessage ?? '(메시지 없음)'}</p>
      <span className="date">{formatWhen(conv.createdAt)}</span>
    </div>
  ))}
</div>
```

---

### MessageThread

**기능:**
1. 대화 상세 조회 (GET /api/conversations/:id + 모든 메시지)
2. 메시지 입력 및 전송 (POST /api/conversations/:id/lines)
3. 메시지 시각화 (사용자 우측, 상대방 좌측)
4. 선택적 이미지 업로드

**상태:**
```typescript
interface ThreadState {
  conversation: Conversation | null;
  lines: ChatLine[];
  loading: boolean;
  error: string | null;
  inputValue: string;
  isSending: boolean;
}

const [state, setState] = useState<ThreadState>({
  conversation: null,
  lines: [],
  loading: true,
  error: null,
  inputValue: '',
  isSending: false
});
```

**데이터 로드:**
```typescript
useEffect(() => {
  const id = router.query.id;
  if (typeof id !== 'string') return;
  
  let isMounted = true;
  
  (async () => {
    const res = await api.getConversation(Number(id));
    
    if (isMounted) {
      queueMicrotask(() => {
        if (res.success) {
          setState(s => ({
            ...s,
            conversation: res.data,
            lines: res.data?.lines ?? [],
            error: null
          }));
        } else if (res.error === 'loginRequired') {
          router.push('/login');
        } else {
          setState(s => ({ ...s, error: res.error }));
        }
        setState(s => ({ ...s, loading: false }));
      });
    }
  })();
  
  return () => { isMounted = false; };
}, [router.query.id]);
```

**메시지 전송:**
```typescript
const handleSendMessage = async () => {
  if (!state.inputValue.trim()) return;
  
  const id = router.query.id;
  if (typeof id !== 'string') return;
  
  setState(s => ({ ...s, isSending: true }));
  
  const res = await api.sendChatLine(Number(id), {
    content: state.inputValue,
    isImage: false
  });
  
  if (res.success) {
    // 로컬 상태 즉시 업데이트
    setState(s => ({
      ...s,
      lines: [...s.lines, res.data!],
      inputValue: ''
    }));
  } else {
    setState(s => ({ ...s, error: res.error ?? '전송 실패' }));
  }
  
  setState(s => ({ ...s, isSending: false }));
};
```

**이미지 업로드:**
```typescript
const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async () => {
    const dataUrl = reader.result as string;
    
    const id = router.query.id;
    if (typeof id !== 'string') return;
    
    const res = await api.sendChatLine(Number(id), {
      content: dataUrl,
      isImage: true
    });
    
    if (res.success) {
      setState(s => ({
        ...s,
        lines: [...s.lines, res.data!]
      }));
    }
  };
  reader.readAsDataURL(file);
};
```

**렌더링:**
```typescript
<div className="message-thread">
  <div className="messages">
    {state.lines.map(line => (
      <div
        key={line.id}
        className={`message ${line.type}`}
      >
        {line.isImage ? (
          <img src={line.content} alt="image" />
        ) : (
          <p>{line.content}</p>
        )}
        <span className="time">
          {formatWhen(line.createdAt)}
        </span>
      </div>
    ))}
  </div>
  
  <div className="input-area">
    <input
      type="text"
      value={state.inputValue}
      onChange={e => setState(s => ({ ...s, inputValue: e.target.value }))}
      onKeyPress={e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSendMessage();
        }
      }}
      placeholder="메시지를 입력하세요..."
      disabled={state.isSending}
    />
    
    <label className="image-upload">
      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        disabled={state.isSending}
      />
      📸
    </label>
    
    <button
      onClick={handleSendMessage}
      disabled={state.isSending || !state.inputValue.trim()}
    >
      {state.isSending ? '전송 중...' : '전송'}
    </button>
  </div>
</div>
```

---

## 4. CSS 스타일링 예시

```css
.messages {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 500px;
  overflow-y: auto;
}

.message {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
}

.message.me {
  justify-content: flex-end;
}

.message.me p {
  background: #007bff;
  color: white;
  border-radius: 1rem;
  padding: 0.5rem 1rem;
}

.message.other p {
  background: #e9ecef;
  color: black;
  border-radius: 1rem;
  padding: 0.5rem 1rem;
}

.message img {
  max-width: 200px;
  border-radius: 0.5rem;
}
```

---

## 5. 고려사항

### 자동 스크롤

최신 메시지가 보이도록:

```typescript
const messagesEndRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [state.lines]);

// 렌더링 마지막에
<div ref={messagesEndRef} />
```

### 더블 제출 방지

```typescript
const [isSending, setIsSending] = useState(false);

const handleSendMessage = async () => {
  if (isSending) return;  // ← 중복 방지
  setIsSending(true);
  // ...
};
```

### 대화 목록 자동 갱신

새 메시지 추가 후 목록의 `lastMessage` 갱신 (optional):

```typescript
// MessageThread에서
if (res.success) {
  // ... 메시지 추가
  // 부모(MessagesPageClient)에 알림 또는 리스트 새로고침
}
```

---

## 6. 지원되지 않는 기능 (향후 TBD)

- [ ] 메시지 수정/삭제
- [ ] 그룹 대화 (현재는 1:1만)
- [ ] 타이핑 인디케이터
- [ ] 읽음 상태 표시
- [ ] 음성 메시지
- [ ] 이모지 반응

---

## 7. 후속 커밋

- **049:** 챗봇 컴포넌트 재작성
- **050:** 린트/타입 수정 마무리
