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

## 빠른 시작

프로젝트 루트(`project/`) 기준 경로입니다.

### 1. 백엔드

```bash
cd vidshare/BackendServer
npm install
npm run dev
```

→ http://localhost:4000  
→ http://192.168.x.x:4000  (이 PC IPv4, 같은 Wi-Fi 기기에서)

### 2. 프론트엔드 (다른 터미널)

```bash
cd vidshare/FrontServer
npm install
npm run dev
```

→ http://localhost:3000  
→ http://192.168.x.x:3000  (예: http://192.168.45.182:3000)

Next가 `Network: http://0.0.0.0:3000` 이라고 찍어도, 휴대폰·다른 PC에서는 **0.0.0.0이 아니라 이 컴퓨터 IPv4**로 접속합니다.

### 3. 관리자 콘솔 (필요할 때만, 또 다른 터미널)

```bash
cd vidshare/console
npm install
npm run dev
```

→ http://localhost:3200

관리자 계정은 **시드에 없습니다**(비밀번호를 소스에 두지 않으려고).
백엔드 폴더에서 한 번 만들어 두세요.

```bash
cd vidshare/BackendServer
npm run create-admin -- myadmin mypassword123

# 이미 있는 일반 계정을 관리자로 올리려면 (비밀번호는 그대로)
npm run create-admin -- demo demo1234 --promote
```

사용자 사이트와 콘솔은 세션 쿠키 이름이 달라서(`vidshare_sid` /
`vidshare_admin_sid`) 같은 브라우저에서 동시에 로그인해 있어도 됩니다.

### 환경 변수 (선택)

`vidshare/FrontServer/.env.local` (예시는 `.env.local.example`):

```env
# 비우면 브라우저 주소의 호스트:4000 을 씁니다 (LAN IP 접속 포함).
NEXT_PUBLIC_API_URL=
```

`vidshare/BackendServer/.env` (예시는 `.env.example`):

```env
PORT=4000
# 비우면 localhost + 사설망(192.168/10/172.16-31) 프론트를 허용합니다.
CORS_ORIGIN=
```

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
| FrontServer | UI 완성, **서버 API 전면 연동** (mock 제거 완료) |
| console | 관리자 콘솔 — 신고·유저·콘텐츠·고객센터·대시보드 |
| BackendServer | REST API + **SQLite** (`data/vidshare.sqlite`), SSE·WebSocket 실시간 |
| 인증 | bcrypt + HttpOnly 세션 (SQLite), 사용자/관리자 세션 분리 |
| 실파일 업로드 | 구현 (`POST /api/uploads`, 영상 100MB · 이미지 8MB) |
| 테스트 | 백엔드 127건, 프론트 29건, E2E 8건 |
| 배포 | **미배포.** 가이드만 준비됨 → [docs/deployment.md](./docs/deployment.md) |

---

## 포트

| 서비스 | 포트 |
|--------|------|
| FrontServer (사용자) | 3000 |
| console (관리자) | 3200 |
| BackendServer | 4000 |
