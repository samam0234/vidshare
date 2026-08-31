# 077 — 알림 실시간화 (SSE)

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `077` |
| **파일명** | `077-notifications-realtime-sse.md` |
| **Git 커밋 (short)** | `TBD` |
| **Git 커밋 (full)** | `TBD` |
| **날짜** | `2026-08-31` |
| **작성자** | `GitHub Copilot (pair)` |
| **브랜치** | `master` |
| **로드맵 항목** | D6 — 알림 실시간화 |

---

## 1. 커밋 내용

```
feat: 알림 실시간화 (SSE)

- Server-Sent Events 로 알림 폴링을 대체
- EventEmitter 기반 notificationBus, createActivityNotification 에서 발행
- GET /api/notifications/stream (인증 필요, keep-alive ping)
- 프론트: notifications-store 에 EventSource 연결/해제 관리
- 백엔드 테스트 2건 추가 (총 79건)
```

---

## 2. 개요

알림은 페이지 진입 시 한 번 `GET /api/notifications` 로 불러올 뿐, 그 이후 새 알림이
생겨도 사용자가 새로고침하거나 알림 패널을 다시 열기 전까지는 화면에 나타나지 않았다.
로드맵 D6 "알림 실시간화"를 SSE(Server-Sent Events)로 구현했다.

**왜 WebSocket이 아니라 SSE인가**: 알림은 서버→클라이언트 단방향 스트림이면 충분하고,
브라우저 표준 `EventSource` 가 재연결·이벤트 파싱을 자동으로 처리해 준다. 별도
라이브러리(`ws`, `socket.io`) 없이 express 라우트 하나로 구현 가능해 기존 스택에
가장 적은 변화로 붙일 수 있었다.

---

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `BackendServer/src/realtime/notificationBus.ts` | 신규 — `EventEmitter` 기반 pub/sub |
| `BackendServer/src/data/store.ts` | `createActivityNotification` 에서 저장 직후 `publishNotification` 호출 |
| `BackendServer/src/routes/notifications.ts` | `GET /stream` 신규 (인증, keep-alive) |
| `BackendServer/tests/notifications.test.ts` | 스트림 인증/실시간 수신 테스트 2건 |
| `FrontServer/lib/notifications-store.ts` | `EventSource` 연결/해제, 수신 시 목록 맨 위에 추가 |

---

## 4. 설계

### 4.1 이벤트 버스

```ts
export const notificationBus = new EventEmitter();
notificationBus.setMaxListeners(0); // 접속자 수만큼 리스너가 붙으므로 상한 해제

export function publishNotification(ownerId, notification) {
  notificationBus.emit(ownerId, notification);
}
```

`owner_id` 를 이벤트 채널명으로 그대로 쓴다. 사용자별로 별도의 큐/토픽을 두지 않고
"내 알림"이라는 개념 자체가 이미 owner_id 로 격리돼 있으므로 자연스럽게 맞아떨어진다.

`createActivityNotification` 은 **수신 OFF 인 사용자에겐 애초에 저장도 하지 않으므로**
(064에서 만든 정책) SSE 발행도 자동으로 스킵된다 — 별도 분기 없이 기존 정책을 그대로 탄다.

### 4.2 라우트

```ts
router.get("/stream", (req, res) => {
  const user = requireRequestUser(req); // 비로그인 401
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // 프록시가 버퍼링해 이벤트가 지연되는 것 방지
  });
  res.write(": connected\n\n");
  const onNotification = (n) => res.write(`event: notification\ndata: ${JSON.stringify(n)}\n\n`);
  notificationBus.on(user.id, onNotification);
  const keepAlive = setInterval(() => res.write(": ping\n\n"), 25000);
  keepAlive.unref(); // 이 인터벌 하나 때문에 서버/테스트 프로세스가 종료되지 않는 일이 없도록
  req.on("close", () => { clearInterval(keepAlive); notificationBus.off(user.id, onNotification); });
});
```

`/settings`, `/read-all` 과 마찬가지로 `/:id` 라우트보다 먼저 등록해야 하는 규칙을
따랐다(이번엔 `/:id` 에 해당하는 GET 라우트가 아예 없어 충돌 위험은 없었지만, 관례상
동일 위치에 배치).

