# 107 — 업로드 화면: 쇼츠 기본 + 서브메뉴로 롱폼 업로드

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `107` |
| **파일명** | `107-upload-tabs.md` |
| **Git 커밋 (short)** | (이 커밋) |
| **날짜** | `2026-10-07` |
| **작성자** | `Claude` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` — Changed |

---

## 1. 요청

로그인한 유저가 상단 **업로드** 버튼을 누르면 기본은 쇼츠 업로드 화면이고, 서브메뉴에서 **롱폼 업로드**를 누르면
롱폼 업로드 화면으로 바뀌게 한다.

## 2. 변경

| 파일 | 내용 |
|------|------|
| `lib/upload-tabs.ts` (신규) | `parseUploadTab` (`?type=` → `shorts`/`longform`, 모르는 값·배열·빈 값은 쇼츠), `uploadHref`, `UPLOAD_TABS` |
| `components/upload/UploadTabs.tsx` (신규) | 상단 서브메뉴. 탭마다 주소가 달라 `Link`(replace) 로 전환 — 새로고침·공유·뒤로가기가 그대로 동작, `aria-current` 로 현재 탭 표시 |
| `app/upload/page.tsx` | `searchParams.type` 으로 `UploadForm`(기본) / `LongformForm` 을 고름 |
| `app/longform/write/page.tsx` | 예전 주소 → `/upload?type=longform` 으로 `redirect` (기존 링크·북마크 유지) |
| `components/longform/LongformList.tsx` | 등록 버튼·빈 목록·로그인 유도 링크를 새 주소로. 문구 "롱폼 등록" → "롱폼 업로드" |
| `components/longform/LongformForm.tsx` | 제목 문구 "롱폼 등록" → "롱폼 업로드" |

폼 자체(`UploadForm`, `LongformForm`)의 동작·API 는 바꾸지 않았다. 탭을 바꾸면 폼이 새로 뜨므로 입력 중이던 값은 초기화된다.

## 3. 설계 메모

- **상태를 컴포넌트가 아니라 URL 에 둠.** `/upload` 한 화면 안의 클라이언트 상태로 만들면 새로고침하면 쇼츠로 돌아가고
  "롱폼 업로드 링크"를 줄 수 없다. `?type=longform` 이면 롱폼 목록의 "롱폼 업로드" 버튼, 로그인 뒤 복귀(`next`), 새로고침이 모두 같은 탭으로 온다.
- **비회원**: `/upload` 는 이미 로그인 필요 경로라 `GuestRouteGuard` 가 `?type=longform` 까지 `next` 에 보존해 로그인 뒤 그 탭으로 돌아온다.
  `/longform/write` 도 redirect 후 같은 경로를 탄다.
- 탭 판정을 순수 함수로 빼서 단위 테스트가 가능하게 했다(저장소의 `lib/guest-routes.ts` 와 같은 방식).

## 4. 검증

| 항목 | 결과 |
|------|------|
| `npm run typecheck` | 통과 |
| `npm run lint` | 에러 0 (기존 `no-page-custom-font` 경고 1건) |
| `npm test` (프론트) | 39건 통과 (기존 32 + `upload-tabs` 7) |
| Playwright `e2e/upload.spec.ts` 3 시나리오 | 통과 — ① 업로드 버튼 → 쇼츠 기본 → 롱폼 탭 → 롱폼 화면 → 다시 쇼츠 ② `/longform/write` → 롱폼 탭 ③ 비회원이 `/upload?type=longform` → 로그인 `next` 보존 |
| 기존 `e2e/guest.spec.ts` | 통과 |
| 화면 | 데스크톱·모바일 폭 캡처로 서브메뉴 배치·강조 확인 |

> 이 PC 의 로컬 `vidshare` DB 계정 비밀번호가 `BackendServer/.env` 와 맞지 않아(인증 실패) E2E 는 임시 테스트 클러스터(포트 5433)로 돌렸다.
> 로컬 DB 계정 정리(`setup-postgres-d.ps1`)는 별도로 필요하다.

## 5. 알려진 한계

- 탭 전환 시 입력 중인 값이 사라진다(폼이 별개 컴포넌트).
- 롱폼 폼은 `max-w-2xl`, 쇼츠 폼은 `max-w-5xl` 로 폭이 달라 서브메뉴와 폼의 좌우 정렬이 완전히 맞지는 않는다.
