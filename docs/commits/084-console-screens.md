# 084 — 관리자 콘솔 화면 (신고·유저·콘텐츠·고객센터)

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `084` |
| **파일명** | `084-console-screens.md` |
| **Git 커밋 (short)** | `082f724` |
| **Git 커밋 (full)** | `082f72408272cc2d8fd55b560e5ebc758facb128` |
| **날짜** | `2026-09-01` |
| **작성자** | `Claude (pair)` |
| **브랜치** | `master` |
| **로드맵 항목** | 운영 — 관리자 콘솔 (4/4) |

---

## 1. 커밋 내용

```
feat: 관리자 콘솔 — 신고·유저·콘텐츠·고객센터 화면

- /reports: 상태별 필터, 조치함/반려/되돌리기
- /users: 핸들·이름 검색, 정지·해제
- /content: 쇼츠·롱폼·커뮤니티 탭, 확인 후 삭제
- /support: 미답변 필터, 답변 작성·수정
- adminApi 에 전 엔드포인트 래퍼, 공용 Page/ListState UI 조각
```

---

## 2. 개요

### 배경
083의 뼈대에 실제 운영 화면 네 개를 붙여 081~084 묶음을 마무리한다.

### 범위 (In Scope)
- 신고·유저·콘텐츠·고객센터 화면
- 사용자 쪽 고객센터에 관리자 답변 표시 (답변 흐름이 실제로 닫히게)

### 범위 밖 (Out of Scope)
- 신고 항목에서 대상 콘텐츠로 바로 이동/삭제. 지금은 `targetId` 를 보고
  콘텐츠 탭에서 찾는다 — 대상 종류가 4가지(쇼츠·댓글·커뮤니티·유저)라
  연결을 제대로 하려면 화면마다 딥링크가 필요해서 이번엔 남겼다.
- 페이지네이션·정렬 UI.

---

## 3. 구현 기능 · 변경 사항

### 기능 / 동작
- [x] **신고**: 미처리/조치함/반려/전체 필터. 미처리 항목엔 `조치함`·`반려`,
      처리된 항목엔 `되돌리기` 버튼
- [x] **유저**: 핸들·이름 검색, 정지/해제(확인 창). 관리자 행에는 정지 버튼 대신
      "관리자는 정지할 수 없음" 문구 — 서버가 400으로 막는 것을 화면에서도 미리 알림
- [x] **콘텐츠**: 쇼츠/롱폼/커뮤니티 탭, 항목별 삭제(확인 창)
- [x] **고객센터**: 미답변만 보기 토글, 답변 작성·수정
- [x] 사용자 `/support/:id` 에 답변 블록, 목록에 "답변 완료" 배지

### 주요 변경 파일·경로
| 경로 | 변경 유형 | 설명 |
|------|-----------|------|
| `console/components/admin/ReportsClient.tsx` | 추가 | 신고 |
| `console/components/admin/UsersClient.tsx` | 추가 | 유저 |
| `console/components/admin/ContentClient.tsx` | 추가 | 콘텐츠 3탭 |
| `console/components/admin/SupportClient.tsx` | 추가 | 문의 답변 |
| `console/app/{reports,users,content,support}/page.tsx` | 추가 | 라우트 |
| `FrontServer/types/content.ts` | 수정 | `SupportInquiry.adminReply`/`repliedAt` |
| `FrontServer/components/support/InquiryDetail.tsx` | 수정 | 답변 블록 |
| `FrontServer/components/support/SupportContact.tsx` | 수정 | "답변 완료" 배지 |

### UI/UX
- 삭제·정지처럼 되돌릴 수 없는 조작은 전부 `confirm` 을 거친다.
- 각 화면 하단에 그 조작의 부작용을 한 줄로 적었다(예: 쇼츠를 지우면 댓글도
  사라지지만 업로드 원본은 남는다).

---

## 4. 기타

### 검증 방법
```bash
cd console
npm run typecheck && npm run lint && npm run build   # 통과

cd ../FrontServer
npx tsc --noEmit && npm run lint    # 통과
npm test          # 29/29 통과
npm run test:e2e  # 8/8 통과 (관리자 작업으로 인한 회귀 없음)

cd ../BackendServer
npm test          # 127/127 통과
```

수동 확인 흐름:
1. `cd BackendServer && npm run create-admin -- root <비밀번호>`
2. 콘솔(3200) 로그인 → 대시보드 지표 확인
3. 사용자 앱(3000)에서 신고 접수 → 콘솔 `/reports` 에서 조회·처리
4. `/users` 에서 정지 → 해당 계정으로 재로그인 시 403 확인
5. `/content` 에서 쇼츠 삭제 → 사용자 앱 피드에서 사라짐 확인
6. 사용자 앱에서 문의 작성 → 콘솔에서 답변 → 알림 도착 + `/support/:id` 에 답변 표시

### 트레이드오프 · 결정 이유
- **목록 로딩을 `queueMicrotask` 로 감쌈**: `load()` 가 `setLoading(true)` 를
  동기로 부르는 탓에 `react-hooks/set-state-in-effect` 에 걸린다. 저장소가
  이미 같은 상황에서 `queueMicrotask` 로 통일해 온 관례(CHANGELOG "Fixed")를
  그대로 따랐다.
- **필터가 걸린 목록은 조작 후 재조회, 전체 목록은 로컬 갱신**: 필터 조건에서
  벗어나는 항목(예: 미처리 → 조치함)은 목록에서 빠져야 해서 다시 읽고,
  전체 보기에서는 응답만 반영해 깜빡임을 줄였다.

### 리스크 · 알려진 이슈
- 콘솔 화면에 자동화 테스트가 없다.
- 신고 대상으로 바로 이동하는 링크가 없어, 대상 찾기는 아직 수동이다.

### 후속 작업
- [ ] 신고 → 대상 콘텐츠 딥링크
- [ ] 목록 페이지네이션
- [ ] 콘솔 E2E

### 참고 링크
- [083 — 관리자 콘솔 뼈대](./083-console-scaffold.md)
- [배포 가이드](../deployment.md)

---

## 작성 체크리스트

- [x] 문서 번호·파일명 규칙 준수
- [x] 인덱스 표 업데이트 (`commits/README.md`)
- [x] CHANGELOG 반영 여부 결정
- [x] Git 해시 기입 (TBD 해소)
- [x] 민감 정보(키, 비밀번호, 개인정보) 없음
