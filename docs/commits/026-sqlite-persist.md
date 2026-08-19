# 026 — Backend SQLite 영속화

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `026` |
| **파일명** | `026-sqlite-persist.md` |
| **Git 커밋 (short)** | `f8733fc` |
| **날짜** | `2026-08-20` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
feat: Backend를 SQLite로 영속화
```

계정·세션·쇼츠를 `data/vidshare.sqlite`에 저장한다. 파일이 비어 있으면 데모 데이터를 한 번만 시드한다. DB 파일은 git에 넣지 않는다.

상세 기록: docs/commits/026-sqlite-persist.md

## 범위

- `BackendServer/src/db/*`, `data/store.ts`, `data/seedData.ts`
- 인증·쇼츠·댓글·알림·메시지·FAQ 라우트
- `BackendServer/data/README.md` (테이블·시드 표)
- `better-sqlite3`
