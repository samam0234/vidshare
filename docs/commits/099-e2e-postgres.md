# 099 — E2E 를 PostgreSQL 테스트 스키마로

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `099` |
| **파일명** | `099-e2e-postgres.md` |
| **Git 커밋 (short)** | `9f1359d` |
| **Git 커밋 (full)** | `9f1359d2b76889d047138de8953e95ebef35e799` |
| **날짜** | `2026-10-02` |
| **작성자** | `Claude` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` — Fixed |

---

## 1. 커밋 내용

```
fix(e2e): Playwright 백엔드를 테스트 DB 의 e2e 스키마로 띄운다

096 에서 백엔드가 Postgres 로 바뀌었는데 playwright.config.ts 는 여전히 SQLITE_PATH 만
넘기고 있었다. 이대로면 백엔드가 .env 의 DATABASE_URL(개발 DB)로 떠서 E2E 데이터가
개발 DB 에 쌓인다. DATABASE_URL_TEST 와 DATABASE_SCHEMA=e2e 를 명시하고, 시작 전에
스키마를 초기화하는 scripts/reset-schema.ts 를 추가한다.

상세 기록: docs/commits/099-e2e-postgres.md
```

---

## 2. 개요

### 배경

096 은 백엔드 단위 테스트(`tests/helpers.ts`)만 Postgres 로 옮기고, Playwright 설정을 놓쳤다.
포트폴리오 문서를 갱신하다 "E2E 는 임시 SQLite 로 서버를 띄운다"는 문장을 확인하면서 발견했다.

위험한 점은 **실패하지 않고 엉뚱한 DB 로 성공**한다는 것이다. `SQLITE_PATH` 는 더 이상 읽히지 않고,
dotenv 가 `.env` 의 `DATABASE_URL` 을 채우므로 E2E 가 만든 계정·글·대화가 개발 DB 에 남는다.

---

## 3. 변경 파일

| 경로 | 변경 | 설명 |
|------|------|------|
| `FrontServer/playwright.config.ts` | 수정 | `DATABASE_URL`(= `DATABASE_URL_TEST`) · `DATABASE_SCHEMA=e2e` 를 명시. 없으면 시작 전에 에러 |
| `BackendServer/scripts/reset-schema.ts` | 추가 | 지정 스키마 DROP → CREATE. `public` 과 이상한 이름은 거부 |
| `FrontServer/README.md`, `docs/architecture/overview.md` | 수정 | E2E 실행 조건 |
| `docs/changelog/CHANGELOG.md` | 수정 | Fixed |

---

## 4. 결정

- 백엔드 단위 테스트처럼 **랜덤 스키마 + 종료 시 삭제** 대신 **고정 스키마 `e2e` + 시작 시 초기화**를 택했다.
  Playwright 의 `webServer` 는 종료 훅에서 DB 를 정리하기 어렵고, 고정 이름이면 남는 스키마가 하나뿐이다.
- URL 은 환경 변수 → `BackendServer/.env` 의 `DATABASE_URL_TEST` 순. `.env` 전체를 읽지 않는 것은 단위 테스트 헬퍼와 같은 이유다.

---

## 5. 검증

```bash
DATABASE_URL_TEST=postgres://…/vidshare_test npx playwright test   # 8 passed (2.0m)
npm run lint && npm run typecheck                                   # FrontServer (기존 폰트 경고 1건)
npm run typecheck                                                   # BackendServer
```
