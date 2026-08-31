# 081 — 관리자 스키마·인증 기반

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `081` |
| **파일명** | `081-admin-auth.md` |
| **Git 커밋 (short)** | `a6f9b5b` |
| **Git 커밋 (full)** | `a6f9b5b6b238c028ae6a57c462fd54339cf6c016` |
| **날짜** | `2026-09-01` |
| **작성자** | `Claude (pair)` |
| **브랜치** | `master` |
| **로드맵 항목** | 운영 — 관리자 콘솔 (1/4) |

---

## 1. 커밋 내용

```
feat: 관리자 스키마·인증 기반

- users.role/suspended, reports.status, support_inquiries.admin_reply/replied_at
  컬럼을 기존 ensureColumn 관례로 추가
- Author 에 role 노출, AuthAccount 는 suspended 를 내부에만 유지
- 관리자 세션을 vidshare_admin_sid 로 분리
- requireAdmin 가드, /api/admin/auth 의 login/logout/me
- 정지된 계정은 일반 로그인에서 403
- npm run create-admin 으로 관리자 계정 생성·승격
- 백엔드 테스트 12건 추가 (83 → 95)
```

---

## 2. 개요

### 배경
075에서 신고(`reports`)를 받기 시작했지만 **아무도 그것을 볼 수 없었다.**
쇼츠·롱폼·커뮤니티에는 삭제 라우트 자체가 없었고, 고객센터 문의는 본인 것만
보였다. 운영자가 서비스를 들여다보고 조치할 방법이 전혀 없는 상태였다.

081~084는 그 공백을 메우는 4개 커밋 중 첫 번째로, 관리자라는 개념 자체를
데이터·인증 계층에 만든다.

### 목표
"관리자로 로그인한다"가 가능해지는 데까지. 실제 운영 기능(신고 조회, 삭제 등)은
082에서 붙인다.

### 범위 (In Scope)
- 스키마 컬럼 5개 추가
- `role`/`suspended` 를 계정 레이어에 반영
- 관리자 전용 세션·가드·로그인 라우트
- 관리자 계정 provisioning CLI

### 범위 밖 (Out of Scope)
- 관리자 전용 테이블 분리 — 유저는 한 명이 일반 계정이자 관리자일 수 있고,
  `reports.reporter_id` 등 기존 FK가 전부 `users(id)` 를 보고 있다. 테이블을
  나누면 조인이 두 갈래가 된다. `users.role` 한 컬럼이 이 규모에 맞다.
- 세분화된 권한(모더레이터/슈퍼관리자 등). 지금은 `user` / `admin` 둘뿐이다.

---

## 3. 구현 기능 · 변경 사항

### 기능 / 동작
- [x] `users.role`(기본 `'user'`), `users.suspended`(기본 `0`)
- [x] `reports.status`(기본 `'open'`), `support_inquiries.admin_reply` / `replied_at`
- [x] 공개 `Author` 에 `role` 이 실린다. `suspended` 는 실리지 않는다
      (`toPublicUser()` 가 `passwordHash` 와 함께 떨어뜨림)
- [x] `POST /api/admin/auth/login` — 관리자 계정만 통과
- [x] `POST /api/admin/auth/logout`, `GET /api/admin/auth/me`
- [x] 일반 로그인(`POST /api/auth/login`)에서 정지 계정은 403
- [x] `npm run create-admin -- <handle> <password> [name] [--promote]`

