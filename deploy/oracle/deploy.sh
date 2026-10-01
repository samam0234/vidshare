#!/usr/bin/env bash
# 반복 배포. VM 에서 실행한다.
#
#   sudo bash /opt/vidshare/deploy/oracle/deploy.sh [git ref]
#
# 순서: 백업 → pull → npm ci → build → db:migrate → 재시작 → health 확인
# 마이그레이션은 되돌리기 어렵기 때문에 항상 백업부터 한다.
set -euo pipefail

APP=/opt/vidshare
ENVF=/etc/vidshare/backend.env
REF="${1:-}"

[[ $EUID -eq 0 ]] || { echo "sudo 로 실행하세요." >&2; exit 1; }

as_app() { sudo -u vidshare -H bash -c "$1"; }

echo "== 백업"
/usr/local/bin/vidshare-backup

echo "== 코드"
as_app "cd $APP && git fetch --prune origin"
if [[ -n "$REF" ]]; then
  as_app "cd $APP && git checkout --quiet '$REF'"
else
  as_app "cd $APP && git checkout --quiet master && git pull --ff-only"
fi
echo "  $(as_app "cd $APP && git log -1 --oneline")"

echo "== 빌드"
# tsc · tsx 가 devDependencies 라 전체 설치한다.
as_app "cd $APP/BackendServer && npm ci --no-audit --no-fund && npm run build"

echo "== 마이그레이션"
as_app "set -a; . $ENVF; set +a; cd $APP/BackendServer && npm run -s db:migrate"

echo "== 재시작"
systemctl restart vidshare-backend

echo "== health"
for _ in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:4000/api/health >/dev/null; then
    curl -fsS http://127.0.0.1:4000/api/health; echo
    echo "배포 완료"
    exit 0
  fi
  sleep 1
done
echo "health 실패. 로그: journalctl -u vidshare-backend -n 100 --no-pager" >&2
exit 1
