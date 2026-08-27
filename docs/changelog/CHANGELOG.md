# 변경 이력 (Changelog)

형식: [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/) 스타일을 느슨하게 따릅니다.  
커밋 **상세** 기록은 [../commits/](../commits/) 를 참고하세요.

---

## [Unreleased]

### Added
- SQLite 테이블·행 덤프 `BackendServer/data/DataBaseColumn.md` (쓰기 시 자동 갱신, gitignore)
- 알림 팝업 바깥 클릭 닫기 (커밋 059)
- 알림 벌크 API (커밋 058): `PATCH /api/notifications/read-all`, `DELETE /api/notifications`
- **로컬 디스크 파일 스토리지** (커밋 057): `POST /api/uploads`, `GET /uploads/:file`. 영상 100MB / 이미지 8MB, UUID 파일명
- 쇼츠 `thumb` 컬럼. 프로필 그리드·비디오 poster에 사용
- **localStorage → SQLite 전면 이관** (커밋 038~052): 콘텐츠 상태를 전부 서버 영속화
- SQLite 스키마 8개 테이블 추가: `longform`, `community_posts`, `chatbot_threads`, `chatbot_messages`, `conversations`, `chat_lines`, `support_inquiries`, `activity_notifications`
- 백엔드 라우트 신설: `/api/longform`, `/api/community`, `/api/conversations`, `/api/chatbot/threads`, `/api/support/inquiries`
- `requireRequestUser()` 인증 미들웨어 (401 일괄 처리)
- `lib/notifications-store.ts` — `useSyncExternalStore` 기반 알림 전역 스토어
- `lib/chatbot-corpus.ts` — Shape 모델용 RAG 코퍼스 수집
- 알림 읽음/안읽음 시각 구분 (점 인디케이터, NEW 배지, 미읽 카운트)
- 알림 수신 on/off 토글 (localStorage), 전체 읽음 처리, 전체 삭제
- 알림 팝업 설정 패널 (톱니바퀴) + 목록 페이지 바로가기 (문서 아이콘)
- Front ↔ API 전면 연동: ShortsFeed·ProfilePageClient·UploadForm을 mock에서 서버 API로 교체
- 쇼츠 목록/댓글 로드, 댓글 작성, 좋아요 토글, 사용자 프로필 조회, 쇼츠 생성 모두 API 호출
- 로딩·에러·빈 목록 상태 UI 피드백
- BackendServer 소스를 저장소에 추가 (Express REST, 인메모리 store)
- 작성 콘텐츠 일련번호 스토어 (`content-store`, SerialBadge)
- 롱폼 영상 목록·작성·상세 (`/longform`)
- 커뮤니티 목록·작성·상세 (`/community`)
- 챗봇 대화 목록·상세 (`/chatbot`)
- 메시지·알림 작성 기반 일련번호 상세 (`/messages/:id`, `/notifications/:id`)
- 고객센터 문의 메시지 (`/support`, `/support/:id`)
- Backend 인메모리 인증 (bcrypt + HttpOnly 세션, `demo`/`demo1234`)
- 로그인·회원가입 페이지 (`/login`, `/register`)
- Navbar·프로필 세션 사용자 표시
- 루트 계획서 `plan.md` (계기·방식 비교)
- Backend SQLite 영속화 (`data/vidshare.sqlite`, 계정·세션·쇼츠)
- 챗봇 모델 Locals(무료·비회원) / Vide·Shape(회원)
- 챗봇 워크스페이스 (왼쪽 저장 기록, 파일 첨부, 모델 선택)
- 챗봇 Locals·Vide·Shape가 원격 LLM을 직접 호출 (핸드북 매칭 제거)
- 챗봇 LangChain·LangGraph·RAG: Locals 단순 체인, Vide 요약 그래프, Shape 저장 대화 검색
- 챗봇 플랫폼 JSON 스냅샷 + 커뮤니티/롱폼 RAG 검색 (실시간 쇼츠·유저·FAQ 현황 반영)
- 챗봇 이미지/PDF/DOCX 첨부 읽기 (Locals·Vide는 Gemini 비전 직접, Shape는 Gemini 설명 경유)
- 챗봇 봇 답변 마크다운 렌더링 (굵게·이탤릭·취소선·목록)

### Changed
- 쇼츠·롱폼 작성은 data URL을 저장하지 않고 업로드 URL 또는 http(s)만 허용
- 쇼츠 생성 API는 로그인 필수 (`requireRequestUser`)
- 챗봇 워크스페이스 게스트/회원 모드 분리 (게스트는 메모리, 회원은 SQLite 영속화)
- 알림 팝업을 포털/`fixed` 배치에서 벨 버튼 기준 `absolute` 배치로 변경
- `lib/content-store.ts` 를 `formatSerial`/`formatWhen` 두 유틸만 남기고 축약 (~1000줄 → ~50줄)
- `ContentState` 타입 및 `useContentStore` 계열 함수 제거
- 챗봇 저장 기록에서 방 이름 수정·삭제
- 챗봇 Locals·Vide·Shape 시스템 프롬프트 분리
- 비회원은 쇼츠·롱폼·커뮤니티 열람만 (작성·메시지·업로드는 로그인)
- 비회원 챗봇은 저장 기록·새 방 없이 Locals만
- 회원가입: 비밀번호 확인, 필드 검증, 핸들 소문자 정규화
- 프로젝트 문서를 `FrontServer/docs/` 에서 루트 `docs/` 로 이동
- Git 저장소 루트를 `FrontServer/` 에서 `vidshare/` 로 이동 (루트 docs 추적)
- 네비: 메시지/알림 텍스트 제거, 롱폼·커뮤니티·챗봇 추가, 좁은 화면 햄버거
- 고객센터 FAQ를 유저가 직접 할 수 있는 짧은 안내로 변경

### Fixed
- `support_inquiries` 컬럼 불일치 (`author_id` → `owner_id`)
- `useEffect` 내 `setState` 린트 위반 (`queueMicrotask` 래핑으로 통일)
- 버튼 안 SVG 클릭이 아이콘 선 사이로 빠지던 문제
- Turbopack `next/font/google` 모듈 해석 오류 (Noto Sans KR CSS 링크로 우회)
- 네비가 세 줄 모드에 고정되던 문제 (`lg` 이상 메뉴 노출, 좁을 때 햄버거 클릭)
- 알림 종·테마 버튼이 클릭되지 않던 문제 (댓글 패널 히트박스, 테마 래퍼)
- localhost만 되고 LAN IP로 개발 서버에 접속되지 않던 문제
- LAN으로 열면 API가 localhost로 고정되지 않게 (브라우저 호스트:4000)
- 메시지 상대를 눌러도 대화창이 안 열리던 문제 (localStorage 하이드)

### 예정 (다음 작업자용, 상세는 features/roadmap.md)
- 전체 삭제 확인 모달 (P0)
- 레거시 `notifications` 테이블 정리 (P0)
- 통합 검색, 팔로우, 실시간 알림/메시지 (P1)
- 자동화 테스트 (현재 0건), 배포 파이프라인 (P1)

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
