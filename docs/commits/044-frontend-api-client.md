# 커밋 044: API 클라이언트 메서드 (lib/api.ts)

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `044` |
| **파일명** | `044-frontend-api-client.md` |
| **Git 커밋 (short)** | `187b0e0` |
| **Git 커밋 (full)** | `187b0e04a5b307a6bb9ef77d3c439278d25a2df4` |
| **날짜** | `2026-08-24` |
| **작성자** | `Copilot` |
| **브랜치** | `main` |

---

## 1. 커밋 내용

### 제목

```
feat: 프론트엔드 API 클라이언트 메서드 확장
```

### 본문

```
모든 백엔드 라우트 호출을 lib/api.ts에 통합:

- Longform: list, create, get, delete
- Community: list, create, get, delete
- Conversations: list, create, get, addLine
- ChatbotThreads: list, create, get, patch, delete, addMessage, complete
- Support: list, create, get
- Notifications: list, markRead, remove

모든 메서드는 {success, data?, error?} 반환. 로그인 필요 시 loginHref 활용.

상세: docs/commits/044-frontend-api-client.md
```

---

## 2. 파일 변경

| 파일 | 라인 | 변경 |
|------|------|------|
| `FrontServer/lib/api.ts` | +400~500 | 모든 메서드 추가 |

---

## 3. API 클라이언트 구조

### 응답 타입

모든 메서드의 반환값:

```typescript
export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};
```

### 에러 처리 패턴

```typescript
export async function getLongformList(): Promise<ApiResponse<LongformVideo[]>> {
  try {
    const res = await fetch('/api/longform');
    const json = await res.json();
    
    if (!res.ok) {
      if (res.status === 401) {
        // 로그인 페이지로 리다이렉트 (컴포넌트에서 처리)
        return { success: false, error: '로그인 필요' };
      }
      return { success: false, error: json.error ?? 'Unknown error' };
    }
    
    return json;
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
```

---

## 4. 메서드 목록

### Longform

```typescript
export async function getLongformList(): Promise<ApiResponse<LongformVideo[]>>
export async function createLongform(input: CreateLongformInput): Promise<ApiResponse<LongformVideo>>
export async function getLongformDetail(id: number): Promise<ApiResponse<LongformVideo>>
export async function deleteLongform(id: number): Promise<ApiResponse<void>>
```

### Community

```typescript
export async function getCommunityList(): Promise<ApiResponse<CommunityPost[]>>
export async function createCommunity(input: CreateCommunityInput): Promise<ApiResponse<CommunityPost>>
export async function getCommunityDetail(id: number): Promise<ApiResponse<CommunityPost>>
export async function deleteCommunity(id: number): Promise<ApiResponse<void>>
```

### Conversations

```typescript
export async function getConversations(): Promise<ApiResponse<Conversation[]>>
export async function createConversation(input: CreateConversationInput): Promise<ApiResponse<Conversation>>
export async function getConversation(id: number): Promise<ApiResponse<Conversation & { lines: ChatLine[] }>>
export async function sendChatLine(id: number, input: SendChatLineInput): Promise<ApiResponse<ChatLine>>
```

### Chatbot Threads

```typescript
export async function getChatbotThreads(): Promise<ApiResponse<ChatbotThread[]>>
export async function createChatbotThread(input: CreateChatbotThreadInput): Promise<ApiResponse<ChatbotThread>>
export async function getChatbotThread(id: number): Promise<ApiResponse<ChatbotThread & { messages: ChatbotMessage[] }>>
export async function patchChatbotThread(id: number, input: Partial<ChatbotThread>): Promise<ApiResponse<ChatbotThread>>
export async function deleteChatbotThread(id: number): Promise<ApiResponse<void>>
export async function addChatbotMessage(id: number, input: CreateChatbotMessageInput): Promise<ApiResponse<ChatbotMessage>>
export async function chatbotComplete(input: ChatbotCompleteInput): Promise<ApiResponse<string>>
```

### Support & Notifications

