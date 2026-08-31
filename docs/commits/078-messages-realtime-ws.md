# 078 — 실시간 메시지 (WebSocket)

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `078` |
| **파일명** | `078-messages-realtime-ws.md` |
| **Git 커밋 (short)** | `41dfaae` |
| **Git 커밋 (full)** | `41dfaaef151c13b5ad571512b8b62c2e571bafa3` |
| **날짜** | `2026-09-01` |
| **작성자** | `Claude (pair)` |
| **브랜치** | `master` |
| **로드맵 항목** | Phase B — 실시간 메시지 |

---

## 1. 커밋 내용

```
feat: 메시지 실시간화 (WebSocket)

- 1:1 대화(conversations/chat_lines)를 WebSocket으로 실시간 송수신
- EventEmitter 기반 chatBus, addChatLine 에서 발행 (SSE 알림과 동일 패턴)
- ws 패키지로 /ws/conversations 를 세션 쿠키로 인증, http 서버에 upgrade 로 연결
- WS로 보내면 REST 없이 즉시 브로드캐스트, 연결이 없으면 기존 REST로 폴백
- 프론트: chat-socket 스토어가 로그인 시 연결, 로그아웃 시 해제(Navbar)
- 백엔드 테스트 4건 추가 (총 83건)
```

---

## 2. 개요

### 배경
로드맵 Phase B 마지막 미착수 항목. 077(알림 SSE)의 "남은 한계" 절에서도 "메시지는
별개 항목"이라고 명시적으로 남겨 둔 다음 작업이었다. 실제로 조사해보니 `/messages`
는 폴링조차 없었고(마운트 시 1회 fetch 후 끝), 다른 탭/기기에서 보낸 메시지가
현재 열려 있는 탭에 반영될 방법이 전혀 없었다.

### 목표
`/messages` 대화가 새로고침이나 재조회 없이 실시간으로 갱신되게 한다. 이번 로드맵
문구가 "WebSocket 채팅"으로 명시돼 있어, 알림(SSE, 단방향)과 달리 송신도 같은
채널로 처리하는 진짜 양방향 통신으로 구현했다.

### 범위 (In Scope)
- `conversations`/`chat_lines` 테이블 기반 메시지 실시간 송수신 (WS)
- 세션 쿠키 인증을 WS 업그레이드 요청에도 동일하게 적용
- WS 연결 끊김 시 기존 REST 전송으로 자동 폴백
- 메시지 목록(`/messages`)의 `lastMessage` 미리보기도 실시간 갱신

### 범위 밖 (Out of Scope)
- 레거시 `messages`/`chat_users` 라우트(`/api/messages/*`, 인증 없음, 프론트 미사용)는
  건드리지 않았다 — 별도 정리 대상으로 남겨 둔다.
- 읽음/타이핑 표시, 다중 인스턴스(Redis pub/sub 등) 수평 확장은 다루지 않았다.
- 대화 상대는 여전히 실제 다른 VidShare 계정이 아니라 본인이 붙이는 라벨(`targetName`)
  이다 — 이 구조 자체는 이번 작업의 범위가 아니다. 실시간화의 실질 효과는 "같은
  계정으로 연 다른 탭/기기 사이의 즉시 동기화"다.

---

## 3. 구현 기능 · 변경 사항

### 기능 / 동작
- [x] `GET`(업그레이드) `/ws/conversations` — 세션 쿠키 인증, owner_id 채널 구독
- [x] WS로 `{ type: "send", conversationId, content, isImage? }` 전송 → 저장 후 본인의
      모든 연결에 `{ type: "chat_line", data }` 브로드캐스트
      (전송한 소켓 자신도 포함 — 낙관적 UI 업데이트 대신 브로드캐스트 수신으로 화면 반영)
