#!/usr/bin/env bash
# Oracle Cloud VM (Ubuntu 22.04 / 24.04, ARM/AMD) 최초 설정. 여러 번 실행해도 안전하다.
#
#   git clone https://github.com/samam0234/vidshare.git ~/vidshare
#   sudo bash ~/vidshare/deploy/oracle/setup-vm.sh [옵션]
#
# 옵션
#   --domain <host>    백엔드 공개 호스트. 생략하면 <공인IP>.sslip.io (도메인 없이 HTTPS 인증서 발급)
#   --device <dev>     데이터용 블록 볼륨 (lsblk 로 확인. 예: /dev/sdb)
#   --no-volume        블록 볼륨 없이 부트 디스크의 /mnt/vidshare-data 폴더를 쓴다
#   --format           --device 에 파일시스템이 없을 때만 ext4 로 포맷. 이미 있으면 포맷하지 않는다
#   --cors <origins>   허용할 프론트 오리진(쉼표 구분). 도메인 모드 기본값 https://app.<base>,https://console.<base>
#   --repo <url>       /opt/vidshare 에 클론할 저장소 (기본: https://github.com/samam0234/vidshare.git)
#
# 쿠키 방식은 호스트로 정한다.
#   - 실제 도메인(api.example.com)  → SameSite=Lax, COOKIE_DOMAIN=.example.com (권장)
#   - *.sslip.io / *.nip.io           → SameSite=None (프론트 *.workers.dev 와 다른 사이트라서).
#     Safari 등 서드파티 쿠키를 막는 브라우저에서는 로그인이 안 될 수 있다 — 임시용.
#
# DB 비밀번호: 터미널이면 묻고, 아니면(원격 자동 실행) 서버 안에서 무작위로 만들어 backend.env 에만 둔다.
set -euo pipefail

DOMAIN=""
DEVICE=""
NO_VOLUME=0
FORMAT=0
CORS=""
REPO="https://github.com/samam0234/vidshare.git"
DATA=/mnt/vidshare-data
APP=/opt/vidshare
PG_VER=16

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="$2"; shift 2 ;;
    --device) DEVICE="$2"; shift 2 ;;
    --no-volume) NO_VOLUME=1; shift ;;
    --format) FORMAT=1; shift ;;
    --cors) CORS="$2"; shift 2 ;;
    --repo) REPO="$2"; shift 2 ;;
    *) echo "알 수 없는 옵션: $1" >&2; exit 1 ;;
  esac
done
[[ $EUID -eq 0 ]] || { echo "sudo 로 실행하세요." >&2; exit 1; }
if [[ $NO_VOLUME -eq 0 ]]; then
  [[ -n "$DEVICE" ]] || { echo "--device <장치> 또는 --no-volume 중 하나가 필요합니다." >&2; exit 1; }
  [[ -b "$DEVICE" ]] || { echo "블록 장치가 아닙니다: $DEVICE" >&2; exit 1; }
fi

if [[ -z "$DOMAIN" ]]; then
  PUBLIC_IP=$(curl -fsS --max-time 10 https://api.ipify.org)
  DOMAIN="${PUBLIC_IP//./-}.sslip.io"
fi
case "$DOMAIN" in
  *.sslip.io|*.nip.io)
    COOKIE_SAMESITE=none
    COOKIE_DOMAIN=""
    [[ -n "$CORS" ]] || { echo "sslip.io/nip.io 모드에서는 --cors 로 프론트 주소를 지정하세요." >&2; exit 1; }
    ;;
  *.*.*)
    BASE="${DOMAIN#*.}"
    COOKIE_SAMESITE=lax
    COOKIE_DOMAIN=".$BASE"
    [[ -n "$CORS" ]] || CORS="https://app.$BASE,https://console.$BASE"
    ;;
  *) echo "--domain 은 api.example.com 처럼 서브도메인이어야 합니다." >&2; exit 1 ;;
esac
echo "호스트: $DOMAIN  ·  CORS: $CORS  ·  쿠키: SameSite=$COOKIE_SAMESITE ${COOKIE_DOMAIN:+(domain $COOKIE_DOMAIN)}"

echo "== 1. 패키지"
export DEBIAN_FRONTEND=noninteractive
echo iptables-persistent iptables-persistent/autosave_v4 boolean true | debconf-set-selections
echo iptables-persistent iptables-persistent/autosave_v6 boolean true | debconf-set-selections
apt-get update -y
apt-get install -y curl git ca-certificates gnupg lsb-release debian-keyring debian-archive-keyring \
  apt-transport-https build-essential iptables-persistent openssl
# Ubuntu 22.04 기본 저장소에는 PostgreSQL 16 이 없다 → PostgreSQL 공식 저장소(PGDG)를 붙인다.
PG_CANDIDATE=$(apt-cache policy "postgresql-$PG_VER" | awk '/Candidate:/ {print $2}')
if [[ -z "$PG_CANDIDATE" || "$PG_CANDIDATE" == "(none)" ]]; then
  install -d /usr/share/postgresql-common/pgdg
  curl -fsSo /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
    https://www.postgresql.org/media/keys/ACCC4CF8.asc
  echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list
  apt-get update -y
