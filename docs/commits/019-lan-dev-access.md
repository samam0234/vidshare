# 019 — 개발 서버 LAN 접속

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `019` |
| **파일명** | `019-lan-dev-access.md` |
| **Git 커밋 (short)** | `fa96be5` |
| **날짜** | `2026-08-15` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
fix: 프론트·백엔드 개발 서버를 LAN에서도 접속되게
```

Next를 0.0.0.0에 바인딩하고 allowedDevOrigins에 현재 LAN IP를 넣는다. Backend도 0.0.0.0 + 사설망 CORS, API URL은 접속 호스트:4000을 쓴다.

상세 기록: docs/commits/019-lan-dev-access.md

## 범위

- FrontServer next.config, package.json, lib/api.ts, .env.local.example
- BackendServer listen/CORS, .env.example