**`keepAlive.unref()`가 중요했던 이유**: 처음 테스트를 작성했을 때 이 unref 없이
연결을 강제로 끊어도 `setInterval` 자체가 이벤트 루프를 붙잡고 있어 `node:test`
프로세스가 절대 자연 종료되지 않고 무한 대기하는 문제가 있었다. unref 처리 후
정상 종료됨을 확인했다.

### 4.3 프론트 스토어

```ts
function connectStream() {
  if (typeof window === "undefined" || eventSource || !enabled) return;
  eventSource = new EventSource(`${api.baseUrl}/api/notifications/stream`, { withCredentials: true });
  eventSource.addEventListener("notification", (e) => {
    const n = JSON.parse(e.data);
    if (items.some((x) => x.id === n.id)) return; // 중복 방지
    items = [n, ...items];
    emit();
  });
}
```

- `refreshNotifications()` 성공 후 `connectStream()` 호출 → 로그인 상태에서만, 중복 없이 1회만 연결.
- `resetNotifications()`(로그아웃), `setNotificationsEnabled(false)`(수신 끔) 시 `disconnectStream()`.
- 브라우저 표준 `EventSource` 는 연결이 끊기면 자동 재연결하므로 프론트에서 별도
  재시도 로직을 구현하지 않았다.

---

## 5. 검증

### 백엔드 자동화 테스트 (2건 추가, 총 79건)

| 확인 | 결과 |
|------|------|
| 비로그인 스트림 연결 401 | ✅ |
| 로그인 시 `text/event-stream` 응답 + 알림 발생 시 즉시 이벤트 수신 | ✅ |

두 번째 테스트는 실제 http 서버를 띄우고 `fetch` + `AbortController` 로 스트림을
읽다가 `event: notification` 이 도착하면 즉시 확인·해제하는 방식으로 작성했다.
(최초엔 `http.request` 로 작성했다가 프로세스가 종료되지 않는 문제를 겪어 `fetch`
+ `keepAlive.unref()` 조합으로 교체.)

`npm run typecheck` 통과, 전체 79/79 통과, 프로세스 정상 종료 확인.

### 브라우저 실측

1. 로그인 상태(demo)에서 raw `EventSource` 를 열어 `readyState === 1`(OPEN) 확인.
2. 새 계정을 만들어 demo 를 팔로우 → **새로고침 없이** demo 쪽에 연결해 둔 `EventSource`
   가 `event: notification` 을 즉시 수신함을 확인:
   ```
   {"id":16,"category":"follower","message":"SSE Tester 님이 회원님을 팔로우합니다.", ...}
   ```
   팔로우 발생 시점과 이벤트 도착 시점 사이에 폴링/새로고침이 전혀 없었다.

---

## 6. 남은 한계

1. **단일 서버 프로세스 전제** — `notificationBus` 는 프로세스 메모리 내 `EventEmitter`
   라서 서버를 여러 인스턴스로 수평 확장하면 각 인스턴스가 자신에게 붙은 접속자에게만
   이벤트를 전달한다. Redis pub/sub 등 외부 브로커 없이는 멀티 인스턴스 환경에서
   일부 접속자가 이벤트를 못 받을 수 있다. 지금 규모(단일 프로세스)에서는 문제 없음.
2. **읽음 처리/삭제는 여전히 폴링(요청-응답) 기반** — 실시간화한 건 "새 알림 도착"
   뿐이고, 다른 탭에서 읽음 처리해도 이 탭에 실시간으로 반영되진 않는다.
3. **메시지(1:1 대화)는 별도** — 이번 실시간화는 활동 알림(`activity_notifications`)
   에 한정되고, `/messages` 대화 갱신은 여전히 폴링이다(로드맵의 "실시간 메시지"는
   별개 항목으로 남겨둠).
4. **재연결 시 유실 구간 보정 없음** — 연결이 끊겼다 브라우저가 자동 재연결하는
   사이에 발생한 알림은 다음 `refreshNotifications()` 호출(페이지 재방문 등) 전까지
   놓칠 수 있다. `Last-Event-ID` 기반 재전송은 구현하지 않았다.

---

## 7. 관련 문서

- [064 — 알림 수신 설정](./064-notification-settings.md) (OFF 사용자는 저장 자체를 안 하는 정책, 이번에도 그대로 적용)
- [로드맵 D6](../features/roadmap.md)
