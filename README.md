# VidShare

숏폼(쇼츠) 영상 공유 플랫폼 **VidShare**의 Next.js 프론트엔드입니다.

기존 정적 HTML/CSS/JS 프로토타입(`../oldplanHTML`)을 **React + TypeScript + Tailwind CSS** 기반으로 리디자인·통합한 버전입니다.

> 현재는 **프론트엔드 데모**입니다. 백엔드 API·DB·실인증·실파일 저장은 포함하지 않으며, 데이터는 클라이언트 mock을 사용합니다.

---

## 목차

1. [소개](#소개)
2. [주요 기능](#주요-기능)
3. [기술 스택](#기술-스택)
4. [시작하기](#시작하기)
5. [페이지 가이드](#페이지-가이드)
6. [프로젝트 구조](#프로젝트-구조)
7. [기본 사용 가이드](#기본-사용-가이드)
8. [문서(docs)](#문서docs)
9. [한계 및 다음 단계](#한계-및-다음-단계)
10. [라이선스 / 표기](#라이선스--표기)

---

## 소개

VidShare는 YouTube Shorts / TikTok 스타일의 **세로 스크롤 숏폼 시청**을 중심으로, 프로필·업로드·메시지·알림·고객센터까지 한 앱에서 탐색할 수 있도록 만든 UI입니다.

| 구분 | 설명 |
|------|------|
| 목적 | 숏폼 플랫폼 UX 프로토타입 / 학습·데모 |
| 범위 | 프론트엔드 UI + 로컬 인터랙션 |
| 데이터 | `lib/mock-data.ts` 고정 mock |
| 기존 코드 | `../oldplanHTML` 에 HTML 예시 보관 |

---

## 주요 기능

### 쇼츠 피드 (`/`)
- 세로 **scroll-snap** 피드
- 좋아요 / 싫어요 (상호 배타 토글)
- 댓글 사이드 패널 열기·작성
- 공유(링크 복사 토스트)
- ▲▼ 버튼 및 **키보드 방향키** 이동
- 검색 쿼리(`?q=`) / 특정 쇼츠 포커스(`?id=`)
- 음소거 토글, 활성 카드 자동 재생

### 프로필 / 라이브러리 (`/profile/[id]`)
- 프로필 헤더, 팔로우·메시지(타인) / 업로드·설정(본인)
- 탭: 동영상 · 재생목록 · 좋아요
- 정렬: 최신 · 인기 · 오래된 순
- 영상 그리드 → 피드로 이동

### 업로드 (`/upload`)
- 제목·내용 실시간 미리보기
- 썸네일 이미지 선택 / 랜덤 그라데이션
- 업로드 완료 후 프로필로 이동 (데모)

### 메시지 (`/messages`)
- 대화 상대 목록
- 텍스트 전송, 이미지 첨부
- 프로필 링크

### 알림 (`/notifications`)
- 카테고리 탭 필터 (전체 / 댓글 / 멘션 / 좋아요 / 시스템 / 팔로워)
- 숨기기 · 받지 않기 · 삭제
- 헤더 알림 팝업과 동일 mock 연동

### 고객센터 (`/support`)
- 쇼츠 문제 해결 FAQ 아코디언
- 모두 열기 / 모두 닫기

### 공통
- 반응형 네비게이션 (검색, 다크/라이트 모드)
- 테마 localStorage 유지 (`vidshare-theme`)
- Footer 링크 (고객센터 등)

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) |
| UI | React 19, TypeScript |
| 스타일 | Tailwind CSS v4, CSS 변수 테마 |
| 아이콘 | lucide-react |
| 상태 | React state / context (Theme) |
| 데이터 | 클라이언트 mock |

---

## 시작하기

### 요구 사항

- **Node.js** 18 이상 권장 (개발 환경: v24 검증)
- **npm** 9 이상

### 설치

```bash
cd vidshare
npm install
```

### 개발 서버

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 엽니다.

> **포트가 사용 중일 때**  
> 이미 `next dev`가 떠 있으면 `Port 3000 is in use` 또는  
> `Another next dev server is already running` 이 표시됩니다.  
> 기존 터미널에서 `Ctrl+C`로 종료한 뒤 다시 실행하세요.

### 기타 명령

```bash
npm run build   # 프로덕션 빌드
npm run start   # 빌드 결과 실행
npm run lint    # ESLint
```

---

## 페이지 가이드

| 경로 | 설명 |
|------|------|
| `/` | 쇼츠 홈 피드 |
| `/profile/[id]` | 사용자 프로필 (`u-me`, `u1` 등 mock id) |
| `/upload` | 쇼츠 업로드 폼 |
| `/messages` | 메신저 |
| `/notifications` | 알림 전체 페이지 |
| `/support` | 고객센터 FAQ |

예: 내 프로필 → [http://localhost:3000/profile/u-me](http://localhost:3000/profile/u-me)

---

## 프로젝트 구조

```
vidshare/
├── app/                 # App Router 페이지·레이아웃
├── components/          # UI 컴포넌트 (layout, shorts, profile, …)
├── context/             # ThemeProvider 등
├── lib/                 # mock-data, utils
├── types/               # 공통 타입
├── docs/                # 상세 문서 (아키텍처, 커밋 기록 등)
├── public/              # 정적 자산
├── package.json
└── README.md            # 이 파일
```

상세 구조·설계는 [docs/architecture](./docs/architecture/) 를 참고하세요.

---

## 기본 사용 가이드

1. **쇼츠 시청**  
   홈에서 스크롤하거나 우측 ▲▼ / `↑` `↓` 키로 다음·이전 영상으로 이동합니다.
2. **좋아요·댓글**  
   카드 우측 버튼으로 반응합니다. 댓글은 패널에서 입력 후 등록합니다.
3. **프로필**  
   작성자 핸들(`@…`) 또는 헤더 **내 프로필**로 이동합니다.
4. **업로드**  
   제목 필수 → 미리보기 확인 → 업로드(데모 알림 후 프로필 이동).
5. **테마**  
   헤더 해/달 아이콘으로 다크·라이트 전환 (브라우저에 저장).
6. **알림·메시지**  
   헤더 아이콘 또는 메뉴에서 진입합니다. 데이터는 mock이며 새로고침 시 초기화됩니다.

---

## 문서(docs)

프로젝트 운영·이력·설계 문서는 **`docs/`** 폴더에 모아 두었습니다.

| 문서 | 내용 |
|------|------|
| [docs/README.md](./docs/README.md) | docs 이용 가이드 (먼저 읽기) |
| [docs/architecture](./docs/architecture/) | 아키텍처·폴더 역할 |
| [docs/features](./docs/features/) | 추가 기능 로드맵 |
| [docs/changelog](./docs/changelog/) | 수정·변경 이력 |
| [docs/security](./docs/security/) | 보안 고려사항 |
| [docs/commits](./docs/commits/) | 커밋 상세 기록 + 템플릿 |

---

## 한계 및 다음 단계

**현재 한계**
- 백엔드·DB 없음 → 새로고침 시 댓글/메시지/업로드 상태 초기화
- 실제 로그인·권한 없음
- 영상은 공개 sample URL 또는 그라데이션 플레이스홀더

**권장 다음 단계**
1. 인증 (로그인/회원가입)
2. API + DB (쇼츠 CRUD)
3. 파일 스토리지 (실제 영상·썸네일)
4. mock 제거 후 API 연동

자세한 로드맵: [docs/features/roadmap.md](./docs/features/roadmap.md)

---

## 라이선스 / 표기

- 데모·학습용 프로젝트입니다.
- © VidShare Corp. 표기는 UI 카피이며, 별도 상용 라이선스 고지는 포함하지 않습니다.
- 샘플 영상 URL은 Google 공개 sample 버킷을 사용합니다.
