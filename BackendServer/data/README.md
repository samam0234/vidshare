# data/

DB 는 **PostgreSQL** 로 옮겼습니다(096). 이 폴더에는 더 이상 실제 DB 가 없습니다.
남은 용도는 두 가지입니다.

| 파일 | Git | 설명 |
|------|-----|------|
| `.gitkeep` | 추적 | 빈 `data/` 폴더를 저장소에 유지 |
| `DataBaseColumn.md` | 무시 | `npm run db:doc` 으로 만드는 테이블·컬럼·데이터 덤프 |
| `vidshare.sqlite` (+ `-wal`, `-shm`) | 무시 | **예전** SQLite DB. `npm run db:import-sqlite` 의 기본 원본 |

## DB 는 어디에 있나

| 환경 | 위치 |
|------|------|
| 로컬 (내 PC) | Postgres 16 서비스 `postgresql-x64-16`, 데이터 디렉터리 `D:\PostgreSQL\16\data` |
| 운영 (Oracle VM) | `/mnt/vidshare-data/pgdata` (블록 볼륨) |

접속 문자열은 `BackendServer/.env` 의 `DATABASE_URL` 입니다.

## 스키마 · 시드

- 스키마: `src/db/migrations/` (버전 순 적용, `schema_migrations` 테이블에 기록)
- 시드: `src/data/seedData.ts` — `users` 가 비어 있을 때 **한 번만** 넣는다

## 시드 계정

| id | 핸들 | 로그인 |
|----|------|--------|
| `u-demo` | `demo` | `demo` / `demo1234` |
| `u-me` | `usernumber02345` | 같은 비밀번호 `demo1234` |
| `u1` `u2` `u3` | 시드 크리에이터 | 불가 (비밀번호 없음) |

> 운영 DB 에 시드 계정이 생겼다면 비밀번호가 공개된 계정이므로 지우거나 정지하세요
> (관리자 콘솔 → 유저 → 정지).

## SQLite 에서 옮기기 (1회)

```bash
npm run db:import-sqlite                 # data/vidshare.sqlite → DATABASE_URL
npm run db:import-sqlite -- --from D:\vidshare-data\backups\sqlite-final\vidshare.sqlite
npm run db:import-sqlite -- --replace    # 대상 DB 를 비우고 다시
```

끝나면 테이블별 행 수 비교표를 찍고, 다르면 종료 코드 1 로 끝납니다.
