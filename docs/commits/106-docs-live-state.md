# 106 — 문서 전체를 실제 운영 구성으로 맞춤

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `106` |
| **파일명** | `106-docs-live-state.md` |
| **Git 커밋 (short)** | `31afdc1` |
| **날짜** | `2026-10-02` |
| **작성자** | `Claude` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` — Changed |

---

## 1. 배경

096~098 에서 문서를 "Caddy + 블록 볼륨 + 도메인으로 올릴 예정" 기준으로 썼다. 실제 운영(103)은
**전용 VM + Cloudflare Tunnel, 블록 볼륨 없음, 도메인 없음(`SameSite=None`)** 이라 여러 문서가 사실과 달랐다.
`docs/deployment.md` 는 맨 위 요약만 최신이고 본문 1~10장이 옛 계획 그대로였다.

## 2. 서버에서 확인한 실제 값 (2026-10-02)

| 항목 | 값 |
|------|----|
| DB 데이터 | `/var/lib/postgresql/16/main` (부트 디스크 `/dev/sda1` 50GB 중 3.5GB 사용) |
| 업로드 | `UPLOADS_PATH=/mnt/vidshare-data/uploads` (부트 디스크 위 폴더) |
| 서버 백업 | cron `0 3 * * *` → `/mnt/vidshare-data/backups` |
| 쿠키·CORS | `COOKIE_SAMESITE=none`, `COOKIE_DOMAIN=` (비움), `CORS_ORIGIN` = 두 `workers.dev` 주소, `TRUST_PROXY=1` |
| 서비스 | `vidshare-backend` · `vidshare-tunnel` · `postgresql` 모두 active |
| 이 PC | 작업 스케줄러 "운영 백업 가져오기" · "터널 주소 동기화" 등록됨. **`BackendServer\.env` 없음** — 로컬 D 드라이브 DB 계정 생성(P1)은 아직 안 함 |

## 3. 바꾼 문서

| 문서 | 내용 |
|------|------|
| `docs/deployment.md` | **전면 재작성.** 0장 운영 한눈에, 1장 구성도(터널), 3장 쿠키(지금 `None` / 도메인 마련 시 `Lax`), 4장 A 터널 · B Caddy 두 경로, 6장 관리자 만들기·찾기·재설정, 터널 주소 동기화, 8장 "D 드라이브 사본이 유일한 외부 백업" 경고, 11장 구조 변경 신호에 도메인·블록 볼륨 |
| `plan.md` | 원래 계획은 두고 ▶ 로 실제를 덧붙임 — 상단 상태(v2.2), 7장 실제 구성도, 7.2 "Tunnel 을 버린다 → 다시 썼다", 9.1·10장·11.1 실제 값, 12장 새 파일(`setup-vm-tunnel.sh` 등 7개), 12.3 실제 VM 경로, 13장 체크리스트, 14장 실제로 생긴 위험 5개, 16장 완료 기준별 현재 상태 |
| `README.md` | 테스트 배지·숫자 151, 배포 행(터널), DB 위치, 쿠키 안내(sslip.io → trycloudflare) |
| `BackendServer/README.md` | 테스트 151, `TRUST_PROXY` 설명, scripts 목록, 다음 단계 체크 |
| `BackendServer/data/README.md` · `uploads/README.md` | 운영 위치를 실제 경로로 |
| `deploy/README.md` | 스크립트 설명(현재 운영 / 도메인 경로 / 사용 중단), 터널 설치 순서·예약 작업 등록, 관리자 도구 |
| `docs/architecture/overview.md` | 갱신 범위, DB 위치, API 주소, 새 CLI, 다음 작업자 주의 6번 |
| `docs/features/roadmap.md` | 백엔드 공개 완료, 관리자 복구 완료, 테스트 숫자, 운영 디스크 이중화 과제 추가 |
| `docs/security/security-notes.md` | 운영 쿠키 `SameSite=None` 과 그 방어(CORS), 관리자 재설정, 현재 운영의 네트워크(22 만) |
| `docs/ops/oracle-setup.md` | 0장 "A 터널 / B Caddy" 선택과 터널 경로 요약 |
| `docs/ops/backup-restore.md` | VM 을 잃었을 때 — 블록 볼륨이 없어 D 드라이브가 유일한 원본 |

## 4. 검증

- 바꾼 12개 파일에 제어 문자 0개(백슬래시 이스케이프 사고 방지 점검)
- "구축 전", "UI 확인용", "sslip.io 임시", "148건", "29건" 같은 옛 표현이 현재 상태 설명에 남지 않음(계획·이력 서술은 유지)
- 문서에 적은 스크립트 옵션(`--cors`, `-Register`, `-SshHost`)과 `/uploads` 서빙 위치를 소스에서 확인
