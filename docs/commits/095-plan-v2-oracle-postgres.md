# 095 — 계획서 v2 (Oracle Cloud 배포 · PostgreSQL 전환 · 전체 폴더 구조)

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `095` |
| **파일명** | `095-plan-v2-oracle-postgres.md` |
| **Git 커밋 (short)** | `TBD` |
| **Git 커밋 (full)** | `TBD` |
| **날짜** | `2026-10-02` |
| **작성자** | `Claude` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `해당 없음 (문서만 변경)` |

---

## 1. 커밋 내용

```
docs: 계획서 v2 — Oracle Cloud 배포·Postgres 전환·전체 폴더 구조

plan.md 를 16장 구성으로 고도화한다. 백엔드를 Oracle VM 에 올리고
SQLite 를 PostgreSQL 16 으로 전환하며, 로컬 DB·업로드는 D 드라이브에
둔다. 운영 DB 는 VM 블록 볼륨에 두고 야간 백업을 D 드라이브로 당겨온다.
파일명 단위 폴더 구조와 P1~P7 실행 계획, 위험 요소를 포함한다.

상세 기록: docs/commits/095-plan-v2-oracle-postgres.md
```

---

## 2. 개요

### 배경

기존 plan.md 는 약 200줄로 배포 대상(Oracle Cloud), DB(Postgres), 저장 위치(D 드라이브)가
빠져 있었다. 사용자가 이를 반영한 상세 계획서와 파일명 수준의 폴더 구조를 요청했다.

### 목표

- 다음 작업자가 계획서만 보고 P1~P7 을 순서대로 진행할 수 있을 것

### 범위 밖 (Out of Scope)

- 실제 코드·스크립트 작성 (계획서에 "신규"로 표시만 함)
- docs/deployment.md, architecture/overview.md 갱신 (P5·P6 항목으로 계획서에 기록)

---

## 3. 변경 파일

| 경로 | 변경 | 설명 |
|------|------|------|
| `plan.md` | 수정 | 16장 구성으로 개정 (v2) |
| `docs/commits/095-plan-v2-oracle-postgres.md` | 추가 | 이 문서 |
| `docs/commits/README.md` | 수정 | 인덱스에 095 추가 |

---

## 4. 결정과 트레이드오프

### D 드라이브 vs Oracle Cloud

Oracle VM 은 원격 서버라 PC 의 D 드라이브를 직접 쓸 수 없다. 로컬 개발 DB·업로드는
`D:\vidshare-data`, 운영 DB 는 VM 블록 볼륨, 운영 백업은 D 드라이브로 당겨오는 구조를 택했다.
운영 백엔드가 집 PC 의 Postgres 에 직접 붙는 안은 PC 상시 가동·포트 노출·지연 문제로 제외했다.

### 코드 전환 규모 (실측)

`data/store.ts` 1,621줄에 `getDb()` 86곳, 호출 파일 6개. better-sqlite3(동기)에서 pg(비동기)로
바뀌므로 호출부 전부 `await` 전환이 필요하다. 가장 큰 위험으로 계획서 14장에 적었다.

---

## 5. 기타

### 리스크 · 알려진 이슈

- `db/dumpDoc.ts` 는 내용을 읽지 않고 파일명 기준으로 "대체 대상"으로 분류했다. P3 에서 확인 필요.
- Oracle Always Free 한도·유휴 회수 정책은 구축 전 재확인 필요 (이 세션에서 조회 불가).
- 도메인이 아직 없다면 P6 전에 구입해야 한다.

### 후속 작업

- [ ] P1 로컬 Postgres 준비 (`deploy/windows/setup-postgres-d.ps1`)
