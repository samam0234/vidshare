# 커밋 050: 고객센터 컴포넌트 구현

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `050` |
| **파일명** | `050-frontend-support-components.md` |
| **Git 커밋 (short)** | `f975d80` |
| **Git 커밋 (full)** | `f975d803165a2d340a3b5bab4254d4624d4932de` |
| **날짜** | `2026-08-24` |
| **작성자** | `Copilot` |
| **브랜치** | `main` |

---

## 1. 커밋 내용

### 제목

```
feat: 고객센터 컴포넌트 구현 (문의 생성/조회)
```

### 본문

```
사용자 지원 요청 기능 구현:

- SupportContact: 문의 생성 폼
  - POST /api/support/inquiries
  - 제목, 본문 입력
  - 성공 시 /support로 리다이렉트

- SupportList: 문의 목록
  - GET /api/support/inquiries
  - 사용자별 문의 히스토리
  - 각 항목 클릭 시 상세 조회

- InquiryDetail: 문의 상세
  - GET /api/support/inquiries/:id
  - 제목, 본문, 작성 시각 표시
  - 회원 전용

상세: docs/commits/050-frontend-support-components.md
```

---

## 2. 파일 변경

| 파일 | 라인 | 변경 |
|------|------|------|
| `FrontServer/components/support/SupportContact.tsx` | 신규 | ~120줄 |
| `FrontServer/components/support/SupportList.tsx` | 신규 | ~130줄 |
| `FrontServer/components/support/InquiryDetail.tsx` | 신규 | ~100줄 |

---

## 3. 컴포넌트 설계

### SupportContact (문의 생성)

**기능:**
- 제목, 본문 입력
- POST /api/support/inquiries로 제출
- 성공 후 목록으로 리다이렉트

```typescript
// components/support/SupportContact.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import * as api from '@/lib/api';

export function SupportContact() {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;

    setLoading(true);
    const res = await api.createInquiry({ subject, body });

    if (res.success) {
      router.push('/support');
    } else if (res.error === 'loginRequired') {
      router.push('/login');
    } else {
      setError(res.error ?? '생성 실패');
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="제목"
        value={subject}
        onChange={e => setSubject(e.target.value)}
        required
      />
      <textarea
        placeholder="내용"
        value={body}
        onChange={e => setBody(e.target.value)}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? '등록 중...' : '제출'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
```

### InquiryDetail (문의 상세)

```typescript
// components/support/InquiryDetail.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import * as api from '@/lib/api';
import { formatWhen } from '@/lib/content-store';

export function InquiryDetail() {
  const router = useRouter();
  const [inquiry, setInquiry] = useState<SupportInquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = router.query.id;
    if (typeof id !== 'string') return;

    let isMounted = true;

    (async () => {
      const res = await api.getInquiry(Number(id));

      if (isMounted) {
        queueMicrotask(() => {
          if (res.success) {
            setInquiry(res.data ?? null);
            setError(null);
          } else if (res.error === 'loginRequired') {
            router.push('/login');
          } else {
            setError(res.error ?? 'Error');
          }
          setLoading(false);
        });
      }
    })();

    return () => { isMounted = false; };
  }, [router.query.id]);

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!inquiry) return <div>찾을 수 없습니다.</div>;

  return (
    <div className="inquiry-detail">
      <h1>{inquiry.subject}</h1>
      <p className="meta">{formatWhen(inquiry.createdAt)}</p>
      <p>{inquiry.body}</p>
      <button onClick={() => router.back()}>돌아가기</button>
    </div>
  );
}
```

### SupportList (문의 목록)

```typescript
// components/support/SupportList.tsx
import { useEffect, useState } from 'react';
import Link from 'next/link';
import * as api from '@/lib/api';
import { formatWhen } from '@/lib/content-store';

export function SupportList() {
  const [inquiries, setInquiries] = useState<SupportInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      const res = await api.getInquiries();

      if (isMounted) {
        queueMicrotask(() => {
          if (res.success) {
            setInquiries(res.data ?? []);
            setError(null);
          } else if (res.error === 'loginRequired') {
            // Navbar에서 처리
          } else {
            setError(res.error ?? 'Error');
          }
          setLoading(false);
        });
      }
    })();

    return () => { isMounted = false; };
  }, []);

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="inquiry-list">
      <h2>나의 문의 내역</h2>
      
      {inquiries.length === 0 ? (
        <p className="empty">문의가 없습니다.</p>
      ) : (
        <ul>
          {inquiries.map(inquiry => (
            <li key={inquiry.id}>
              <Link href={`/support/inquiries/${inquiry.id}`}>
                <h3>{inquiry.subject}</h3>
                <p className="preview">{inquiry.body.slice(0, 100)}...</p>
                <span className="date">
                  {formatWhen(inquiry.createdAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## 4. 페이지 구조
