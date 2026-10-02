# 배포 가이드

**상태**: **운영 중 (2026-10-02~)** — 백엔드는 **Oracle Cloud VM**, DB 는 **PostgreSQL 16**, 운영 백업 사본은 **D 드라이브**

> ### 현재 운영 구성 (2026-10-02, 커밋 103)
>
> | 항목 | 값 |
> |------|----|
> | 서버 | **전용 VM** `161.33.186.255` — Ubuntu 22.04 · **ARM(A1) 2 OCPU / 11GB RAM** · 부트 디스크 50GB (블록 볼륨 없음) |
> | 설치 | `deploy/oracle/setup-vm-tunnel.sh` → `deploy.sh` |
> | 공개 방식 | **Cloudflare 빠른 터널**(`cloudflared`, 아웃바운드). OCI 보안 목록에서 80·443 이 막혀 있어도 HTTPS 로 서비스된다 |
> | API 주소 | `https://<무작위>.trycloudflare.com` — **터널이 재시작되면 바뀐다.** 현재 주소는 서버에서 `vidshare-tunnel-url` |
> | 주소 변경 대응 | 이 PC 작업 스케줄러 **"VidShare 터널 주소 동기화"(매시간)** 가 `sync-tunnel-url.ps1` 로 바뀐 주소를 감지해 프론트·콘솔을 자동 재배포 |
> | 쿠키 | 프론트(`*.workers.dev`)와 API 가 다른 사이트 → `SameSite=None; Secure`. **Safari 등에서는 로그인 불가할 수 있음** |
> | 백업 | 서버 cron 03:00 → 이 PC 작업 스케줄러 04:30 이 `D:\vidshare-data\backups\prod` 로 가져옴 |
> | SSH | 이 PC `~/.ssh/config` 의 `vidshare-vm` (human-bug-tier 서버는 `hbt-vm`) |
>
> **이력**: 102 에서 human-bug-tier VM 에 함께 올렸던 VidShare 는 103 에서 **완전히 제거**했다(서비스·nginx 사이트·인증서·DB·Postgres·파일·계정).
> 주소를 고정하려면 도메인을 마련해 Cloudflare **named tunnel**(계정 로그인 필요)로 바꾸면 된다.

**최종 갱신**: 2026-10-02 (096~098)
**대상**: VidShare 를 처음 실제 서버에 올리려는 사람

결정의 이유는 [plan.md](../plan.md) 7~10장, 스크립트 목록은 [deploy/README.md](../deploy/README.md),
손으로 따라 하는 절차서는 [ops/](./ops/) 에 있습니다.

---

## 1. 구성

```
app.example.com      → FrontServer   Cloudflare Workers (OpenNext)
console.example.com  → console       Cloudflare Workers (OpenNext)
api.example.com      → Oracle VM 공인 IP
                         Caddy :443 ─┬─ /uploads/*  → /mnt/vidshare-data/uploads (디스크 직접)
                                     └─ 그 외       → BackendServer 127.0.0.1:4000 (systemd)
                                                         └─ PostgreSQL 16 127.0.0.1:5432
                                                              data: /mnt/vidshare-data/pgdata
내 PC                D:\PostgreSQL\16\data      ← 로컬 개발 DB
                     D:\vidshare-data\uploads   ← 로컬 업로드
                     D:\vidshare-data\backups   ← 로컬 백업 + 운영 백업 사본
```

