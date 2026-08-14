# 변경 이력 (Changelog)

형식: [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/) 스타일을 느슨하게 따릅니다.  
커밋 **상세** 기록은 [../commits/](../commits/) 를 참고하세요.

---

## [Unreleased]

### Added
- BackendServer 소스를 저장소에 추가 (Express REST, 인메모리 store)

### Changed
- 프로젝트 문서를 `FrontServer/docs/` 에서 루트 `docs/` 로 이동
- Git 저장소 루트를 `FrontServer/` 에서 `vidshare/` 로 이동 (루트 docs 추적)

### 예정
- FrontServer UI ↔ BackendServer API 전면 연동
- 인증·DB·실업로드 (로드맵 참고)

---

## [0.3.1] - 2026-08-14

### Fixed
- 의도한 구조로 복구: **`vidshare/FrontServer`**, **`vidshare/BackendServer`**
- `vidshare` 폴더를 프로젝트 컨테이너로 유지 (삭제하지 않음)

---

## [0.3.0] - 2026-08-14

### Changed
- 프론트/백엔드 서버 폴더 분리 (`FrontServer` + `BackendServer`)
- `vidshare/README.md` 모노레포 가이드

### Added
- BackendServer (Express + TypeScript, REST API, 인메모리 store)
- FrontServer `lib/api.ts` BackendServer 클라이언트 스텁
- FrontServer `.env.local.example` (`NEXT_PUBLIC_API_URL`)

---

## [0.2.0] - 2026-08-14

### Added
- 쇼츠 피드 UI 및 인터랙션 (스냅 스크롤, 좋아요/싫어요, 댓글, 공유, 키보드 네비)
- 프로필 라이브러리 (탭, 정렬, 그리드)
- 업로드 페이지 (실시간 미리보기, 썸네일)
- 메시지 페이지 (텍스트·이미지, 유저 목록)
- 알림 페이지 (카테고리 필터, 숨김/삭제)
- 고객센터 FAQ 아코디언
- 공통 Navbar / Footer / 알림 팝업
- ThemeContext (다크·라이트, localStorage)
- mock 데이터·공통 타입
- 프로젝트 문서 (`docs/`: architecture, features, changelog, security, commits)
- 루트 README 기능 소개 및 가이드 보강

### Fixed
- ESLint `set-state-in-effect` / refs 관련 이슈 (Theme, Navbar, ShortCard)
- 개발 서버 포트 충돌 시 재실행 안내 (README)

### Changed
- create-next-app 기본 템플릿 UI → VidShare 도메인 UI로 교체

---

## [0.1.0] - 2026-08-14

### Added
- `create-next-app` 초기 스캐폴드 (Next.js, TypeScript, Tailwind, ESLint)

---

## 버전 규칙 (권장)

- **MAJOR**: 호환 깨지는 구조 변경 (예: 라우트 전면 개편)
- **MINOR**: 기능 추가
- **PATCH**: 버그 수정·문서·리팩터

앱이 데모 단계이므로 버전은 문서 기준 추적용입니다. `package.json` 버전과 맞출지는 팀 규칙에 따릅니다.
