# 101 — setup-vm.sh: Ubuntu 22.04 · 도메인 없이(sslip.io) · 볼륨 없이 · 비대화형

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `101` |
| **파일명** | `101-setup-vm-jammy-sslip.md` |
| **Git 커밋 (short)** | `70172ca` |
| **Git 커밋 (full)** | `70172ca7ab061aa687cdd5302bf236f0df09fbef` |
| **날짜** | `2026-10-02` |
| **작성자** | `Claude` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` — Changed |

---

## 1. 커밋 내용

```
feat(deploy): setup-vm.sh 를 Ubuntu 22.04·도메인 없음·볼륨 없음에서도 돌게

실제로 만든 인스턴스가 Ubuntu 22.04 이고 도메인·블록 볼륨이 아직 없어서
097 스크립트가 그대로는 돌지 않는다. PostgreSQL 공식 저장소 자동 추가,
--domain 생략 시 <공인IP>.sslip.io, --no-volume, --cors, 비대화형 실행 시
서버 안에서 DB 비밀번호 생성, RAM 2GB 미만이면 스왑 생성을 넣는다.
backup.sh 는 볼륨이 없는 구성에서도 돌게 한다.

상세 기록: docs/commits/101-setup-vm-jammy-sslip.md
```

---

## 2. 배경

사용자가 만든 인스턴스: Ubuntu **22.04**, 공인 IP `168.110.23.222`, 도메인 없음, 블록 볼륨 미확인.
097 의 `setup-vm.sh` 는 24.04·도메인·블록 볼륨을 전제했고, DB 비밀번호를 `read -s` 로 물어
원격 자동 실행(ssh 비대화형)에서 멈춘다.

## 3. 변경

| 항목 | 이전 | 지금 |
|------|------|------|
| OS | 24.04 기본 저장소의 `postgresql-16` | 후보 버전이 없으면 PGDG(apt.postgresql.org) 저장소를 붙인다 — 22.04 대응 |
| 도메인 | `--domain` 필수 | 생략하면 `<IP 대시>.sslip.io` (공인 IP 로 풀리는 무료 와일드카드 DNS → Caddy 가 Let's Encrypt 인증서 발급) |
| 쿠키 | 항상 `SameSite=Lax` + `COOKIE_DOMAIN=.<base>` | 실제 도메인이면 그대로, sslip.io/nip.io 면 `SameSite=None`(프론트 `*.workers.dev` 와 다른 사이트) |
| CORS | 도메인에서 `app.`/`console.` 계산 | `--cors` 로 지정 가능. sslip 모드에선 필수 |
| 데이터 위치 | `--device` 필수 | `--no-volume` 이면 부트 디스크의 `/mnt/vidshare-data` |
| DB 비밀번호 | `read -s` | 터미널이면 묻고, 아니면 서버에서 `openssl rand` 로 생성해 `backend.env` 에만 저장. 재실행 시 기존 값 재사용 |
| backend.env | 템플릿 sed 치환 | 스크립트가 직접 작성 (값 출처가 한 곳) |
| 메모리 | — | RAM < 2GB 이고 스왑이 없으면 2GB 스왑 파일 (E2.1.Micro 빌드 대비) |
| `backup.sh` | 마운트 안 됐으면 항상 실패 | fstab 에 볼륨이 등록된 구성일 때만 마운트 검사 |

`set -o pipefail` 아래에서 `cmd | grep -q` 는 grep 이 먼저 끝나면 앞 명령이 SIGPIPE 로 실패한 것으로 잡힌다.
스왑·PG 후보 검사에 그 패턴이 있어 "이미 있어도 다시 만들다 중단"될 수 있었다 → 값을 변수로 받은 뒤 비교.

## 4. 알려진 한계

- **sslip.io 모드의 쿠키**: 서드파티 쿠키를 막는 브라우저(Safari 기본, Firefox 엄격 모드)에서는 로그인이 안 될 수 있다.
  도메인을 마련해 `--domain api.<도메인>` 으로 다시 실행하는 것이 정식 구성.
- 실제 VM 에서는 아직 실행하지 못했다 — SSH 키가 인스턴스에 등록되지 않아 접속이 거부되는 상태(사용자 조치 대기).
  `bash -n` 문법 검사만 통과.

## 5. 검증

```bash
bash -n deploy/oracle/setup-vm.sh && bash -n deploy/oracle/backup.sh
nslookup 168-110-23-222.sslip.io     # → 168.110.23.222
```
