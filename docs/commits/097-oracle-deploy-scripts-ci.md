# 097 — Oracle Cloud · D 드라이브 배포/백업 스크립트 + CI

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `097` |
| **파일명** | `097-oracle-deploy-scripts-ci.md` |
| **Git 커밋 (short)** | `TBD` |
| **Git 커밋 (full)** | `TBD` |
| **날짜** | `2026-10-02` |
| **작성자** | `Claude` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` — Added / Removed |

---

## 1. 커밋 내용

```
feat(deploy): Oracle Cloud VM·D 드라이브 배포/백업 스크립트와 CI 추가

deploy/oracle 에 VM 최초 설정(setup-vm.sh), 반복 배포(deploy.sh), 야간 백업,
Caddyfile, systemd 유닛을 두고, deploy/windows 에 D 드라이브 Postgres 계정·폴더
준비와 로컬/운영 백업 스크립트를 둔다. GitHub Actions 로 세 앱을 검증한다
(백엔드는 Postgres 16 서비스 컨테이너). Cloudflare Tunnel 템플릿은 제거한다.

상세 기록: docs/commits/097-oracle-deploy-scripts-ci.md
```

---

## 2. 개요

### 배경

096 으로 백엔드가 Postgres 위에서 돈다. plan.md 10장의 Oracle VM 구성과 9장의 D 드라이브 백업을
손으로 따라 하지 않아도 되도록 스크립트로 만든다. 계정이 필요한 작업(OCI 리소스, 도메인)은 스크립트 밖이다.

### 범위 밖

- 실제 OCI 리소스 생성·VM 구축 — 사용자 계정 필요
- Workers Custom Domain(`wrangler.jsonc`) — 도메인이 정해진 뒤

---

## 3. 변경 파일

| 경로 | 변경 | 설명 |
|------|------|------|
| `deploy/oracle/setup-vm.sh` | 추가 | Node 24·Postgres 16·Caddy, 블록 볼륨 마운트, Postgres 데이터 이전, `vidshare` 계정·DB, env·Caddy·systemd·cron, iptables |
| `deploy/oracle/deploy.sh` | 추가 | 백업 → pull/checkout → `npm ci` → build → `db:migrate` → restart → health |
| `deploy/oracle/backup.sh` | 추가 | `pg_dump -Fc`, `root:adm 640`, 14일 보관 |
| `deploy/oracle/Caddyfile` | 추가 | HTTPS, `/uploads/*` 직접 서빙, `reverse_proxy :4000` + `flush_interval -1` |
| `deploy/oracle/vidshare-backend.service` | 추가 | `RequiresMountsFor`, `ProtectSystem=full`, `Restart=always` |
| `deploy/oracle/postgresql.vidshare.conf` | 추가 | conf.d — `listen_addresses='localhost'`, 메모리 |
| `deploy/oracle/backend.env.example` | 추가 | `/etc/vidshare/backend.env` 견본 |
| `deploy/windows/setup-postgres-d.ps1` | 추가 | 기존 `D:\PostgreSQL\16` 클러스터에 계정·DB, `D:\vidshare-data`, SQLite 원본 보관 |
| `deploy/windows/backup-local.ps1` | 추가 | 로컬 `pg_dump`, `-Register` 로 작업 스케줄러 |
| `deploy/windows/backup-pull.ps1` | 추가 | 운영 최신 덤프·업로드를 `scp` 로 가져옴 |
| `deploy/README.md` | 추가 | 순서 요약 |
| `.github/workflows/ci.yml` | 추가 | backend(Postgres 16)·front·console |
| `.gitattributes` | 추가 | `*.sh`·`deploy/oracle/*` LF, `*.ps1` CRLF |
| `.gitignore` | 수정 | `*.tsbuildinfo`, `*.dump`, `backend.env`, `cloudflare/` |
| `cloudflare/config.template.yml` | 삭제 | Tunnel → Oracle VM + Caddy |
| `console/tsconfig.tsbuildinfo` | 추적 해제 | 빌드 캐시 |

---

## 4. 결정과 트레이드오프

### 새 클러스터 대신 기존 클러스터

v2 초안은 `D:\vidshare-data\pgdata` 에 `initdb` 하는 안이었다. 확인해 보니 서비스 `postgresql-x64-16` 의
데이터 디렉터리가 이미 `D:\PostgreSQL\16\data` 라, 두 번째 클러스터·서비스를 만들 이유가 없다.
스크립트는 그 클러스터에 `vidshare` 계정과 `vidshare` · `vidshare_test` DB 만 추가한다(여러 번 실행해도 안전).

### Node 24

계획서 초안의 Node 20 은 2026-04 에 지원이 끝났다. 로컬(v24)·VM·CI 를 Node 24 LTS 로 맞췄다.

### Nginx 대신 Caddy

인증서 발급·갱신이 자동이고 설정이 짧다. SSE 가 버퍼링되지 않게 `flush_interval -1`, WebSocket 은 별도 설정 없이 통과한다.
업로드는 Node 를 거치지 않고 Caddy 가 디스크에서 바로 준다.

### 안전장치

- `--format` 은 **파일시스템이 없는 장치**일 때만 포맷한다. 옵션을 줘도 기존 데이터는 지우지 않는다.
- 기존 볼륨을 새 VM 에 붙여 재실행하면 데이터 복사는 건너뛰고 `data_directory` 만 다시 맞춘다.
- Postgres·백엔드 유닛 모두 `RequiresMountsFor=/mnt/vidshare-data` — 볼륨 없이 빈 디렉터리로 뜨지 않는다.
- iptables 규칙은 하드코딩한 위치가 아니라 **첫 REJECT 앞**에 넣는다(Oracle 이미지마다 위치가 다름).
- DB 비밀번호는 영문·숫자·`_-` 만 허용 — `DATABASE_URL` 과 `sed` 에 그대로 들어간다.
- `deploy.sh` 는 마이그레이션 전에 항상 백업한다.

### `.ps1` 인코딩

PowerShell 5.1 은 BOM 없는 UTF-8 을 ANSI(CP949)로 읽어 한글 문자열이 깨진다. 세 스크립트를 UTF-8 BOM + CRLF 로 저장했다.

---

## 5. 검증

| 대상 | 방법 | 결과 |
|------|------|------|
| `deploy/oracle/*.sh` | `bash -n` | 3개 통과 |
| `deploy/windows/*.ps1` | PowerShell 파서(`Parser.ParseFile`) | 3개 통과 |
| `backup-local.ps1` | 임시 클러스터(5433)의 이관 DB 를 실제 백업 | 59KB 덤프 생성 |
| 복원 연습 | 그 덤프를 빈 DB 에 `pg_restore` → 행 수·마이그레이션 버전 비교 | 일치 |
| CI 대상 명령 | 로컬에서 front `lint`·`typecheck`·`test`, console `lint`·`typecheck` | 전부 0 |

`setup-vm.sh` · `deploy.sh` 는 Linux VM 이 없어 **실행해 보지 못했다**(문법 검사만). 첫 구축 때 출력을 확인해야 한다.

---

## 6. 후속

- [ ] 사용자: OCI 리소스·도메인 → `setup-vm.sh` → `deploy.sh`
- [ ] 첫 push 후 GitHub Actions 결과 확인
- [ ] 도메인 확정 후 `wrangler.jsonc` Custom Domain
