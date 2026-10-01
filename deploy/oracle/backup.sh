#!/usr/bin/env bash
# 운영 DB 백업. cron(매일 03:00)과 deploy.sh 가 호출한다. /usr/local/bin/vidshare-backup 으로 설치된다.
#
# - pg_dump 커스텀 포맷(-Fc): pg_restore 로 부분 복원이 가능하고 압축된다.
# - 파일은 root:adm 640 → ubuntu(adm 그룹) 계정으로 내 PC 에서 scp 로 가져갈 수 있다
#   (deploy/windows/backup-pull.ps1).
# - 14일이 지난 백업은 지운다.
set -euo pipefail

DIR=/mnt/vidshare-data/backups
KEEP_DAYS=14
STAMP=$(date +%Y%m%d-%H%M)
OUT="$DIR/vidshare-$STAMP.dump"

mountpoint -q /mnt/vidshare-data || { echo "블록 볼륨이 마운트되어 있지 않습니다." >&2; exit 1; }

sudo -u postgres pg_dump -Fc vidshare > "$OUT.part"
mv "$OUT.part" "$OUT"
chown root:adm "$OUT"
chmod 640 "$OUT"
echo "$(date '+%F %T') 백업 $OUT ($(du -h "$OUT" | cut -f1))"

find "$DIR" -name 'vidshare-*.dump' -mtime +"$KEEP_DAYS" -print -delete
