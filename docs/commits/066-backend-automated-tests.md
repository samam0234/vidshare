# 066 — 백엔드 자동화 테스트 도입

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `066` |
| **파일명** | `066-backend-automated-tests.md` |
| **Git 커밋 (short)** | `TBD` |
| **Git 커밋 (full)** | `TBD` |
| **날짜** | `2026-08-31` |
| **작성자** | `GitHub Copilot (pair)` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |
| **로드맵 항목** | Phase C — 자동화 테스트 |

---

## 1. 커밋 내용

```
test: 백엔드 API 자동화 테스트 32건 도입

- node:test + tsx + supertest (러너 추가 설치 없음)
- 임시 SQLite 로 테스트마다 격리
- 인증·쇼츠·검색·팔로우·알림 커버
- npm test / npm run typecheck (테스트 포함)
```

---

## 2. 개요

이 저장소에는 **자동화 테스트가 한 건도 없었다.** 지금까지 모든 검증은
임시 `.cjs` 스크립트를 만들어 수동 실행하고 지우는 방식이었다.

Phase B에서 검색·팔로우·알림 설정이 한꺼번에 추가되면서
회귀를 놓치기 쉬운 상태가 됐다. 특히 라우트 순서(`/feed` vs `/:id`)처럼
조용히 깨지는 종류의 버그는 사람이 매번 확인하기 어렵다.

---

## 3. 러너 선택 (시행착오 기록)

### 처음 시도: vitest

`vitest` + `supertest` 를 설치했으나 **테스트가 한 건도 실행되지 않았다.**

```
Error: Vitest failed to find the runner.
TypeError: Cannot read properties of undefined (reading 'config')
```

- `vitest.config.ts` → `.mts` 로 바꿔도 동일
- vitest 중복 설치 없음 (단일 4.1.11)
- `expect(1+1).toBe(2)` 만 있는 최소 파일도 실패

원인은 **vitest 4.1.11 이 끌어온 vite 8.2.2** 조합으로 판단했다.
환경과 싸우는 대신 러너를 바꿨다.

### 채택: `node:test` + `tsx`

| 장점 | 설명 |
|------|------|
| 의존성 최소 | `tsx` 는 이미 `dev` 스크립트에서 쓰던 것. 러너는 Node 내장 |
| 프로세스 격리 | `node --test` 는 **파일마다 별도 프로세스** → DB 싱글턴이 안 섞임 |
| 안정성 | Node 24 내장이라 서드파티 버전 충돌 없음 |

`vitest` 는 제거했고, `supertest` 와 `cross-env` 만 남겼다.

---

## 4. 변경 파일

| 파일 | 변경 |
|------|------|
| `BackendServer/tests/helpers.ts` | 신규 — 임시 DB 앱 생성, 로그인 헬퍼 |
| `BackendServer/tests/smoke.test.ts` | 신규 — health·인증·쇼츠 (8건) |
| `BackendServer/tests/search.test.ts` | 신규 — 통합 검색 (6건) |
| `BackendServer/tests/follows.test.ts` | 신규 — 팔로우 (10건) |
| `BackendServer/tests/notifications.test.ts` | 신규 — 알림 설정·벌크 (8건) |
| `BackendServer/tsconfig.test.json` | 신규 — 테스트 포함 타입 검사 |
| `BackendServer/package.json` | `test`, `test:watch`, `typecheck` 확장 |
| `BackendServer/src/db/client.ts` | `closeDb()` 추가 |
| `BackendServer/src/db/dumpDoc.ts` | 닫힌 커넥션 덤프 방지 |
| `BackendServer/src/app.ts` | 테스트 환경에서 morgan 로그 끔 |

---

## 5. 테스트 격리 방식

```ts
export async function createTestApp() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vidshare-test-"));
  process.env.SQLITE_PATH = path.join(dir, "test.sqlite");
  process.env.UPLOADS_PATH = path.join(dir, "uploads");

  // env 를 정한 뒤 동적 import 해야 DB 싱글턴이 새 경로로 열린다
  const { initDb, closeDb } = await import("../src/db/client.js");
  const { createApp } = await import("../src/app.js");
  ...
}
```