fi
apt-get install -y "postgresql-$PG_VER"
if ! command -v node >/dev/null || [[ "$(node -v)" != v24* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi
if ! command -v caddy >/dev/null; then
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
    | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
    > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi
timedatectl set-timezone Asia/Seoul

# RAM 이 작은 인스턴스(E2.1.Micro 1GB)는 npm ci·tsc 빌드 중 메모리가 모자란다.
MEM_KB=$(awk '/MemTotal/ {print $2}' /proc/meminfo)
SWAP_LINES=$(swapon --show --noheadings | wc -l)
if [[ "$MEM_KB" -lt 2000000 && "$SWAP_LINES" -eq 0 && ! -e /swapfile ]]; then
  echo "== RAM $((MEM_KB / 1024))MB — 2GB 스왑 파일 생성"
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "== 2. 데이터 위치 → $DATA"
mkdir -p "$DATA"
if [[ $NO_VOLUME -eq 0 ]]; then
  if ! blkid "$DEVICE" >/dev/null 2>&1; then
    if [[ $FORMAT -eq 1 ]]; then
      mkfs.ext4 -L vidshare-data "$DEVICE"
    else
      echo "$DEVICE 에 파일시스템이 없습니다. 새 볼륨이 맞다면 --format 을 붙여 다시 실행하세요." >&2
      exit 1
    fi
  fi
  UUID=$(blkid -s UUID -o value "$DEVICE")
  grep -q "$UUID" /etc/fstab || echo "UUID=$UUID $DATA ext4 defaults,nofail 0 2" >> /etc/fstab
  mountpoint -q "$DATA" || mount "$DATA"
  mountpoint -q "$DATA" || { echo "$DATA 마운트 실패" >&2; exit 1; }
else
  echo "  블록 볼륨 없이 부트 디스크를 씁니다. VM 을 지우면 데이터도 사라지니 백업 가져오기를 꼭 켜 두세요."
fi

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
# 새 데이터 위치면 기본 클러스터를 복사하고, 이미 있으면(VM 재구축·재실행) 그대로 쓴다.
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

ENVF=/etc/vidshare/backend.env
if [[ -f "$ENVF" ]]; then
  # 재실행: 기존 비밀번호를 그대로 쓴다.
  DBPASS=$(sed -n 's|^DATABASE_URL=postgres://vidshare:\([^@]*\)@.*|\1|p' "$ENVF")
elif [[ -t 0 ]]; then
  read -r -s -p "vidshare DB 비밀번호 (새로 정함, 영문·숫자·_- 12자 이상): " DBPASS; echo
else
  DBPASS=$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c 32)
  echo "  DB 비밀번호를 서버에서 무작위로 만들었습니다 ($ENVF 에만 저장)."
fi
[[ "$DBPASS" =~ ^[A-Za-z0-9_-]{12,}$ ]] || { echo "DB 비밀번호는 영문·숫자·_- 로 12자 이상이어야 합니다." >&2; exit 1; }
sudo -u postgres psql -q -v ON_ERROR_STOP=1 -v app_password="$DBPASS" <<'SQL'
SELECT 'CREATE ROLE vidshare LOGIN' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vidshare')\gexec
ALTER ROLE vidshare WITH LOGIN PASSWORD :'app_password';
SELECT 'CREATE DATABASE vidshare OWNER vidshare ENCODING ''UTF8'' TEMPLATE template0'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'vidshare')\gexec
SQL

echo "== 5. 설정 파일"
if [[ ! -f "$ENVF" ]]; then
  {
    echo "# /etc/vidshare/backend.env — setup-vm.sh 가 생성. 저장소에 커밋하지 않는다."
    echo "PORT=4000"
    echo "NODE_ENV=production"
    echo "DATABASE_URL=postgres://vidshare:$DBPASS@127.0.0.1:5432/vidshare"
    echo "DB_POOL_MAX=10"
    echo "UPLOADS_PATH=$DATA/uploads"
    echo "CORS_ORIGIN=$CORS"
    echo "COOKIE_DOMAIN=$COOKIE_DOMAIN"
    echo "COOKIE_SAMESITE=$COOKIE_SAMESITE"
    echo "TRUST_PROXY=1"
    echo "GOOGLE_API_KEY="
    echo "GROQ_API_KEY="
    echo "CHAT_MODEL_LOCALS=gemini-3.1-flash-lite"
    echo "CHAT_MODEL_VIDE=gemini-3.6-flash"
    echo "CHAT_MODEL_SHAPE=openai/gpt-oss-120b"
    echo "CHAT_TIMEOUT_MS=45000"
  } > "$ENVF"
  chown vidshare:vidshare "$ENVF"
  chmod 600 "$ENVF"
  echo "  $ENVF 생성"
fi
unset DBPASS
echo "$DOMAIN" > /etc/vidshare/api-host
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
echo "완료 — API 호스트: https://$DOMAIN"
echo "다음 단계:"
echo "  1) sudo nano $ENVF  — GOOGLE_API_KEY / GROQ_API_KEY (챗봇을 쓸 때만)"
echo "  2) sudo bash $APP/deploy/oracle/deploy.sh"
echo "  3) OCI 보안 목록에서 TCP 80·443 인바운드가 열려 있어야 인증서가 발급된다"
