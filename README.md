# VidShare

숏폼 영상 공유 플랫폼 **VidShare** — 프론트엔드 / 백엔드 서버를 **이 폴더 안**에서 분리한 구조입니다.

```
project/
├── oldplanHTML/              ← 예전 HTML 프로토타입 (참고용)
└── vidshare/                 ← 이 프로젝트 루트
    ├── README.md             ← 지금 이 파일
    ├── docs/                 ← 아키텍처, 커밋 기록, 보안 등
    ├── FrontServer/          ← Next.js 프론트엔드 (UI)  :3000
    └── BackendServer/        ← Express REST API         :4000
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
| [FrontServer/README.md](./FrontServer/README.md) | 프론트 기능·실행 가이드 |
| [docs/](./docs/) | 아키텍처, 커밋 기록, 보안 등 |
| [BackendServer/README.md](./BackendServer/README.md) | API 목록·백엔드 가이드 |

---

## 현재 상태

| 구분 | 상태 |
|------|------|
| FrontServer | UI 완성, 데이터는 주로 **클라이언트 mock** |
| BackendServer | REST API + **인메모리 store** (재시작 시 초기화) |
| 연동 | `FrontServer/lib/api.ts` 클라이언트 스텁 준비, UI 전면 연동은 진행 중 |
| 인증 / DB / 실파일 업로드 | 미구현 |

---

## 포트

| 서비스 | 포트 |
|--------|------|
| FrontServer | 3000 |
| BackendServer | 4000 |