- 운영 DB(`data/vidshare.sqlite`)를 **건드리지 않는다**
- 매번 새 파일이므로 시드가 항상 같은 상태에서 시작
- `after()` 에서 커넥션을 닫고 임시 디렉터리를 지운다

`app.listen()` 을 하지 않고 `createApp()` 결과를 supertest 에 직접 넘기므로
포트 충돌이 없다.

---

## 6. 부수적으로 고친 것

### `closeDb()` 부재

`db/client.ts` 에 커넥션을 닫는 함수가 없어 임시 파일을 지울 수 없었다.

### 종료 후 덤프 크래시

테스트가 끝나고 `closeDb()` 한 뒤에도 060의 디바운스 타이머가 살아 있어
닫힌 커넥션에 접근했다.

```
DataBaseColumn.md 갱신 실패: TypeError: The database connection is not open
```

`database.open` 을 확인해 건너뛰도록 했다. 운영에서도 종료 직후 같은 일이
일어날 수 있었으므로 테스트가 실제 버그를 찾아낸 셈이다.

### 로그 노이즈

`NODE_ENV=test` 일 때 morgan 을 끄지 않으면 테스트 출력이 요청 로그에 묻힌다.

### 테스트 타입 검사 누락

`tsconfig.json` 의 `include` 가 `src/**/*` 뿐이라 `tests/` 는 타입 검사가 안 됐다.
`tsconfig.test.json` 을 추가해 `npm run typecheck` 가 둘 다 보게 했더니
바로 실제 오류를 잡았다.

```
TS2835: Relative import paths need explicit file extensions ...
Did you mean '../src/db/client.js'?
```

`moduleResolution: node16` 이라 동적 import 에 `.js` 확장자가 필요했다.

---

## 7. 커버리지

| 파일 | 건수 | 내용 |
|------|------|------|
| `smoke` | 8 | health, 로그인 성공/실패, `me` 401/200, 쇼츠 목록·404·401 |
| `search` | 6 | 빈 쿼리, 도메인 키 존재, 핸들·제목 매칭, 대소문자 무시 |
| `follows` | 10 | 팔로우/언팔, **멱등성**, 팔로워 목록, 자기 팔로우 400, 401, 404, **`/feed` 라우트 순서**, 피드 내용 |
| `notifications` | 8 | 기본값, 401, 400, **수신 OFF 시 미생성**, 전체 읽음, 전체 삭제 |
| **합계** | **32** | |

굵게 표시한 것들은 이번 Phase B에서 **직접 구현한 규칙**이라
회귀 시 즉시 잡힌다.

### 실행 결과

```
ℹ tests 32
ℹ suites 7
ℹ pass 32
ℹ fail 0
ℹ duration_ms 1472
```

---

## 8. 사용법

```bash
cd BackendServer
npm test           # 전체 실행
npm run test:watch # 변경 감지
npm run typecheck  # src + tests 타입 검사
```

---

## 9. 남은 한계

1. **프론트엔드 테스트 없음** — 이번엔 백엔드 API만 다뤘다.
   컴포넌트 테스트는 별도 러너(RTL 등) 도입이 필요하다.
2. **E2E 없음** — Playwright 로 브라우저 흐름을 검증하는 단계는 미착수.
3. **커버리지 측정 없음** — `--experimental-test-coverage` 를 붙일 수 있지만
   임계치 정책이 없어 보류했다.
4. **챗봇 미포함** — 외부 LLM 호출이라 모킹 없이는 테스트가 불안정하다.
5. **업로드 미포함** — multipart 테스트는 픽스처 파일이 필요해 다음으로 미뤘다.
6. **CI 미연결** — 로컬에서만 돈다. 배포 파이프라인은 로드맵 Phase C에 남아 있다.

---

## 10. 관련 문서

- [060 — SQLite 덤프](./060-sqlite-database-column-dump.md) (종료 시 크래시 수정 대상)
- [063 — 통합 검색](./063-unified-search.md)
- [064 — 알림 수신 설정](./064-notification-settings-server.md)
- [065 — 팔로우](./065-user-follows.md)
- [로드맵 Phase C](../features/roadmap.md)
