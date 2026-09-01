# 배포 가이드

**상태**: 가이드 문서 — Cloudflare Tunnel 경로로 코드 준비됨 (실제 터널 생성은 계정 작업)
**최종 갱신**: 2026-09-02
**대상**: VidShare를 처음 실제 서버에 올리려는 사람

이 문서는 **무엇을 골라야 하는지**와 **올리기 전에 반드시 고쳐야 하는 것**을
정리합니다. 지금 코드는 전부 "내 PC + 같은 Wi-Fi" 를 전제로 되어 있어서,
그대로 올리면 **로그인이 되지 않습니다**(3장 참고).

---

## 1. 먼저 알아야 할 제약

배포처를 고르기 전에, 이 프로젝트가 지금 어떤 모양인지부터 봅니다.

| 요소 | 현재 | 배포에 주는 제약 |
|------|------|------------------|
| DB | `better-sqlite3` → `data/vidshare.sqlite` **파일 하나** | **서버리스 불가.** 항상 살아 있는 프로세스와 **영구 디스크**가 필요. 인스턴스를 2개로 늘리면 각자 다른 DB를 보게 됨 → **1대 고정** |
| 업로드 | `uploads/` **로컬 디스크** (영상 100MB, 이미지 8MB) | 같은 영구 디스크에 저장. 컨테이너를 다시 만들면 볼륨이 없는 한 전부 사라짐 |
| 실시간 | SSE(`/api/notifications/stream`) + WebSocket(`/ws/conversations`) | 요청 시간 제한이 있는 서버리스/일부 프록시에서 끊김. **WS를 지원하는 호스트** 필요 |
| 네이티브 모듈 | `better-sqlite3` | 배포 환경에서 컴파일되거나 prebuilt가 맞아야 함. Node 버전을 로컬과 맞출 것 |
| 앱 개수 | FrontServer(3000) / BackendServer(4000) / console(3200) | 배포 단위가 **셋**. 프론트 둘은 정적에 가깝고 백엔드만 상태를 가짐 |
| 세션 | HttpOnly 쿠키 `vidshare_sid` / `vidshare_admin_sid` | **프론트와 백엔드 도메인이 다르면 지금 설정으로는 쿠키가 안 실림** (3장) |

> 요약: **백엔드는 "디스크가 붙은 작은 서버 1대"**, **프론트 둘은 아무 데나.**

---

## 2. 추천 조합

### 이 저장소의 권장안 — Cloudflare Tunnel + 상시 Node 3프로세스

아티팩트(배포 가이드)의 제약 그대로다. **백엔드는 서버리스에 올리지 않는다.**
SQLite 파일 + `uploads/` + WebSocket 이라 Workers/Pages Functions 로는 깨진다.

| 대상 | 호스트 | 이유 |
|------|--------|------|
| BackendServer | **이 PC 또는 VPS에서 `npm start`** + Cloudflare Tunnel | 영구 디스크와 상시 프로세스. HTTPS·WS는 Cloudflare가 붙인다 |
| FrontServer | **Cloudflare Workers** (`npm run deploy` in `FrontServer/`) | OpenNext 어댑터. 현재 `https://vidshare-front.limjinheng0120.workers.dev` |
| console | **Cloudflare Workers** (`npm run deploy` in `console/`) | 동일. 현재 `https://vidshare-console.limjinheng0120.workers.dev` |

도메인은 Cloudflare 존에 있어야 서브도메인 3개를 한 터널에 묶고 쿠키 `domain=.example.com` 이 된다.
템플릿: [`cloudflare/config.template.yml`](../cloudflare/config.template.yml)

### 대안 (아티팩트와 동일)

| 대상 | 호스트 | 이유 |
|------|--------|------|
| BackendServer | Railway / Render / Fly.io | 영구 볼륨 + WS. Tunnel 대신 쓸 수 있음 |
| FrontServer / console | Vercel 또는 Cloudflare Pages(정적/OpenNext) | 프론트만 |

코드를 가장 적게 고치고 올리는 경로다. DB를 Postgres로 옮기거나 R2를 붙이지 않는다.

| 방식 | 언제 | 대가 |
|------|------|------|
| **전부 한 VPS** + Nginx | 도메인 하나에 `/` 와 `/api` 를 같이 붙이고 싶을 때. **쿠키 문제가 통째로 사라지는** 방식 | Nginx·PM2·인증서(certbot)를 직접 관리 |
| **Docker Compose** 로 3개 컨테이너 | 위 VPS의 정돈된 버전 | Dockerfile 3개를 새로 써야 함 |
| **Workers/Pages에 백엔드까지** | — | **하지 않음.** SQLite·업로드·WS가 전부 깨짐 |

### 도메인 배치 (권장)

```
app.example.com      → FrontServer   (localhost:3000, Tunnel)
api.example.com      → BackendServer (localhost:4000, Tunnel)
console.example.com  → console       (localhost:3200, Tunnel)
```

관리자 콘솔은 **검색에 잡히지 않게** 되어 있습니다(`robots: index:false`).
가능하면 회사 VPN·IP 허용 목록 뒤에 두는 편이 좋습니다.

