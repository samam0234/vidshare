# 028 — 비회원은 열람만 가능

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `028` |
| **파일명** | `028-guest-read-only.md` |
| **Git 커밋 (short)** | `TBD` |
| **날짜** | `2026-08-20` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
fix: 비회원은 쇼츠·롱폼·커뮤니티 열람만 가능하게
```

업로드·메시지·알림·글쓰기·좋아요/댓글 작성은 로그인 후. 막힌 주소는 `/login?next=` 로 보낸다.

상세 기록: docs/commits/028-guest-read-only.md

## 범위

- `GuestRouteGuard`, `guest-routes.ts`, Navbar, LoginForm
- 쇼츠 액션, 롱폼/커뮤니티 작성 버튼, 프로필
