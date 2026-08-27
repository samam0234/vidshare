# 060 — SQLite 테이블 덤프 DataBaseColumn.md

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `060` |
| **파일명** | `060-sqlite-database-column-dump.md` |
| **Git 커밋 (short)** | `TBD` |
| **Git 커밋 (full)** | `TBD` |
| **날짜** | `2026-08-27` |
| **작성자** | `Grok` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
feat: SQLite 쓰기 시 DataBaseColumn.md 자동 덤프

테이블·컬럼·행을 BackendServer/data/DataBaseColumn.md 에 기록한다.
INSERT/UPDATE/DELETE 후 갱신. 파일은 gitignore.

상세: docs/commits/060-sqlite-database-column-dump.md
```

---

## 2. 개요

로컬 SQLite에 무엇이 들어 있는지 마크다운으로 바로 보게 한다.
데이터가 쌓일 때마다 파일이 따라가며, 저장소에는 올리지 않는다.

---

## 3. 구현 기능 · 변경 사항

### 기능 / 동작
- [x] 서버 기동 시 전체 테이블 덤프
- [x] `prepare().run` / `exec` 의 쓰기 SQL 이후 200ms 디바운스 갱신
- [x] `password_hash` 는 `(redacted)`
- [x] `DataBaseColumn.md` gitignore

### 주요 변경 파일·경로

| 경로 | 변경 유형 | 설명 |
|------|-----------|------|
| `BackendServer/src/db/dumpDoc.ts` | 추가 | 덤프·쓰기 가로채기 |
| `BackendServer/src/db/client.ts` | 수정 | init 후 훅 + 즉시 덤프 |
| `.gitignore`, `BackendServer/.gitignore` | 수정 | `data/DataBaseColumn.md` |
| `BackendServer/data/README.md` | 수정 | 파일 안내 |

---

## 4. 기타

### 검증
```bash
cd BackendServer && npx tsc --noEmit
```
서버 기동 후 `data/DataBaseColumn.md` 생성. 쇼츠 하나 만들면 해당 테이블 행이 늘어난다.

### 트레이드오프
- store 함수마다 호출하지 않고 DB 레이어에서 가로채 누락을 줄임.
- 긴 셀은 240자로 자름. 첨부 JSON이 잘릴 수 있음.