- [x] REST `POST /api/conversations/:id/lines` 로 보낸 메시지도 동일하게 브로드캐스트됨
- [x] WS 연결이 없거나 끊긴 경우 프론트가 자동으로 REST 전송으로 폴백
- [x] 유효하지 않은 대화 id로 send 시 `{ type: "error", message }` 프레임 응답
- [x] 3초 후 자동 재연결(의도적 종료 제외), 25초 간격 ping keep-alive

### 주요 변경 파일·경로
| 경로 | 변경 유형 | 설명 |
|------|-----------|------|
| `BackendServer/src/realtime/chatBus.ts` | 추가 | owner_id 채널 `EventEmitter` (notificationBus와 동일 패턴) |
| `BackendServer/src/realtime/chatSocket.ts` | 추가 | `/ws/conversations` 업그레이드 처리, 인증, 송수신 핸들러 |
| `BackendServer/src/data/store.ts` | 수정 | `addChatLine` 에서 저장 직후 `publishChatLine` 호출 |
| `BackendServer/src/index.ts` | 수정 | `app.listen` → `http.createServer(app)` + `attachChatSocket(server)` |
| `BackendServer/src/app.ts` | 수정 | 엔드포인트 목록에 `WS /ws/conversations` 추가(안내용) |
| `BackendServer/package.json` | 수정 | `ws`, `@types/ws` 추가 |
| `BackendServer/tests/chat-socket.test.ts` | 추가 | 인증 거부/송수신/에러 프레임/REST↔WS 교차 브로드캐스트 4건 |
| `FrontServer/lib/chat-socket.ts` | 추가 | 싱글턴 WebSocket 연결 관리, 구독/전송/재연결 |
| `FrontServer/components/layout/Navbar.tsx` | 수정 | 로그인 시 `connectChatSocket()`, 로그아웃 시 `disconnectChatSocket()` |
| `FrontServer/components/messages/MessageThread.tsx` | 수정 | WS 구독으로 새 줄 반영, 전송은 WS 우선·REST 폴백 |
| `FrontServer/components/messages/MessagesPageClient.tsx` | 수정 | WS로 들어온 새 줄로 목록 미리보기 실시간 갱신 |

### 데이터·API
- 신규 테이블 없음. 기존 `conversations`/`chat_lines` 그대로 사용.
- 신규 엔드포인트: `WS /ws/conversations` (HTTP REST가 아니라 업그레이드 연결).
- 기존 REST(`GET/POST /api/conversations`, `POST /api/conversations/:id/lines`)는 그대로 유지 — 최초 로딩과 WS 폴백에 계속 쓰인다.

### UI/UX
- `/messages/[id]` 에서 메시지를 보내면(WS 연결 시) REST 왕복을 기다리지 않고 브로드캐스트
  수신으로 즉시 화면에 붙는다.
- 같은 계정으로 두 개의 탭을 열어 두면, 한 탭에서 보낸 메시지가 다른 탭에도 즉시 나타난다
  (새로고침 불필요) — 이번 실시간화의 가장 체감되는 변화.
- `/messages` 목록에서도 대화 미리보기(`lastMessage`)가 상세 페이지를 열지 않고도 갱신된다.

---

## 4. 기타

### 검증 방법
```bash
# 백엔드
npx tsc --noEmit && npm run typecheck   # 통과
npm test                                 # 83/83 통과 (신규 4건 포함)

# 프론트
npx tsc --noEmit                         # 통과
npm run lint                             # 기존 경고 1건(무관) 외 통과

# 수동 확인 (node ws 클라이언트로 스모크 테스트, 이후 정리)
# 1. demo 로그인 → 세션 쿠키 획득
# 2. 대화 생성(POST /api/conversations)
# 3. ws://localhost:4000/ws/conversations 연결(Cookie 헤더 포함)
# 4. { type: "send", conversationId, content } 전송
# 5. 동일 소켓으로 { type: "chat_line", data } 즉시 수신 확인 → 성공, 테스트용 대화는 DB에서 정리함
```

