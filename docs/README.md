# VidShare Docs 가이드

이 폴더는 VidShare 프로젝트의 **설계·이력·보안·커밋 상세**를 README보다 깊게 정리하기 위한 문서 공간입니다.

루트 [README.md](../README.md) 는 “소개 + 실행 + 기능 요약”용이고,  
`docs/` 는 “왜 이렇게 만들었는지 / 무엇을 바꿨는지 / 다음에 무엇을 할지”용입니다.

---

## 폴더 구조

```
docs/
├── README.md                 ← 지금 이 파일 (docs 이용 가이드)
├── architecture/             ← 아키텍처
│   └── overview.md
├── features/                 ← 추가 기능·로드맵
│   └── roadmap.md
├── changelog/                ← 수정·변경 내용
│   └── CHANGELOG.md
├── security/                 ← 보안 포인트
│   └── security-notes.md
└── commits/                  ← 커밋 상세 기록
    ├── README.md             ← 커밋 문서 작성 가이드
    ├── TEMPLATE.md           ← 복사용 템플릿
    └── *.md                  ← 커밋별 상세 기록
```

---

## 언제 어떤 문서를 보나

| 상황 | 볼 문서 |
|------|---------|
| 앱을 처음 실행한다 | 루트 `README.md` |
| 폴더 구조·데이터 흐름을 이해한다 | `architecture/` |
| 다음에 무엇을 만들지 정한다 | `features/roadmap.md` |
| “언제 뭐가 바뀌었지?” | `changelog/CHANGELOG.md` |
| 보안상 주의할 점 | `security/security-notes.md` |
| 특정 커밋이 무엇을 했는지 (git 메시지보다 상세) | `commits/` |

---

## 문서 작성 규칙 (공통)

1. **언어**: 한국어 우선 (코드·경로·API 이름은 영문 유지)
2. **날짜**: `YYYY-MM-DD` (예: 2026-08-14)
3. **경로**: `vidshare/FrontServer/` 또는 `vidshare/` 기준 상대 경로 사용
4. **범위 명시**: “구현됨 / 계획 / 미구현”을 구분
5. **중복 최소화**: 요약은 README, 상세는 docs. 같은 내용을 두 곳에 길게 복붙하지 않기
6. **링크**: 관련 파일·이슈·커밋 문서를 서로 링크

---

## 문서 업데이트 타이밍

| 작업 | 업데이트할 곳 |
|------|----------------|
| 새 기능 구현 | `changelog/` + 필요 시 `architecture/`, `features/` |
| 버그 수정·리팩터 | `changelog/` |
| 보안 관련 변경 | `security/` + `changelog/` |
| Git 커밋 | **`commits/` 에 상세 MD를 먼저(또는 직후) 작성** → git commit |
| 로드맵 변경 | `features/roadmap.md` |

---

## 커밋 상세 문서 워크플로 (권장)

Git 커밋 메시지는 짧게, **무엇을·왜 했는지** 는 `docs/commits/` 에 남깁니다.

1. [commits/TEMPLATE.md](./commits/TEMPLATE.md) 를 복사
2. 파일명: `NNN-짧은-영문-slug.md` (예: `002-shorts-feed-ui.md`)
3. 템플릿 항목 채우기 (개요, 구현 기능, 기타)
4. `commits/README.md` 인덱스 표에 한 줄 추가
5. `changelog/CHANGELOG.md` 에 요약 한 줄 추가 (선택, 권장)
6. `git add` → `git commit`

자세한 규칙은 [commits/README.md](./commits/README.md) 를 따르세요.

---

## 새 문서 추가 시

1. 알맞은 하위 폴더에 `.md` 생성
2. 이 파일(docs README) 구조 목록에 경로 반영 (필요할 때만)
3. 루트 README의 [문서](../README.md#문서) 표는 폴더 단위만 유지

---

## 관련 링크

- 앱 실행·기능 소개: [../README.md](../README.md)
- 프론트 가이드: [../FrontServer/README.md](../FrontServer/README.md)
- 백엔드 가이드: [../BackendServer/README.md](../BackendServer/README.md)
- 기존 HTML 프로토타입: `../../oldplanHTML/` (project 루트)
