#!/usr/bin/env bash
# Oracle Cloud VM (Ubuntu 24.04, ARM/AMD) 최초 설정. 한 번만 실행한다.
#
#   git clone https://github.com/samam0234/vidshare.git ~/vidshare
#   sudo bash ~/vidshare/deploy/oracle/setup-vm.sh --domain api.example.com --device /dev/sdb [--format]
#
#   --domain   백엔드 공개 도메인. 첫 라벨을 뗀 나머지(example.com)를 프론트·쿠키 도메인으로 쓴다.
#              DNS A 레코드가 먼저 이 VM 의 공인 IP 를 가리켜야 Caddy 가 인증서를 받는다.
#   --device   데이터용 블록 볼륨 장치 (lsblk 로 확인. 예: /dev/sdb, /dev/oracleoci/oraclevdb)
#   --format   장치에 파일시스템이 없을 때만 ext4 로 포맷한다. 이미 있으면 이 옵션이 있어도 포맷하지 않는다.
#   --repo     /opt/vidshare 에 클론할 저장소 (기본: https://github.com/samam0234/vidshare.git)
#
# 하는 일
#   1. 패키지: Node 24, PostgreSQL 16, Caddy, iptables-persistent
#   2. 블록 볼륨을 /mnt/vidshare-data 에 마운트 (fstab, UUID, nofail)
#   3. vidshare 시스템 계정, /opt/vidshare 에 코드 클론
#   4. Postgres 데이터 디렉터리를 /mnt/vidshare-data/pgdata 로 옮기고 앱 계정·DB 생성
#   5. /etc/vidshare/backend.env, Caddy, systemd, 백업 cron 설치
#   6. VM 방화벽(iptables)에서 80·443 허용 — Oracle 이미지는 기본으로 막혀 있다
set -euo pipefail

DOMAIN=""
DEVICE=""
FORMAT=0
REPO="https://github.com/samam0234/vidshare.git"
DATA=/mnt/vidshare-data
APP=/opt/vidshare
PG_VER=16

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="$2"; shift 2 ;;
    --device) DEVICE="$2"; shift 2 ;;
    --format) FORMAT=1; shift ;;
    --repo) REPO="$2"; shift 2 ;;
    *) echo "알 수 없는 옵션: $1" >&2; exit 1 ;;
  esac
done
[[ $EUID -eq 0 ]] || { echo "sudo 로 실행하세요." >&2; exit 1; }
[[ -n "$DOMAIN" && -n "$DEVICE" ]] || { echo "--domain 과 --device 가 필요합니다." >&2; exit 1; }
[[ "$DOMAIN" == *.*.* ]] || { echo "--domain 은 api.example.com 처럼 서브도메인이어야 합니다." >&2; exit 1; }
[[ -b "$DEVICE" ]] || { echo "블록 장치가 아닙니다: $DEVICE" >&2; exit 1; }
BASE="${DOMAIN#*.}"

echo "== 1. 패키지"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git ca-certificates gnupg debian-keyring debian-archive-keyring \
  apt-transport-https build-essential iptables-persistent "postgresql-$PG_VER"
