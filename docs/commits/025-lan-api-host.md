# 025 — LAN 접속 시 호스트 IP로 API 호출

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `025` |
| **파일명** | `025-lan-api-host.md` |
| **Git 커밋 (short)** | `7496ff3` |
| **날짜** | `2026-08-20` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
fix: LAN IP로 접속하면 그 주소의 백엔드를 쓰게
```

브라우저가 localhost가 아니면 같은 호스트의 :4000 을 호출한다. Next는 시작 시 실제 LAN URL을 찍고, `next start` 도 0.0.0.0에 바인딩한다.

상세 기록: docs/commits/025-lan-api-host.md

## 범위

- `FrontServer/lib/api.ts`, `next.config.ts`, `package.json`, `.env.local.example`
- `README.md`
