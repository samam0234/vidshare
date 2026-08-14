# 003 — FrontServer / BackendServer 폴더 분리

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `003` |
| **파일명** | `003-split-front-backend-servers.md` |
| **Git 커밋 (short)** | `5dccd96` |
| **Git 커밋 (full)** | `5dccd96fd54288c2271860fb8f8cacc969abf396` |
| **날짜** | 2026-08-14 |
| **작성자** | VidShare |
| **브랜치** | `master` |
| **관련 이슈/PR** | 없음 |
| **관련 CHANGELOG** | `[0.3.0] - 2026-08-14` |

---

## 1. 커밋 내용

### 제목

```
chore: FrontServer·BackendServer로 프론트/백엔드 분리
```

### 본문

```
기존 vidshare 프론트를 FrontServer로 이전하고,
Express 기반 BackendServer(REST, 인메모리)를 추가한다.
루트 README 및 FrontServer docs/api 스텁을 갱신한다.

상세: docs/commits/003-split-front-backend-servers.md
```

---

## 2. 개요

### 배경
프론트만 있던 구조를 확장하기 위해 UI와 API 서버를 물리적으로 분리할 필요가 있음.

### 목표
- `FrontServer` = Next.js UI
- `BackendServer` = Express API
- 연동 준비 (`lib/api.ts`, CORS, env)

### 범위 (In Scope)
- 폴더 분리 및 문서 갱신
- BackendServer 스캐폴드 + 도메인 REST
- Front API 클라이언트 스텁

### 범위 밖 (Out of Scope)
- UI 전면 API 전환
- DB / 실인증 / 파일 스토리지

---

## 3. 구현 기능 · 변경 사항

### 기능 / 동작
- [x] FrontServer (Next) 포트 3000
- [x] BackendServer (Express) 포트 4000
- [x] 쇼츠·댓글·유저·알림·메시지·FAQ API
- [x] CORS → localhost:3000
- [x] `lib/api.ts` 스텁

### 주요 경로
| 경로 | 설명 |
|------|------|
| `FrontServer/` | 구 vidshare 프론트 |
| `BackendServer/src/` | Express 앱 |
| `README.md` (루트) | 모노레포 가이드 |

---

## 4. 기타

### 검증
```bash
cd BackendServer && npm install && npm run dev
cd FrontServer && npm install && npm run dev
curl http://localhost:4000/api/health
```

### 후속
- [ ] UI mock → API 연동
- [x] 해시 갱신 (`5dccd96`)
- [x] 구 `vidshare/` 폴더 삭제
