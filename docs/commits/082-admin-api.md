# 082 — 관리자 API (신고·유저·콘텐츠·고객센터)

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `082` |
| **파일명** | `082-admin-api.md` |
| **Git 커밋 (short)** | `b747b89` |
| **Git 커밋 (full)** | `b747b89fed93217bb7847226b56257667dbc4dbb` |
| **날짜** | `2026-09-01` |
| **작성자** | `Claude (pair)` |
| **브랜치** | `master` |
| **로드맵 항목** | 운영 — 관리자 콘솔 (2/4) |

---

## 1. 커밋 내용

```
feat: 관리자 API — 신고·유저·콘텐츠·고객센터·대시보드

- GET/PATCH /api/admin/reports
- GET /api/admin/users, PATCH /api/admin/users/:id/suspend
- DELETE /api/admin/content/{shorts,longform,community,comments}/:id
- GET/PATCH /api/admin/support/inquiries
- GET /api/admin/dashboard/stats
- deleteComment 의 삭제 본체를 deleteCommentRow 로 분리
- 백엔드 테스트 32건 추가 (95 → 127)
```

---

## 2. 개요

### 배경
081에서 "관리자로 로그인한다"까지 됐다. 이제 로그인한 관리자가 실제로 할 일을
붙인다.

### 목표
사용자가 결정한 1차 범위 4개 — 신고 조회·처리 / 유저 목록·정지 / 콘텐츠 삭제 /
고객센터 문의 전체 조회·답변 — 를 전부 API로 제공한다. 화면은 083~084.

### 범위 (In Scope)
- 관리자 라우트 5개 파일, 엔드포인트 11개
- `store.ts` 에 관리자 전용 조회/변경 함수
- 문의 조회 응답에 `adminReply`/`repliedAt` 포함 (사용자 화면에서도 답변이 보이게)

### 범위 밖 (Out of Scope)
- **업로드 원본 파일 삭제**: 이 저장소에는 파일 수명주기를 관리하는 코드가
  아직 어디에도 없다(057에서 업로드만 만들고 삭제는 넣지 않았다). 관리자
  삭제만 예외로 파일을 지우면 일관성이 오히려 깨진다. DB 레코드만 지운다.
- **감사 로그**: 누가 무엇을 지웠는지 기록하지 않는다. 단일 관리자 체계에서
  당장 필요하지 않고, 넣으려면 테이블이 하나 더 필요하다.
- 신고 대상으로 바로 이동/삭제하는 연결. 지금은 관리자가 `targetId` 를 보고
  콘텐츠 탭에서 직접 찾는다.

---

## 3. 구현 기능 · 변경 사항

### 기능 / 동작
- [x] 신고 목록을 신고자 핸들과 함께 조회, `?status=` 필터
- [x] 신고 상태를 `open` / `resolved` / `dismissed` 로 변경 (되돌리기 가능)
- [x] 유저 목록(역할·정지 여부·가입일), `?q=` 로 핸들·이름 검색
- [x] 유저 정지/해제. **정지 시 그 유저의 세션을 전부 삭제**해 즉시 로그아웃
- [x] 자기 자신·다른 관리자 정지는 400 (콘솔 잠금 방지)
- [x] 쇼츠·롱폼·커뮤니티·댓글 삭제
- [x] 전체 문의 조회(`?unreplied=1`), 답변 등록 → 작성자에게 알림
- [x] 운영 지표 8종을 한 번에 주는 대시보드 통계

### 주요 변경 파일·경로
| 경로 | 변경 유형 | 설명 |
|------|-----------|------|
| `BackendServer/src/routes/admin/reports.ts` | 추가 | 목록·상태 변경 |
| `BackendServer/src/routes/admin/users.ts` | 추가 | 목록·정지 (자기보호 가드) |
| `BackendServer/src/routes/admin/content.ts` | 추가 | 4종 삭제 |
| `BackendServer/src/routes/admin/support.ts` | 추가 | 전체 문의·답변 |
| `BackendServer/src/routes/admin/dashboard.ts` | 추가 | 통계 |
| `BackendServer/src/data/store.ts` | 수정 | 관리자 섹션 신설, `deleteCommentRow` 추출, `INQUIRY_SELECT` 확장 |
| `BackendServer/src/app.ts` | 수정 | 라우터 등록 + 안내 엔드포인트 목록 |
| `BackendServer/tests/admin-api.test.ts` | 추가 | 32건 |