### 주요 변경 파일·경로
| 경로 | 변경 유형 | 설명 |
|------|-----------|------|
| `BackendServer/src/db/client.ts` | 수정 | `ensureColumn` 5개 추가 |
| `BackendServer/src/types/index.ts` | 수정 | `UserRole`, `AdminUser`, `AdminReport`, `AdminStats`, `Author.role` |
| `BackendServer/src/auth/accounts.ts` | 수정 | `role`/`suspended` 조회, `createAccount({role})`, `setAccountRole` |
| `BackendServer/src/auth/adminSession.ts` | 추가 | `vidshare_admin_sid` 쿠키 읽기/쓰기/삭제 |
| `BackendServer/src/auth/requireAdmin.ts` | 추가 | 관리자 라우트 진입 가드 |
| `BackendServer/src/routes/admin/auth.ts` | 추가 | login/logout/me |
| `BackendServer/src/routes/auth.ts` | 수정 | 정지 계정 로그인 403 |
| `BackendServer/src/data/store.ts` | 수정 | 모든 `Author` 생성 지점 SELECT 에 `role` 추가 |
| `BackendServer/src/data/seedData.ts` | 수정 | 시드 계정을 전부 `role: "user"` 로 |
| `BackendServer/scripts/create-admin.ts` | 추가 | 관리자 계정 생성/승격 CLI |
| `BackendServer/tests/admin-auth.test.ts` | 추가 | 12건 |

### 데이터·API
```
POST   /api/admin/auth/login    { handle, password } → Author(role=admin)
POST   /api/admin/auth/logout
GET    /api/admin/auth/me       → Author
```

---

## 4. 기타

### 검증 방법
```bash
cd BackendServer
npm run typecheck   # 통과
npm test            # 95/95 통과 (기존 83 + 신규 12)
```

### 트레이드오프 · 결정 이유
- **쿠키 이름 분리 (`vidshare_admin_sid`)**: 개발 중에는 사용자 사이트(3000)와
  콘솔(3200)이 같은 `localhost` 라 쿠키 도메인이 겹친다. 이름이 같으면 한쪽에
  로그인할 때마다 다른 쪽이 튕긴다. 세션 **테이블**은 그대로 공유하므로
  (`sid` 문자열은 쿠키 이름과 무관) 로직 중복은 없고 이름만 다르다.
- **`requireAdmin` 실패를 401 하나로 통일**: 비로그인·일반 유저·정지된 관리자를
  구분해서 알려주면, 핸들을 넣어 보며 "이 계정이 관리자인가"를 떠볼 수 있다.
  로그인 실패 메시지도 같은 이유로 한 문장으로 통일했다.
- **정지는 "그 시점에 세션을 지운다"**: 매 요청마다 `suspended` 를 다시 확인하면
  모든 인증 경로에 조회가 하나씩 붙는다. 정지 시점에 `sessions` 를 한 번
  비우고, 재로그인을 403으로 막는 편이 이 규모에서 훨씬 싸다.
- **관리자를 시드하지 않음**: 시드에 넣으면 비밀번호가 소스에 박힌다.
  `create-admin` 스크립트로 각 환경에서 직접 만들게 했다.

### 리스크 · 알려진 이슈
- `create-admin` 은 로컬에서 DB 파일에 직접 붙는다. 원격 서버라면 그 서버에
  들어가서 실행해야 한다(원격 provisioning API는 만들지 않았다 — 그런 API가
  있는 것 자체가 공격면이다).
- `--promote` 로 승격한 계정은 **비밀번호가 그대로**다. 일반 유저로 쓰던 계정을
  올릴 때는 비밀번호를 먼저 바꾸는 편이 낫다.

### 후속 작업
- [x] 082 — 관리자 API (신고·유저·콘텐츠·고객센터)
- [ ] 관리자 활동 감사 로그(누가 무엇을 지웠는지)

### 참고 링크
- [075 — 신고·차단](./075-report-block.md) — 이번에 조회 경로가 생긴 신고의 원본 구현
- [082 — 관리자 API](./082-admin-api.md)
- [로드맵](../features/roadmap.md)

---

## 작성 체크리스트

- [x] 문서 번호·파일명 규칙 준수
- [x] 인덱스 표 업데이트 (`commits/README.md`)
- [x] CHANGELOG 반영 여부 결정
- [x] Git 해시 기입 (TBD 해소)
- [x] 민감 정보(키, 비밀번호, 개인정보) 없음
