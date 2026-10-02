#!/usr/bin/env bash
# 다른 서비스가 이미 nginx 로 80·443 을 쓰고 있는 VM 에 VidShare 백엔드를 "추가" 설치한다.
# (전용 VM 이면 setup-vm.sh 를 쓴다.) 여러 번 실행해도 안전하다.
#
#   sudo bash setup-shared-nginx.sh --cors <프론트 오리진들> [--host <호스트>] [--repo <url>]
#
#   --host   공개 호스트. 생략하면 <공인IP>.sslip.io
#   --cors   허용할 프론트 오리진(쉼표 구분). 필수
#
# 기존 서비스를 지키기 위해 하지 않는 것
#   - 시스템 Node 버전을 바꾸지 않는다(설치된 Node 20+ 를 그대로 쓴다)
#   - 기존 nginx 사이트 파일·iptables 규칙을 건드리지 않는다
#   - nginx 설정은 `nginx -t` 를 통과할 때만 reload 한다
#
# 메모리가 작은 VM(E2.1.Micro 1GB)을 전제로 Postgres·커넥션 풀을 작게 잡는다.
set -euo pipefail

HOST=""
CORS=""
REPO="https://github.com/samam0234/vidshare.git"
DATA=/mnt/vidshare-data
APP=/opt/vidshare
PG_VER=16

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) HOST="$2"; shift 2 ;;
    --cors) CORS="$2"; shift 2 ;;
    --repo) REPO="$2"; shift 2 ;;
    *) echo "알 수 없는 옵션: $1" >&2; exit 1 ;;
  esac
done
[[ $EUID -eq 0 ]] || { echo "sudo 로 실행하세요." >&2; exit 1; }
[[ -n "$CORS" ]] || { echo "--cors 가 필요합니다." >&2; exit 1; }
command -v nginx >/dev/null || { echo "nginx 가 없습니다. 전용 VM 이면 setup-vm.sh 를 쓰세요." >&2; exit 1; }
NODE_MAJOR=$(node -v 2>/dev/null | sed 's/^v\([0-9]*\).*/\1/' || echo 0)
[[ "${NODE_MAJOR:-0}" -ge 20 ]] || { echo "Node 20 이상이 필요합니다 (현재: $(node -v 2>/dev/null || echo 없음))." >&2; exit 1; }
if [[ -z "$HOST" ]]; then
  PUBLIC_IP=$(curl -fsS --max-time 10 https://api.ipify.org)
  HOST="${PUBLIC_IP//./-}.sslip.io"
fi
case "$HOST" in
  *.sslip.io|*.nip.io) COOKIE_SAMESITE=none; COOKIE_DOMAIN="" ;;
  *.*.*) COOKIE_SAMESITE=lax; COOKIE_DOMAIN=".${HOST#*.}" ;;
  *) echo "--host 는 api.example.com 처럼 서브도메인이어야 합니다." >&2; exit 1 ;;
esac
echo "호스트: $HOST · CORS: $CORS · 쿠키: SameSite=$COOKIE_SAMESITE · Node $(node -v)"

echo "== 1. PostgreSQL $PG_VER"
export DEBIAN_FRONTEND=noninteractive
PG_CANDIDATE=$(apt-cache policy "postgresql-$PG_VER" | awk '/Candidate:/ {print $2}')
if [[ -z "$PG_CANDIDATE" || "$PG_CANDIDATE" == "(none)" ]]; then
  apt-get install -y curl ca-certificates lsb-release
  install -d /usr/share/postgresql-common/pgdg
  curl -fsSo /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
    https://www.postgresql.org/media/keys/ACCC4CF8.asc
  echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list
  apt-get update -y
fi
apt-get install -y "postgresql-$PG_VER" git openssl
cat > "/etc/postgresql/$PG_VER/main/conf.d/vidshare.conf" <<'CONF'
# VidShare — 다른 서비스와 1GB RAM 을 나눠 쓰는 VM 용 저메모리 설정
listen_addresses = 'localhost'
shared_buffers = 64MB
effective_cache_size = 256MB
work_mem = 4MB
maintenance_work_mem = 32MB
max_connections = 20
timezone = 'Asia/Seoul'
log_timezone = 'Asia/Seoul'
CONF
systemctl enable postgresql
systemctl restart postgresql

echo "== 2. 계정 · 폴더 · 코드"
id vidshare >/dev/null 2>&1 || useradd --system --create-home --shell /bin/bash vidshare
install -d -m 755 "$DATA"
install -d -o vidshare -g vidshare -m 755 "$DATA/uploads" "$APP"
install -d -o root -g adm -m 750 "$DATA/backups"
install -d -o root -g vidshare -m 750 /etc/vidshare
[[ -d "$APP/.git" ]] || sudo -u vidshare git clone "$REPO" "$APP"
OR="$APP/deploy/oracle"

echo "== 3. DB 계정"
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
    echo "# /etc/vidshare/backend.env — setup-shared-nginx.sh 가 생성. 저장소에 커밋하지 않는다."
    echo "PORT=4000"
    echo "NODE_ENV=production"
    echo "DATABASE_URL=postgres://vidshare:$DBPASS@127.0.0.1:5432/vidshare"
    echo "DB_POOL_MAX=5"
    echo "UPLOADS_PATH=$DATA/uploads"
    echo "CORS_ORIGIN=$CORS"
    echo "COOKIE_DOMAIN=$COOKIE_DOMAIN"
    echo "COOKIE_SAMESITE=$COOKIE_SAMESITE"
    echo "TRUST_PROXY=1"
    echo "NODE_OPTIONS=--max-old-space-size=256"
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
echo "$HOST" > /etc/vidshare/api-host

echo "== 5. systemd · 백업 cron"
install -m 644 "$OR/vidshare-backend.service" /etc/systemd/system/vidshare-backend.service
sed -i "s|^ExecStart=.*|ExecStart=$(command -v node) dist/index.js|" /etc/systemd/system/vidshare-backend.service
install -m 755 "$OR/backup.sh" /usr/local/bin/vidshare-backup
echo "0 3 * * * root /usr/local/bin/vidshare-backup >> /var/log/vidshare-backup.log 2>&1" \
  > /etc/cron.d/vidshare-backup
systemctl daemon-reload
systemctl enable vidshare-backend

echo "== 6. nginx 사이트 추가"
SITE=/etc/nginx/sites-available/vidshare
if [[ ! -f "$SITE" ]]; then
  sed "s|__HOST__|$HOST|g" "$OR/nginx-vidshare.conf" > "$SITE"
fi
ln -sf "$SITE" /etc/nginx/sites-enabled/vidshare
if ! nginx -t; then
  rm -f /etc/nginx/sites-enabled/vidshare
  echo "nginx 설정 검사 실패 — VidShare 사이트를 빼고 기존 설정은 그대로 둡니다." >&2
  exit 1
fi
systemctl reload nginx

echo ""
echo "완료 — 다음:"
echo "  1) sudo bash $OR/deploy.sh                     (빌드 · 마이그레이션 · 시작)"
echo "  2) sudo certbot --nginx -d $HOST --redirect      (HTTPS 인증서)"
echo "  3) sudo nano $ENVF                              (챗봇 API 키, 선택)"
