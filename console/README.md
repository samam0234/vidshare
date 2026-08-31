# VidShare — Console (관리자)

VidShare 운영자용 Next.js 앱입니다. 사용자 사이트(`FrontServer`)와 **같은
BackendServer(:4000)** 를 보지만, `/api/admin/*` 만 호출하고 세션 쿠키 이름도
다릅니다.

| 앱 | 포트 | 세션 쿠키 |
|----|------|-----------|
| FrontServer (사용자) | 3000 | `vidshare_sid` |
| **console (관리자)** | **3200** | **`vidshare_admin_sid`** |

쿠키 이름이 달라서 같은 브라우저에서 두 사이트에 동시에 로그인해 있어도
서로 로그아웃시키지 않습니다.

---

## 시작하기

```bash
npm install
npm run dev      # http://localhost:3200
```

BackendServer가 먼저 떠 있어야 합니다.

### 관리자 계정

관리자는 시드에 없습니다. 백엔드 폴더에서 한 번 만드세요.

```bash
cd ../BackendServer
npm run create-admin -- myadmin mypassword123
```

### 환경 변수 (선택)

`.env.local` (예시는 `.env.local.example`):

```env
# 비우면 브라우저 주소의 호스트:4000 을 씁니다 (LAN IP 접속 포함).
NEXT_PUBLIC_API_URL=
```

---

## 화면

| 경로 | 하는 일 |
|------|---------|
| `/login` | 관리자 로그인 (여기만 비로그인 접근 가능) |
| `/` | 대시보드 — 미처리 신고·미답변 문의·정지 계정 등 지표 |
| `/reports` | 신고 조회, 조치함/반려 처리 |
| `/users` | 유저 검색, 계정 정지·해제 |
| `/content` | 쇼츠·롱폼·커뮤니티 삭제 |
| `/support` | 고객센터 문의 조회·답변 |

`/login` 을 제외한 모든 경로는 `AdminRouteGuard` 가 막습니다.

---

## 구조

```
console/
├── app/                  ← 라우트 (App Router)
├── components/
│   ├── admin/            ← 화면별 클라이언트 컴포넌트
│   ├── layout/           ← AdminNav, AdminRouteGuard
│   └── ui/Page.tsx       ← PageShell/PageHeader/Panel/ListState
├── context/AdminAuthContext.tsx   ← useSyncExternalStore 기반 세션
├── lib/
│   ├── api.ts            ← fetch 래퍼 (credentials: include)
│   ├── adminApi.ts       ← /api/admin/* 타입 있는 메서드
│   └── format.ts
└── types/index.ts        ← 콘솔이 쓰는 최소 타입
```

`types/index.ts` 와 `lib/api.ts` 는 FrontServer와 일부 겹칩니다. 앱 세 개가
공유 패키지를 둘 만한 규모가 아니라고 보고 **의도적으로 작은 중복을 허용**한
것입니다. `app/globals.css` 도 마찬가지로 복사본이며, 팔레트를 바꾸면 두 파일을
함께 고쳐야 합니다(파일 상단 주석 참고).

---

## 검증

```bash
npm run typecheck
npm run lint       # app/layout.tsx 폰트 경고 1건은 FrontServer와 동일한 기존 이슈
npm run build
```

콘솔에는 아직 자동화 테스트가 없습니다. API 계층은 BackendServer 테스트
(`tests/admin-*.test.ts`, 44건)가 검증합니다.

---

## 관련 문서

- [081 — 관리자 인증](../docs/commits/081-admin-auth.md)
- [082 — 관리자 API](../docs/commits/082-admin-api.md)
- [083 — 콘솔 뼈대](../docs/commits/083-console-scaffold.md)
- [084 — 콘솔 화면](../docs/commits/084-console-screens.md)
- [배포 가이드](../docs/deployment.md)
