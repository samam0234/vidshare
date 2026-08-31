# 079 — E2E 테스트 (Playwright)

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `079` |
| **파일명** | `079-e2e-playwright.md` |
| **Git 커밋 (short)** | `596d730` |
| **Git 커밋 (full)** | `596d730e7a28843240a053b68c6169ae8a49a1ed` |
| **날짜** | `2026-09-01` |
| **작성자** | `Claude (pair)` |
| **브랜치** | `master` |
| **로드맵 항목** | Phase C — E2E 테스트 |

---

## 1. 커밋 내용

```
test: E2E 테스트 도입 (Playwright)

- @playwright/test + Chromium 설치, playwright.config.ts 작성
- 프론트(3310)·백엔드(4310) 를 임시 SQLite로 자동 기동하는 webServer 설정
- 게스트 접근/로그인/로그아웃/커뮤니티 작성/메시지 실시간(WS) 8개 시나리오
- Next dev(Turbopack) 첫 컴파일 중 클릭·입력이 씹히는 레이스를 흡수하는
  gotoStable/fillStable 헬퍼
```

---

## 2. 개요

### 배경
Phase C 로드맵 1순위. 지금까지 자동화 테스트는 백엔드 API(node:test, 83건)와
프론트 순수 함수(29건)뿐이었고, 실제 화면을 브라우저로 열어 로그인 → 작성 →
확인까지 흐르는 시나리오 검증은 전무했다.

### 목표
핵심 사용자 흐름(비회원 열람, 로그인/로그아웃, 콘텐츠 작성, 실시간 메시지)이
브라우저에서 실제로 동작함을 자동으로 검증한다. 특히 078에서 만든 WebSocket
실시간 메시지는 백엔드 단위 테스트만으로는 "화면에 실제로 반영되는지"를
증명하지 못하므로, 이번 E2E가 그 부분의 첫 UI 레벨 검증이다.

### 범위 (In Scope)
- Playwright 설치·설정 (Chromium만, 헤드리스)
- 프론트/백엔드를 격리된 임시 SQLite로 자동 기동하는 `webServer` 구성
- 8개 시나리오: 게스트 열람 3건, 로그인/로그아웃 3건, 커뮤니티 작성 1건,
  메시지 실시간(WS) 1건

### 범위 밖 (Out of Scope)
- CI 연동 (다음 로드맵 항목인 "배포 파이프라인"에서 다룰지 별도 결정)
- 시각적 회귀 테스트(스크린샷 비교), 크로스 브라우저(Firefox/WebKit)
- 챗봇, 재생목록, 팔로우, 알림 등 나머지 기능의 E2E 커버리지 (후속 작업)

---

## 3. 구현 기능 · 변경 사항

### 기능 / 동작
- [x] `playwright.config.ts` — 프론트(3310)·백엔드(4310) 를 각각 `SQLITE_PATH`/
      `UPLOADS_PATH` 임시 디렉터리로 기동, 테스트 종료 시 자동 종료
- [x] `e2e/guest.spec.ts` — 비회원 쇼츠 피드 열람, `/upload`·`/messages` 접근 시
      로그인 리다이렉트
- [x] `e2e/auth.spec.ts` — 데모 로그인 성공/실패, 로그아웃
- [x] `e2e/community.spec.ts` — 로그인 후 글 작성 → 상세 페이지 → 목록 반영
- [x] `e2e/messages.spec.ts` — 대화 상대 추가 → 메시지 전송 → **WS 브로드캐스트로
      화면에 반영**되는지 확인(078의 UI 레벨 회귀 테스트 역할 겸함)
- [x] `e2e/helpers.ts` — `gotoStable`/`fillStable`/`loginAsDemo` 공용 헬퍼

### 주요 변경 파일·경로
| 경로 | 변경 유형 | 설명 |
|------|-----------|------|
| `FrontServer/playwright.config.ts` | 추가 | 프론트·백엔드 동시 기동, 임시 DB, 60s 타임아웃 |
| `FrontServer/e2e/helpers.ts` | 추가 | 로그인 헬퍼 + dev 모드 레이스 대응 유틸 |
| `FrontServer/e2e/guest.spec.ts` | 추가 | 비회원 시나리오 3건 |
| `FrontServer/e2e/auth.spec.ts` | 추가 | 로그인/로그아웃 시나리오 3건 |
| `FrontServer/e2e/community.spec.ts` | 추가 | 글쓰기 시나리오 1건 |
| `FrontServer/e2e/messages.spec.ts` | 추가 | 메시지 실시간(WS) 시나리오 1건 |
| `FrontServer/next.config.ts` | 수정 | `PLAYWRIGHT_E2E=1` 일 때 `distDir: ".next-e2e"` |
| `FrontServer/package.json` | 수정 | `@playwright/test` 추가, `test:e2e` 스크립트 |
| `FrontServer/tsconfig.json` | 수정(자동) | `.next-e2e` distDir용 타입 include (next dev가 자동 반영) |
| `FrontServer/.gitignore` | 수정 | `.next-e2e/`, `playwright-report/`, `test-results/` |

