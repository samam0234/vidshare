# 추가 기능 · 로드맵

**상태**: 계획 문서
**최종 갱신**: 2026-08-26
**용도**: 다음 작업자(사람/에이전트)가 **무엇부터 손대야 하는지** 판단하는 기준

현재 구현 상태 전체는 [architecture/overview.md](../architecture/overview.md) 를 먼저 읽으세요.

---

## 1. 구현 완료

### 프론트엔드
- [x] 쇼츠 피드 (스냅, 좋아요/싫어요, 댓글 패널, 공유)
- [x] 프로필 탭·정렬·그리드
- [x] 롱폼 목록·작성·상세
- [x] 커뮤니티 목록·작성·상세
- [x] 메시지 대화 목록·스레드·전송
- [x] 알림 목록·상세·읽음/삭제·수신 토글·읽음 시각 구분
- [x] 챗봇 워크스페이스 (게스트/회원 모드, 3모델, 첨부, 마크다운)
- [x] 고객센터 FAQ + 문의 작성·목록·상세
- [x] 로그인·회원가입, 비회원 열람 전용 정책
- [x] 다크/라이트 테마, 공통 Navbar/Footer

### 백엔드
- [x] Express + TypeScript + better-sqlite3 (18개 테이블)
- [x] 인증 (bcrypt + HttpOnly 세션 쿠키)
- [x] 쇼츠·댓글·유저·롱폼·커뮤니티·대화·알림·고객센터·챗봇 REST API
- [x] `requireRequestUser()` 인증 미들웨어, `owner_id` 스코프 격리
- [x] 챗봇 LLM 연동 (LangChain/LangGraph, RAG, 멀티모달)

### 구조
- [x] FrontServer / BackendServer 분리
- [x] localStorage → SQLite 전면 이관 (커밋 038~052)
- [x] `lib/api.ts` 단일 통신 창구화
- [x] 로컬 디스크 파일 스토리지 (`POST /api/uploads`, `/uploads`)
- [x] 알림 벌크 읽음/삭제 (`PATCH /read-all`, `DELETE /api/notifications`)
- [x] 알림 팝업 바깥 클릭 닫기

---

## 2. Phase A — 완료 (P0)

| # | 작업 | 결과 |
|---|------|------|
| A1 | ~~파일 스토리지~~ | **완료 (057)** — `uploads/` 디스크 + 쇼츠/롱폼 실파일 |
| A2 | ~~알림 벌크 엔드포인트~~ | **완료 (058)** — `PATCH /read-all`, `DELETE /` |
| A3 | ~~팝업 outside-click 닫기~~ | **완료 (059)** — `notifRef` 밖 `pointerdown` |
| A4 | ~~전체 삭제 확인 모달~~ | **완료 (061)** — `confirmClear` 뷰, 건수 표시 후 실행 |
| A5 | ~~레거시 테이블 정리~~ | **완료 (062)** — `notifications` DROP + 죽은 코드 제거 |

**Phase A 전량 완료 (2026-08-31).** 다음은 Phase B로 넘어간다.

### 다음에 착수할 것 (권장 순서)

1. **통합 검색** — 사용자가 가장 먼저 아쉬워하는 기능. 기존 테이블만으로 구현 가능
2. **알림 수신 거부 서버 반영** — 054에서 남긴 클라이언트 전용 한계 해소
3. **팔로우** — 관계 테이블 신설이 필요해 설계 비중이 큼
4. **자동화 테스트** — 기능이 늘기 전에 도입할수록 이득 (현재 0건)

---

## 3. Phase B — 제품 기능 (P1)

| 기능 | 설명 | 비고 |
|------|------|------|
| 통합 검색 | 쇼츠 외 롱폼·커뮤니티·유저까지 서버 검색 | 현재 Navbar 검색은 `/?q=` 쇼츠 전용 |
| 팔로우 | 팔로우/언팔, 팔로잉 피드 | `users` 테이블에 관계 테이블 추가 필요 |
| 알림 실시간화 | 폴링 → SSE 또는 WebSocket | `notifications-store` 의 `refreshNotifications` 대체 |
| 실시간 메시지 | WebSocket 채팅 | `conversations` / `chat_lines` 기반 |
| 알림 수신 거부 서버 반영 | 현재는 클라이언트 localStorage 전용 | `users` 에 설정 컬럼 + 알림 생성부 분기 |
| 댓글 대댓글 | 계층 댓글 | `comments` 에 `parent_id` |
| 재생목록 | 프로필 탭 실구현 | 신규 테이블 |
| 신고·차단 | 모더레이션 기초 | 신규 테이블 |

---

## 4. Phase C — 품질·운영 (P1~P3)

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 자동화 테스트 | 현재 **테스트 0건**. 단위 + E2E(Playwright) | P1 |
| 배포 파이프라인 | CI, preview, 프로덕션 | P1 |
| 서버 상태 캐싱 | React Query/SWR 도입 (현재 컴포넌트마다 중복 페치) | P2 |
| 접근성 | 키보드·ARIA 전면 점검 | P2 |
| 성능 | 영상 lazy, 가상 스크롤, LCP | P2 |
| 에러 바운더리 | 페이지 단위 실패 격리 | P2 |
| `mock-data.ts` 제거 | 잔존 코드 정리 | P3 |
| 분석 | 조회수·체류 이벤트 | P3 |
| i18n | 한/영 | P3 |

---

## 5. 챗봇 개선 (별도 트랙)

| 항목 | 현재 | 목표 |
|------|------|------|
| 응답 방식 | 전체 수신 후 한 번에 표시 | 스트리밍 렌더 |
| 요청 취소 | 불가 | AbortController |
| 게스트 대화 | 새로고침 시 소실 | IndexedDB 임시 영속 |
| RAG | 문자열 매칭 + 코퍼스 수집 | 벡터 DB (임베딩 기반) |
| 토큰 관리 | `length / 4` 근사치 | 실제 토크나이저 |
| 이미지 | 첨부만 | OCR 텍스트 추출 |

---

## 6. 작업 시 지켜야 할 규칙

1. **레이어 순서 준수**
   `db/schema.ts` → `data/store.ts` → `routes/*.ts` → `app.ts` 등록 → `lib/api.ts` → 컴포넌트
2. **응답 형태 고정** — `{ success, data?, error? }`
3. **인증 라우트는 `requireRequestUser(req)` 로 시작**
4. **`useEffect` 안 `setState` 는 `queueMicrotask()` 로 감싼다** (린트 규칙)
5. **색상은 CSS 변수만** (`var(--accent)` 등, 하드코딩 금지)
6. **커밋은 기능 단위로 잘게** + `docs/commits/NNN-*.md` 작성 + 인덱스 갱신
7. 검증: `npx tsc --noEmit` && `npm run lint` (양쪽 서버 모두)

---

## 7. 기능 제안 템플릿

```markdown
### [제안] 기능 이름
- **목적**:
- **사용자 시나리오**:
- **영향 범위** (페이지/API/테이블):
- **우선순위**: P0 / P1 / P2 / P3
- **의존성**:
- **완료 기준**:
```

---

## 8. 관련 문서

- [아키텍처 (현재 상태 전체)](../architecture/overview.md)
- [보안](../security/security-notes.md)
- [변경 이력](../changelog/CHANGELOG.md)
- [커밋 상세](../commits/README.md)
