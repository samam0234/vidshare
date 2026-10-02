# 102 — 운영 배포: 기존 Oracle VM 에 함께 설치

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `102` |
| **파일명** | `102-live-deploy-shared-vm.md` |
| **Git 커밋 (short)** | `TBD` |
| **Git 커밋 (full)** | `TBD` |
| **날짜** | `2026-10-02` |
| **작성자** | `Claude` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` — Added / Fixed |

---

## 1. 커밋 내용

```
feat(deploy): 기존 Oracle VM 에 VidShare 백엔드 운영 배포

새 인스턴스(168.110.23.222)가 이 PC 의 어떤 키도 받지 않아, 접속 가능한
human-bug-tier VM(161.33.190.199)에 사용자 승인을 받고 함께 설치했다.
setup-shared-nginx.sh 에 빌드 도구를 추가하고, backup-pull.ps1 이 ssh 실패를
명확히 알리게 고친다. 배포 결과를 README·deployment·plan 에 반영한다.

상세 기록: docs/commits/102-live-deploy-shared-vm.md
```

---

## 2. 경과

1. 사용자가 새 인스턴스(Ubuntu 22.04, `168.110.23.222`)의 공개키를 전달.
   이 PC 의 `Downloads\ssh-key-2026-10-02.key` 가 짝(지문 일치)이지만 서버가 `ubuntu`·`opc` 모두 거부.
   Git Bash ssh·Windows OpenSSH, PC 의 다른 키 3개, 디스크 전체 키 검색까지 해도 맞는 키 없음 → 인스턴스에 다른 키가 등록된 것으로 판단.
   OCI CLI·콘솔 권한이 없어 키를 등록할 수 없음.
2. `known_hosts` 에서 다른 Oracle VM(`161.33.190.199`, human-bug-tier)을 발견, `ssh-key-2026-09-27.key` 로 접속 가능.
   다른 프로젝트가 운영 중인 서버라 **사용자에게 확인 후** 함께 설치하기로 결정.
3. 기존 구성 조사(읽기 전용): nginx + certbot 이 80/443 사용, 시스템 Node 22(HBT 사용), RAM 1GB + 스왑 2GB, iptables 80/443 이미 허용.
   → Caddy 를 쓰는 `setup-vm.sh` 대신 nginx 사이트를 **추가**하는 `setup-shared-nginx.sh` 작성(커밋 `de353af`).

## 3. 실행 기록

| 단계 | 결과 |
|------|------|
| `setup-shared-nginx.sh` | Postgres 16(저메모리 설정), `vidshare` 계정·DB(비밀번호 서버 생성), 코드, `backend.env`, systemd, cron, nginx 사이트. `nginx -t` 통과 |
| human-bug-tier 확인 | `https://hbt-tier.duckdns.org/` 200 (설치 전후 모두) |
| `deploy.sh` 1차 | **실패** — `better-sqlite3` 가 Node 22 용 프리빌드가 없어 소스 빌드 시도, `make` 없음 → `build-essential python3` 설치, 스크립트에도 추가 |
| `deploy.sh` 2차 | 빌드 → 마이그레이션 0001 → 시작 → `/api/health` `"db":"ok"` |
| 데이터 이관 | 이 PC 의 `vidshare.sqlite`(+WAL) 를 서버로 복사해 `db:import-sqlite --replace` — 22개 테이블 151행 일치. 업로드 1개 이동. 임시 파일 삭제 |
| HTTPS | `certbot --nginx -d 161-33-190-199.sslip.io --redirect` — 인증서 발급, 자동 갱신 |
| 외부 확인 | health 200, HTTP→HTTPS 301, 업로드 200(nginx 직접), CORS preflight 204, 로그인 `Set-Cookie: …; Secure; SameSite=None` |
| 프론트·콘솔 | `.env.production`(git 제외)에 `NEXT_PUBLIC_API_URL` → `npm run deploy` 두 앱 |
| 브라우저 확인 | Playwright(Chromium)로 운영 사이트 로그인 → 새로고침 후 유지 → 커뮤니티 목록 → `/messages` 에서 `wss://…/ws/conversations` 연결, `/api/notifications/stream` 200 |
| 백업 | 서버 `vidshare-backup` → 이 PC `backup-pull.ps1` 로 `D:\vidshare-data\backups\prod` 에 108KB 덤프 + 업로드. 작업 스케줄러 매일 04:30 등록 |

## 4. 이 PC 에서 바꾼 것 (저장소 밖)

| 항목 | 내용 |
|------|------|
| `~/.ssh/config` | `vidshare-vm` → 161.33.190.199, `vidshare-vm-new` → 168.110.23.222 |
| `~/.ssh/vidshare_prod.key` | `D:\ssh\human-bug-tier\ssh-key-2026-09-27.key` 의 **복사본**. Windows OpenSSH 가 넓은 권한의 키를 거부해 이 복사본만 본인 계정 전용으로 제한(원본 권한은 그대로) |
| `~/.ssh/vidshare_oci` | 새 인스턴스용 키 복사본 |
| `FrontServer/.env.production`, `console/.env.production` | API 주소 (git 제외, 비밀값 아님) |
| 작업 스케줄러 | "VidShare 운영 백업 가져오기" 매일 04:30 |

## 5. 알려진 한계 · 후속

- **sslip.io 임시 구성**: 프론트와 API 가 다른 사이트라 `SameSite=None` 쿠키 — Safari 등 서드파티 쿠키 차단 브라우저에서는 로그인 불가 가능. 도메인을 붙이면 해결.
- **다른 프로젝트와 1GB RAM 공유**: 현재 VidShare node 약 85MB, 가용 426MB. 트래픽이 늘면 전용 VM 으로 이전.
- 운영 DB 에 공개 비밀번호의 데모 계정(`demo`)이 있다 — 포트폴리오 시연용으로 유지 중.
- 원본 데이터의 커뮤니티 글 #001·#002 제목이 `???` (8월 Windows 터미널 테스트 때 깨진 것, 이관 문제 아님).
- 포트폴리오(문서·사이트·슬라이드·Notion)는 아직 "구축 전"으로 적혀 있다 — 별도 갱신 필요.
