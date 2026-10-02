#!/usr/bin/env bash
# cloudflared 빠른 터널(vidshare-tunnel.service)의 현재 공개 URL 을 로그에서 뽑는다.
# trycloudflare URL 은 서비스가 재시작될 때마다 바뀐다.
set -euo pipefail
url=$(journalctl -u vidshare-tunnel --no-pager -o cat 2>/dev/null \
  | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)
[[ -n "$url" ]] || { echo "아직 터널 URL 이 없습니다. systemctl status vidshare-tunnel 을 확인하세요." >&2; exit 1; }
echo "$url"
