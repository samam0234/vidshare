# 006 — BackendServer 소스를 저장소에 추가

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `006` |
| **파일명** | `006-track-backend-server.md` |
| **Git 커밋 (short)** | `c0ee728` |
| **Git 커밋 (full)** | `c0ee728ab0315d9083f698400163bbf20527c934` |
| **날짜** | `2026-08-14` |
| **작성자** | VidShare |
| **브랜치** | `master` |
| **관련 이슈/PR** | 없음 |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용 (Git 메시지 초안)

### 제목 (50~72자 권장)

```
chore: BackendServer 소스를 저장소에 추가
```

### 본문

```
003에서 만든 Express API가 FrontServer/.git 밖에 있어 추적되지 않았다.
vidshare 루트에서 BackendServer 소스를 추가한다.

상세 기록: docs/commits/006-track-backend-server.md
```

---

## 2. 개요

### 배경
005에서 Git 루트를 `vidshare/`로 올렸지만, BackendServer는 아직 untracked였다.  
디스크에는 이미 Express REST API가 있고, 저장소에만 없었다.

### 목표
- `BackendServer/` 소스가 `vidshare` 저장소에 포함된다
- `.env`, `node_modules/` 는 커밋하지 않는다

### 범위 (In Scope)
- BackendServer 소스·설정·README·lockfile 추가
- 커밋 상세 006 + CHANGELOG 요약

### 범위 밖 (Out of Scope)
- UI mock → API 연동
- DB / 실인증 / 파일 스토리지
- 백엔드 코드 변경

---

## 3. 구현 기능 · 변경 사항

### 기능 / 동작
- [x] BackendServer 소스 추적
- [x] `.env` / `node_modules` 제외 확인

### 주요 변경 파일·경로
| 경로 | 변경 유형 | 설명 |
|------|-----------|------|
| `BackendServer/src/` | 추가 | Express 앱, 라우트, 인메모리 store |
| `BackendServer/package.json` | 추가 | 의존성·스크립트 |
| `BackendServer/README.md` | 추가 | API 가이드 |
| `BackendServer/.env.example` | 추가 | PORT, CORS_ORIGIN 예시 |
| `docs/commits/006-track-backend-server.md` | 추가 | 이 커밋 상세 |
| `docs/commits/README.md` | 수정 | 인덱스 006 행 |
| `docs/changelog/CHANGELOG.md` | 수정 | Unreleased 항목 |

### 데이터·API
이미 구현된 인메모리 REST (쇼츠·댓글·유저·알림·메시지·FAQ·헬스). 이번 커밋에서 API를 바꾸지 않음.

### UI/UX
해당 없음

---

## 4. 기타

### 검증 방법
```bash
git check-ignore -v BackendServer/.env BackendServer/node_modules
git ls-files BackendServer
```

### 트레이드오프 · 결정 이유
백엔드는 003 때 만들었지만 Git이 FrontServer 안에 있어 빠졌다. 코드 변경 없이 추적만 추가한다.

### 리스크 · 알려진 이슈
- `.env` 가 ignore 되는지 확인 필요 (확인함)
- 인메모리 store라 서버 재시작 시 데이터 초기화 (기존과 동일)

### 후속 작업
- [ ] UI mock → API 연동
- [x] Git 해시 기입 (커밋 후 같은 커밋에 반영)

### 참고 링크
- [BackendServer README](../../BackendServer/README.md)
- [커밋 003](./003-split-front-backend-servers.md)

---

## 작성 체크리스트

- [x] 문서 번호·파일명 규칙 준수
- [x] 인덱스 표 업데이트 (`commits/README.md`)
- [x] CHANGELOG 반영 여부 결정
- [x] Git 해시 기입 (`c0ee728`)
- [x] 민감 정보(키, 비밀번호, 개인정보) 없음
