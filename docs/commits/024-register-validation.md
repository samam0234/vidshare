# 024 — 회원가입 검증·비밀번호 확인

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `024` |
| **파일명** | `024-register-validation.md` |
| **Git 커밋 (short)** | `TBD` |
| **날짜** | `2026-08-20` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
feat: 회원가입 검증과 비밀번호 확인을 추가
```

가입 폼에 비밀번호 확인·필드 오류를 넣고, 핸들은 소문자로 저장한다. 로그인된 세션으로는 추가 가입을 막는다.

상세 기록: docs/commits/024-register-validation.md

## 범위

- `FrontServer/components/auth/RegisterForm.tsx`
- `BackendServer/src/routes/auth.ts`, `auth/accounts.ts`, `routes/users.ts`