if ! command -v node >/dev/null || [[ "$(node -v)" != v24* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi
if ! command -v caddy >/dev/null; then
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
    > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi
timedatectl set-timezone Asia/Seoul

echo "== 2. 블록 볼륨 → $DATA"
if ! blkid "$DEVICE" >/dev/null 2>&1; then
  if [[ $FORMAT -eq 1 ]]; then
    mkfs.ext4 -L vidshare-data "$DEVICE"
  else
    echo "$DEVICE 에 파일시스템이 없습니다. 새 볼륨이 맞다면 --format 을 붙여 다시 실행하세요." >&2
    exit 1
  fi
fi
UUID=$(blkid -s UUID -o value "$DEVICE")
mkdir -p "$DATA"
grep -q "$UUID" /etc/fstab || echo "UUID=$UUID $DATA ext4 defaults,nofail 0 2" >> /etc/fstab
mountpoint -q "$DATA" || mount "$DATA"
mountpoint -q "$DATA" || { echo "$DATA 마운트 실패" >&2; exit 1; }

echo "== 3. 계정 · 코드"
id vidshare >/dev/null 2>&1 || useradd --system --create-home --shell /bin/bash vidshare
install -d -o vidshare -g vidshare -m 755 "$DATA/uploads" "$APP"
install -d -o root -g adm -m 750 "$DATA/backups"
install -d -o root -g vidshare -m 750 /etc/vidshare
[[ -d "$APP/.git" ]] || sudo -u vidshare git clone "$REPO" "$APP"
OR="$APP/deploy/oracle"

echo "== 4. PostgreSQL → $DATA/pgdata"
PGCONF=/etc/postgresql/$PG_VER/main
systemctl stop postgresql
# 새 볼륨이면 기본 클러스터를 복사하고, 기존 볼륨(VM 재구축)이면 그 데이터를 그대로 쓴다.
if [[ ! -f "$DATA/pgdata/PG_VERSION" ]]; then
  install -d -o postgres -g postgres -m 700 "$DATA/pgdata"
  cp -a "/var/lib/postgresql/$PG_VER/main/." "$DATA/pgdata/"
fi
sed -i "s|^data_directory = .*|data_directory = '$DATA/pgdata'|" "$PGCONF/postgresql.conf"
install -m 644 "$OR/postgresql.vidshare.conf" "$PGCONF/conf.d/vidshare.conf"
# 볼륨이 붙기 전에 Postgres 가 뜨면 엉뚱한 디렉터리로 시작할 수 있다 → 마운트를 요구한다.
mkdir -p /etc/systemd/system/postgresql@.service.d
printf '[Unit]\nRequiresMountsFor=%s\n' "$DATA" \
  > /etc/systemd/system/postgresql@.service.d/vidshare-mount.conf
systemctl daemon-reload
systemctl enable postgresql
systemctl restart postgresql

read -r -s -p "vidshare DB 비밀번호 (새로 정함, 영문·숫자·_- 12자 이상): " DBPASS; echo
[[ "$DBPASS" =~ ^[A-Za-z0-9_-]{12,}$ ]] || { echo "영문·숫자·_- 로 12자 이상이어야 합니다." >&2; exit 1; }
sudo -u postgres psql -v ON_ERROR_STOP=1 -v app_password="$DBPASS" <<'SQL'
SELECT 'CREATE ROLE vidshare LOGIN' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vidshare')\gexec
ALTER ROLE vidshare WITH LOGIN PASSWORD :'app_password';
SELECT 'CREATE DATABASE vidshare OWNER vidshare ENCODING ''UTF8'' TEMPLATE template0'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'vidshare')\gexec
SQL

echo "== 5. 설정 파일"
ENVF=/etc/vidshare/backend.env
if [[ ! -f "$ENVF" ]]; then
  sed -e "s|CHANGE_ME_DB_PASSWORD|$DBPASS|" \
      -e "s|api\.example\.com|$DOMAIN|g" \
      -e "s|example\.com|$BASE|g" \
      "$OR/backend.env.example" > "$ENVF"
  chown vidshare:vidshare "$ENVF"
  chmod 600 "$ENVF"
  echo "  $ENVF 생성 (CORS_ORIGIN=https://app.$BASE,https://console.$BASE, COOKIE_DOMAIN=.$BASE)"
fi
unset DBPASS
sed "s|api\.example\.com|$DOMAIN|g" "$OR/Caddyfile" > /etc/caddy/Caddyfile
install -m 644 "$OR/vidshare-backend.service" /etc/systemd/system/vidshare-backend.service
install -m 755 "$OR/backup.sh" /usr/local/bin/vidshare-backup
echo "0 3 * * * root /usr/local/bin/vidshare-backup >> /var/log/vidshare-backup.log 2>&1" \
  > /etc/cron.d/vidshare-backup
systemctl daemon-reload
systemctl enable vidshare-backend
systemctl restart caddy

echo "== 6. 방화벽 (iptables 80/443)"
for port in 80 443; do
  if ! iptables -C INPUT -p tcp --dport "$port" -m state --state NEW -j ACCEPT 2>/dev/null; then
    # Oracle 이미지는 INPUT 끝에 REJECT 가 있다. 그 앞에 넣는다(위치는 이미지마다 다름).
    pos=$(iptables -L INPUT --line-numbers -n | awk '$2=="REJECT"{print $1; exit}')
    if [[ -n "$pos" ]]; then
      iptables -I INPUT "$pos" -p tcp --dport "$port" -m state --state NEW -j ACCEPT
    else
      iptables -A INPUT -p tcp --dport "$port" -m state --state NEW -j ACCEPT
    fi
  fi
done
netfilter-persistent save

echo ""
echo "완료. 다음 단계:"
echo "  1) sudo nano $ENVF  — GOOGLE_API_KEY / GROQ_API_KEY 입력"
echo "  2) 데이터 옮기기 (plan.md 10.4 의 7번: pg_restore, uploads 복사)"
echo "  3) sudo bash $APP/deploy/oracle/deploy.sh"
