# 005 — 프로젝트 문서를 루트 docs/로 이동

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `005` |
| **파일명** | `005-move-docs-to-root.md` |
| **Git 커밋 (short)** | `5a64037` |
| **Git 커밋 (full)** | `5a6403735410888adb4175d113a51f9a521cd4ca` |
| **날짜** | `2026-08-14` |
| **작성자** | VidShare |
| **브랜치** | `master` |
| **관련 이슈/PR** | 없음 |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용 (Git 메시지 초안)

### 제목 (50~72자 권장)

```
docs: 프로젝트 문서를 루트 docs/로 이동
```

### 본문

```
FrontServer/docs를 vidshare/docs로 옮기고,
루트 docs를 추적할 수 있도록 Git 저장소 루트를 vidshare/로 올린다.

상세 기록: docs/commits/005-move-docs-to-root.md
```

---

## 2. 개요

### 배경
문서는 FrontServer 전용이 아니라 Front/Backend 공통 설계·이력이다.  
`FrontServer/docs`에 두면 프론트 전용처럼 보이고, Git 저장소도 `FrontServer/.git`에 있어 루트 파일을 추적할 수 없었다.

### 목표
- 문서는 `vidshare/docs/` 에서 관리한다
- Git 작업 트리는 `vidshare/` (FrontServer + BackendServer + docs)
- README 링크가 새 경로를 가리킨다

### 범위 (In Scope)
- `FrontServer/docs/` → `docs/` 이동
- 상대 경로·README 링크 수정
- Git 저장소 루트를 `FrontServer/` → `vidshare/` 로 이동
- 루트 `.gitignore` 추가

### 범위 밖 (Out of Scope)
- BackendServer 소스 최초 추적 (별도 커밋)
- UI / API 코드 변경

---

## 3. 구현 기능 · 변경 사항

### 기능 / 동작
- [x] `docs/` 를 프로젝트 루트로 이동
- [x] 루트·FrontServer README 링크 갱신
- [x] docs 내부 상대 경로 갱신
- [x] Git 루트를 `vidshare/` 로 이동

### 주요 변경 파일·경로
| 경로 | 변경 유형 | 설명 |
|------|-----------|------|
| `docs/**` | 이동 | `FrontServer/docs` → 루트 `docs` |
| `README.md` | 수정 | 트리·문서 표에 `docs/` 반영 |
| `FrontServer/README.md` | 수정 | `../docs/` 링크 |
| `.gitignore` | 추가 | 루트 무시 규칙 (`node_modules`, `.env`, `.next` 등) |
| `docs/commits/005-move-docs-to-root.md` | 추가 | 이 커밋 상세 |
| `docs/commits/README.md` | 수정 | 인덱스 005 행 |
| `docs/changelog/CHANGELOG.md` | 수정 | Unreleased 항목 |

### 데이터·API
해당 없음

### UI/UX
해당 없음

---

## 4. 기타

### 검증 방법
```bash
# 문서가 루트에 있는지
dir docs
dir FrontServer\docs

# Git 루트가 vidshare 인지
git rev-parse --show-toplevel
```

### 트레이드오프 · 결정 이유
루트 `docs/`를 커밋하려면 저장소 루트가 `vidshare/`여야 한다.  
`FrontServer/.git`을 유지하면 문서가 저장소 밖으로 빠진다.

### 리스크 · 알려진 이슈
- 기존 클론은 `FrontServer`를 루트로 보고 있을 수 있음. 이후에는 `vidshare/`에서 git 명령을 실행한다.
- BackendServer는 아직 이 저장소에 추가하지 않음.

### 후속 작업
- [x] Git 해시 기입 (`5a64037`)
- [ ] BackendServer 소스를 저장소에 추가할지 결정
- [ ] UI mock → API 연동

### 참고 링크
- [docs 가이드](../README.md)
- [CHANGELOG](../changelog/CHANGELOG.md)

---

## 작성 체크리스트

- [x] 문서 번호·파일명 규칙 준수
- [x] 인덱스 표 업데이트 (`commits/README.md`)
- [x] CHANGELOG 반영 여부 결정
- [x] Git 해시 기입 (`5a64037`)
- [x] 민감 정보(키, 비밀번호, 개인정보) 없음
