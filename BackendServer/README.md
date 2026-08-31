# VidShare — BackendServer

프론트엔드(`../FrontServer`)와 분리된 **REST API 서버**입니다.

데이터는 **SQLite** (`data/vidshare.sqlite`)에 저장됩니다. 서버를 재시작해도 계정·세션·쇼츠가 남습니다.  
인증은 bcrypt + HttpOnly 세션 쿠키입니다. 테스트 계정: `demo` / `demo1234`.

---

## 기술 스택

| 항목 | 기술 |
|------|------|
| 런타임 | Node.js |
| 프레임워크 | Express |
| 언어 | TypeScript (`tsx` 개발 실행) |
| CORS | `cors` (localhost + 사설망, `CORS_ORIGIN`으로 추가) |
| DB | SQLite (`better-sqlite3`) |

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
| `CORS_ORIGIN` | (비움) | 추가 허용 오리진. 비우면 localhost + 사설망 |
| `SQLITE_PATH` | `data/vidshare.sqlite` | DB 파일 경로 |
| `UPLOADS_PATH` | `uploads/` | 사용자 업로드 파일 경로 |
| `NODE_ENV` | `development` | 환경 |

### 기타 명령

```bash
npm run build      # dist/ 컴파일
npm start          # 프로덕션 실행 (build 후)
npm run typecheck  # 타입만 검사 (src + tests)
npm test           # API 자동화 테스트 (임시 SQLite 사용)
npm run test:watch # 테스트 진행 상태 감지
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
| GET | `/api/search?q=` | 통합 검색 (쇼츠·롱폼·커뮤니티·유저) |
| GET | `/api/shorts?q=` | 쇼츠 목록 (검색 선택) |
| GET | `/api/shorts/:id` | 쇼츠 상세 |
| POST | `/api/shorts` | 쇼츠 생성 `{ title, description?, gradient?, videoUrl?, thumb? }` (로그인) |
| POST | `/api/uploads?kind=` | 파일 업로드 `multipart file` (`image` \| `video`, 로그인) |
| GET | `/uploads/:file` | 업로드된 영상·이미지 정적 파일 |
| POST | `/api/shorts/:id/like` | 좋아요 `{ action?: "unlike" }` |
| GET | `/api/shorts/:shortId/comments` | 댓글 목록 |
| POST | `/api/shorts/:shortId/comments` | 댓글 작성 `{ text, author? }` |
| POST | `/api/auth/register` | 회원가입 `{ handle, name, password }` |
| POST | `/api/auth/login` | 로그인 `{ handle, password }` |
| POST | `/api/auth/logout` | 로그아웃 (세션 쿠키 삭제) |
| GET | `/api/auth/me` | 현재 세션 사용자 (없으면 401) |
| GET | `/api/users` | 사용자 목록 |
| GET | `/api/users/me` | 현재 세션 사용자 (없으면 401) |
| GET | `/api/users/:id` | 사용자 상세 |
| GET | `/api/users/:id/shorts` | 사용자 쇼츠 |
| GET | `/api/notifications?category=` | 알림 목록 |
| GET | `/api/notifications/settings` | 알림 수신 설정 조회 (로그인) |
| PATCH | `/api/notifications/settings` | `{ enabled }` 수신 설정 변경 (로그인) |
| PATCH | `/api/notifications/read-all` | 본인 알림 전체 읽음 |
| DELETE | `/api/notifications` | 본인 알림 전체 삭제 |
| DELETE | `/api/notifications/:id` | 알림 삭제 |
| PATCH | `/api/notifications/:id` | `{ read }` |
| GET | `/api/follows/feed` | 팔로잉 피드 (로그인) |
| GET | `/api/follows/:id` | 팔로워/팔로잉 수 + 내 팔로우 여부 |
| GET | `/api/follows/:id/followers` | 팔로워 목록 |
| GET | `/api/follows/:id/following` | 팔로잉 목록 |
| POST | `/api/follows/:id` | 팔로우 (로그인, 멱등) |
| DELETE | `/api/follows/:id` | 언팔로우 (로그인) |
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
│   ├── db/                # SQLite 연결·스키마·시드
│   ├── data/              # 시드 데이터 + 쿼리
│   ├── auth/              # 계정·세션
│   ├── middleware/
│   ├── routes/
│   ├── upload/            # 디스크 저장·MIME 화이트리스트
│   └── types/
├── uploads/               # 사용자 파일 (Git 무시, README만 추적)
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

프론트는 `lib/api.ts` 로 이 서버를 호출합니다. 업로드된 미디어는 `/uploads/...` 상대 경로로 저장되고, 프론트는 API 호스트를 붙여 재생합니다.

---

## 다음 단계

- [x] SQLite 영속화
- [x] 인증 (세션 쿠키)
- [x] 파일 업로드 스토리지
- [x] FrontServer mock → API fetch 전환
- [ ] (필요 시) SQLite → Maria
