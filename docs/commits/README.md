# 커밋 상세 기록 가이드

Git 커밋 메시지는 짧게 남기고, **배경·구현 범위·검증 방법**은 이 폴더의 Markdown에 남깁니다.

커밋 메시지보다 **항상 더 상세**하게 작성하는 것이 목적입니다.

---

## 왜 따로 쓰나

| Git commit message | `docs/commits/*.md` |
|--------------------|---------------------|
| 한두 줄 요약 | 개요 + 구현 기능 + 기타 |
| `git log` 로 훑기 | 온보딩·회고·인수인계 |
| 변경 파일 목록은 diff | 의도·트레이드오프 설명 |

---

## 파일 규칙

### 파일명

```
NNN-짧은-영문-slug.md
```

- `NNN`: 3자리 순번 (`001`, `002`, …) — **이 폴더 안에서의 문서 번호**
- `slug`: 소문자, 하이픈 (예: `vidshare-frontend-redesign`)

예: `002-vidshare-frontend-redesign.md`

### 순번 vs Git 해시

| 필드 | 의미 |
|------|------|
| 문서 번호 (`NNN`) | docs 안 순서. 사람이 읽기 쉬운 인덱스 |
| Git 커밋 해시 | `git rev-parse --short HEAD` 등 실제 커밋 ID |
| (선택) 전체 해시 | 감사·추적용 |

해시가 아직 없으면 `TBD` 로 두고, **커밋 직후 갱신**합니다.

---

## 작성 절차 (체크리스트)