### 트레이드오프 · 결정 이유
- **왜 SSE가 아니라 WS인가**: 알림(077)은 서버→클라이언트 단방향이면 충분해 SSE를
  택했지만, 메시지는 로드맵 문구 자체가 "WebSocket 채팅"이었고 송신까지 같은 채널로
  묶는 게 왕복(REST POST 응답 대기 → 로컬 낙관적 갱신) 없이 더 단순한 데이터 흐름을
  만든다고 판단했다.
- **WS 송신 성공 시에도 REST 낙관적 갱신을 하지 않음**: 클라이언트가 보낸 메시지도
  서버의 브로드캐스트(`chat_line`)를 받아서만 화면에 반영한다. 이렇게 하면 "내가
  보낸 메시지"와 "다른 탭에서 온 메시지"를 같은 코드 경로로 처리할 수 있고, id 중복
  걱정 없이 단일 진입점(구독 콜백)만 유지하면 된다. 대신 왕복 지연(로컬 네트워크
  기준 수 ms) 동안 메시지가 아주 잠깐 늦게 뜬다 — 체감상 무시할 수준.
  REST 폴백 경로는 여전히 응답 기반 낙관적 갱신을 쓴다(WS가 아예 연결되지 않은
  경우에 대한 안전망이라 별도 취급).
- **인증 재사용**: 별도 토큰 체계를 만들지 않고 기존 `vidshare_sid` 세션 쿠키를
  업그레이드 요청 헤더에서 직접 파싱했다(`cookie-parser` 미들웨어는 raw upgrade
  요청에는 적용되지 않으므로 최소한의 수동 파서를 작성). SSE와 동일한 신뢰 모델.
- **레거시 `/api/messages/*` 라우트는 손대지 않음**: 조사 중 인증이 없고 프론트에서
  전혀 참조하지 않는 죽은 코드로 보이는 별도의 메시징 시스템(`chat_users`/`messages`
  테이블)을 발견했다. 이번 작업과 무관해 범위에서 제외했다 — 072(mock-data 정리)
  나 062(레거시 테이블 정리)와 같은 후속 정리 커밋에서 다룰 만하다.

### 리스크 · 알려진 이슈
- **단일 프로세스 전제** — `chatBus` 도 `notificationBus` 와 동일하게 프로세스 메모리
  `EventEmitter` 다. 수평 확장 시 인스턴스 간 브로드캐스트가 전달되지 않는다(077과
  동일한 한계, 지금 규모에서는 문제 없음).
- **CSRF 신뢰 모델 동일** — WS 업그레이드도 세션 쿠키만으로 인증하며 별도 Origin
  검증이나 CSRF 토큰이 없다. 기존 SSE 엔드포인트와 동일한 신뢰 모델을 그대로 따른
  것으로, 이번 작업에서 새로 생긴 취약점은 아니다.
- **대화 상대가 실제 유저가 아님** — 위에서 언급했듯 `targetName` 은 자유 라벨이라,
  진짜 두 계정 간 실시간 채팅을 시연하려면 대화 참여자 모델 자체를 바꿔야 한다.

### 후속 작업
- [ ] 레거시 `/api/messages/*`, `chat_users`/`messages` 테이블 정리 여부 결정
- [ ] E2E 테스트(Playwright) 도입 시 이 기능도 시나리오에 포함
- [ ] (장기) 대화 상대를 실제 유저 계정과 연결하는 모델로 전환할지 검토

### 참고 링크
- [077 — 알림 실시간화 (SSE)](./077-notifications-realtime-sse.md) — 이번 작업이 그대로 따른 인증·이벤트 버스 패턴의 원형
- [로드맵](../features/roadmap.md)

---

## 작성 체크리스트

- [x] 문서 번호·파일명 규칙 준수
- [ ] 인덱스 표 업데이트 (`commits/README.md`)
- [ ] CHANGELOG 반영 여부 결정
- [x] Git 해시 기입 (TBD 해소)
- [x] 민감 정보(키, 비밀번호, 개인정보) 없음
