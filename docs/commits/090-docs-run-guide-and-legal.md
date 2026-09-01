# 090 — 실행 가이드와 법적 페이지 문서 전면 갱신

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `090` |
| **파일명** | `090-docs-run-guide-and-legal.md` |
| **Git 커밋 (short)** | `TBD` |
| **Git 커밋 (full)** | `TBD` |
| **날짜** | `2026-09-02` |
| **작성자** | `Grok` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
docs: 실행 가이드와 법적 페이지·현재 기능 문서 전면 갱신

087~089 페이지를 실행 방법·README·아키텍처·로드맵·계획서에 빠짐없이 반영.
FrontServer README의 mock 안내를 제거한다.
```

---

## 2. 개요

087~089 구현 때 CHANGELOG·아키텍처 라우트 표·커밋 MD만 있었다.
루트/`FrontServer` README, 로드맵 완료 목록, `plan.md` 기능 표, 보안 노트,
실행 순서는 예전(mock, 약관 없음) 그대로였다.

---

## 3. 변경 파일

| 경로 | 설명 |
|------|------|
| `README.md` | 빠른 시작: 세 서버, 약관 URL, env, 테스트, Workers deploy |
| `FrontServer/README.md` | 전면 교체. 페이지 표에 terms/privacy/business |
| `BackendServer/README.md` | CORS·쿠키 env |
| `console/README.md` | API URL·deploy |
| `docs/architecture/overview.md` | 완료 표·라우트 맵·게스트 |
| `docs/features/roadmap.md` | 법적 페이지, 다음 작업 |
| `plan.md` | 기능 표 현재 상태 |
| `docs/security/security-notes.md` | 법적 고지 |
