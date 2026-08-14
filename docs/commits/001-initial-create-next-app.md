# 001 — Create Next App 초기 스캐폴드

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `001` |
| **파일명** | `001-initial-create-next-app.md` |
| **Git 커밋 (short)** | `7dcb8d8` |
| **Git 커밋 (full)** | `7dcb8d85f45d41e163904735394eccef5878b179` |
| **날짜** | 2026-08-14 |
| **작성자** | create-next-app / 초기 생성 |
| **브랜치** | `master` |
| **관련 이슈/PR** | 없음 |
| **관련 CHANGELOG** | `[0.1.0] - 2026-08-14` |

---

## 1. 커밋 내용

### 제목

```
Initial commit from Create Next App
```

### 본문

Create Next App이 생성한 기본 Next.js + TypeScript + Tailwind + ESLint 프로젝트 골격.

---

## 2. 개요

### 배경
VidShare를 Next.js로 리디자인하기 전, 공식 도구로 앱 뼈대를 생성함.

### 목표
- App Router 기반 프로젝트 부트스트랩
- TypeScript, Tailwind CSS, ESLint 기본 설정

### 범위 (In Scope)
- Next.js 기본 페이지·설정 파일
- `package.json` 의존성 및 lockfile

### 범위 밖 (Out of Scope)
- VidShare 도메인 UI
- 비즈니스 로직·mock 데이터

---

## 3. 구현 기능 · 변경 사항

### 기능 / 동작
- [x] `npm run dev` 로 기본 Next 템플릿 실행 가능
- [x] TypeScript 경로 별칭 `@/*`
- [x] Tailwind v4 PostCSS 연동

### 주요 변경 파일·경로
| 경로 | 변경 유형 | 설명 |
|------|-----------|------|
| `app/` | 추가 | 기본 layout, page, globals |
| `package.json` | 추가 | next, react, tailwind 등 |
| `tsconfig.json` | 추가 | TS 설정 |
| `next.config.ts` | 추가 | Next 설정 |
| `eslint.config.mjs` | 추가 | ESLint |

### 데이터·API
해당 없음.

### UI/UX
Create Next App 기본 랜딩(배포/문서 링크) UI.

---

## 4. 기타

### 검증 방법
```bash
npm install
npm run dev
```

### 트레이드오프 · 결정 이유
- App Router + TS + Tailwind를 한 번에 고정해 이후 VidShare 작업 속도 확보.

### 리스크 · 알려진 이슈
- 템플릿 기본 문구·에셋은 이후 커밋에서 교체 예정.

### 후속 작업
- [x] VidShare 프론트 리디자인 (문서 002)

### 참고 링크
- [Next.js 문서](https://nextjs.org/docs)
