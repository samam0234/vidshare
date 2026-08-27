# 058 — 알림 벌크 읽음/삭제 API

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `058` |
| **파일명** | `058-notification-bulk-endpoints.md` |
| **Git 커밋 (short)** | `ee8612d` |
| **Git 커밋 (full)** | `ee8612d9b339860595496689bf77e0c94343f301` |
| **날짜** | `2026-08-27` |
| **작성자** | `Grok` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
feat: 알림 전체 읽음/삭제 벌크 엔드포인트

PATCH /api/notifications/read-all, DELETE /api/notifications.
프론트 스토어는 Promise.all N요청 대신 한 번만 호출한다.

상세: docs/commits/058-notification-bulk-endpoints.md
```

---

## 2. 개요

### 배경
054에서 전체 읽음/삭제를 넣었지만 백엔드에 일괄 API가 없어
알림 50개면 PATCH/DELETE가 50번 나갔다. 부분 실패 시 롤백도 애매했다.

### 목표
- 본인 알림만 한 쿼리로 전체 읽음/삭제
- UI는 그대로. 스토어 내부만 교체

### 범위 (In Scope)
- store CRUD 2함수
- `PATCH /read-all`, `DELETE /`
- `lib/api.ts` + `notifications-store.ts`

### 범위 밖 (Out of Scope)
- 알림 수신 거부 서버 반영 (Phase B)
- 팝업 바깥 클릭 닫기 (A3)
- 전체 삭제 확인 모달 (A4)

---

## 3. 구현 기능 · 변경 사항

### 기능 / 동작
- [x] `PATCH /api/notifications/read-all` → `{ count }` (안읽음만 `read=1`)
- [x] `DELETE /api/notifications` → `{ count }` (본인 행만 삭제)
- [x] 두 경로 모두 `requireRequestUser` + `WHERE owner_id = ?`
- [x] `/read-all` 과 `DELETE /` 를 `/:id` 보다 먼저 등록
- [x] 스토어는 낙관적 갱신 후 실패 시 이전 배열로 롤백

### 주요 변경 파일·경로

| 경로 | 변경 유형 | 설명 |
|------|-----------|------|
| `BackendServer/src/data/store.ts` | 수정 | `markAllActivityNotificationsRead`, `deleteAllActivityNotifications` |
| `BackendServer/src/routes/notifications.ts` | 수정 | 벌크 라우트 2개 |
| `FrontServer/lib/api.ts` | 수정 | `markAllNotificationsRead`, `clearAllNotifications` |
| `FrontServer/lib/notifications-store.ts` | 수정 | `Promise.all` 제거 |

### 데이터·API

```
PATCH  /api/notifications/read-all
DELETE /api/notifications

{ "success": true, "data": { "count": 3 } }
```

개별 `PATCH /:id`, `DELETE /:id` 는 유지.

---

## 4. 기타

### 검증 방법
```bash
cd BackendServer && npx tsc --noEmit
cd FrontServer && npx tsc --noEmit && npm run lint
```

로그인 후 알림 여러 개 만든 뒤 read-all → 전부 read. 다른 계정 알림은 그대로.
DELETE / 후 본인 목록만 비움.

### 트레이드오프 · 결정 이유
- 설계안을 그대로 따름. UI 변경 없음.
- 실패 시 markAll도 롤백으로 통일 (054는 refresh 재동기화였음).

### 리스크 · 알려진 이슈
- 클라이언트 목록과 서버가 어긋난 채 전체 삭제를 누르면 서버의 나머지 알림도 지워진다. 의도된 “본인 전체” 동작.

### 후속 작업
- [ ] A3 팝업 바깥 클릭 닫기
- [ ] A4 전체 삭제 확인 모달
