# 배포 가이드

**상태**: **운영 중 (2026-10-02~)** — 백엔드는 **Oracle Cloud 전용 VM + Cloudflare Tunnel**, DB 는 **PostgreSQL 16**, 운영 백업 사본은 **D 드라이브**
**최종 갱신**: 2026-10-02 (096~105)
**대상**: VidShare 를 운영하거나 새 서버에 다시 올리려는 사람

결정의 이유는 [plan.md](../plan.md), 스크립트 목록은 [deploy/README.md](../deploy/README.md),
손으로 따라 하는 절차서는 [ops/](./ops/) 에 있습니다.

---

## 0. 현재 운영 구성 한눈에

| 항목 | 값 |
|------|----|
| 서버 | **전용 VM** `161.33.186.255` — Ubuntu 22.04 · **ARM(A1) 2 OCPU / 11GB RAM** · 부트 디스크 50GB (블록 볼륨 없음) |
| 설치 | `deploy/oracle/setup-vm-tunnel.sh` (최초 1회) → `deploy/oracle/deploy.sh` (매번) |
| 공개 방식 | **Cloudflare 빠른 터널**(`cloudflared`, 아웃바운드). OCI 보안 목록에서 80·443 이 막혀 있어도 HTTPS 로 서비스된다 |
| API 주소 | `https://<무작위>.trycloudflare.com` — **터널이 재시작되면 바뀐다.** 서버에서 `vidshare-tunnel-url` 로 확인 |
| 주소 변경 대응 | 이 PC 작업 스케줄러 **"VidShare 터널 주소 동기화"(매시간)** → `sync-tunnel-url.ps1` 이 프론트·콘솔 자동 재배포 |
| 쿠키 | 프론트(`*.workers.dev`)와 API 가 다른 사이트 → `SameSite=None; Secure`. **Safari 등 서드파티 쿠키 차단 브라우저에서는 로그인 불가할 수 있음** |
| DB 데이터 | `/var/lib/postgresql/16/main` (부트 디스크, localhost 전용) |
| 업로드 | `/mnt/vidshare-data/uploads` (부트 디스크 위 폴더) — 백엔드가 `/uploads/*` 로 서빙 |
| 백업 | 서버 cron 03:00 → `/mnt/vidshare-data/backups` · 이 PC 04:30 → `D:\vidshare-data\backups\prod` |
| 관리자 복구 | `deploy\windows\admin-tools.ps1 -List` / `-Reset <handle>` (6장) |
| SSH | 이 PC `~/.ssh/config` 의 `vidshare-vm` |

> **이력**: 102 에서 다른 서비스(human-bug-tier)의 VM 에 함께 올렸다가, 103 에서 **전용 VM 으로 옮기고 그쪽에서는 완전히 제거**했다.
> VidShare 는 다른 서비스와 서버를 공유하지 않는다.

---

## 1. 구성

```
사용자 브라우저
 ├─ vidshare-front.limjinheng0120.workers.dev    → Cloudflare Workers (FrontServer)
 ├─ vidshare-console.limjinheng0120.workers.dev  → Cloudflare Workers (console)
 └─ <무작위>.trycloudflare.com (HTTPS)            → Cloudflare ══ 아웃바운드 터널 ══ Oracle VM
                                                                  ├─ vidshare-tunnel.service   (cloudflared)
                                                                  ├─ vidshare-backend.service  127.0.0.1:4000
                                                                  │    └─ /uploads/* → /mnt/vidshare-data/uploads
                                                                  └─ postgresql                127.0.0.1:5432
                                                                       data: /var/lib/postgresql/16/main

내 PC   D:\PostgreSQL\16\data            ← 로컬 개발 DB
        D:\vidshare-data\uploads         ← 로컬 업로드
        D:\vidshare-data\backups\local   ← 로컬 DB 백업
        D:\vidshare-data\backups\prod    ← 운영 백업 사본 (매일 04:30)
        작업 스케줄러: 운영 백업 가져오기(04:30) · 터널 주소 동기화(매시간)
```

