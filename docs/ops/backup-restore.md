# 백업 · 복원

> 복원해 본 적 없는 백업은 백업이 아니다. 분기에 한 번은 4장을 실제로 해 본다.

---

## 1. 무엇이 어디에 쌓이나

| 백업 | 만드는 것 | 위치 | 보관 |
|------|-----------|------|------|
| 운영 DB | VM cron 03:00 `/usr/local/bin/vidshare-backup` · `deploy.sh` 시작 시 | VM `/mnt/vidshare-data/backups/vidshare-YYYYMMDD-HHMM.dump` | 14일 |
| 운영 DB 사본 | 내 PC `backup-pull.ps1` (04:30) | `D:\vidshare-data\backups\prod\db\` | 30일 |
| 운영 업로드 사본 | 내 PC `backup-pull.ps1` | `D:\vidshare-data\backups\prod\uploads\` | 최신본 |
| 로컬 DB | 내 PC `backup-local.ps1` (03:30) | `D:\vidshare-data\backups\local\` | 14일 |
| SQLite 원본 | `setup-postgres-d.ps1` (1회) | `D:\vidshare-data\backups\sqlite-final\` | 영구 |

덤프는 모두 `pg_dump -Fc`(커스텀 포맷): 압축되고, `pg_restore` 로 테이블 단위 복원이 됩니다.

## 2. 자동 실행 등록

```powershell
# 내 PC — 작업 스케줄러
powershell -ExecutionPolicy Bypass -File deploy\windows\backup-local.ps1 -Register
powershell -ExecutionPolicy Bypass -File deploy\windows\backup-pull.ps1 -SshHost vidshare-vm -Register
```

VM 쪽 cron(`/etc/cron.d/vidshare-backup`)은 `setup-vm.sh` 가 이미 등록합니다.
로그: `/var/log/vidshare-backup.log`

## 3. 수동 백업

```bash
sudo /usr/local/bin/vidshare-backup                          # VM
```

```powershell
powershell -ExecutionPolicy Bypass -File deploy\windows\backup-local.ps1   # 내 PC
```

## 4. 복원 연습 (분기 1회)

운영 DB 를 건드리지 않고, **빈 DB 에 복원해서 행 수를 비교**합니다. 내 PC 에서:

```powershell
$env:Path += ";D:\PostgreSQL\16\bin"
$dump = (Get-ChildItem D:\vidshare-data\backups\prod\db\*.dump | Sort-Object LastWriteTime | Select-Object -Last 1).FullName

psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS vidshare_restore"
psql -h localhost -U postgres -c "CREATE DATABASE vidshare_restore OWNER vidshare TEMPLATE template0"
pg_restore -h localhost -U vidshare -d vidshare_restore --no-owner $dump

psql -h localhost -U vidshare -d vidshare_restore -c "select (select count(*) from users) users, (select count(*) from shorts) shorts, (select max(version) from schema_migrations) migration"
```

통과 기준: 오류 없이 끝나고, 숫자가 운영 대시보드(콘솔)와 맞는다. 끝나면 `vidshare_restore` 를 지운다.

> 2026-10-02 에 로컬 이관 DB 로 같은 절차(덤프 → 빈 DB 복원 → 행 수 비교)를 해 보고 일치를 확인했다(097).

## 5. 실제 장애 복구

### 운영 DB 를 직전 백업으로 되돌리기

```bash
sudo systemctl stop vidshare-backend
sudo /usr/local/bin/vidshare-backup                         # 지금 상태도 남겨 둔다
sudo -u postgres pg_restore -d vidshare --clean --if-exists --no-owner --role=vidshare \
  /mnt/vidshare-data/backups/vidshare-<날짜>.dump
sudo systemctl start vidshare-backend
curl -fsS http://127.0.0.1:4000/api/health
```

코드도 그 시점으로 돌려야 하면 `sudo bash /opt/vidshare/deploy/oracle/deploy.sh <커밋>`.

### VM 을 통째로 잃었을 때

> **현재 운영(103)은 블록 볼륨이 없다.** DB(`/var/lib/postgresql/16/main`) · 업로드 · 서버 쪽 백업이 모두 부트 디스크에 있어,
> VM 을 잃으면 서버 백업도 함께 잃는다. 이때는 **내 PC 의 `D:\vidshare-data\backups\prod\` 가 유일한 원본**이다.

1. [oracle-setup.md](./oracle-setup.md) 0장(터널) 으로 새 VM — 터널 주소는 새로 받으며, `sync-tunnel-url.ps1` 이 프론트·콘솔을 따라 바꾼다
2. (Caddy 구성이고) 블록 볼륨이 살아 있으면 새 VM 에 붙이고 `setup-vm.sh` 를 **`--format` 없이** 실행
3. 그 밖의 경우 내 PC 의 `D:\vidshare-data\backups\prod\` 로 [deployment.md 5장](../deployment.md) 과 같은 방법으로 복원
