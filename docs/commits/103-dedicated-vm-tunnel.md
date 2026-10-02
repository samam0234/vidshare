# 103 — 전용 VM + Cloudflare Tunnel 로 이전, 공유 VM 에서 제거

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `103` |
| **파일명** | `103-dedicated-vm-tunnel.md` |
| **Git 커밋 (short)** | `TBD` |
| **Git 커밋 (full)** | `TBD` |
| **날짜** | `2026-10-02` |
| **작성자** | `Claude` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` — Changed / Added |

---

## 1. 커밋 내용

```
feat(deploy): 전용 VM + Cloudflare Tunnel 로 이전, 공유 VM 에서 제거

사용자가 "합치지 말라"고 해 102 의 human-bug-tier 공유 설치를 되돌리고,
새 전용 VM(161.33.186.255, ARM 11GB)에 setup-vm-tunnel.sh 로 설치했다.
이 VM 은 OCI 보안 목록에서 80·443 이 막혀 있어 Cloudflare 빠른 터널(아웃바운드)로
공개한다. 터널 주소가 바뀌면 sync-tunnel-url.ps1 이 매시간 감지해 프론트·콘솔을
자동 재배포한다.

상세 기록: docs/commits/103-dedicated-vm-tunnel.md
```

---

## 2. 경과

1. 사용자가 공유 설치(102)를 원치 않았음을 알림 → 전용 서버로 옮기고 공유 서버에서 제거하기로.
2. 사용자가 새 인스턴스 IP `161.33.186.255` 를 전달. 같은 키(`ssh-key-2026-10-02.key`)로 **접속 성공**
   (앞서 실패한 `168.110.23.222` 와는 다른 인스턴스).
3. 점검: Ubuntu 22.04 · **aarch64** · 2 OCPU / **11GB RAM** · 50GB, 블록 볼륨 없음, 아무것도 설치 안 됨.
   iptables 는 22 만 허용, **외부에서 80·443 이 OCI 보안 목록 레벨로 막힘**(22 만 연결 수락).
4. 80·443 은 서버 안에서 열 수 없다(OCI 콘솔 권한 필요). → Caddy/certbot 대신 **Cloudflare 빠른 터널**:
   `cloudflared` 가 바깥으로 연결해 `*.trycloudflare.com` HTTPS 주소를 받으므로 인바운드 포트가 필요 없다.

## 3. 실행 기록

| 단계 | 결과 |
|------|------|
| `setup-vm-tunnel.sh` (새 스크립트) | Node 24 · Postgres 16(PGDG) · 빌드 도구 · cloudflared(arm64) 설치, 계정·DB·`backend.env`, systemd(백엔드·터널)·cron |
| `deploy.sh` | 빌드 → 마이그레이션 0001 → 시작 → `"db":"ok"` |
| 터널 | `vidshare-tunnel.service` 기동, URL 확보. 외부 HTTPS·CORS·`SameSite=None; Secure` 쿠키 확인 |
| 데이터 | 운영 백업(`D:\vidshare-data\backups\prod\…0731.dump`)을 `pg_restore --clean` — users 12, posts 5, shorts 7, admin 2. 업로드 1개(터널로 200) |
| 프론트·콘솔 | `.env.production` 갱신 후 `npm run deploy` |
| 브라우저 확인 | Playwright: 로그인 → 새로고침 유지 → 커뮤니티 → `wss://…/ws/conversations`, SSE 200 |
| 공유 VM 제거 | 최종 백업을 D 드라이브에 받은 뒤 human-bug-tier VM 에서 VidShare 서비스·nginx 사이트·인증서·DB·Postgres 패키지·파일·계정 삭제. `nginx -t` 통과 후 reload, **human-bug-tier 200 확인**, 포트 원상복구 |
| 터널 주소 자동 동기화 | `sync-tunnel-url.ps1` 작성 → 터널을 실제로 재시작해 주소를 바꾼 뒤 감지·재배포·사이트 동작까지 검증 → 매시간 작업 등록 |

## 4. `sync-tunnel-url.ps1` 에서 잡은 결함 2개

| 결함 | 원인 | 처리 |
|------|------|------|
| 재배포 중 중단 | PowerShell 5.1 은 네이티브 명령 stderr(npm 의 `WARN OpenNext…`)를 `2>&1` 로 받으면 오류로 감싸고, `ErrorActionPreference=Stop` 이 중단시킨다 | `cmd /c "npm run deploy > log 2>&1"` 로 돌리고 종료 코드만 확인 |
| 실패 후 "변경 없음" 오판 | 비교 기준이 `.env.production` 이었는데, 첫 실행이 파일을 먼저 고친 뒤 배포에 실패 → 다음 실행이 같은 값이라 판단 | 비교 기준을 **두 앱 배포가 모두 성공한 뒤에만 쓰는** 상태 파일(`%LOCALAPPDATA%\vidshare\deployed-api-url`)로 변경 |

## 5. 이 PC 에서 바꾼 것 (저장소 밖)

| 항목 | 내용 |
|------|------|
| `~/.ssh/config` | `vidshare-vm` → 161.33.186.255(`~/.ssh/vidshare_oci`, 본인 계정 전용 권한), `hbt-vm` → 161.33.190.199 |
| 작업 스케줄러 | "VidShare 터널 주소 동기화"(매시간) 추가. "VidShare 운영 백업 가져오기"(04:30)는 `vidshare-vm` 을 따라 새 서버로 |
| `FrontServer/.env.production`, `console/.env.production` | 현재 터널 주소 (스크립트가 갱신) |

## 6. 알려진 한계

- **터널 주소가 고정이 아니다.** 바뀌면 최대 1시간 안에 자동 재배포되지만, 그 사이(그리고 재배포 1~2분 동안)는 프론트가 옛 주소를 본다.
  이 PC 가 꺼져 있으면 자동 재배포가 안 된다. 고정하려면 도메인 + Cloudflare named tunnel(계정 로그인 필요).
- 쿠키가 `SameSite=None` 이라 Safari 등 서드파티 쿠키 차단 브라우저에서는 로그인 불가할 수 있다.
- 블록 볼륨이 없어 데이터가 부트 디스크에 있다. 매일 D 드라이브로 백업을 가져온다.
- 처음 키가 거부된 인스턴스 `168.110.23.222` 는 쓰지 않는다(SSH 별칭에서도 제거). 필요 없으면 OCI 에서 종료하면 된다.