| 요소 | 제약 | 그래서 |
|------|------|--------|
| DB | 상시 프로세스 + 영구 디스크 | VM 1대 + 블록 볼륨. Workers 불가 |
| 업로드 | 영구 디스크 (영상 100MB, 이미지 8MB) | 같은 블록 볼륨. Caddy 가 직접 서빙 |
| 실시간 | SSE + WebSocket, 단일 프로세스 `EventEmitter` | 인스턴스 **1개 고정** |
| 세션 | HttpOnly 쿠키 `vidshare_sid` / `vidshare_admin_sid` | 세 호스트가 **같은 등록 도메인** 아래여야 함 (3장) |

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
npm run db:import-sqlite   # 예전 SQLite 데이터 → Postgres (행 수 비교표 출력)
npm test                   # 148건, Postgres 위에서
npm run dev
```

자세한 설명·문제 해결: [ops/postgres-d-drive.md](./ops/postgres-d-drive.md)

---

## 3. 도메인과 쿠키 (가장 중요)

`app.example.com` 의 JS 가 `api.example.com` 으로 보내는 요청에 세션 쿠키가 실리려면
**두 호스트가 같은 등록 도메인**(`example.com`)이어야 합니다. `*.workers.dev` 와 VM IP 처럼
서로 다른 사이트면 `SameSite=Lax` 쿠키가 붙지 않아, 로그인은 200 인데 다음 요청이 401 이 됩니다.

그래서 도메인을 하나 마련해 세 개로 나눕니다.

| 호스트 | 대상 | 연결 |
|--------|------|------|
| `app.example.com` | FrontServer | Workers → Settings → Domains & Routes → Custom Domain |
| `console.example.com` | console | 같음 |
| `api.example.com` | Oracle VM | DNS **A 레코드** → 예약 공인 IP (Cloudflare 라면 **DNS only**, 주황 구름 끔) |

백엔드 `/etc/vidshare/backend.env` (setup-vm.sh 가 `--domain` 에서 계산해 채움):

```env
CORS_ORIGIN=https://app.example.com,https://console.example.com
COOKIE_DOMAIN=.example.com
COOKIE_SAMESITE=lax
TRUST_PROXY=1
```

- `NODE_ENV=production` 이면 사설망 CORS 자동 허용이 꺼지고 쿠키에 `Secure` 가 붙습니다.
- 진짜 다른 사이트끼리라면 `COOKIE_SAMESITE=none` 이 필요하고, CSRF 대비를 따로 해야 합니다. 권장하지 않습니다.

---

## 4. Oracle Cloud VM 구축 (최초 1회)

요약입니다. 콘솔 화면 순서까지 적은 절차서는 [ops/oracle-setup.md](./ops/oracle-setup.md).

1. **OCI 리소스**: Ubuntu 24.04 VM(Ampere A1 권장), 블록 볼륨 100GB 연결, 예약 공인 IP.
2. **보안 목록**: Ingress TCP 80·443 전체, TCP 22 는 **내 IP/32 만**.
3. **DNS**: `api.example.com` A → 예약 IP. 반영을 확인한 뒤 다음 단계(인증서 발급에 필요).
4. **설정 스크립트** (VM 에서):

   ```bash
   lsblk                                   # 블록 볼륨 장치 이름 확인 (예: sdb)
   git clone https://github.com/samam0234/vidshare.git ~/vidshare
   sudo bash ~/vidshare/deploy/oracle/setup-vm.sh --domain api.example.com --device /dev/sdb --format
   ```

   패키지(Node 24 · Postgres 16 · Caddy) 설치, 볼륨 마운트, Postgres 데이터 이전,
   `vidshare` 계정·DB, `/etc/vidshare/backend.env`, Caddy · systemd · 백업 cron, iptables 80/443 까지 처리합니다.
   `--format` 은 **파일시스템이 없는 새 볼륨일 때만** 포맷합니다.

5. **API 키**: `sudo nano /etc/vidshare/backend.env` 에 `GOOGLE_API_KEY` / `GROQ_API_KEY`.

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
sudo -u postgres pg_restore -d vidshare --no-owner --role=vidshare /tmp/to-oracle.dump
sudo cp -a /tmp/uploads/. /mnt/vidshare-data/uploads/ && sudo chown -R vidshare:vidshare /mnt/vidshare-data/uploads
rm -rf /tmp/to-oracle.dump /tmp/uploads
```

> 처음부터 빈 DB 로 시작한다면 이 단계를 건너뜁니다. 서버가 처음 뜰 때 시드(데모 계정 포함)를 넣습니다.
> **운영에서는 시드 계정 `demo` / `demo1234` 를 정지하거나 지우세요** — 비밀번호가 공개되어 있습니다.

---

## 6. 배포

```bash
sudo bash /opt/vidshare/deploy/oracle/deploy.sh            # master 최신
sudo bash /opt/vidshare/deploy/oracle/deploy.sh <커밋|태그>  # 특정 버전 (롤백)
```

`deploy.sh` 순서: **백업** → `git pull` → `npm ci` → `npm run build` → `npm run db:migrate` → `systemctl restart` → `/api/health` 확인.
마이그레이션은 되돌리기 어려워 매번 백업부터 합니다. 코드 롤백은 이전 커밋으로 다시 `deploy.sh`,
스키마까지 되돌려야 하면 직전 덤프를 `pg_restore --clean` 합니다([ops/backup-restore.md](./ops/backup-restore.md)).

### 관리자 계정

관리자는 시드에 없습니다. VM 에서 한 번 만듭니다.

```bash
sudo -u vidshare bash -c 'set -a; . /etc/vidshare/backend.env; set +a; cd /opt/vidshare/BackendServer && npm run create-admin -- <handle> <password>'
```