---

## 3. 올리기 전에 반드시 고쳐야 할 것

> **이 절을 건너뛰면 배포 후 로그인이 되지 않습니다.** 지금 코드는 전부
> "프론트와 백엔드가 같은 localhost" 를 전제로 합니다.

### 3-1. 크로스 도메인 세션 쿠키 (가장 중요)

`BackendServer/src/auth/sessions.ts` 와 `adminSession.ts` 는 지금 이렇습니다.

```ts
res.cookie(SESSION_COOKIE, sid, {
  httpOnly: true,
  sameSite: "lax",                                  // ← 문제
  secure: process.env.NODE_ENV === "production",
  path: "/",
});
```

`app.example.com` 의 자바스크립트가 `api.example.com` 으로 보내는 요청은
**cross-site** 라서, `SameSite=Lax` 쿠키는 **브라우저가 붙여 주지 않습니다.**
로그인은 200이 돌아오는데 다음 요청이 401이 되는 증상으로 나타납니다.

해결은 둘 중 하나입니다.

- **(A) 같은 사이트로 묶기 — 권장.** 프론트와 API를 같은 등록 도메인 아래
  (`app.example.com` ↔ `api.example.com`)에 두고 쿠키에 `COOKIE_DOMAIN=.example.com`
  을 주거나, 아예 한 호스트에서 `/api/*` 를 백엔드에 리버스 프록시.
  **동일 사이트가 되면 `Lax` 그대로 동작하고, 이 항목은 신경 쓸 게 없어집니다.**
- **(B) 진짜 크로스 사이트로 간다면** `COOKIE_SAMESITE=none` (코드가 프로덕션에서
  `secure` 를 켠다). HTTPS 필수이고, CSRF 방어가 `Lax` 에 기대던 부분이 사라지니
  그 대비도 함께 필요합니다.

`sessions.ts` / `adminSession.ts` 는 `COOKIE_DOMAIN` · `COOKIE_SAMESITE` 환경 변수를 읽는다.

### 3-2. CORS 화이트리스트

`BackendServer/src/app.ts` 의 `isDevAllowedOrigin()` 은 **사설망 호스트를 전부
허용**합니다. 개발 편의를 위한 것이고, 프로덕션에서는 `CORS_ORIGIN` 을 반드시
명시해야 합니다.

```env
CORS_ORIGIN=https://app.example.com,https://console.example.com
```

`NODE_ENV=production` 이면 사설망 자동 허용은 꺼진다. `CORS_ORIGIN` 이 비면
브라우저 Origin 이 있는 요청은 전부 막힌다.

### 3-3. 관리자 계정 만들기

관리자는 **시드에 없습니다**(비밀번호를 소스에 두지 않으려고). 배포한 서버에
붙어서 직접 만들어야 합니다.

```bash
# 백엔드가 돌아가는 서버/컨테이너 안에서
cd BackendServer
npm run create-admin -- <handle> <password> [name]

# 이미 있는 일반 계정을 올리려면 (비밀번호는 그대로 유지됨)
npm run create-admin -- <handle> <password> --promote
```

터널을 띄운 **그 기계**의 백엔드 폴더에서 실행한다.
`SQLITE_PATH` 가 실제 남는 경로여야 한다 — 컨테이너 임시 디스크면 재시작 때 사라진다.

### 3-4. 그 외 점검

- [ ] `NODE_ENV=production` (쿠키 `secure`, morgan 포맷이 여기에 걸려 있음)
- [ ] `GOOGLE_API_KEY` / `GROQ_API_KEY` — 챗봇을 쓸 거면 호스트의 시크릿으로.
      **저장소에 넣지 말 것**
- [ ] 업로드 볼륨 크기 — 영상 100MB × 개수. 최소 몇 GB는 잡을 것
- [ ] 프록시(Nginx/Cloudflare)를 둔다면 업로드 상한(`client_max_body_size 100m`)
      과 SSE·WS 버퍼링 해제(`proxy_buffering off`, `Upgrade` 헤더 전달)
- [ ] `data/DataBaseColumn.md` 덤프는 쓰기마다 갱신됨 — 프로덕션에서 부담되면 끌 것

---

## 4. 단계별 절차 (Cloudflare Tunnel)

에이전트가 대신 할 수 없는 계정 작업은 5장 끝에 적어 두었다.

### 4-1. 앱을 프로덕션 설정으로 띄우기

백엔드 `BackendServer/.env`:

```env
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://app.example.com,https://console.example.com
COOKIE_DOMAIN=.example.com
COOKIE_SAMESITE=lax
GOOGLE_API_KEY=...
GROQ_API_KEY=...
```

프론트 `FrontServer/.env.local` · `console/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://api.example.com
```

백엔드:

```bash
cd BackendServer && npm ci && npm run build && npm start
```

프론트·콘솔은 Cloudflare Workers 로 올린다 (OpenNext).

```bash
cd FrontServer && npm run deploy
cd console && npm run deploy
```

