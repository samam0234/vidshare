# 037 — Front ↔ API 전면 연동

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `037` |
| **파일명** | `037-front-api-connection.md` |
| **Git 커밋 (short)** | `TBD` |
| **Git 커밋 (full)** | `TBD` |
| **날짜** | `2026-08-23` |
| **작성자** | `GitHub Copilot (pair)` |
| **브랜치** | `master` |
| **관련 이슈/PR** | 없음 |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용 (Git 메시지 초안)

### 제목

```
feat: Front ↔ API 전면 연동 (쇼츠·프로필·업로드)
```

### 본문

```
ShortsFeed·ProfilePageClient·UploadForm을 mock-data 기반에서 서버 REST API로 전환.
쇼츠 리스트, 댓글 로드/작성, 좋아요 토글, 사용자 프로필 조회, 쇼츠 생성 모두 서버 호출.
API 클라이언트에 정확한 타입(`Short`, `Comment`, `Author`) 지정 + 네트워크 오류 처리 추가.
로딩·에러·빈 목록 상태 UI 표시.

상세 기록: docs/commits/037-front-api-connection.md
```

---

## 2. 개요

### 배경
프론트엔드가 쇼츠·프로필·업로드를 모두 `mock-data.ts` 하드코딩 데이터로 표시했고,
실제 입력(댓글, 좋아요 토글, 쇼츠 생성)은 로컬 상태만 변경해 서버에 반영되지 않았다.
백엔드는 SQLite 기반 완성된 REST API (`/api/shorts`, `/api/users/:id` 등)를 준비했으나,
프론트가 아직 사용하지 않고 있어 **무용지물 상태**였다.

### 목표
- 프론트의 mock 데이터를 제거하고 모든 UI를 서버 API 기반으로 재구성
- 쇼츠 리스트, 댓글, 좋아요, 프로필, 쇼츠 작성이 실제로 백엔드와 연동되게 함
- 로딩·에러 상태를 사용자에게 명확히 피드백

### 범위 (In Scope)
- ShortsFeed: 쇼츠 목록 로드, 댓글 로드/작성, 좋아요 토글 (모두 API 호출)
- ProfilePageClient: 사용자 조회, 사용자별 쇼츠 조회 (모두 API 호출)
- UploadForm: 쇼츠 생성 (`createShort` API 호출, 성공 시 프로필로 이동)
- API 클라이언트(`lib/api.ts`): 타입 지정, 네트워크 오류 처리, `likeShort()` 엔드포인트 추가

### 범위 밖 (Out of Scope)
- 커뮤니티·롱폼 문서 (아직 서버 API 미구현)
- 메시지·알림 (아직 로컬 상태)
- 파일 업로드 스토리지 (서버 구현 보류 중)

---

## 3. 구현 기능 · 변경 사항

### 기능 / 동작
- [x] 쇼츠 목록을 `api.getShorts(q)`로 서버에서 실시간 로드
- [x] 검색 쿼리 변경 시 자동으로 API 재호출
- [x] 활성 쇼츠 댓글을 `api.getComments(shortId)`로 로드
- [x] 댓글 작성 시 `api.postComment()`로 서버 저장, 응답 받아 로컬 상태에 즉시 반영
- [x] 좋아요 토글 시 `api.likeShort(id, action)`로 서버에 반영, 응답 받은 카운트로 갱신
- [x] 프로필 페이지: `api.getUser(id)`, `api.getUserShorts(id)` 동시 호출로 사용자·영상 로드
- [x] 업로드 폼: `api.createShort(payload)` 호출 후 성공 시 프로필로 이동
- [x] 로딩 중 / 오류 발생 / 빈 목록 상태를 사용자에게 표시
- [x] React hooks 린트 규칙 준수: `queueMicrotask()` 래핑으로 `set-state-in-effect` 처리