### 데이터·API
해당 없음 (기존 REST/WS 엔드포인트를 그대로 사용). E2E 전용 백엔드 인스턴스는
매 실행마다 임시 SQLite 파일로 새로 시드된다(`seedIfEmpty` 가 demo 계정을 만듦).

### UI/UX
해당 없음 (테스트 코드만 추가, 화면 변경 없음)

---

## 4. 기타

### 검증 방법
```bash
cd FrontServer
npx tsc --noEmit     # 통과
npm run lint          # 기존 경고 1건(무관) 외 통과
npm test              # 29/29 통과 (순수 함수, 회귀 없음)
npm run test:e2e      # 8/8 통과 (Chromium, headless)
```

### 트레이드오프 · 결정 이유
- **왜 별도 포트(3310/4310)와 별도 distDir(`.next-e2e`)인가**: 이 저장소는
  평소 개발용 `npm run dev`(3100/4000)를 켜 둔 채로 작업하는 경우가 많다.
  Next.js는 프로젝트 디렉터리당 `.next/dev/lock` 파일로 동시 실행을 막기
  때문에, 기본 포트·기본 `distDir` 로 E2E를 돌리면 이미 떠 있는 개발 서버와
  충돌해 실행 자체가 거부된다. 완전히 격리된 포트·빌드 디렉터리·SQLite 파일을
  써서 평소 켜 둔 dev 서버를 건드리지 않고 병행 가능하게 했다.
- **`gotoStable`/`fillStable` 헬퍼가 필요했던 이유**: 처음 테스트를 작성했을 때
  로그인 등 폼 제출 시나리오가 간헐적으로 멈췄다. 원인을 추적해 보니 Next
  dev(Turbopack)가 라우트를 처음 방문할 때 HTML 응답 이후에도 짧게(~100ms)
  백그라운드에서 Fast Refresh 재컴파일이 도는데, 이 사이에 클릭이 들어오면
  아직 안 붙은 핸들러 때문에 이벤트가 씹혔다(네트워크 로그에 `POST
  /api/auth/login` 자체가 안 찍힘). `page.waitForLoadState("networkidle")` +
  약간의 여유 시간을 페이지 이동 직후에 항상 거치도록 헬퍼로 감쌌다.
  재시도-클릭 방식도 검토했으나, 커뮤니티 글쓰기 같은 비-멱등 액션에서는
  중복 제출 위험이 있어 "미리 안정화를 기다린다" 쪽을 택했다.
- **Chromium만 설치**: 로컬 개인 프로젝트 규모에서 Firefox/WebKit까지 받으면
  설치 시간·디스크만 늘고 얻는 신뢰도 이득이 크지 않다고 판단했다.

### 리스크 · 알려진 이슈
- **Turbopack 첫 컴파일 지연**: 캐시가 없는 `.next-e2e` 로 처음 실행하면 전체
  스위트가 1~3분 걸린다(로드맵 문서에도 이미 기록된 이 저장소의 알려진 특성).
  이후 재실행은 캐시 덕분에 더 빠르다.
- **`tsconfig.json` 자동 변경**: `next dev` 가 `.next-e2e` distDir을 인식하며
  `include` 배열과 포맷팅을 스스로 고쳐 썼다(진짜 필요한 include 2줄 추가 +
  줄바꿈 스타일 변경). 기능상 문제는 없지만 diff가 다소 커 보인다.
- **커버리지가 아직 좁다**: 챗봇·재생목록·팔로우·알림·신고/차단 등은 E2E로
  다루지 않았다. 백엔드 단위 테스트(83건)가 이 영역들을 이미 커버하고 있어
  우선순위가 상대적으로 낮다고 판단했다.

### 후속 작업
- [ ] CI에서 `npm run test:e2e` 실행 여부는 "배포 파이프라인" 작업에서 결정
- [ ] 커버리지 확장(챗봇/재생목록/팔로우) 여부는 필요성 재평가 후 결정

### 참고 링크
- [078 — 메시지 실시간화 (WebSocket)](./078-messages-realtime-ws.md) — 이번 메시지 E2E가 검증하는 기능
- [로드맵](../features/roadmap.md)

---

## 작성 체크리스트

- [x] 문서 번호·파일명 규칙 준수
- [ ] 인덱스 표 업데이트 (`commits/README.md`)
- [ ] CHANGELOG 반영 여부 결정
- [x] Git 해시 기입 (TBD 해소)
- [x] 민감 정보(키, 비밀번호, 개인정보) 없음
