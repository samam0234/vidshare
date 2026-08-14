# VidShare — BackendServer

프론트엔드(`../FrontServer`)와 분리된 **REST API 서버**입니다.

현재는 **인메모리 store** (서버 재시작 시 데이터 초기화)로 동작합니다.  
DB·실인증·파일 스토리지는 이후 단계에서 연결합니다.

---

## 기술 스택

| 항목 | 기술 |
|------|------|
| 런타임 | Node.js |
| 프레임워크 | Express |
| 언어 | TypeScript (`tsx` 개발 실행) |
| CORS | `cors` (기본 FrontServer `http://localhost:3000`) |

---

## 시작하기

```bash
cd vidshare/BackendServer
npm install
npm run dev
```

기본 주소: **http://localhost:4000**

헬스 체크: [http://localhost:4000/api/health](http://localhost:4000/api/health)

### 환경 변수

`.env.example` 을 복사해 `.env` 로 사용합니다.

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | `4000` | 서버 포트 |
| `CORS_ORIGIN` | `http://localhost:3000` | 허용 프론트 오리진 |
| `NODE_ENV` | `development` | 환경 |

### 기타 명령

```bash
npm run build      # dist/ 컴파일
npm start          # 프로덕션 실행 (build 후)
npm run typecheck  # 타입만 검사
```

---

## API 개요

응답 형식:

```json
{ "success": true, "data": ... }
```

에러:

```json
{ "success": false, "error": "message" }
```

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/health` | 헬스 체크 |
| GET | `/api/shorts?q=` | 쇼츠 목록 (검색 선택) |
| GET | `/api/shorts/:id` | 쇼츠 상세 |
| POST | `/api/shorts` | 쇼츠 생성 `{ title, description?, gradient?, videoUrl? }` |
| POST | `/api/shorts/:id/like` | 좋아요 `{ action?: "unlike" }` |
| GET | `/api/shorts/:shortId/comments` | 댓글 목록 |
| POST | `/api/shorts/:shortId/comments` | 댓글 작성 `{ text, author? }` |
| GET | `/api/users` | 사용자 목록 |
| GET | `/api/users/me` | 현재 사용자 (데모 고정) |
| GET | `/api/users/:id` | 사용자 상세 |
| GET | `/api/users/:id/shorts` | 사용자 쇼츠 |
| GET | `/api/notifications?category=` | 알림 목록 |
| DELETE | `/api/notifications/:id` | 알림 삭제 |
| PATCH | `/api/notifications/:id` | `{ read }` |
| GET | `/api/messages/users` | 채팅 상대 목록 |
| GET | `/api/messages/:userId` | 대화 내역 |
| POST | `/api/messages/:userId` | 메시지 전송 `{ content, isImage? }` |
| GET | `/api/support/faq` | FAQ |

루트 `GET /` 에 엔드포인트 목록이 있습니다.

---

## 폴더 구조

```
BackendServer/
├── src/
│   ├── index.ts           # 엔트리
│   ├── app.ts             # Express 앱 조립
│   ├── data/store.ts      # 인메모리 데이터
│   ├── middleware/
│   ├── routes/
│   └── types/
├── .env.example
├── package.json
└── README.md
```

---

## FrontServer 연동

| 서버 | 포트 | 역할 |
|------|------|------|
| FrontServer | 3000 | Next.js UI |
| BackendServer | 4000 | REST API |

프론트 환경 변수 예 (`FrontServer/.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

> 현재 UI는 아직 로컬 mock을 주로 사용합니다. API 연동은 `NEXT_PUBLIC_API_URL` 기준으로 점진 교체하면 됩니다.

---

## 다음 단계

- [ ] DB (PostgreSQL / Mongo 등) 연결
- [ ] 인증 (JWT / 세션)
- [ ] 파일 업로드 스토리지
- [ ] FrontServer mock → API fetch 전환
