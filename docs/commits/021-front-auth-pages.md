# 021 — Front 로그인·회원가입 페이지

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `021` |
| **파일명** | `021-front-auth-pages.md` |
| **Git 커밋 (short)** | `b59de8d` |
| **날짜** | `2026-08-19` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
feat: 로그인·회원가입 페이지와 AuthProvider 추가
```

쿠키 포함 fetch로 `/api/auth` 를 호출한다. getServerSnapshot 은 고정 객체로 캐시한다.

상세 기록: docs/commits/021-front-auth-pages.md

## 범위

- `/login`, `/register`
- `lib/auth.ts`, `AuthContext`, `api.ts` credentials
- layout 에 AuthProvider