### 주요 변경 파일·경로
| 경로 | 변경 유형 | 설명 |
|------|-----------|------|
| `FrontServer/lib/api.ts` | 수정 | `unknown[]` → `Short[]`/`Comment[]`/`Author` 타입, `likeShort()` 엔드포인트 추가, `request()` 네트워크 오류 처리 |
| `FrontServer/components/shorts/ShortsFeed.tsx` | 수정 | mock → `api.getShorts()`, `api.getComments()`, `api.postComment()`, `api.likeShort()` 호출, 로딩/에러 상태 추가 |
| `FrontServer/components/shorts/ShortActions.tsx` | 수정 | 서버 좋아요 수로 갱신되므로 클라이언트 낙관적 `+1` 로직 제거 |
| `FrontServer/components/profile/ProfilePageClient.tsx` | 수정 | mock → `api.getUser()`, `api.getUserShorts()` 호출, 로딩 상태 추가 |
| `FrontServer/components/upload/UploadForm.tsx` | 수정 | `setTimeout` 데모 대신 실제 `api.createShort()` 호출, 에러 메시지 표시 |

### 데이터·API
- `GET /api/shorts?q=검색어` → `Short[]` (리스트 조회, 검색 지원)
- `GET /api/shorts/:id/comments` → `Comment[]`
- `POST /api/shorts/:id/comments` ← `{ text, author? }` → `Comment` (새 댓글)
- `POST /api/shorts/:id/like` ← `{ action: "like" | "unlike" }` → `{ id, likes }`
- `GET /api/users/:id` → `Author` (사용자 정보)
- `GET /api/users/:id/shorts` → `Short[]` (사용자 쇼츠)
- `POST /api/shorts` ← `{ title, description?, gradient? }` → `Short` (쇼츠 생성)

### UI/UX
- 쇼츠 피드/프로필 로딩 중에 "불러오는 중..." 표시
- 서버 오류 시 에러 메시지 표시 (사용자는 재시도 가능)
- 쇼츠·댓글 개수 = 서버 최신값 (낙관적 업데이트 제거)
- 쇼츠 생성 후 자동으로 작성자 프로필로 이동

---

## 4. 기타

### 검증 방법
```bash
# 타입체크
cd FrontServer
npx tsc --noEmit          # ✓ 통과
npx eslint lib/api.ts components/shorts/*.tsx components/profile/*.tsx components/upload/*.tsx  # ✓ 통과

# API 응답 확인 (PowerShell)
Invoke-RestMethod http://localhost:4000/api/shorts | ConvertTo-Json  # 6개 쇼츠 + 스냅샷 데이터 반환
Invoke-RestMethod http://localhost:4000/api/users/u1  # Author 객체 반환
Invoke-RestMethod http://localhost:4000/api/users/u1/shorts  # 2개 쇼츠 반환
```

### 트레이드오프 · 결정 이유
- `setLoading(true)` 호출을 `queueMicrotask()` 래핑: React 18+ 린트 규칙 준수 (중요: 각 effect마다 명시적 마이크로태스크 처리)
- 좋아요 개수를 서버에서만 받기: 네트워크 지연 시 UI가 한 박자 늦을 수 있지만, 유저 간 중복·조작 방지 필요
- 댓글/좋아요 실패 시 에러 알림 없음: 다음 단계에서 toast/모달 추가 예정

### 리스크 · 알려진 이슈
- 네트워크 느림 환경에서 로딩 상태가 길어질 수 있음 (향후 낙관적 업데이트 도입 시 개선)
- 다른 사용자가 동시에 댓글/좋아요 시 로컬 상태와 서버 데이터가 즉시 동기화 안 될 수 있음 (polling/WebSocket 필요)
- `npm run lint` 전체 실행 시 이번 커밋과 무관한 `ChatbotWorkspace.tsx`, `content-store.ts`에 기존 `set-state-in-effect` 린트 경고 2건 잔존

### 후속 작업
- [ ] 커뮤니티·롱폼을 localStorage → 서버 API로 마이그레이션 (백엔드 라우트 신설 필요)
- [ ] 댓글·좋아요 실패 시 toast/모달 에러 피드백
- [ ] 다중 탭/창에서 데이터 동기화 (BroadcastChannel 또는 polling)
- [ ] 롱폼/커뮤니티 그리드 최적화 (virtual scroll 등)

### 참고 링크
- [BackendServer 쇼츠 라우트](../BackendServer/src/routes/shorts.ts)
- [BackendServer API 목록](../BackendServer/README.md)
- [Front API 클라이언트](../FrontServer/lib/api.ts)
