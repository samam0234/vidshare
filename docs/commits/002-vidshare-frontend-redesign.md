# 002 — VidShare 프론트엔드 리디자인 및 문서화

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `002` |
| **파일명** | `002-vidshare-frontend-redesign.md` |
| **Git 커밋 (short)** | `TBD` ← 커밋 후 갱신 |
| **Git 커밋 (full)** | `TBD` |
| **날짜** | 2026-08-14 |
| **작성자** | VidShare 리디자인 작업 |
| **브랜치** | `master` |
| **관련 이슈/PR** | 없음 (로컬 리디자인) |
| **관련 CHANGELOG** | `[0.2.0] - 2026-08-14` |

---

## 1. 커밋 내용

### 제목

```
feat: VidShare 쇼츠 플랫폼 프론트 리디자인 및 docs 추가
```

### 본문

```
기존 HTML 프로토타입 기능을 Next.js App Router로 통합.
쇼츠·프로필·업로드·메시지·알림·고객센터 UI와 mock 데이터,
프로젝트 문서(docs) 및 커밋 기록 템플릿을 추가한다.

상세: docs/commits/002-vidshare-frontend-redesign.md
```

---

## 2. 개요

### 배경
`oldplanHTML` 에 분리되어 있던 정적 HTML/CSS/JS 쇼츠 관련 화면을  
하나의 React/Next 앱으로 모으고, 다크 우선 숏폼 UX로 리디자인할 필요가 있었음.

### 목표
- 기존 6개 기능 영역(쇼츠, 라이브러리, 업로드, 메시지, 알림, 고객센터)을 라우트로 통합
- TypeScript + Tailwind 기반 유지보수 가능한 구조
- 실행·온보딩·이력 관리를 위한 README + docs 체계 확립
- ESLint/빌드 통과 상태로 개발 서버 실행 가능

### 범위 (In Scope)
- 프론트 UI 전 페이지
- mock 데이터·테마
- docs (architecture, features, changelog, security, commits + template)
- 루트 README 기능 소개·가이드

### 범위 밖 (Out of Scope)
- 백엔드 API / DB / 실인증
- 실파일 스토리지 업로드
- 기존 `oldplanHTML` 수정 (보존만)

---

## 3. 구현 기능 · 변경 사항

### 기능 / 동작
- [x] 쇼츠 피드: 스냅 스크롤, 좋아요/싫어요, 댓글 패널, 공유, ▲▼·키보드
- [x] 프로필: 탭(동영상/재생목록/좋아요), 정렬, 그리드
- [x] 업로드: 제목·내용·썸네일 미리보기
- [x] 메시지: 유저 목록, 텍스트·이미지 전송(로컬 상태)
- [x] 알림: 카테고리 필터, 숨김/뮤트/삭제 UI
- [x] 고객센터: FAQ 아코디언, 모두 열기/닫기
- [x] Navbar/Footer, 알림 팝업, 다크·라이트 테마
- [x] docs 폴더 및 커밋 상세 템플릿·가이드

### 주요 변경 파일·경로
| 경로 | 변경 유형 | 설명 |
|------|-----------|------|
| `app/**` | 수정/추가 | 페이지·globals·layout |
| `components/**` | 추가 | 도메인 UI |
| `context/ThemeContext.tsx` | 추가 | 테마 스토어 |
| `lib/mock-data.ts`, `lib/utils.ts` | 추가 | 데이터·유틸 |
| `types/index.ts` | 추가 | 도메인 타입 |
| `docs/**` | 추가 | 프로젝트 문서 |
| `README.md` | 수정 | 기능 소개·가이드 |
| `package.json` | 수정 | `lucide-react` 등 |

### 데이터·API
- 클라이언트 mock (`lib/mock-data.ts`)
- 샘플 영상: Google gtv sample mp4 URL
- 네트워크 API 없음

### UI/UX
- 다크 우선, 액센트 블루/핑크 그라데이션 로고
- 모바일 메뉴, 데스크톱 스크롤 네비
- 댓글 패널 슬라이드 인

### 품질 수정 (동일 작업 묶음)
- Theme: `useSyncExternalStore` 로 effect setState 린트 회피
- Navbar: 경로 변경 시 메뉴 닫기 (render-phase state adjust)
- ShortCard: 재생 상태 업데이트 비동기 처리

---

## 4. 기타

### 검증 방법
```bash
cd vidshare
npm install
npm run lint
npm run build
npm run dev
# http://localhost:3000 에서 각 라우트 수동 확인
```

### 트레이드오프 · 결정 이유
- 백엔드 없이 UI 완성도를 먼저 맞춤 → 학습·데모 속도 우선
- 문서를 코드와 같은 저장소에 두어 커밋 단위 인수인계 가능하게 함

### 리스크 · 알려진 이슈
- 새로고침 시 댓글·메시지·업로드 상태 초기화 (설계상)
- 포트 3000 중복 실행 시 dev 서버 충돌 가능
- 외부 샘플 영상 네트워크 의존

### 후속 작업
- [ ] 인증 + API + DB
- [ ] 실 영상 업로드 스토리지
- [ ] mock → API 교체
- [ ] 이 문서의 `TBD` 해시를 실제 커밋 해시로 갱신

### 참고 링크
- [루트 README](../../README.md)
- [아키텍처](../architecture/overview.md)
- [커밋 가이드](./README.md)
- [템플릿](./TEMPLATE.md)