### 프론트·콘솔

```bash
# FrontServer/.env.local · console/.env.local
NEXT_PUBLIC_API_URL=https://api.example.com
```

```bash
cd FrontServer && npm run deploy
cd console && npm run deploy
```

WebSocket 주소는 프론트가 `https → wss` 로 바꿔 씁니다(`lib/chat-socket.ts`). 따로 설정할 것은 없습니다.

---

## 7. 배포 후 확인

```
1. curl https://api.example.com/api/health        → 200, "db":"ok"
2. app.example.com 회원가입·로그인 → 새로고침해도 유지   (401 이면 3장 쿠키)
3. 쇼츠 업로드 → https://api.example.com/uploads/... 재생   (Caddy 직접 서빙)
4. 두 브라우저로 메시지 → 실시간 반영                     (WebSocket)
5. 알림 팝업 실시간 수신                                   (SSE, Caddy flush_interval)
6. console.example.com 로그인 → 대시보드 숫자
7. sudo reboot → 다시 1~6                                 (볼륨 마운트·자동 시작)
8. 외부에서 nmap -p 5432 <IP>                              → closed/filtered
```

---

## 8. 백업

| 대상 | 방법 | 주기 · 보관 |
|------|------|-------------|
| 운영 DB | `/usr/local/bin/vidshare-backup` (cron 03:00) → `/mnt/vidshare-data/backups` | 매일 · 14일 |
| 운영 → 내 PC | `deploy\windows\backup-pull.ps1 -SshHost vidshare-vm` → `D:\vidshare-data\backups\prod` | 매일 04:30(`-Register`) · 30일 |
| 로컬 DB | `deploy\windows\backup-local.ps1` → `D:\vidshare-data\backups\local` | 매일 03:30(`-Register`) · 14일 |
| 복원 연습 | 빈 DB 에 `pg_restore` 후 행 수 비교 | 분기 1회 |

절차: [ops/backup-restore.md](./ops/backup-restore.md)

---

## 9. CI

`.github/workflows/ci.yml` — PR 과 master push 마다 세 앱을 검증합니다(배포는 하지 않음).

| 잡 | 내용 |
|----|------|
| backend | Postgres 16 서비스 컨테이너 위에서 `typecheck` · `test`(148건) · `build` |
| front | `lint` · `typecheck` · `test` |
| console | `lint` · `typecheck` |

E2E(Playwright)는 브라우저 설치가 필요해 CI 에 넣지 않았습니다. 로컬에서 `npm run test:e2e`.

---

## 10. 직접 해야 하는 일 (스크립트·에이전트가 못 함)

| 항목 | 이유 |
|------|------|
| OCI 계정, VM·블록 볼륨·예약 IP·보안 목록 | 계정 인증 |
| 도메인 구입, DNS A 레코드, Workers Custom Domain | 계정 인증 |
| `setup-postgres-d.ps1` 실행 (postgres 비밀번호 입력) | 슈퍼유저 비밀번호는 본인만 앎 |
| `/etc/vidshare/backend.env` 에 API 키 | 저장소·채팅에 남기지 않음 |
| `npm run create-admin` | 관리자 비밀번호를 소스에 두지 않음 |
| SSH 하드닝(키 전용, 루트 로그인 끔) | [security-notes 5-3](./security/security-notes.md) |

---

## 11. 언제 구조를 바꿔야 하나

| 신호 | 해야 할 일 |
|------|-----------|
| 업로드가 볼륨을 채운다 | Oracle Object Storage / R2 + 서명 URL. 지금은 삭제 경로가 없어(082) 쌓이기만 함 |
| 서버를 2대 이상으로 | SSE/WS 브로드캐스트에 **Redis pub/sub**, 세션은 이미 DB 라 공유됨 |
| 날짜·불리언으로 정렬·집계가 늘어난다 | `TEXT`→`timestamptz`, 0/1→`boolean` 마이그레이션 (096 은 타입 보존) |
| 관리자가 여럿이 된다 | 관리자 조치 **감사 로그** |
| 신고·유저가 수천 건 | 관리자 목록 API **페이지네이션** |

---

## 12. 관련 문서

- [plan.md](../plan.md) · [deploy/README.md](../deploy/README.md)
- [ops/oracle-setup.md](./ops/oracle-setup.md) · [ops/postgres-d-drive.md](./ops/postgres-d-drive.md) · [ops/backup-restore.md](./ops/backup-restore.md)
- [아키텍처](./architecture/overview.md) · [보안 노트](./security/security-notes.md) · [로드맵](./features/roadmap.md)
