# 093 — 포트폴리오 문서·소개 사이트 + 푸터 진입 링크

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `093` |
| **파일명** | `093-portfolio.md` |
| **Git 커밋 (short)** | `003cc9a` |
| **Git 커밋 (full)** | `003cc9a38f8cf46fadaeb61823feca6602cd3e40` |
| **날짜** | `2026-09-08` |
| **작성자** | `Claude` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
feat: 포트폴리오 문서·소개 사이트 + 푸터 진입 링크

portfolio/ 에 포트폴리오 본문(md·docx)과 정적 소개 사이트를 만든다.
스크린샷 20장은 실행 중인 세 앱에서 Playwright 로 캡처한다.
사용자 사이트 푸터 "이용약관" 왼쪽에 "프로젝트 소개" 링크를 깐다.

상세 기록: docs/commits/093-portfolio.md
```

---

## 2. 개요

### 배경

저장소 README는 **실행할 사람**을 위한 문서다. 반면 프로젝트를 평가하거나 처음
훑어보는 사람은 코드를 열기 전에 "이게 뭐고, 왜 이렇게 만들었고, 어디까지 됐는지"를
먼저 알고 싶어 한다. 지금까지 그 층이 없었다.

### 목표

- 코드를 열지 않고도 프로젝트를 파악할 수 있는 자료 한 벌
- 제출 가능한 문서 파일(docx)
- 사용자 사이트에서 곧바로 들어갈 수 있는 진입점

### 범위 (In Scope)

- `portfolio/` 신설 — 본문 md, docx 변환기, 소개 사이트, 로컬 서버
- 스크린샷 자동 캡처 스크립트 (`FrontServer/scripts/capture-portfolio.ts`)
- `public/portfolio` 동기화 스크립트 + npm 라이프사이클 연결
- 푸터 "프로젝트 소개" 링크
- ESLint 생성물 무시 규칙 정리 (아래 4장)

### 범위 밖 (Out of Scope)

- 포트폴리오 사이트를 별도 도메인에 배포하는 일 — 지금은 FrontServer가 함께 서빙한다
- 백엔드 공개 배포 (여전히 로드맵 1순위)

---

## 3. 변경 파일

| 경로 | 변경 | 설명 |
|------|------|------|
| `portfolio/VidShare-포트폴리오.md` | 추가 | 본문 (원본) |
| `portfolio/VidShare-포트폴리오.docx` | 추가 | 위 파일에서 생성 |
| `portfolio/build_docx.py` | 추가 | md → docx 변환기 (python-docx) |
| `portfolio/serve.py` | 추가 | 소개 사이트 로컬 서버 |
| `portfolio/README.md` | 추가 | 폴더 사용법 |
| `portfolio/site/*.html` | 추가 | 메인 + 프론트/콘솔/백엔드 상세 4쪽 |
| `portfolio/site/assets/css/style.css` | 추가 | 공통 스타일 |
| `portfolio/site/assets/js/main.js` | 추가 | 라이트박스 · 스크롤 등장 · 목차 활성화 |
| `portfolio/site/assets/screenshots/*.png` | 추가 | 실행 중인 앱 캡처 20장 |
| `FrontServer/scripts/capture-portfolio.ts` | 추가 | 스크린샷 캡처 (Playwright) |
| `FrontServer/scripts/sync-portfolio.mjs` | 추가 | `portfolio/site` → `public/portfolio` |
| `FrontServer/components/layout/Footer.tsx` | 수정 | "프로젝트 소개" 링크 (이용약관 왼쪽) |
| `FrontServer/package.json` | 수정 | `portfolio:sync`·`portfolio:shots` + `predev`/`prebuild`/`predeploy` |
| `FrontServer/.gitignore` | 수정 | `/public/portfolio/` (생성물) |
| `FrontServer/eslint.config.mjs` | 수정 | `.open-next`·`.next-e2e`·`public/portfolio` 무시 |
| `console/eslint.config.mjs` | 수정 | `.open-next` 무시 |
| `README.md` | 수정 | 화면 미리보기 4장 |
| `docs/architecture/overview.md` | 수정 | 폴더 표에 `portfolio/` 추가 |
| `docs/features/roadmap.md` | 수정 | 구현 완료 항목 추가 |

---

## 4. 결정과 트레이드오프

### 스크린샷은 실행 중인 앱에서 캡처한다

목업을 그리지 않았다. `capture-portfolio.ts` 가 세 서버(4000/3000/3200)에 붙어
게스트 화면 → 로그인 후 화면 → 관리자 콘솔 순으로 20장을 찍는다.
언제든 다시 돌릴 수 있어야 화면이 바뀌었을 때 자료가 낡지 않는다.

API 응답은 **스크린샷을 쓰지 않았다.** 브라우저의 JSON 뷰어는 기본이 한 줄 raw 출력이라
읽을 수 없는 그림이 나온다. 대신 실제 응답을 스타일링한 HTML 코드 블록으로 넣었다.
내용은 실측값 그대로다.

### `public/portfolio` 는 생성물이다

사이트 원본은 `portfolio/site` 하나다. FrontServer가 서빙하려면 `public/` 아래에
있어야 하는데, 두 벌을 git에 두면 반드시 어긋난다.
`sync-portfolio.mjs` 로 복사하고 복사본은 `.gitignore` 에 넣었다.

npm은 `predev`/`prebuild`/`predeploy` 를 자동으로 실행하므로,
**개발자가 동기화를 따로 기억할 필요가 없다.** 원본이 없으면 경고만 남기고
넘어가서 FrontServer만 떼어 쓰는 경우에도 실행을 막지 않는다.

링크는 `/portfolio/` 가 아니라 `/portfolio/index.html` 이다.
Next의 정적 파일 서빙은 디렉터리 인덱스 해석을 보장하지 않는다.

### ESLint가 빌드 산출물을 검사하고 있었다

작업 중 발견했다. `npm run lint` 가 **27,002건(에러 1,148)** 을 뱉고 있었는데,
전부 `.open-next/` 안의 OpenNext 생성 코드였다. 우리 소스는 기존 경고 1건뿐이다.
`globalIgnores` 에 `.open-next/**` 를 넣어 실제 결과가 보이게 했다.
console도 같은 문제였다(7,987건).

린트가 의미 있는 신호를 주지 못하면 사람은 곧 린트를 보지 않게 된다.
포트폴리오 작업과 직접 관련은 없지만, 같이 고치지 않을 이유도 없었다.

### 문서 변환기는 범용이 아니다

`build_docx.py` 는 이 문서가 실제로 쓰는 문법만 다룬다 —
제목·표·코드블록·목록·인용·굵게·인라인코드·구분선.
범용 마크다운 파서를 붙이는 것보다 200줄이 짧고, 표 서식을 원하는 대로 통제할 수 있다.
대신 본문에 새 문법을 쓰면 변환기도 함께 고쳐야 한다 —
그 사실을 `portfolio/README.md` 에 적어 두었다.

---

## 5. 검증

```bash
# 세 앱 정적 검사·테스트
cd BackendServer && npm test          # 137 pass
cd FrontServer   && npm test          # 32 pass
cd FrontServer   && npm run typecheck && npm run lint   # 경고 1건(기존 폰트 경고)
cd console       && npm run typecheck && npm run lint   # 경고 1건(동일)

# 문서 생성
python portfolio/build_docx.py

# 사이트
python portfolio/serve.py             # http://localhost:4500
```

**소개 사이트 자동 점검** (Playwright, 1440 / 1024 / 768 / 390px):

- 네 페이지 모두 가로 스크롤 넘침 **0px**
- 상세 3쪽의 사이드 목차 앵커 **26개 전부** 현재 위치와 일치
- 스크린샷 라이트박스 열기 / Esc 닫기 동작
- 4xx 응답·JS 오류 없음

**푸터 링크 실동작**: `/community` → "프로젝트 소개" 클릭 →
`/portfolio/index.html` (제목 "VidShare — 포트폴리오") → "프론트엔드 살펴보기" →
`/portfolio/frontend.html`, CSS 적용 확인.

### 작업 중 잡은 버그 3건

| 증상 | 원인 | 조치 |
|------|------|------|
| 사이드 목차가 로드 시 아무것도 표시 안 하고, 스크롤하면 한 칸씩 밀림 | `html { scroll-padding-top: 84px }` 와 `.anchor { scroll-margin-top: 84px }` 가 **더해져** 앵커가 168px 아래 착지 | `.anchor` 쪽 제거, 착지 위치는 한 곳에서만 정함 |
| 스크린샷 갤러리에서 스크롤 위치가 밀림 | `loading="lazy"` 이미지에 크기가 없어 로드 시 레이아웃이 밀림 | 모든 `<img>` 에 실제 `width`/`height` 부여 + `height:auto` |
| 모바일 백엔드 페이지 가로 110px 넘침 | 그리드 아이템의 기본 `min-width:auto` 때문에 안쪽 `overflow-x:auto` 가 동작하지 못함 | `.layout > * { min-width: 0 }` |

---

## 6. 리스크 · 알려진 이슈

- 스크린샷에는 **개발 DB의 실험용 데이터**가 그대로 찍혀 있다.
  제출 전에 데이터를 정리하고 `npm run portfolio:shots` 를 다시 돌리는 편이 좋다.
- `portfolio/site` 는 FrontServer 번들에 1.9MB를 더한다. 현재 Workers 한도에는 여유가 있다.
- 소개 사이트에 적은 수치(82개 API, 22개 테이블, 테스트 177건)는 **수동 갱신**이다.
  코드가 바뀌면 어긋날 수 있다.

---

## 7. 후속 작업

- [ ] 백엔드 공개 배포 → 포트폴리오의 "배포된 사이트" 링크가 실제로 동작하게
- [ ] CI에서 `portfolio:sync` 포함 여부 결정
- [ ] 사업자등록 후 `/business` 실정보 기입