```typescript
export async function getInquiries(): Promise<ApiResponse<SupportInquiry[]>>
export async function createInquiry(input: CreateInquiryInput): Promise<ApiResponse<SupportInquiry>>
export async function getInquiry(id: number): Promise<ApiResponse<SupportInquiry>>

export async function getNotifications(unreadOnly?: boolean): Promise<ApiResponse<ActivityNotification[]>>
export async function markNotificationRead(id: number): Promise<ApiResponse<void>>
export async function removeNotification(id: number): Promise<ApiResponse<void>>
```

---

## 5. 구현 예시

### 기본 GET

```typescript
export async function getLongformList(): Promise<ApiResponse<LongformVideo[]>> {
  try {
    const res = await fetch('/api/longform');
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return {
        success: false,
        error: json.error ?? `HTTP ${res.status}`
      };
    }
    return await res.json();
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
```

### POST (인증 필요)

```typescript
export async function createLongform(
  input: CreateLongformInput
): Promise<ApiResponse<LongformVideo>> {
  try {
    const res = await fetch('/api/longform', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      credentials: 'include'  // 쿠키 포함
    });
    
    if (!res.ok) {
      if (res.status === 401) {
        return {
          success: false,
          error: 'loginRequired'  // 컴포넌트가 감지해서 로그인 페이지로 리다이렉트
        };
      }
      const json = await res.json().catch(() => ({}));
      return { success: false, error: json.error ?? 'Creation failed' };
    }
    
    return await res.json();
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
```

### PATCH (부분 업데이트)

```typescript
export async function patchChatbotThread(
  id: number,
  input: Partial<ChatbotThread>
): Promise<ApiResponse<ChatbotThread>> {
  try {
    const res = await fetch(`/api/chatbot/threads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      credentials: 'include'
    });
    
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return {
        success: false,
        error: json.error ?? `HTTP ${res.status}`
      };
    }
    
    return await res.json();
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
```

### DELETE

```typescript
export async function deleteLongform(id: number): Promise<ApiResponse<void>> {
  try {
    const res = await fetch(`/api/longform/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return {
        success: false,
        error: json.error ?? `HTTP ${res.status}`
      };
    }
    
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
```

### 복잡한 요청 (chatbotComplete)

```typescript
export async function chatbotComplete(
  input: ChatbotCompleteInput
): Promise<ApiResponse<string>> {
  try {
    // Shape 모델: collectPlatformCorpus 포함
    const body: any = { ...input };
    
    if (input.model === 'shape') {
      // 프론트에서 corpus 수집 후 전달
      // body.platformDocs = [...] (이미 input에 포함)
    }
    
    const res = await fetch('/api/chatbot/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include'
    });
    
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return {
        success: false,
        error: json.error ?? 'Completion failed'
      };
    }
    
    const data = await res.json();
    return {
      success: true,
      data: data.response ?? data.text  // 서버 응답 형식에 맞춤
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
```

---

## 6. 컴포넌트에서의 사용 패턴

### 데이터 로드

```typescript
// components/longform/LongformList.tsx
useEffect(() => {
  (async () => {
    setLoading(true);
    const res = await api.getLongformList();
    if (res.success) {
      setVideos(res.data ?? []);
    } else {
      setError(res.error ?? 'Error');
    }
    setLoading(false);
  })();
}, []);
```

### 데이터 생성 (권한 체크 포함)

```typescript
// components/longform/LongformForm.tsx
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  
  const res = await api.createLongform({
    title,
    description,
    videoUrl,
    gradient
  });
  
  if (res.success) {
    router.push(`/longform/${res.data!.id}`);
  } else if (res.error === 'loginRequired') {
    router.push(loginHref);  // 로그인 페이지로 리다이렉트
  } else {
    setError(res.error ?? 'Creation failed');
  }
  
  setLoading(false);
};
```

---

## 7. 후속 커밋

- **045:** 알림 스토어 신설
- **046:** 챗봇 코퍼스 라이브러리
- **047~050:** 컴포넌트 연동
