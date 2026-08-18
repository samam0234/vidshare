# 020 — Backend 인메모리 인증·세션

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `020` |
| **파일명** | `020-backend-auth-session.md` |
| **Git 커밋 (short)** | `7cf452f` |
| **날짜** | `2026-08-19` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
feat: Backend 회원가입·로그인·세션 API 추가
```

bcrypt 해시 계정과 HttpOnly 세션 쿠키(`vidshare_sid`)를 넣는다. 테스트 계정 `demo` / `demo1234`.

상세 기록: docs/commits/020-backend-auth-session.md

## 범위

- `BackendServer/src/auth/*`, `routes/auth.ts`
- `users/me` 는 세션 사용자
- bcrypt, cookie-parser
