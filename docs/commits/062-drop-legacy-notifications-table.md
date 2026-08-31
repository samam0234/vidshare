# 062 — 레거시 notifications 테이블 정리

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `062` |
| **파일명** | `062-drop-legacy-notifications-table.md` |
| **Git 커밋 (short)** | `b77e4dc` |
| **Git 커밋 (full)** | `b77e4dcac816460ebb4b766bc5f0d8143a743319` |
| **날짜** | `2026-08-31` |
| **작성자** | `GitHub Copilot (pair)` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |
| **로드맵 항목** | Phase A — A5 |

---

## 1. 커밋 내용

```
refactor: 레거시 notifications 테이블 및 죽은 코드 제거

- schema.ts: CREATE TABLE notifications 제거
- client.ts: 기존 DB 대상 DROP TABLE IF EXISTS notifications 마이그레이션
- store.ts: 미사용 listNotifications/deleteNotification/patchNotification 제거
- seedData.ts, seed.ts: seedNotifications 시드 제거
- types/index.ts: Notification 타입 제거 (NotificationCategory 는 유지)
```

---

## 2. 개요

커밋 038에서 소유자 스코프를 가진 `activity_notifications` 를 추가하면서
초기 목업용 `notifications` 테이블이 함께 남았다. 두 테이블이 이름만 비슷한 채로 공존해
"어느 쪽이 진짜인가"를 매번 확인해야 했고, 아키텍처 문서에도 경고로 적어 둔 상태였다.

확인 결과 레거시 쪽은 **어떤 라우트에서도 호출되지 않는 죽은 코드**였다.

| 심볼 | 호출처 |
|------|--------|
| `listNotifications()` | 없음 |
| `deleteNotification()` | 없음 |
| `patchNotification()` | 없음 |
| `seedNotifications` | `db/seed.ts` 시드 루프뿐 |

`/api/notifications` 라우트는 전부 `*ActivityNotification*` 계열만 쓴다.

> 참고: 프론트 `lib/api.ts` 의 `patchNotification` / `deleteNotification` 은
> 이름만 같을 뿐 `/api/notifications/:id` 를 호출하는 **클라이언트 메서드**이며,
> 서버에서는 `activity_notifications` 로 처리된다. 이번 삭제와 무관하다.

---

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `BackendServer/src/db/schema.ts` | `CREATE TABLE notifications` 블록 제거 |
| `BackendServer/src/db/client.ts` | `DROP TABLE IF EXISTS notifications` 마이그레이션 추가 |
| `BackendServer/src/data/store.ts` | 죽은 함수 3개 + `Notification` import 제거 (약 -80줄) |
| `BackendServer/src/data/seedData.ts` | `seedNotifications` 배열 + import 제거 (약 -50줄) |
| `BackendServer/src/db/seed.ts` | `insertNotif` prepare + 시드 루프 + import 제거 |
| `BackendServer/src/types/index.ts` | `Notification` 타입 제거 |

프론트엔드 변경 없음.

---

## 4. 마이그레이션 처리

`schema.ts` 는 `CREATE TABLE IF NOT EXISTS` 만 실행하므로,
정의를 지워도 **이미 만들어진 DB 파일에서는 테이블이 사라지지 않는다.**
따라서 `initDb()` 에 명시적 DROP 을 넣었다.

```ts
db.exec(SCHEMA_SQL);
ensureColumn(db, "shorts", "thumb", "TEXT");
// 레거시 목 알림 테이블. 지금은 activity_notifications 만 쓴다.
db.exec("DROP TABLE IF EXISTS notifications");
```

`IF EXISTS` 라서 새 DB에서도 안전하고, 재기동해도 반복 실행에 문제가 없다.

### `NotificationCategory` 를 남긴 이유

`AppNotification`(= `activity_notifications` 의 도메인 타입)이 이 유니온을 그대로 쓴다.
카테고리 정의 자체는 레거시가 아니라 현행이므로 유지했다.

---

## 5. 검증

### 정적 검사
- `npx tsc --noEmit` (BackendServer) 통과 — 미사용 import 잔재 없음

### 실제 DB 마이그레이션
```
# 서버 기동 전
notification tables: activity_notifications, notifications

# npm run dev 기동 후
notification tables: activity_notifications
```

### API 스모크 테스트
| 요청 | 결과 |
|------|------|
| `GET /api/health` | 200 |
| `POST /api/auth/login` (demo) | 200 |
| `GET /api/notifications` | 200, 0건 |
| `GET /api/shorts` | 200, 7건 |

시드가 도는 경로(빈 DB)도 `seedIfEmpty` 에서 알림 삽입만 빠졌을 뿐
users/shorts/comments/chat_users/messages/faqs 는 그대로다.

---

## 6. 영향 및 주의

1. **데이터 손실**: 기존 DB의 `notifications` 행은 삭제된다.
   목업 시드 데이터였고 어떤 화면도 읽지 않았으므로 실사용 영향은 없다.
2. **롤백**: 이 커밋을 되돌리면 테이블 정의는 복구되지만 **데이터는 복구되지 않는다**
   (시드는 `users` 가 비어 있을 때만 돌기 때문). 필요하면 DB 파일을 지우고 재생성해야 한다.
3. `DROP TABLE` 은 일회성 정리 목적이다. 마이그레이션이 더 늘어나면
   버전 테이블을 둔 정식 마이그레이션 체계로 옮기는 편이 낫다.

---

## 7. 관련 문서

- [038 — SQLite 스키마 확장](./038-sqlite-schema-extend.md) (`activity_notifications` 도입)
- [아키텍처 개요](../architecture/overview.md) (이중화 경고 제거 대상)
- [로드맵 Phase A](../features/roadmap.md)
