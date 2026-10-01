# 내 PC(D 드라이브) PostgreSQL

**대상**: 로컬에서 BackendServer 를 실행하는 사람
**전제**: PostgreSQL 16 이 `D:\PostgreSQL\16` 에 설치되어 있고, 서비스 `postgresql-x64-16` 의
데이터 디렉터리가 `D:\PostgreSQL\16\data` (2026-10-02 확인)

---

## 1. 무엇이 어디에 있나

| 경로 | 내용 |
|------|------|
| `D:\PostgreSQL\16\bin` | `psql`, `pg_dump`, `pg_restore` … |
| `D:\PostgreSQL\16\data` | **DB 파일** (클러스터 전체). 직접 건드리지 않는다 |
| `D:\vidshare-data\uploads` | 업로드 영상·썸네일 (`UPLOADS_PATH`) |
| `D:\vidshare-data\backups\local` | 로컬 DB 백업 (`backup-local.ps1`) |
| `D:\vidshare-data\backups\prod` | 운영(Oracle) 백업 사본 (`backup-pull.ps1`) |
| `D:\vidshare-data\backups\sqlite-final` | 전환 직전 `vidshare.sqlite` 원본 |

같은 클러스터 안에 DB 두 개를 둡니다.

| DB | 용도 |
|----|------|
| `vidshare` | `npm run dev` |
| `vidshare_test` | `npm test` — 테스트 파일마다 `t_<pid>_<rand>` 스키마를 만들고 끝나면 지운다 |

## 2. 처음 설정

```powershell
powershell -ExecutionPolicy Bypass -File deploy\windows\setup-postgres-d.ps1
```

1. `postgres` 슈퍼유저 비밀번호를 psql 이 한 번 묻습니다(설치 때 정한 것).
2. `vidshare` 계정에 쓸 새 비밀번호를 묻습니다(영문·숫자·`_-` 12자 이상 — URL 에 그대로 들어감).
3. 끝에 출력되는 세 줄을 `BackendServer\.env` 에 넣습니다.

```env
DATABASE_URL=postgres://vidshare:<비밀번호>@localhost:5432/vidshare
DATABASE_URL_TEST=postgres://vidshare:<비밀번호>@localhost:5432/vidshare_test
UPLOADS_PATH=D:\vidshare-data\uploads
```

기존 `BackendServer\uploads\` 에 파일이 있으면 `D:\vidshare-data\uploads\` 로 복사합니다.

## 3. SQLite 데이터 옮기기 (1회)

```bash
cd BackendServer
npm run db:import-sqlite
```

- 원본: `data/vidshare.sqlite` (다른 파일이면 `-- --from <경로>`). 읽기 전용으로 엽니다.
- 대상: `DATABASE_URL`. 마이그레이션을 먼저 적용하고, 22개 테이블을 FK 순서로 한 트랜잭션에 넣습니다.
- 대상에 이미 데이터가 있으면 멈춥니다. 다시 하려면 `-- --replace`.
- 끝에 테이블별 `sqlite` / `postgres` 행 수 표를 찍고, 하나라도 다르면 종료 코드 1.

## 4. 자주 쓰는 명령

```powershell
$env:Path += ";D:\PostgreSQL\16\bin"
psql -h localhost -U vidshare -d vidshare                 # 접속
psql -h localhost -U vidshare -d vidshare -c "\dt"        # 테이블 목록
psql -h localhost -U vidshare -d vidshare -c "select * from schema_migrations"
```

비밀번호를 매번 치지 않으려면 `%APPDATA%\postgresql\pgpass.conf`:

```
localhost:5432:vidshare:vidshare:<비밀번호>
localhost:5432:vidshare_test:vidshare:<비밀번호>
```

## 5. 초기화

```sql
-- postgres 로 접속해서
DROP DATABASE vidshare;
CREATE DATABASE vidshare OWNER vidshare ENCODING 'UTF8' TEMPLATE template0;
```

다음 `npm run dev` 때 마이그레이션 → 시드가 다시 들어갑니다.

## 6. 문제 해결

| 증상 | 원인 · 해결 |
|------|-------------|
| `DATABASE_URL 이 비어 있습니다` | `BackendServer\.env` 확인 |
| `password authentication failed` | `.env` 비밀번호 · `setup-postgres-d.ps1` 다시 실행하면 비밀번호를 재설정 |
| `ECONNREFUSED 127.0.0.1:5432` | `Get-Service postgresql-x64-16` → `Start-Service postgresql-x64-16` |
| 테스트가 `DATABASE_URL_TEST 가 없습니다` | `.env` 에 `DATABASE_URL_TEST` |
| 테스트 후 `t_…` 스키마가 남음 | 테스트가 중간에 죽은 경우. `DROP SCHEMA t_… CASCADE` |
| PowerShell 스크립트 한글이 깨짐 | 파일이 UTF-8 BOM 인지 확인 (저장소의 `.ps1` 은 BOM 포함) |

> 설치된 클러스터의 `postgresql.conf` 는 `listen_addresses = '*'` 이지만 `pg_hba.conf` 가
> 127.0.0.1 · ::1 만 허용합니다. 외부 노출이 필요 없다면 `localhost` 로 줄이는 편이 안전합니다.
