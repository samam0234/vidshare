# 004 — FrontServer·BackendServer 를 vidshare 하위로 배치

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `004` |
| **파일명** | `004-nest-servers-under-vidshare.md` |
| **Git 커밋 (short)** | `dd0e585` |
| **Git 커밋 (full)** | `dd0e585` |
| **날짜** | 2026-08-14 |
| **작성자** | VidShare |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `[0.3.1] - 2026-08-14` |

---

## 1. 커밋 내용

### 제목

```
fix: FrontServer·BackendServer를 vidshare 폴더 하위로 배치
```

### 본문

```
의도는 vidshare 컨테이너 안에 FrontServer와 BackendServer를 두는 것이었음.
루트에 풀어 두었던 구조를 vidshare/ 아래로 이동하고 문서 경로를 수정한다.

상세: docs/commits/004-nest-servers-under-vidshare.md
```

---

## 2. 개요

### 배경
003에서 `vidshare` 이름을 FrontServer로 바꾸며 컨테이너 폴더가 사라진 상태였음.  
요청: **vidshare 폴더는 유지**하고 그 안에 Front/Backend 서버 폴더를 둔다.

### 목표
```
vidshare/
  FrontServer/
  BackendServer/
  README.md
```

### 범위
- 폴더 이동
- README·docs 경로 수정
- 의존성 재설치 확인

---

## 3. 구현 기능 · 변경 사항

- [x] `vidshare/FrontServer`, `vidshare/BackendServer` 배치
- [x] `vidshare/README.md` 구조도 수정
- [x] project 루트 README 포인터
- [x] Front/Backend README 실행 경로 `cd vidshare/...`

---

## 4. 기타

### 검증
```bash
cd vidshare/BackendServer && npm install && npm run dev
cd vidshare/FrontServer && npm install && npm run dev
```

### 후속
- [ ] UI mock → API 연동
- [x] 해시 갱신 (`dd0e585`)
