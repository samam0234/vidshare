# deploy/

백엔드를 **Oracle Cloud VM** 에 올리고, 데이터를 **D 드라이브**에 두고 백업하기 위한 스크립트입니다.
왜 이렇게 나눴는지는 [plan.md](../plan.md) 7·9·10장, 절차의 자세한 설명은 [docs/deployment.md](../docs/deployment.md) 를 보세요.

```
deploy/
├── oracle/                         VM(Ubuntu 24.04)에서 쓰는 파일
│   ├── setup-vm.sh                 최초 1회 (전용 VM): 패키지·볼륨 마운트·Postgres 이전·Caddy·systemd·방화벽
│   ├── setup-shared-nginx.sh       최초 1회 (nginx 가 이미 있는 VM 에 추가): Postgres·사이트 파일·systemd
│   ├── nginx-vidshare.conf         위 스크립트가 설치하는 nginx 사이트 (certbot 이 HTTPS 덧붙임)
│   ├── setup-vm-tunnel.sh          최초 1회 (전용 VM, 80·443 막힘): Cloudflare 터널로 공개 ← 현재 운영
│   ├── get-tunnel-url.sh           현재 터널 URL 출력 (/usr/local/bin/vidshare-tunnel-url)
│   ├── deploy.sh                   반복 배포: 백업 → pull → build → db:migrate → 재시작 → health
│   ├── backup.sh                   pg_dump 야간 백업 (/usr/local/bin/vidshare-backup 으로 설치)
│   ├── Caddyfile                   api 도메인 HTTPS + /uploads 직접 서빙 + reverse_proxy :4000
│   ├── vidshare-backend.service    systemd 유닛 (블록 볼륨 마운트 필수)
│   ├── postgresql.vidshare.conf    conf.d 드롭인 (localhost 전용, 메모리 설정)
│   └── backend.env.example         /etc/vidshare/backend.env 견본
└── windows/                        내 PC 에서 쓰는 파일 (PowerShell 5.1)
    ├── setup-postgres-d.ps1        D 드라이브 Postgres 에 vidshare 계정·DB, D:\vidshare-data 폴더
    ├── backup-local.ps1            로컬 DB pg_dump → D:\vidshare-data\backups\local (-Register 로 매일)
    ├── backup-pull.ps1             운영 백업·업로드 → D:\vidshare-data\backups\prod (-Register 로 매일)
    ├── admin-tools.ps1             운영 서버 관리자 찾기(-List) · 비밀번호 재설정(-Reset <handle>)
    └── sync-tunnel-url.ps1         터널 주소가 바뀌면 프론트·콘솔 재배포 (-Register 로 매시간)
```

## 순서 요약

### 내 PC (최초 1회)

```powershell
powershell -ExecutionPolicy Bypass -File deploy\windows\setup-postgres-d.ps1
# 안내대로 BackendServer\.env 에 DATABASE_URL / DATABASE_URL_TEST / UPLOADS_PATH 입력
cd BackendServer
npm install
npm run db:import-sqlite        # 예전 SQLite 데이터가 있으면
npm test                        # Postgres 위에서 전체 테스트
npm run dev
```

### Oracle VM (최초 1회)

```bash
git clone https://github.com/samam0234/vidshare.git ~/vidshare
sudo bash ~/vidshare/deploy/oracle/setup-vm.sh --domain api.example.com --device /dev/sdb --format
sudo nano /etc/vidshare/backend.env          # API 키
# 로컬 데이터 옮기기: docs/deployment.md 5장
sudo bash /opt/vidshare/deploy/oracle/deploy.sh
```

도메인이 아직 없거나 블록 볼륨을 붙이지 않았다면:

```bash
# 도메인 없이 <공인IP>.sslip.io 로 HTTPS (프론트는 *.workers.dev 그대로)
sudo bash ~/vidshare/deploy/oracle/setup-vm.sh --no-volume \
  --cors https://vidshare-front.limjinheng0120.workers.dev,https://vidshare-console.limjinheng0120.workers.dev
```

> sslip.io 모드는 프론트와 API 가 다른 사이트라 쿠키를 `SameSite=None` 으로 보낸다.
> Chrome 에서는 로그인이 되지만, 서드파티 쿠키를 막는 Safari 등에서는 안 될 수 있다 — 도메인을 마련하면 `--domain` 으로 다시 실행.

### 이후 배포

```bash
sudo bash /opt/vidshare/deploy/oracle/deploy.sh          # master 최신
sudo bash /opt/vidshare/deploy/oracle/deploy.sh <커밋>    # 특정 버전(롤백)
```