1. [TEMPLATE.md](./TEMPLATE.md) 복사 → 새 파일명으로 저장
2. **커밋 번호·제목·개요·구현 기능·기타** 작성
3. 아래 [인덱스](#인덱스) 표에 행 추가
4. (권장) [../changelog/CHANGELOG.md](../changelog/CHANGELOG.md) 요약 반영
5. 코드 + 이 MD 를 함께 `git add`
6. `git commit`
7. 생성된 **해시**를 MD의 `Git 커밋` 필드에 기입 후 amend **하지 말고**,  
   해시만 고치는 작은 후속 커밋을 하거나, 커밋 전에 메시지 확정 후  
   `git log -1 --format=%h` 로 채워 **같은 커밋에 포함**하는 방식을 선호

> 실무 팁: 상세 MD를 먼저 쓰고, 커밋 메시지 첫 줄은 MD 제목과 맞춥니다.  
> 해시는 커밋 후 `002` 문서에 패치 커밋으로 넣어도 됩니다.

---

## 템플릿 필수 섹션

1. **메타** — 문서 번호, Git 해시, 날짜, 작성자, 관련 이슈
2. **커밋 내용** — git 메시지에 넣을 한 줄 + 본문 초안
3. **개요** — 왜 이 변경을 했는지
4. **구현 기능 / 변경 사항** — 체크리스트·경로
5. **기타** — 트레이드오프, 후속 과제, 검증, 리스크

전체 골격: [TEMPLATE.md](./TEMPLATE.md)

---

## 인덱스

| 문서 번호 | 파일 | Git (short) | 한 줄 요약 | 날짜 |
|-----------|------|-------------|------------|------|
| 001 | [001-initial-create-next-app.md](./001-initial-create-next-app.md) | `7dcb8d8` | Create Next App 초기 스캐폴드 | 2026-08-14 |
| 002 | [002-vidshare-frontend-redesign.md](./002-vidshare-frontend-redesign.md) | `630d716` | VidShare 프론트 리디자인 + docs | 2026-08-14 |
| 003 | [003-split-front-backend-servers.md](./003-split-front-backend-servers.md) | `5dccd96` | FrontServer / BackendServer 분리 | 2026-08-14 |
| 004 | [004-nest-servers-under-vidshare.md](./004-nest-servers-under-vidshare.md) | `dd0e585` | 서버 폴더를 vidshare 하위로 배치 | 2026-08-14 |
| 005 | [005-move-docs-to-root.md](./005-move-docs-to-root.md) | `5a64037` | 문서를 루트 `docs/`로 이동 + Git 루트 상향 | 2026-08-14 |
| 006 | [006-track-backend-server.md](./006-track-backend-server.md) | `c0ee728` | BackendServer 소스를 저장소에 추가 | 2026-08-14 |
| 007 | [007-content-store-serial-ids.md](./007-content-store-serial-ids.md) | `a0a845c` | 작성 콘텐츠 일련번호 스토어 | 2026-08-15 |
| 008 | [008-longform-pages.md](./008-longform-pages.md) | `52c05e1` | 롱폼 영상 목록·작성·상세 | 2026-08-15 |
| 009 | [009-community-pages.md](./009-community-pages.md) | `dfe9870` | 커뮤니티 목록·작성·상세 | 2026-08-15 |
| 010 | [010-chatbot-pages.md](./010-chatbot-pages.md) | `75a5869` | 챗봇 대화 목록·상세 | 2026-08-15 |
| 011 | [011-messages-notifications-serial.md](./011-messages-notifications-serial.md) | `9ebfb23` | 메시지·알림 작성 기반 상세 | 2026-08-15 |
| 012 | [012-navbar-new-tags-hamburger.md](./012-navbar-new-tags-hamburger.md) | `4bc6809` | 네비 롱폼·커뮤니티·챗봇 + 햄버거 | 2026-08-15 |
| 013 | [013-button-svg-pointer-events.md](./013-button-svg-pointer-events.md) | `1207823` | 버튼 안 SVG 클릭 수정 | 2026-08-15 |
| 014 | [014-support-faq-user-self-help.md](./014-support-faq-user-self-help.md) | `6c409b5` | 고객센터 FAQ 유저 자가해결 안내 | 2026-08-15 |
| 015 | [015-support-inquiry-message.md](./015-support-inquiry-message.md) | `6363ed4` | 고객센터 문의 메시지 | 2026-08-15 |
| 016 | [016-noto-sans-css-font.md](./016-noto-sans-css-font.md) | `c0ed3f7` | Turbopack next/font 오류 우회 | 2026-08-15 |
| 017 | [017-navbar-lg-hamburger-click.md](./017-navbar-lg-hamburger-click.md) | `5be7e28` | 넓은 화면 메뉴 + 햄버거 클릭 | 2026-08-15 |
| 018 | [018-notif-theme-click.md](./018-notif-theme-click.md) | `4f353d4` | 알림 팝업·테마 전환 클릭 복구 | 2026-08-15 |
| 019 | [019-lan-dev-access.md](./019-lan-dev-access.md) | `fa96be5` | 개발 서버 LAN 접속 | 2026-08-15 |
| 020 | [020-backend-auth-session.md](./020-backend-auth-session.md) | `7cf452f` | Backend 회원가입·로그인·세션 API | 2026-08-19 |
| 021 | [021-front-auth-pages.md](./021-front-auth-pages.md) | `b59de8d` | 로그인·회원가입 페이지 | 2026-08-19 |
| 022 | [022-navbar-session-user.md](./022-navbar-session-user.md) | `5709d20` | Navbar·프로필 세션 연결 | 2026-08-19 |
| 023 | [023-add-root-plan.md](./023-add-root-plan.md) | `eefcdda` | 루트 계획서 plan.md | 2026-08-19 |
| 024 | [024-register-validation.md](./024-register-validation.md) | `144966c` | 회원가입 검증·비밀번호 확인 | 2026-08-20 |
| 025 | [025-lan-api-host.md](./025-lan-api-host.md) | `7496ff3` | LAN 접속 시 호스트 IP로 API 호출 | 2026-08-20 |
| 026 | [026-sqlite-persist.md](./026-sqlite-persist.md) | `f8733fc` | Backend SQLite 영속화 | 2026-08-20 |
| 027 | [027-message-thread-open.md](./027-message-thread-open.md) | `1ac1db3` | 메시지 상대 클릭 시 대화창 열기 | 2026-08-20 |
| 028 | [028-guest-read-only.md](./028-guest-read-only.md) | `f6992a2` | 비회원은 쇼츠·롱폼·커뮤니티 열람만 | 2026-08-20 |
| 029 | [029-chatbot-models.md](./029-chatbot-models.md) | `50bfe29` | 챗봇 Locals·Vide·Shape | 2026-08-20 |
| 030 | [030-chatbot-workspace.md](./030-chatbot-workspace.md) | `a974e9e` | 챗봇 왼쪽 기록·아래 입력줄 | 2026-08-20 |
| 031 | [031-locals-flash-memory.md](./031-locals-flash-memory.md) | `cd53689` | Locals 이 방 Flash급 기억 | 2026-08-20 |
| 032 | [032-chatbot-model-tiers.md](./032-chatbot-model-tiers.md) | `c044ca5` | Locals·Vide·Shape 프롬프트 | 2026-08-20 |
| 033 | [033-chatbot-conversation-engine.md](./033-chatbot-conversation-engine.md) | `c044ca5` | Locals·Vide·Shape 대화 엔진 | 2026-08-20 |
| 034 | [034-chatbot-real-llm.md](./034-chatbot-real-llm.md) | `c044ca5` | 챗봇 실제 LLM 호출 | 2026-08-20 |
| 035 | [035-chatbot-langgraph-rag.md](./035-chatbot-langgraph-rag.md) | `c044ca5` | LangChain·LangGraph·RAG | 2026-08-20 |
| 036 | [036-chatbot-rag-multimodal.md](./036-chatbot-rag-multimodal.md) | `a5927ad` | 챗봇 RAG 고도화 & 멀티모달 지원 | 2026-08-22 |
| 037 | [037-front-api-connection.md](./037-front-api-connection.md) | `204c3c7` | Front ↔ API 전면 연동 | 2026-08-23 |
| 038 | [038-sqlite-schema-extend.md](./038-sqlite-schema-extend.md) | `f1b0388` | SQLite 스키마 확장 (8개 테이블) | 2026-08-24 |
| 039 | [039-store-crud-functions.md](./039-store-crud-functions.md) | `88b7c2e` | store.ts CRUD 함수 확장 | 2026-08-24 |
| 040 | [040-backend-routes-content.md](./040-backend-routes-content.md) | `9b11cc5` | 롱폼·커뮤니티 라우트 | 2026-08-24 |
| 041 | [041-backend-routes-messages.md](./041-backend-routes-messages.md) | `645a9c1` | 대화(conversations) 라우트 | 2026-08-24 |
| 042 | [042-backend-routes-chatbot.md](./042-backend-routes-chatbot.md) | `683f209` | 챗봇 스레드·메시지 라우트 | 2026-08-24 |
| 043 | [043-backend-routes-support.md](./043-backend-routes-support.md) | `acd4ec4` | 고객센터·알림 라우트 + 인증 미들웨어 | 2026-08-24 |
| 044 | [044-frontend-api-client.md](./044-frontend-api-client.md) | `187b0e0` | API 클라이언트 확장 | 2026-08-24 |
| 045 | [045-frontend-notifications-store.md](./045-frontend-notifications-store.md) | `3673806` | 알림 스토어 (useSyncExternalStore) | 2026-08-24 |
| 046 | [046-frontend-chatbot-corpus.md](./046-frontend-chatbot-corpus.md) | `6a9eb39` | 챗봇 RAG 코퍼스 수집 | 2026-08-24 |
| 047 | [047-frontend-components-content.md](./047-frontend-components-content.md) | `29f0cd1` | 롱폼·커뮤니티 컴포넌트 API 연동 | 2026-08-24 |
| 048 | [048-frontend-components-messages.md](./048-frontend-components-messages.md) | `40a202f` | 메시지 컴포넌트 API 연동 | 2026-08-24 |
| 049 | [049-frontend-chatbot-workspace.md](./049-frontend-chatbot-workspace.md) | `0a271f1` | 챗봇 워크스페이스 게스트/회원 모드 | 2026-08-24 |
| 050 | [050-frontend-finalization.md](./050-frontend-finalization.md) | `f975d80` | 고객센터 컴포넌트 API 연동 | 2026-08-24 |
| 051 | [051-frontend-notification-components.md](./051-frontend-notification-components.md) | `b5265c9` | 알림 UI + Navbar 배지 통합 | 2026-08-24 |
| 052 | [052-frontend-lint-finalization.md](./052-frontend-lint-finalization.md) | `015458d` | content-store 축약·ContentState 제거 | 2026-08-24 |
| 053 | [053-notification-read-unread-visual.md](./053-notification-read-unread-visual.md) | `d28cda0` | 알림 읽음/안읽음 시각 구분 강화 | 2026-08-24 |
| 054 | [054-notification-store-settings.md](./054-notification-store-settings.md) | `2be566d` | 알림 수신 on/off·전체 읽음·전체 삭제 | 2026-08-24 |
| 055 | [055-notification-popup-settings-ui.md](./055-notification-popup-settings-ui.md) | `034ec73` | 알림 팝업 위치·설정 패널 개편 | 2026-08-24 |
| 056 | [056-documentation-handover-finalization.md](./056-documentation-handover-finalization.md) | `TBD` | 전체 문서 인수인계용 갱신 (053-055 문서화, 아키텍처·로드맵·CHANGELOG 갱신) | 2026-08-26 |

---

## 좋은 예 / 나쁜 예

**좋은 커밋 메시지**
```
feat: 쇼츠 피드와 프로필·업로드 UI 추가

mock 데이터 기반 데모. 상세: docs/commits/002-....md
```

**나쁜 예**
```
update
fix
ㅁㄴㅇㄹ
```

---

## 관련 문서

- [docs 가이드](../README.md)
- [CHANGELOG](../changelog/CHANGELOG.md)
- [템플릿](./TEMPLATE.md)