| 요소 | 제약 | 그래서 |
|------|------|--------|
| DB | 상시 프로세스 + 영구 디스크 | VM 1대. Workers 불가 |
| 업로드 | 영구 디스크 (영상 100MB, 이미지 8MB) | VM 디스크. 블록 볼륨이 없어 **매일 D 드라이브로 사본** |
| 실시간 | SSE + WebSocket, 단일 프로세스 `EventEmitter` | 인스턴스 **1개 고정** |
| 공개 | OCI 보안 목록이 22 만 허용 | 인바운드가 필요 없는 **아웃바운드 터널** |
| 세션 | HttpOnly 쿠키 `vidshare_sid` / `vidshare_admin_sid` | 프론트·API 가 다른 사이트라 `SameSite=None` (3장) |

> 운영 DB 는 Oracle VM 에 있습니다. 내 PC 의 D 드라이브는 **로컬 개발 DB 와 운영 백업 사본**을 둡니다.
> 운영 서버가 집 PC 의 DB 에 붙는 구성은 PC 상시 가동·포트 노출·지연 때문에 쓰지 않습니다(plan.md 9.1).

---

## 2. 로컬 준비 (내 PC, D 드라이브)

PostgreSQL 16 이 `D:\PostgreSQL\16` 에 설치되어 있고 서비스 `postgresql-x64-16` 의 데이터
디렉터리가 `D:\PostgreSQL\16\data` 입니다. 새 클러스터를 만들지 않고 계정·DB 만 추가합니다.

```powershell
powershell -ExecutionPolicy Bypass -File deploy\windows\setup-postgres-d.ps1
```

스크립트가 하는 일: 서비스·데이터 위치 확인 → `D:\vidshare-data\{uploads,backups,logs}` 생성 →
예전 `vidshare.sqlite` 를 `backups\sqlite-final` 에 보관 → `vidshare` 계정과 `vidshare` · `vidshare_test` DB 생성.
끝나면 출력된 세 줄을 `BackendServer\.env` 에 넣습니다.

```bash
cd BackendServer
npm install
npm run db:import-sqlite   # 예전 SQLite 데이터 → Postgres (행 수 비교표 출력, 1회)
npm test                   # 151건, Postgres 위에서
npm run dev
```

자세한 설명·문제 해결: [ops/postgres-d-drive.md](./ops/postgres-d-drive.md)

---

## 3. 쿠키와 주소

### 지금 (도메인 없음)

프론트(`*.workers.dev`)와 API(`*.trycloudflare.com`)는 **서로 다른 사이트**입니다. `SameSite=Lax` 쿠키는
다른 사이트로 가는 `fetch` 에 실리지 않으므로, 서버는 `SameSite=None; Secure` 로 보냅니다.

```env
# /etc/vidshare/backend.env (setup-vm-tunnel.sh 가 작성)
NODE_ENV=production
CORS_ORIGIN=https://vidshare-front.limjinheng0120.workers.dev,https://vidshare-console.limjinheng0120.workers.dev
COOKIE_DOMAIN=
COOKIE_SAMESITE=none
TRUST_PROXY=1
UPLOADS_PATH=/mnt/vidshare-data/uploads
```

- Chrome·Edge: 로그인 · WebSocket 메시지 · SSE 알림까지 동작 확인(103, Playwright).
- Safari(기본)·Firefox 엄격 모드: 서드파티 쿠키를 막아 **로그인이 안 될 수 있습니다.**
- `NODE_ENV=production` 이면 사설망 CORS 자동 허용이 꺼지고 쿠키에 `Secure` 가 붙습니다.

### 도메인을 마련하면 (권장 최종 구성)

세 호스트를 **같은 등록 도메인** 아래로 두면 쿠키를 `SameSite=Lax` 로 되돌릴 수 있고, 주소도 고정됩니다.

