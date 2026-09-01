# 086 — Front/console Cloudflare Workers (OpenNext)

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `086` |
| **파일명** | `086-cloudflare-opennext-workers.md` |
| **Git 커밋 (short)** | `TBD` |
| **Git 커밋 (full)** | `TBD` |
| **날짜** | `2026-09-02` |
| **작성자** | `Grok` |
| **브랜치** | `master` |

---

## 1. 커밋 내용

```
feat: FrontServer·console 을 Cloudflare Workers 로 빌드·배포

OpenNext 어댑터. 백엔드는 Workers 에 올리지 않음.
```

---

## 2. 배포 URL (이 계정)

- Front: https://vidshare-front.limjinheng0120.workers.dev
- Console: https://vidshare-console.limjinheng0120.workers.dev

`NEXT_PUBLIC_API_URL` 은 **빌드 시점**에 박힌다. API 주소가 정해지면:

```powershell
$env:NEXT_PUBLIC_API_URL="https://api.example.com"
cd FrontServer; npm run deploy
cd ../console; npm run deploy
```

---

## 3. 변경

| 경로 | 설명 |
|------|------|
| `FrontServer/wrangler.jsonc` | Worker `vidshare-front` |
| `console/wrangler.jsonc` | Worker `vidshare-console` |
| `*/open-next.config.ts` | OpenNext Cloudflare 설정 |
| `FrontServer/public/_headers` | `/_next/static` 캐시 |
| Next | 16.3.1 → 16.3.3 (OpenNext peer) |
| `docs/deployment.md` | Workers URL · `npm run deploy` |

다시 빌드:

```powershell
cd FrontServer; npm run deploy
cd ../console; npm run deploy
```

`NEXT_PUBLIC_API_URL` 은 빌드 시점에 박힌다. API 터널 주소가 생기면 env 를 넣고 다시 `deploy`.