### 데이터·API
```
GET    /api/admin/reports?status=open|resolved|dismissed
PATCH  /api/admin/reports/:id                    { status }
GET    /api/admin/users?q=
PATCH  /api/admin/users/:id/suspend              { suspended }
DELETE /api/admin/content/shorts/:id
DELETE /api/admin/content/longform/:id
DELETE /api/admin/content/community/:id
DELETE /api/admin/content/comments/:id
GET    /api/admin/support/inquiries?unreplied=1
GET    /api/admin/support/inquiries/:id
PATCH  /api/admin/support/inquiries/:id/reply    { reply }
GET    /api/admin/dashboard/stats
```
전부 첫 줄에서 `requireAdmin(req)` 를 통과해야 한다.

### UI/UX
사용자 쪽 `/support/:id` 에 관리자 답변 블록이 생긴다(084에서 화면 반영).

---

## 4. 기타

### 검증 방법
```bash
cd BackendServer
npm run typecheck   # 통과
npm test            # 127/127 통과 (기존 95 + 신규 32)
```

### 트레이드오프 · 결정 이유
- **`deleteCommentRow` 추출**: 관리자 삭제에 "소유자 확인만 없는" 코드를 복사하면
  답글 정리·`comment_count` 감소 로직이 두 벌이 된다. 소유권 검사 **이후**의
  본체만 뽑아 `deleteComment`(본인)와 `adminDeleteComment`(관리자)가 함께 쓴다.
- **쇼츠 삭제에 별도 정리 코드가 없는 이유**: `comments.short_id` 와
  `playlist_items.short_id` 가 `ON DELETE CASCADE` 라 SQLite 가 알아서 지운다
  (`foreign_keys = ON` 은 `initDb()` 에서 켜 둔다). 테스트로 확인해 뒀다.
- **관리자 정지 금지**: 관리자가 하나뿐인 체계에서 자기 자신을 정지시키면
  콘솔에 다시 들어갈 방법이 없다. 서버에 붙어 SQL을 직접 고쳐야 하는 상황을
  400 하나로 막는 편이 싸다. 다른 관리자도 같은 이유로 막았다.
- **문의 답변을 새 테이블이 아니라 컬럼으로**: 답변이 한 건뿐이라(스레드가 아님)
  `admin_reply` / `replied_at` 두 컬럼이면 충분하다. 주고받는 대화가 필요해지면
  그때 테이블로 옮긴다.

### 리스크 · 알려진 이슈
- 삭제한 쇼츠·롱폼의 업로드 파일은 `/uploads` 에 남는다(범위 밖 참고).
- 관리자 조치 이력이 남지 않는다. 누가 지웠는지 추적하려면 감사 로그가 필요하다.
- `listAllReports` 는 페이지네이션이 없다. 신고가 수천 건 쌓이면 한 번에 다
  내려온다 — 지금 규모에서는 문제되지 않지만 커지면 손봐야 한다.

### 후속 작업
- [x] 083 — 콘솔 앱 뼈대
- [x] 084 — 콘솔 화면
- [ ] 관리자 활동 감사 로그
- [ ] 신고 목록 페이지네이션

### 참고 링크
- [081 — 관리자 스키마·인증](./081-admin-auth.md)
- [083 — 관리자 콘솔 뼈대](./083-console-scaffold.md)
- [057 — 파일 스토리지](./057-file-storage.md) — 업로드 파일에 삭제 경로가 없는 배경

---

## 작성 체크리스트

- [x] 문서 번호·파일명 규칙 준수
- [x] 인덱스 표 업데이트 (`commits/README.md`)
- [x] CHANGELOG 반영 여부 결정
- [x] Git 해시 기입 (TBD 해소)
- [x] 민감 정보(키, 비밀번호, 개인정보) 없음