| 호스트 | 대상 | 연결 |
|--------|------|------|
| `app.example.com` | FrontServer | Workers → Settings → Domains & Routes → Custom Domain |
| `console.example.com` | console | 같음 |
| `api.example.com` | Oracle VM | Cloudflare **named tunnel** 의 Public Hostname (계정 로그인 필요) — 또는 80·443 을 열고 Caddy(4장 B) |

```env
CORS_ORIGIN=https://app.example.com,https://console.example.com
COOKIE_DOMAIN=.example.com
COOKIE_SAMESITE=lax
```

그 뒤 프론트·콘솔의 `NEXT_PUBLIC_API_URL` 을 `https://api.example.com` 으로 바꿔 재배포하고,
`sync-tunnel-url.ps1` 예약 작업은 지웁니다(주소가 더 이상 바뀌지 않음).

---

## 4. 서버 구축 (최초 1회)

### A. 지금 쓰는 방식 — 터널 (`setup-vm-tunnel.sh`)

80·443 을 열 수 없거나 도메인이 없을 때. 요구 사항은 **SSH(22) 하나**입니다.

```bash
git clone https://github.com/samam0234/vidshare.git ~/vidshare
sudo bash ~/vidshare/deploy/oracle/setup-vm-tunnel.sh \
  --cors https://vidshare-front.limjinheng0120.workers.dev,https://vidshare-console.limjinheng0120.workers.dev
sudo nano /etc/vidshare/backend.env          # GOOGLE_API_KEY / GROQ_API_KEY
sudo bash /opt/vidshare/deploy/oracle/deploy.sh
vidshare-tunnel-url                          # 공개 주소 확인
```

스크립트가 하는 일: Node 24 · PostgreSQL 16(22.04 는 PGDG 저장소) · 빌드 도구 · `cloudflared`(arm64/amd64) 설치,
`vidshare` 시스템 계정 · DB(비밀번호는 서버에서 생성해 `backend.env` 에만 저장), `/mnt/vidshare-data/{uploads,backups}`,
systemd(`vidshare-backend`, `vidshare-tunnel`), 야간 백업 cron.

### B. 도메인 + 80·443 이 열린 경우 — Caddy (`setup-vm.sh`)

블록 볼륨을 붙이고 Caddy 가 Let's Encrypt 인증서를 직접 받는 구성입니다. 현재 운영에는 쓰지 않지만 스크립트는 유지합니다.
절차: [ops/oracle-setup.md](./ops/oracle-setup.md)

```bash
sudo bash ~/vidshare/deploy/oracle/setup-vm.sh --domain api.example.com --device /dev/sdb --format
```

---

## 5. 데이터 옮기기 (로컬 → VM)

```powershell
# 내 PC
& "D:\PostgreSQL\16\bin\pg_dump.exe" -h localhost -U vidshare -d vidshare -Fc -f D:\vidshare-data\backups\local\to-oracle.dump
scp D:\vidshare-data\backups\local\to-oracle.dump vidshare-vm:/tmp/
scp -r D:\vidshare-data\uploads\. vidshare-vm:/tmp/uploads/
```

```bash
# VM
sudo -u postgres pg_restore -d vidshare --clean --if-exists --no-owner --role=vidshare /tmp/to-oracle.dump
sudo cp -a /tmp/uploads/. /mnt/vidshare-data/uploads/ && sudo chown -R vidshare:vidshare /mnt/vidshare-data/uploads
rm -rf /tmp/to-oracle.dump /tmp/uploads
```

> 103 에서는 운영 백업(`D:\vidshare-data\backups\prod\…dump`)을 같은 방법으로 새 VM 에 복원했다.
> 처음부터 빈 DB 로 시작한다면 이 단계를 건너뜁니다. 서버가 처음 뜰 때 시드(데모 계정 포함)를 넣습니다.

---

## 6. 배포 · 관리자 계정

### 배포

```bash
sudo bash /opt/vidshare/deploy/oracle/deploy.sh            # master 최신
sudo bash /opt/vidshare/deploy/oracle/deploy.sh <커밋|태그>  # 특정 버전 (롤백)
```

