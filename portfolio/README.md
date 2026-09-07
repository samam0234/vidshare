# portfolio/

VidShare 프로젝트를 **코드를 열지 않고도** 설명하기 위한 자료 모음입니다.

```
portfolio/
├── VidShare-포트폴리오.md      ← 본문 (원본)
├── VidShare-포트폴리오.docx    ← 위 파일에서 생성 (제출용)
├── build_docx.py               ← md → docx 변환기
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
