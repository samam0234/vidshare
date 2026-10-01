# 098 — 문서 갱신: PostgreSQL · Oracle Cloud · 운영 절차서

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `098` |
| **파일명** | `098-docs-postgres-oracle.md` |
| **Git 커밋 (short)** | `TBD` |
| **Git 커밋 (full)** | `TBD` |
| **날짜** | `2026-10-02` |
| **작성자** | `Claude` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
docs: PostgreSQL·Oracle Cloud 전환에 맞춰 문서 갱신

README·BackendServer README·아키텍처·로드맵·보안 노트를 Postgres 기준으로 고치고,
배포 가이드를 Oracle VM + D 드라이브 기준으로 다시 쓴다. docs/ops 에 Oracle 구축,
D 드라이브 Postgres, 백업·복원 절차서를 추가한다. plan.md 를 v2.1 로 올려
096~097 구현 결과와 계획에서 달라진 점, 남은 "직접" 작업을 반영한다.

상세 기록: docs/commits/098-docs-postgres-oracle.md
```

---

## 2. 변경 파일

| 경로 | 변경 | 설명 |
|------|------|------|
| `plan.md` | 수정 | v2.1 — 8~13장 재작성(구현 결과·실측·검증), 폴더 트리 상태 표시, P1~P7 체크 |
| `README.md` | 수정 | 배지(PostgreSQL·Oracle·148 tests), 기술 스택, 빠른 시작에 DB 준비, 배포 |
| `BackendServer/README.md` | 수정 | 스택·환경 변수·명령·폴더 |
| `docs/deployment.md` | 재작성 | Oracle VM + Postgres + D 드라이브, 도메인·쿠키, 데이터 이전, 배포·확인·백업·CI |
| `docs/ops/oracle-setup.md` | 추가 | OCI 콘솔 순서, SSH 하드닝, 문제 해결 표 |
| `docs/ops/postgres-d-drive.md` | 추가 | D 드라이브 Postgres 설정·이관·문제 해결 |
| `docs/ops/backup-restore.md` | 추가 | 백업 위치·자동 등록·복원 연습·장애 복구 |
| `docs/architecture/overview.md` | 수정 | 구조도·데이터 흐름·규약(asyncRouter, withTx)·테이블 노트 |
| `docs/features/roadmap.md` | 수정 | 완료 항목, 다음 착수 순서, 타입 정교화·감사 로그 |
| `docs/security/security-notes.md` | 수정 | 5-3 Oracle·Postgres 운영 체크리스트 |
| `docs/README.md` | 수정 | `ops/` 인덱스 |
| `docs/changelog/CHANGELOG.md` | 수정 | 096~098 |

---

## 3. 계획(v2)에서 달라진 점 — plan.md 에 반영

| v2 초안 | 실제 | 이유 |
|---------|------|------|
| `D:\vidshare-data\pgdata` 에 새 클러스터 | 기존 `D:\PostgreSQL\16\data` 재사용 | 이미 D 드라이브에 설치되어 있음 |
| Node 20 | Node 24 | Node 20 지원 종료(2026-04) |
| `migrations/*.sql` | `migrations/*.ts` | `tsc` 가 `.sql` 을 복사하지 않음 |
| 날짜 timestamptz, 불리언 boolean | 타입 보존 | API 응답을 흔들지 않으려고 분리 |
| `0002_indexes.sql` 별도 | `0001_init` 에 포함 | 배포 전이라 나눌 이유 없음 |
| `pg_hba.conf.snippet` | 만들지 않음 | Ubuntu 기본값이 이미 로컬만 허용 |
| `data/.gitkeep` 삭제 | 유지 | `db:doc` 출력·예전 SQLite 원본 위치로 계속 씀 |

---

## 4. 검증

- 문서 속 명령·경로를 실제 파일과 대조 (`deploy/`, `scripts/`, `package.json` 스크립트 이름)
- SQLite·Tunnel 언급 전수 검색 — 남은 것은 이관 명령과 과거 이력뿐