`deploy.sh` 순서: **백업** → `git pull` → `npm ci` → `npm run build` → `npm run db:migrate` → `systemctl restart` → `/api/health` 확인(`"db":"ok"`).
마이그레이션은 되돌리기 어려워 매번 백업부터 합니다. 코드 롤백은 이전 커밋으로 다시 `deploy.sh`,
스키마까지 되돌려야 하면 직전 덤프를 `pg_restore --clean` 합니다([ops/backup-restore.md](./ops/backup-restore.md)).

### 관리자 계정 — 만들기 · 찾기 · 비밀번호 재설정

관리자는 시드에 없습니다. 비밀번호는 bcrypt 해시라 **원래 값을 찾을 수 없고 재설정만** 됩니다.
웹에는 재설정 기능이 없습니다 — **서버 SSH 키를 가진 사람 = 운영자**가 본인 확인입니다.

```powershell
# 이 PC 에서 (ssh vidshare-vm 경유)
powershell -ExecutionPolicy Bypass -File deploy\windows\admin-tools.ps1 -List            # 관리자 핸들 목록
powershell -ExecutionPolicy Bypass -File deploy\windows\admin-tools.ps1 -Reset <handle>  # 무작위 16자로 재설정, 한 번만 표시
```

```bash
# 서버에서 직접
ENV='set -a; . /etc/vidshare/backend.env; set +a; cd /opt/vidshare/BackendServer'
sudo -u vidshare -H bash -c "$ENV && npm run create-admin -- <handle> <password>"
sudo -u vidshare -H bash -c "$ENV && npm run list-admins"
sudo -u vidshare -H bash -c "$ENV && npm run reset-password -- <handle> --generate"   # 또는 --stdin
```

재설정하면 그 계정의 **모든 세션이 즉시 끊깁니다**(같은 트랜잭션).

### 프론트·콘솔

```bash
# FrontServer/.env.production · console/.env.production (git 무시)
NEXT_PUBLIC_API_URL=https://<현재 터널 주소>
```

```bash
cd FrontServer && npm run deploy
cd console && npm run deploy
```

터널 주소가 바뀌면 `sync-tunnel-url.ps1` 이 이 두 파일을 고치고 두 앱을 다시 배포합니다.
비교 기준은 `%LOCALAPPDATA%\vidshare\deployed-api-url` — **두 앱 배포가 모두 성공한 뒤에만** 갱신됩니다.

```powershell
powershell -ExecutionPolicy Bypass -File deploy\windows\sync-tunnel-url.ps1            # 지금 한 번
powershell -ExecutionPolicy Bypass -File deploy\windows\sync-tunnel-url.ps1 -Register  # 매시간 작업 등록
```

WebSocket 주소는 프론트가 `https → wss` 로 바꿔 씁니다(`lib/chat-socket.ts`). 따로 설정할 것은 없습니다.

---

## 7. 배포 후 확인

```
1. curl https://<터널 주소>/api/health              → 200, "db":"ok"
2. 사용자 사이트 로그인 → 새로고침해도 유지          (401 이면 3장 쿠키·CORS)
3. 쇼츠 업로드 → https://<터널 주소>/uploads/... 재생
4. 두 브라우저로 메시지 → 실시간 반영                (WebSocket)
5. 알림 팝업 실시간 수신                              (SSE)
6. 콘솔 로그인 → 대시보드 숫자
7. sudo reboot → 다시 1~6                            (자동 시작. 터널 주소가 바뀌면 1시간 안에 자동 재배포)
8. 외부에서 nmap -p 4000,5432 161.33.186.255         → closed/filtered
```

---

## 8. 백업

