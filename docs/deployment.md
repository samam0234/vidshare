# 배포 가이드

**상태**: 가이드 문서 (아직 어디에도 배포하지 않음)
**최종 갱신**: 2026-09-01
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

### 권장안 — Railway(또는 Render) 1대 + Vercel 2개

| 대상 | 호스트 | 이유 |
|------|--------|------|
| BackendServer | **Railway** (Render / Fly.io도 동일 성격) | 영구 볼륨을 붙일 수 있고, WebSocket이 그대로 되고, 상시 프로세스라 SQLite가 성립. 설정이 가장 적음 |
| FrontServer | **Vercel** | Next.js 기본 배포처. 빌드·프리뷰가 자동 |
| console | **Vercel** (같은 계정, 별도 프로젝트) | 같은 이유. 별도 프로젝트로 두면 관리자 URL을 따로 숨길 수 있음 |

이 조합을 권하는 이유는 **지금 코드를 가장 적게 고치고 올릴 수 있어서**입니다.
DB를 Postgres로 옮기거나 S3를 붙이는 작업 없이 그대로 동작합니다.

### 대안

| 방식 | 언제 | 대가 |
|------|------|------|
| **전부 한 VPS**(Oracle Cloud 무료 티어, Lightsail 등) + Nginx | 도메인 하나에 `/` 와 `/api` 를 같이 붙이고 싶을 때. **쿠키 문제가 통째로 사라지는** 방식 | Nginx·PM2·인증서(certbot)를 직접 관리 |
| **Docker Compose** 로 3개 컨테이너 | 위 VPS의 정돈된 버전 | Dockerfile 3개를 새로 써야 함 |
| **Vercel에 백엔드까지** | — | **권장하지 않음.** SQLite·업로드·WS가 전부 깨짐. Postgres+S3로 갈아엎어야 함 |

### 도메인 배치 (권장)

```
app.example.com      → FrontServer   (Vercel)
api.example.com      → BackendServer (Railway, 영구 볼륨)
console.example.com  → console       (Vercel)
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
  (`app.example.com` ↔ `api.example.com`)에 두고 쿠키에 `domain: ".example.com"`
  을 주거나, 아예 VPS + Nginx로 `example.com/api/*` 를 백엔드에 리버스 프록시.
  **동일 사이트가 되면 `Lax` 그대로 동작하고, 이 항목은 신경 쓸 게 없어집니다.**
- **(B) 진짜 크로스 사이트로 간다면** `sameSite: "none"` + `secure: true` 로
  바꿔야 합니다. `None` 은 HTTPS에서만 유효하므로 인증서가 필수이고, CSRF
  방어가 `Lax` 에 기대던 부분이 사라지니 그 대비도 함께 필요합니다.

두 파일 모두 고쳐야 합니다(사용자 세션·관리자 세션).

### 3-2. CORS 화이트리스트

`BackendServer/src/app.ts` 의 `isDevAllowedOrigin()` 은 **사설망 호스트를 전부
허용**합니다. 개발 편의를 위한 것이고, 프로덕션에서는 `CORS_ORIGIN` 을 반드시
명시해야 합니다.

```env
CORS_ORIGIN=https://app.example.com,https://console.example.com
```

`NODE_ENV=production` 일 때는 `isPrivateHostname` 경로를 아예 타지 않도록
조여 두는 편이 안전합니다(현재는 env가 비면 사설망을 계속 허용).

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

Railway·Render라면 대시보드의 셸(또는 `railway run`)에서 실행합니다.
`SQLITE_PATH` 가 **실제 볼륨 경로를 가리키는 상태**여야 합니다 — 안 그러면
컨테이너 임시 디스크에 관리자가 생기고 재시작 때 사라집니다.

### 3-4. 그 외 점검

- [ ] `NODE_ENV=production` (쿠키 `secure`, morgan 포맷이 여기에 걸려 있음)
- [ ] `GOOGLE_API_KEY` / `GROQ_API_KEY` — 챗봇을 쓸 거면 호스트의 시크릿으로.
      **저장소에 넣지 말 것**
- [ ] 업로드 볼륨 크기 — 영상 100MB × 개수. 최소 몇 GB는 잡을 것
- [ ] 프록시(Nginx/Cloudflare)를 둔다면 업로드 상한(`client_max_body_size 100m`)
      과 SSE·WS 버퍼링 해제(`proxy_buffering off`, `Upgrade` 헤더 전달)
- [ ] `data/DataBaseColumn.md` 덤프는 쓰기마다 갱신됨 — 프로덕션에서 부담되면 끌 것

---

## 4. 단계별 절차 (권장안 기준)

### 4-1. BackendServer → Railway

1. 새 프로젝트 → GitHub 저장소 연결 → **Root Directory 를 `BackendServer`** 로 지정
2. Build: `npm ci && npm run build` / Start: `npm start`
   (`npm start` 는 `node dist/index.js`. `tsx` 가 아니라 컴파일된 결과를 씁니다)
3. **Volume 을 추가**하고 마운트 경로를 정한다 (예: `/data`)
4. 환경 변수:
   ```env
   NODE_ENV=production
   PORT=4000
   SQLITE_PATH=/data/vidshare.sqlite
   UPLOADS_PATH=/data/uploads
   CORS_ORIGIN=https://app.example.com,https://console.example.com
   GOOGLE_API_KEY=...
   GROQ_API_KEY=...
   ```
5. 배포 후 `https://api.example.com/api/health` 가 200인지 확인
6. 셸에서 `npm run create-admin -- ...` 으로 관리자 생성 (3-3)

> `SQLITE_PATH` 와 `UPLOADS_PATH` 를 **볼륨 안**으로 지정하는 것이 핵심입니다.
> 기본값은 프로젝트 폴더 안이라 재배포 때 통째로 날아갑니다.

### 4-2. FrontServer → Vercel

1. 같은 저장소 임포트 → **Root Directory 를 `FrontServer`**
2. 환경 변수: `NEXT_PUBLIC_API_URL=https://api.example.com`
   (비워 두면 `lib/api.ts` 가 "현재 호스트:4000" 으로 추측합니다 — 프로덕션에선
   반드시 명시)
3. 배포 → `app.example.com` 연결

### 4-3. console → Vercel (별도 프로젝트)

1. 같은 저장소 임포트 → **Root Directory 를 `console`**
2. 환경 변수: `NEXT_PUBLIC_API_URL=https://api.example.com`
3. 배포 → `console.example.com` 연결

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
