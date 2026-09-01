# VidShare — FrontServer

사용자용 Next.js 앱입니다. API는 **[BackendServer](../BackendServer/)** (:4000)입니다.

- Next.js 16 App Router · React 19 · TypeScript · Tailwind CSS v4
- 프로젝트 루트: **[../README.md](../README.md)**
- 배포: Cloudflare Workers (`npm run deploy`) → https://vidshare-front.limjinheng0120.workers.dev

---

## 시작하기

백엔드를 먼저 켭니다 (`../BackendServer` 에서 `npm run dev`).

```bash
cd FrontServer
npm install
npm run dev
```

→ http://localhost:3000  
데모 계정: `demo` / `demo1234`

```bash
npm run lint
npm run typecheck
npm test              # 순수 함수 (guest-routes 등)
npm run test:e2e      # Playwright (백엔드+프론트 필요)
npm run build
npm start
npm run deploy        # OpenNext → Cloudflare Workers
```

`.env.local` (예: `.env.local.example`):

```env
# 비우면 localhost:4000. LAN IP로 이 프론트를 열면 그 IP:4000.
# 프로덕션·Workers 빌드는 반드시 명시.
NEXT_PUBLIC_API_URL=
```

통신은 전부 `lib/api.ts` (`credentials: "include"`).

---

## 주요 기능

| 영역 | 경로 | 비고 |
|------|------|------|
| 쇼츠 피드 | `/` | 스냅, 좋아요, 댓글(대댓글·수정·삭제), 검색 `?q=` |
| 팔로잉 피드 | `/following` | 로그인 |
| 검색 | `/search` | 쇼츠·롱폼·커뮤니티·유저 |
| 프로필 | `/profile/[id]` | 그리드, 팔로워/팔로잉, 재생목록 |
| 업로드 | `/upload` | 로그인, 실파일 |
| 롱폼 | `/longform` | 목록·작성·상세 |
| 커뮤니티 | `/community` | 목록·작성·상세 |
| 메시지 | `/messages` | 로그인, WebSocket |
| 알림 | `/notifications` | 로그인, SSE, 수신 토글 |
| 챗봇 | `/chatbot` | 게스트는 Locals만 |
| 고객센터 | `/support` | 열람 자유, 문의는 로그인 |
| 인증 | `/login` `/register` | |
| 이용약관 | `/terms` | 비회원, 푸터 |
| 개인정보처리방침 | `/privacy` | 비회원, 푸터 |
| 사업자 정보확인 | `/business` | 비회원, 푸터 (등록번호는 미등록) |

공통: Navbar / Footer, 다크·라이트 테마.

---

## 프로젝트 구조

```
FrontServer/
├── app/                 # 페이지 (terms/privacy/business 포함)
├── components/
│   ├── legal/LegalPage.tsx
│   └── layout/Footer.tsx   # 약관·개인정보·사업자·고객센터
├── context/
├── lib/
│   ├── api.ts           # Backend 단일 창구
│   ├── guest-routes.ts  # 비회원 허용 경로
│   └── media.ts
├── wrangler.jsonc       # Cloudflare Workers (OpenNext)
└── open-next.config.ts
```

---

## 관련 문서

| 문서 | 내용 |
|------|------|
| [../README.md](../README.md) | 세 서버 실행 순서 |
| [../docs/architecture/overview.md](../docs/architecture/overview.md) | 라우트·데이터 흐름 |
| [../docs/deployment.md](../docs/deployment.md) | 배포 |
| [087](../docs/commits/087-terms-of-service.md) · [088](../docs/commits/088-privacy-policy.md) · [089](../docs/commits/089-business-info.md) | 법적 페이지 |
