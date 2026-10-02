#!/usr/bin/env bash
# 전용 VM 에 VidShare 백엔드를 깔고 Cloudflare Tunnel 로 내보낸다.
# 80·443 인바운드가 막혀 있어도(아웃바운드 터널) HTTPS 로 서비스된다.
# 여러 번 실행해도 안전하다.
#
#   sudo bash setup-vm-tunnel.sh --cors <프론트 오리진들> [--repo <url>]
#
#   --cors   허용할 프론트 오리진(쉼표 구분). 필수. 예: https://app.workers.dev,https://console.workers.dev
#
# Caddy/nginx 를 쓰지 않는다. cloudflared 가 localhost:4000 을 Cloudflare 로 터널링하고,
# 공개 URL(*.trycloudflare.com)은 systemd 로그에서 읽는다(get-tunnel-url.sh).
set -euo pipefail

CORS=""
REPO="https://github.com/samam0234/vidshare.git"
DATA=/mnt/vidshare-data
APP=/opt/vidshare
PG_VER=16

while [[ $# -gt 0 ]]; do
  case "$1" in
    --cors) CORS="$2"; shift 2 ;;
    --repo) REPO="$2"; shift 2 ;;
    *) echo "알 수 없는 옵션: $1" >&2; exit 1 ;;
  esac
done
[[ $EUID -eq 0 ]] || { echo "sudo 로 실행하세요." >&2; exit 1; }
[[ -n "$CORS" ]] || { echo "--cors 가 필요합니다." >&2; exit 1; }

ARCH=$(dpkg --print-architecture)   # arm64 또는 amd64

echo "== 1. 패키지"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git ca-certificates gnupg lsb-release build-essential python3 openssl
# PostgreSQL 16 (22.04 는 PGDG 저장소가 필요)
PG_CAND=$(apt-cache policy "postgresql-$PG_VER" | awk '/Candidate:/ {print $2}')
if [[ -z "$PG_CAND" || "$PG_CAND" == "(none)" ]]; then
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
if ! command -v cloudflared >/dev/null; then
  curl -fsSL -o /tmp/cloudflared.deb \
    "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${ARCH}.deb"
  dpkg -i /tmp/cloudflared.deb
  rm -f /tmp/cloudflared.deb
fi
timedatectl set-timezone Asia/Seoul

echo "== 2. 계정 · 폴더 · 코드"
id vidshare >/dev/null 2>&1 || useradd --system --create-home --shell /bin/bash vidshare
install -d -m 755 "$DATA"
install -d -o vidshare -g vidshare -m 755 "$DATA/uploads" "$APP"
install -d -o root -g adm -m 750 "$DATA/backups"
install -d -o root -g vidshare -m 750 /etc/vidshare
[[ -d "$APP/.git" ]] || sudo -u vidshare git clone "$REPO" "$APP"
OR="$APP/deploy/oracle"

echo "== 3. PostgreSQL (기본 데이터 디렉터리)"
systemctl enable postgresql
systemctl start postgresql
ENVF=/etc/vidshare/backend.env
if [[ -f "$ENVF" ]]; then
  DBPASS=$(sed -n 's|^DATABASE_URL=postgres://vidshare:\([^@]*\)@.*|\1|p' "$ENVF")
else
  DBPASS=$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c 32)
fi
sudo -u postgres psql -q -v ON_ERROR_STOP=1 -v app_password="$DBPASS" <<'SQL'
SELECT 'CREATE ROLE vidshare LOGIN' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vidshare')\gexec
ALTER ROLE vidshare WITH LOGIN PASSWORD :'app_password';
SELECT 'CREATE DATABASE vidshare OWNER vidshare ENCODING ''UTF8'' TEMPLATE template0'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'vidshare')\gexec
SQL

echo "== 4. backend.env"
if [[ ! -f "$ENVF" ]]; then
  {
    echo "# /etc/vidshare/backend.env — setup-vm-tunnel.sh 가 생성. 저장소에 커밋하지 않는다."
    echo "PORT=4000"
    echo "NODE_ENV=production"
    echo "DATABASE_URL=postgres://vidshare:$DBPASS@127.0.0.1:5432/vidshare"
    echo "DB_POOL_MAX=10"
    echo "UPLOADS_PATH=$DATA/uploads"
    echo "CORS_ORIGIN=$CORS"
    echo "COOKIE_DOMAIN="
    # 프론트(*.workers.dev)와 API(*.trycloudflare.com)가 다른 사이트 → None 필수
    echo "COOKIE_SAMESITE=none"
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
fi
unset DBPASS

echo "== 5. systemd (백엔드 + cloudflared) · 백업 cron"
install -m 644 "$OR/vidshare-backend.service" /etc/systemd/system/vidshare-backend.service
sed -i "s|^ExecStart=.*|ExecStart=$(command -v node) dist/index.js|" /etc/systemd/system/vidshare-backend.service
# 블록 볼륨이 없으므로 마운트 요구 제거
sed -i '/RequiresMountsFor=/d' /etc/systemd/system/vidshare-backend.service

cat > /etc/systemd/system/vidshare-tunnel.service <<'UNIT'
[Unit]
Description=Cloudflare Tunnel for VidShare backend (:4000)
After=network-online.target vidshare-backend.service
Wants=network-online.target

[Service]
# trycloudflare 빠른 터널: 계정·인증 없이 HTTPS URL 을 받는다. URL 은 로그에 찍힌다.
ExecStart=/usr/bin/cloudflared tunnel --no-autoupdate --url http://127.0.0.1:4000
Restart=always
RestartSec=5
User=vidshare

[Install]
WantedBy=multi-user.target
UNIT

install -m 755 "$OR/backup.sh" /usr/local/bin/vidshare-backup
echo "0 3 * * * root /usr/local/bin/vidshare-backup >> /var/log/vidshare-backup.log 2>&1" \
  > /etc/cron.d/vidshare-backup
install -m 755 "$OR/get-tunnel-url.sh" /usr/local/bin/vidshare-tunnel-url
systemctl daemon-reload
systemctl enable vidshare-backend vidshare-tunnel

echo ""
echo "완료. 다음:"
echo "  1) sudo bash $OR/deploy.sh           (빌드 · 마이그레이션 · 백엔드 시작)"
echo "  2) sudo systemctl restart vidshare-tunnel && sleep 8 && vidshare-tunnel-url"
echo "     → 출력된 https://xxxx.trycloudflare.com 을 프론트 NEXT_PUBLIC_API_URL 로"
