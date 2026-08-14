# VidShare — FrontServer

숏폼(쇼츠) 영상 공유 플랫폼 **VidShare**의 **프론트엔드** 서버입니다.

- 프레임워크: **Next.js (App Router) + React + TypeScript + Tailwind CSS**
- 형제 서버: **[BackendServer](../BackendServer/)** (REST API, 포트 4000)
- 예전 HTML 참고: `../oldplanHTML`

> UI는 완성되어 있으며, 데이터는 아직 주로 **클라이언트 mock** (`lib/mock-data.ts`)을 사용합니다.  
> BackendServer 연동용 클라이언트는 `lib/api.ts` 에 준비되어 있습니다.

---

## 목차

1. [소개](#소개)
2. [주요 기능](#주요-기능)
3. [기술 스택](#기술-스택)
4. [시작하기](#시작하기)
5. [BackendServer 연동](#backendserver-연동)
6. [페이지 가이드](#페이지-가이드)
7. [프로젝트 구조](#프로젝트-구조)
8. [기본 사용 가이드](#기본-사용-가이드)
9. [문서(docs)](#문서docs)
10. [한계 및 다음 단계](#한계-및-다음-단계)

---

## 소개

| 구분 | 설명 |
|------|------|
| 폴더 | `FrontServer/` (구 `vidshare/`) |
| 목적 | 숏폼 플랫폼 UX / 데모 |
| 포트 | **3000** |
| 데이터 | mock + (준비) BackendServer API |

---

## 주요 기능

### 쇼츠 피드 (`/`)
- 세로 scroll-snap, 좋아요/싫어요, 댓글 패널, 공유
- ▲▼ 및 키보드 이동, 검색 `?q=`, 포커스 `?id=`

### 프로필 (`/profile/[id]`)
- 탭·정렬·그리드

### 업로드 (`/upload`)
- 제목·내용·썸네일 실시간 미리보기 (데모)

### 메시지 / 알림 / 고객센터
- 메신저, 알림 필터, FAQ 아코디언

### 공통
- Navbar / Footer, 다크·라이트 테마 (`localStorage`)

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) |
| UI | React 19, TypeScript |
| 스타일 | Tailwind CSS v4 |
| 아이콘 | lucide-react |
| API 클라이언트 | `lib/api.ts` → BackendServer |

---

## 시작하기

### 요구 사항
- Node.js 18+
- (권장) BackendServer 동시 실행

### 설치 · 실행

```bash
cd FrontServer
npm install
npm run dev
```

→ [http://localhost:3000](http://localhost:3000)

```bash
npm run build
npm run start
npm run lint
```

> 포트 3000이 사용 중이면 기존 `next dev`를 종료한 뒤 다시 실행하세요.

---

## BackendServer 연동

| 서버 | 경로 | 포트 |
|------|------|------|
| FrontServer | `../FrontServer` | 3000 |
| BackendServer | `../BackendServer` | 4000 |

1. BackendServer에서 `npm run dev`
2. FrontServer에 환경 변수 (선택):

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
```

예시는 `.env.local.example` 참고.

3. 코드에서 `import { api } from "@/lib/api"` 로 호출 (UI 전면 교체는 진행 예정)

백엔드 API 목록: [../BackendServer/README.md](../BackendServer/README.md)

---

## 페이지 가이드

| 경로 | 설명 |
|------|------|
| `/` | 쇼츠 홈 피드 |
| `/profile/[id]` | 프로필 (`u-me`, `u1` …) |
| `/upload` | 업로드 |
| `/messages` | 메신저 |
| `/notifications` | 알림 |
| `/support` | 고객센터 FAQ |

---

## 프로젝트 구조

```
FrontServer/
├── app/                 # 페이지·레이아웃
├── components/          # UI
├── context/             # ThemeProvider
├── lib/
│   ├── mock-data.ts     # 로컬 mock
│   ├── api.ts           # BackendServer 클라이언트
│   └── utils.ts
├── types/
├── docs/                # 상세 문서
└── README.md
```

저장소 루트 구조는 [../README.md](../README.md) 참고.

---

## 기본 사용 가이드

1. 홈에서 쇼츠 스크롤 / 방향키 이동  
2. 좋아요·댓글·공유  
3. 프로필·업로드·메시지·알림 메뉴 탐색  
4. 테마 토글 (헤더 아이콘)

---

## 문서(docs)

| 문서 | 내용 |
|------|------|
| [docs/README.md](./docs/README.md) | docs 가이드 |
| [docs/architecture](./docs/architecture/) | 아키텍처 |
| [docs/features](./docs/features/) | 로드맵 |
| [docs/changelog](./docs/changelog/) | 변경 이력 |
| [docs/security](./docs/security/) | 보안 |
| [docs/commits](./docs/commits/) | 커밋 상세 + 템플릿 |

---

## 한계 및 다음 단계

- mock → BackendServer API 전면 연동  
- 인증, DB, 실파일 업로드 (BackendServer 쪽 확장)

로드맵: [docs/features/roadmap.md](./docs/features/roadmap.md)