로컬에서 Workers 런타임으로 미리 보려면 `npm run preview`.

### 4-2. 터널

1. [Cloudflare Zero Trust](https://one.dash.cloudflare.com) → Networks → Tunnels → Create → Cloudflared
2. 이름 `vidshare`, 설치 명령을 **앱이 도는 기계**에서 실행
3. Public Hostname 세 개: HTTP → `localhost:3000` / `4000` / `3200`
   또는 [`cloudflare/config.template.yml`](../cloudflare/config.template.yml) 을 채워
   `cloudflared tunnel --config ... run`
4. DNS: `app` / `api` / `console` CNAME → `<TUNNEL_ID>.cfargotunnel.com` (프록시 켜기)

임시 확인만 하려면 `cloudflared tunnel --url http://localhost:4000` 으로
`*.trycloudflare.com` 을 받을 수 있다. 주소가 매번 바뀌고 프론트와 쿠키 도메인을
맞추기 어려우니 **고정 터널 + 존** 을 쓴다.

### 4-3. 관리자

백엔드가 뜬 그 기계에서:

```bash
cd BackendServer
npm run create-admin -- <handle> <password>
```

### 4-4. 배포 후 확인 순서

```
1. GET  https://api.example.com/api/health          → 200
2. app.example.com 에서 회원가입·로그인             → 새로고침해도 유지되나
   (여기서 401이 나면 3-1 쿠키 문제)
3. 쇼츠 업로드                                       → 파일이 /uploads/... 로 열리나
4. 두 브라우저로 메시지 주고받기                     → WS 실시간 반영되나
5. console.example.com 로그인 → 대시보드 숫자 표시
6. 앱에서 신고 접수 → 콘솔 /reports 에 보이나
7. 재배포 한 번 → 위 데이터가 그대로 남아 있나 (볼륨 확인)
```

### 4-5. 직접 해야 하는 일 (에이전트/MCP가 못 함)

| 항목 | 이유 |
|------|------|
| Cloudflare 계정 로그인 | 대시보드·`cloudflared` 인증 |
| 존에 도메인 연결 (또는 이미 있는 존) | `app`/`api`/`console` 서브도메인 + `COOKIE_DOMAIN` |
| 터널 만들기, 설치 명령 실행 | 자격 증명이 이 PC의 `%USERPROFILE%\.cloudflared\` 에 생김 |
| `GOOGLE_API_KEY` / `GROQ_API_KEY` 를 `.env`에 넣기 | 채팅에 붙여 넣지 말 것 |
| `npm run create-admin` | 관리자 비밀번호를 소스에 두지 않음 |
| 세 서버를 켜 둔 채로 두기 | 터널은 로컬/VPS 프로세스가 살아 있어야 함 |

`*.trycloudflare.com` 임시 URL은 터미널을 끄면 사라진다. 실서비스는 고정 터널을 쓴다.

---

## 5. CI (선택)

로드맵의 "배포 파이프라인" 항목입니다. 최소 형태는 GitHub Actions로
**PR마다 검증만** 돌리는 것입니다 (배포는 Vercel/Railway가 자동으로 함).

```yaml
# .github/workflows/ci.yml (예시 — 아직 만들지 않음)
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm, cache-dependency-path: BackendServer/package-lock.json }
      - run: npm ci
        working-directory: BackendServer
      - run: npm run typecheck && npm test    # 127건
        working-directory: BackendServer
  front:
    # FrontServer: npx tsc --noEmit && npm run lint && npm test (29건)
    # E2E(npm run test:e2e)는 브라우저 설치가 필요해 별도 잡으로 분리하는 편이 낫다
  console:
    # console: npm run typecheck && npm run lint && npm run build
```

---

## 6. 언제 구조를 바꿔야 하나

지금 구조는 **1대 · 소규모** 전제입니다. 아래 중 하나라도 생기면 그때 손봅니다.

| 신호 | 해야 할 일 |
|------|-----------|
| 서버를 2대 이상으로 늘리고 싶다 | SQLite → **Postgres**. `store.ts` 의 SQL이 대부분 표준이라 이관 자체는 크지 않지만 `better-sqlite3` 동기 API가 전부 async가 됨 |
| 업로드가 디스크를 채운다 | **S3/R2** + presigned URL. 지금은 삭제 경로 자체가 없어서(082 참고) 파일이 쌓이기만 함 |
| 인스턴스 간 실시간이 안 맞는다 | SSE/WS 브로드캐스트에 **Redis pub/sub** |
| 관리자가 여럿이 된다 | 관리자 조치 **감사 로그** 테이블. 지금은 누가 지웠는지 남지 않음 |
| 신고·유저가 수천 건이 된다 | 관리자 목록 API에 **페이지네이션** (현재 전량 조회) |

---

## 7. 관련 문서

- [아키텍처](./architecture/overview.md)
- [보안 노트](./security/security-notes.md)
- [로드맵](./features/roadmap.md)
- [081 — 관리자 인증](./commits/081-admin-auth.md) · [082 — 관리자 API](./commits/082-admin-api.md)
