# VidShare

숏폼 영상 공유 플랫폼 **VidShare** — 프론트엔드 / 백엔드 서버를 **이 폴더 안**에서 분리한 구조입니다.

```
project/
├── oldplanHTML/              ← 예전 HTML 프로토타입 (참고용)
└── vidshare/                 ← 이 프로젝트 루트
    ├── README.md             ← 지금 이 파일
    ├── docs/                 ← 아키텍처, 커밋 기록, 배포 가이드, 보안 등
    ├── FrontServer/          ← Next.js 프론트엔드 (사용자)  :3000
    ├── console/              ← Next.js 프론트엔드 (관리자)  :3200
    └── BackendServer/        ← Express REST API             :4000
```

---

## 빠른 시작 (실행 방법)

터미널을 **백엔드 → 프론트** 순으로 띄웁니다. 경로는 이 저장소 루트(`vidshare/`) 기준입니다.

### 1. 백엔드

```bash
cd BackendServer
npm install
npm run dev
```

- http://localhost:4000
- 헬스: http://localhost:4000/api/health
- LAN: http://192.168.x.x:4000 (같은 Wi-Fi)

데모 로그인: **`demo` / `demo1234`**

### 2. 사용자 사이트 (다른 터미널)

```bash
cd FrontServer
npm install
npm run dev
```

- http://localhost:3000
- LAN: http://192.168.x.x:3000

Next가 `Network: http://0.0.0.0:3000` 이라고 찍어도, 다른 기기는 **이 PC의 IPv4**로 접속합니다.

확인:

| 주소 | 내용 |
|------|------|
| http://localhost:3000 | 쇼츠 피드 |
| http://localhost:3000/terms | 이용약관 (비회원) |
| http://localhost:3000/privacy | 개인정보처리방침 (비회원) |
| http://localhost:3000/business | 사업자 정보확인 (비회원) |

푸터의 세 링크가 위 페이지로 갑니다.

### 3. 관리자 콘솔 (필요할 때만)

```bash
cd console
npm install
npm run dev
```

→ http://localhost:3200

관리자는 **시드에 없습니다.** 백엔드 폴더에서 만듭니다.

```bash
cd BackendServer
npm run create-admin -- myadmin mypassword123
npm run create-admin -- demo demo1234 --promote
```

쿠키 이름이 다릅니다 (`vidshare_sid` / `vidshare_admin_sid`). 같은 브라우저에서 3000과 3200에 동시에 로그인해도 됩니다.

### 환경 변수

예시는 각 폴더의 `.env.example` / `.env.local.example`.

| 위치 | 변수 | 로컬 기본 |
|------|------|-----------|
| `FrontServer/.env.local` | `NEXT_PUBLIC_API_URL` | 비우면 `http://localhost:4000`. LAN IP로 프론트를 열면 그 IP:4000 |
| `console/.env.local` | `NEXT_PUBLIC_API_URL` | 위와 같음 |
| `BackendServer/.env` | `CORS_ORIGIN` | 개발에서 비우면 사설망 허용. **프로덕션은 필수** |
| `BackendServer/.env` | `COOKIE_DOMAIN` / `COOKIE_SAMESITE` | 로컬은 비움 / `lax`. 배포 시 [docs/deployment.md](./docs/deployment.md) |
| `BackendServer/.env` | `GOOGLE_API_KEY` / `GROQ_API_KEY` | 챗봇 실호출에 필요 |

### 검증 명령

```bash
cd BackendServer && npm test && npm run typecheck
cd FrontServer && npm test && npm run lint
cd console && npm run typecheck && npm run lint
```

### Cloudflare에 프론트만 다시 올리기

백엔드는 Workers에 올리지 않습니다. 프론트·콘솔:

```bash
cd FrontServer && npm run deploy   # https://vidshare-front.limjinheng0120.workers.dev
cd console && npm run deploy       # https://vidshare-console.limjinheng0120.workers.dev
```

API 공개 주소가 있으면 빌드 전에 `NEXT_PUBLIC_API_URL`을 넣습니다. 상세는 [docs/deployment.md](./docs/deployment.md).

---

## 문서

| 위치 | 내용 |
|------|------|
| [plan.md](./plan.md) | 기획·계기·방식 비교 (계획서) |
| [docs/architecture/overview.md](./docs/architecture/overview.md) | **현재 구조 전체** — 처음이면 여기부터 |
| [docs/deployment.md](./docs/deployment.md) | **배포 가이드** (호스트 추천 + 올리기 전 필수 수정) |
| [docs/features/roadmap.md](./docs/features/roadmap.md) | 남은 과제 |
| [docs/commits/](./docs/commits/) | 커밋별 상세 기록 |
| [FrontServer/README.md](./FrontServer/README.md) | 프론트 기능·실행 가이드 |
| [BackendServer/README.md](./BackendServer/README.md) | API 목록·백엔드 가이드 |

---

## 현재 상태

| 구분 | 상태 |
|------|------|
| FrontServer | UI + API 연동. 법적 페이지 `/terms` `/privacy` `/business` |
| console | 관리자 콘솔 — 신고·유저·콘텐츠·고객센터·대시보드 |
| BackendServer | REST + SQLite, SSE·WebSocket |
| 인증 | bcrypt + HttpOnly 세션, 사용자/관리자 쿠키 분리 |
| 업로드 | `POST /api/uploads` (영상 100MB · 이미지 8MB) |
| 테스트 | 백엔드 `npm test` · 프론트 `npm test` · E2E `npm run test:e2e` |
| 배포 | Front/console = Cloudflare Workers. 백엔드 = Tunnel. [docs/deployment.md](./docs/deployment.md) |

---

## 포트

| 서비스 | 포트 |
|--------|------|
| FrontServer (사용자) | 3000 |
| console (관리자) | 3200 |
| BackendServer | 4000 |