| 대상 | 방법 | 주기 · 보관 |
|------|------|-------------|
| 운영 DB | `/usr/local/bin/vidshare-backup` (cron 03:00) → `/mnt/vidshare-data/backups` | 매일 · 14일 |
| 운영 → 내 PC | `deploy\windows\backup-pull.ps1 -SshHost vidshare-vm` → `D:\vidshare-data\backups\prod` (DB 덤프 + 업로드) | 매일 04:30(`-Register`) · 30일 |
| 로컬 DB | `deploy\windows\backup-local.ps1` → `D:\vidshare-data\backups\local` | 매일 03:30(`-Register`) · 14일 |
| 복원 연습 | 빈 DB 에 `pg_restore` 후 행 수 비교 | 분기 1회 |

> 블록 볼륨이 없어 DB·업로드·서버 백업이 **모두 같은 부트 디스크**에 있다. 디스크가 망가지면 서버 쪽 백업도 함께 잃으므로,
> **D 드라이브 사본이 실질적인 유일한 외부 백업**이다. 내 PC 가 며칠 꺼져 있으면 그만큼 공백이 생긴다.

절차: [ops/backup-restore.md](./ops/backup-restore.md)

---

## 9. CI

`.github/workflows/ci.yml` — PR 과 master push 마다 세 앱을 검증합니다(배포는 하지 않음).

| 잡 | 내용 |
|----|------|
| backend | Postgres 16 서비스 컨테이너 위에서 `typecheck` · `test`(151건) · `build` |
| front | `lint` · `typecheck` · `test`(32건) |
| console | `lint` · `typecheck` |

E2E(Playwright 8 시나리오)는 브라우저 설치가 필요해 CI 에 넣지 않았습니다. 로컬에서 `npm run test:e2e`.

---

## 10. 직접 해야 하는 일 (스크립트·에이전트가 못 함)

| 항목 | 이유 |
|------|------|
| OCI 계정, VM 생성, SSH 공개키 등록, (필요 시) 보안 목록·블록 볼륨 | 계정 인증 |
| 도메인 구입, DNS, Cloudflare named tunnel · Workers Custom Domain | 계정 인증 |
| `setup-postgres-d.ps1` 실행 (postgres 비밀번호 입력) | 슈퍼유저 비밀번호는 본인만 앎 |
| `/etc/vidshare/backend.env` 에 API 키 | 저장소·채팅에 남기지 않음 |
| 관리자 비밀번호 보관 | 해시라 잃으면 재설정만 가능(6장) |
| SSH 하드닝(키 전용, 루트 로그인 끔) | [security-notes 5-3](./security/security-notes.md) |

---

## 11. 언제 구조를 바꿔야 하나

| 신호 | 해야 할 일 |
|------|-----------|
| 터널 주소 변경이 불편하다 / Safari 사용자가 있다 | 도메인 + Cloudflare named tunnel (3장) |
| 디스크 사용량이 늘거나 서버 장애가 걱정된다 | OCI 블록 볼륨을 붙이고 `/mnt/vidshare-data` · Postgres 데이터를 옮김 |
| 업로드가 디스크를 채운다 | Oracle Object Storage / R2 + 서명 URL. 지금은 삭제 경로가 없어(082) 쌓이기만 함 |
| 서버를 2대 이상으로 | SSE/WS 브로드캐스트에 **Redis pub/sub**, 세션은 이미 DB 라 공유됨 |
| 날짜·불리언으로 정렬·집계가 늘어난다 | `TEXT`→`timestamptz`, 0/1→`boolean` 마이그레이션 (096 은 타입 보존) |
| 관리자가 여럿이 된다 | 관리자 조치 **감사 로그** |
| 신고·유저가 수천 건 | 관리자 목록 API **페이지네이션** |

---

## 12. 관련 문서

- [plan.md](../plan.md) · [deploy/README.md](../deploy/README.md)
- [ops/oracle-setup.md](./ops/oracle-setup.md) · [ops/postgres-d-drive.md](./ops/postgres-d-drive.md) · [ops/backup-restore.md](./ops/backup-restore.md)
- [아키텍처](./architecture/overview.md) · [보안 노트](./security/security-notes.md) · [로드맵](./features/roadmap.md)
