# 085 — Cloudflare Tunnel 배포 준비

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `085` |
| **파일명** | `085-cloudflare-tunnel-prep.md` |
| **Git 커밋 (short)** | `TBD` |
| **Git 커밋 (full)** | `TBD` |
| **날짜** | `2026-09-02` |
| **작성자** | `Grok` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
feat: Cloudflare Tunnel 배포를 위한 쿠키·CORS·API URL 정리

백엔드를 Workers로 옮기지 않는다. SQLite·업로드·WS는 상시 Node + Tunnel.
```

---

## 2. 개요

배포 아티팩트(Railway+Vercel 권고)의 **제약**을 따른다. 호스트만 Cloudflare로 바꾼다.

- 백엔드 서버리스 금지
- 크로스 도메인 쿠키는 env로 설정
- 프로덕션 CORS는 화이트리스트만
- 프론트는 `NEXT_PUBLIC_API_URL` 을 최우선

---

## 3. 변경 파일

| 경로 | 설명 |
|------|------|
| `BackendServer/src/auth/cookieOptions.ts` | `COOKIE_DOMAIN` / `COOKIE_SAMESITE` |
| `BackendServer/src/app.ts` | production CORS 조임 |
| `FrontServer/lib/api.ts`, `console/lib/api.ts` | env 우선, LAN만 :4000 추정 |
| `cloudflare/config.template.yml` | Tunnel ingress 템플릿 |
| `docs/deployment.md` | Cloudflare 절차 |

---

## 4. 하지 않은 것

- Express를 Workers `fetch`로 교체
- SQLite → D1
- 실제 터널 생성 (계정 로그인 필요)

프론트/콘솔 OpenNext 배포는 086.
