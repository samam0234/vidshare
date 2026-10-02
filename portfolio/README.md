# portfolio/

VidShare 프로젝트를 **코드를 열지 않고도** 설명하기 위한 자료 모음입니다.

```
portfolio/
├── VidShare-포트폴리오.md      ← 문서 본문 (원본)
├── VidShare-포트폴리오.docx    ← 위 파일에서 생성 (제출용 문서)
├── VidShare-포트폴리오.pptx    ← 발표용 슬라이드 (서비스 소개, 24장)
├── build_docx.py               ← md → docx 변환기
├── build_pptx.py                ← 슬라이드 생성기 (내용은 이 파일 안 데이터)
├── serve.py                    ← 소개 사이트 로컬 서버
└── site/                       ← 소개 사이트 (HTML · CSS · JS)
    ├── index.html              ← 메인 — 소개 · 목차 · 기능 · 상세 페이지 진입
    ├── frontend.html           ← 사용자 웹앱
    ├── console.html            ← 관리자 콘솔
    ├── backend.html            ← REST API 서버
    └── assets/
        ├── css/style.css
        ├── js/main.js          ← 라이트박스 · 스크롤 등장 · 목차 활성화
        └── screenshots/        ← 실행 중인 앱에서 캡처한 20장
```

세 가지 형태(문서·슬라이드·사이트)는 **성격이 다릅니다.**
문서는 구현 디테일(API·파일 구조·트레이드오프)까지 담은 인수인계용,
슬라이드는 코드 이야기를 빼고 **서비스가 무엇을 하는지**만 화면 위주로 보여주는 발표용,
사이트는 그 중간 — 구조 설명은 있지만 코드 조각은 없습니다.

---

## 사이트 보기

```bash
python portfolio/serve.py            # http://localhost:4500
python portfolio/serve.py 4600       # 포트 지정
```

정적 파일뿐이라 `site/index.html` 을 브라우저로 직접 열어도 보입니다.

사용자 사이트 푸터의 **"프로젝트 소개"** 링크가 이 사이트를 가리킵니다.
주소는 `FrontServer/.env.local` 의 `NEXT_PUBLIC_PORTFOLIO_URL` 로 바꿀 수 있습니다.

---

## 문서 다시 만들기

`VidShare-포트폴리오.md` 를 고친 뒤:

```bash
pip install python-docx     # 최초 1회
python portfolio/build_docx.py
```

`build_docx.py` 는 범용 마크다운 변환기가 아니라 **이 문서가 실제로 쓰는 문법만**
다룹니다 — 제목, 표, 코드블록, 목록, 인용, `**굵게**`, `` `인라인 코드` ``, 구분선.
새 문법을 본문에 쓰면 변환기도 같이 손봐야 합니다.

---

## 발표 슬라이드 (PPTX) 다시 만들기

코드 리뷰가 아니라 **서비스 소개** 관점의 덱입니다. API 목록·파일 구조 같은
구현 디테일은 담지 않고, 화면 스크린샷이 슬라이드의 주인공입니다.

```bash
pip install python-pptx    # 최초 1회
python portfolio/build_pptx.py
```

`build_pptx.py` 는 슬라이드를 **레이아웃 헬퍼(도형·텍스트·화면 프레임)** 와
**내용(문구·화면 목록)** 으로 나눠서 짰습니다. 문구만 고치려면 `build()` 함수
안의 문자열만 바꾸면 되고, 새 화면을 추가하려면 `screen_slide(...)` 호출을
한 줄 더 넣으면 됩니다.

스크린샷은 `site/assets/screenshots/` 것을 그대로 재사용합니다 — 먼저
[스크린샷을 최신으로 갱신](#스크린샷-다시-찍기)한 뒤 이 스크립트를 돌리세요.

> **PowerPoint 스키마 주의**: 도형에 그림자(`shadow=True`)를 줄 때 python-pptx의
> `shape.shadow.inherit = False` 가 이미 빈 `<a:effectLst/>` 를 심어 둔다. 여기에
> 새 `<a:effectLst>` 를 또 추가하면 같은 부모 아래 요소가 두 번 생겨 OOXML 스키마를
> 위반한다 — python-pptx는 눈감아 주지만 **실제 PowerPoint는 파일을 열지 못한다.**
> `rect()` 헬퍼가 기존 요소를 찾아 채우는 방식으로 이미 처리해 뒀으니, 새로 그림자
> 효과를 넣을 땐 이 패턴을 따를 것.

---

## 스크린샷 다시 찍기

스크린샷은 **실행 중인 앱**에서 Playwright로 캡처합니다. 목업이 아닙니다.

세 서버를 먼저 띄우고, 관리자 계정이 없으면 만듭니다.

```bash
cd BackendServer && npm run dev      # :4000
cd FrontServer   && npm run dev      # :3000
cd console       && npm run dev      # :3200

cd BackendServer && npm run create-admin -- portfolioadmin <password>
```

그다음:

```bash
cd FrontServer
CAPTURE_ADMIN_HANDLE=<handle> CAPTURE_ADMIN_PASSWORD=<password> npm run portfolio:shots
```

20장이 `portfolio/site/assets/screenshots/` 에 덮어써집니다.

관리자 자격 증명은 **환경 변수로만** 받습니다(소스에 비밀번호를 두지 않기 위해).
넘기지 않으면 콘솔 로그인 화면까지만 찍고 나머지 관리자 화면 5장은 건너뜁니다.

> **찍기 전에** 개발 DB의 테스트 데이터를 한번 훑어보는 편이 좋습니다.
> 화면에 남아 있는 실험용 글이 그대로 스크린샷에 찍힙니다.

---

## 관련 문서

| 위치 | 내용 |
|------|------|
| [../README.md](../README.md) | 저장소 개요 · 실행 방법 |
| [../plan.md](../plan.md) | 기획서 — 계기와 방식 비교 |
| [../docs/architecture/overview.md](../docs/architecture/overview.md) | 현재 구조 전체 |
| [../docs/security/security-notes.md](../docs/security/security-notes.md) | 보안 체크리스트와 남은 위험 |
| [../docs/features/roadmap.md](../docs/features/roadmap.md) | 남은 과제 |
