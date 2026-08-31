# 080 — 서버 상태 캐싱 (React Query)

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `080` |
| **파일명** | `080-react-query.md` |
| **Git 커밋 (short)** | `c4e2ea2` |
| **Git 커밋 (full)** | `c4e2ea254bcbd7b5a826a7829cddb442834c092f` |
| **날짜** | `2026-09-01` |
| **작성자** | `Claude (pair)` |
| **브랜치** | `master` |
| **로드맵 항목** | Phase C — 서버 상태 캐싱 |

---

## 1. 커밋 내용

```
feat: 서버 상태 캐싱 도입 (React Query)

- @tanstack/react-query 설치, QueryProvider 로 앱 전역에 연결
- 목록성 fetch-on-mount 컴포넌트 5곳을 useQuery 로 전환
  (롱폼/커뮤니티/팔로잉피드/프로필/메시지 목록)
- 작성 폼 2곳에서 성공 시 해당 쿼리 invalidate
- 메시지 목록은 078의 WS 구독을 setQueryData 로 캐시에 직접 반영
```

---

## 2. 개요

### 배경
로드맵 Phase C 2순위. 지금까지는 컴포넌트마다 `useState` + `useEffect` 로
"마운트 시 1회 fetch"를 반복 구현했다. 같은 데이터를 보여주는 페이지를
다시 방문할 때마다 로딩 스피너부터 다시 보여주고, 캐시나 중복 요청 억제가
전혀 없었다.

### 목표
가장 자주 재방문되는 목록형 페이지에 React Query를 붙여 캐싱·중복 요청 억제·
로딩/에러 상태 관리를 통일된 방식으로 처리한다.

### 범위 (In Scope)
- `QueryProvider` 전역 도입 (`app/layout.tsx`)
- `LongformList`, `CommunityList`, `FollowingFeed`, `ProfilePageClient`,
  `MessagesPageClient` — 5개 목록 컴포넌트를 `useQuery` 로 전환
- `LongformForm`, `CommunityForm` — 작성 성공 시 목록 쿼리 invalidate
- `MessagesPageClient` — 078에서 만든 WS `onChatLine` 구독을 로컬 `useState`
  대신 `queryClient.setQueryData` 로 캐시에 직접 반영

### 범위 밖 (Out of Scope)
- `ShortsFeed`(`/`) — 좋아요/댓글 카운트를 로컬에서 낙관적으로 직접 변경하는
  로직과 스크롤·키보드 내비게이션이 `shorts` 배열의 정체성에 강하게 얽혀
  있어, 이번 범위에서는 회귀 위험 대비 이득이 크지 않다고 판단해 제외했다.
  후속 작업으로 남긴다.
- `notifications-store.ts` — 이미 `useSyncExternalStore` + SSE 기반의
  자체 캐싱/실시간 갱신 구조가 있고 077에서 검증됐다. React Query로 다시
  감쌀 이유가 없어 그대로 뒀다.
- 상세 페이지(`LongformDetail`, `CommunityDetail`, `MessageThread` 등)는
  목록만큼 재방문 빈도가 높지 않아 이번 1차 적용에서는 제외했다.

---

## 3. 구현 기능 · 변경 사항

### 기능 / 동작
- [x] `QueryProvider` — `staleTime: 30s`, `refetchOnWindowFocus: false`,
      `retry: 1` 기본값으로 전역 `QueryClient` 제공
- [x] `lib/query-keys.ts` — 쿼리 키를 한곳에 모아 오타·키 불일치 방지
- [x] 5개 목록 컴포넌트가 재방문 시 캐시된 데이터를 즉시 보여주고
      background에서 갱신(30초 이내 재방문은 네트워크 요청 없이 캐시만 사용)
- [x] 글 작성(롱폼/커뮤니티) 성공 시 목록 쿼리를 invalidate 해 캐시가
      새 글을 곧바로 반영
- [x] 메시지 목록의 WS 실시간 미리보기 갱신이 React Query 캐시를 통해 흐름
      (컴포넌트 로컬 state 이중 관리 제거)

### 주요 변경 파일·경로
| 경로 | 변경 유형 | 설명 |
|------|-----------|------|
| `FrontServer/context/QueryProvider.tsx` | 추가 | 전역 `QueryClientProvider` |
| `FrontServer/lib/query-keys.ts` | 추가 | 쿼리 키 상수 모음 |
| `FrontServer/app/layout.tsx` | 수정 | `QueryProvider` 를 `ThemeProvider`/`AuthProvider` 사이에 연결 |
| `FrontServer/components/longform/LongformList.tsx` | 수정 | `useState`+`useEffect` → `useQuery` |
| `FrontServer/components/longform/LongformForm.tsx` | 수정 | 등록 성공 시 `invalidateQueries(longform)` |
| `FrontServer/components/community/CommunityList.tsx` | 수정 | `useState`+`useEffect` → `useQuery` |
| `FrontServer/components/community/CommunityForm.tsx` | 수정 | 작성 성공 시 `invalidateQueries(community)` |
| `FrontServer/components/follows/FollowingFeed.tsx` | 수정 | `useQuery`, 비로그인 시 `enabled: false` |
| `FrontServer/components/profile/ProfilePageClient.tsx` | 수정 | 유저·쇼츠 조회 2건을 각각 `useQuery` |
| `FrontServer/components/messages/MessagesPageClient.tsx` | 수정 | `useQuery` + WS 구독을 `setQueryData` 로 연결 |
| `FrontServer/package.json` | 수정 | `@tanstack/react-query` 추가 |

### 데이터·API
해당 없음 (기존 REST 엔드포인트 그대로, 프론트 상태 관리 계층만 교체)

### UI/UX
- 목록 페이지를 벗어났다가 30초 안에 돌아오면 로딩 스피너 없이 캐시된
  내용이 즉시 보인다(백그라운드 갱신은 계속 일어남).
- 그 외 화면상 동작은 기존과 동일하게 유지했다(로딩/에러 문구, 빈 상태 UI 불변).

---

## 4. 기타

### 검증 방법
```bash
cd FrontServer
npx tsc --noEmit     # 통과
npm run lint          # 기존 경고 1건(무관) 외 통과
npm test              # 29/29 통과
npm run test:e2e      # 8/8 통과 — 커뮤니티 작성/메시지(WS) 시나리오가
                       # 이번 변경(CommunityList, MessagesPageClient)을
                       # 실제로 거쳐가는 회귀 테스트 역할을 했다
```

### 트레이드오프 · 결정 이유
- **전체 컴포넌트를 다 옮기지 않고 5곳만 선택**: "컴포넌트마다 중복 페치"
  문제가 가장 크게 체감되는 목록형·재방문 잦은 화면부터 옮기고, 낙관적
  업데이트가 로컬 state와 깊이 얽힌 `ShortsFeed` 는 별도 작업으로 분리하는
  쪽이 이번 세션에서 회귀 없이 안전하게 끝낼 수 있는 범위라고 판단했다.
  071(댓글 대댓글)·074(댓글 수정삭제) 등도 처음부터 전체를 다루지 않고
  단계적으로 넓혀온 이 저장소의 기존 패턴과 일치한다.
- **`staleTime: 30s`**: 개인 프로젝트 규모의 트래픽에서 "방금 나갔다 돌아온
  화면은 다시 로딩 스피너를 보여주지 않는다"는 체감 이득과 "글 작성 직후
  30초 안에는 목록에 없을 수 있다"는 단점을 저울질했다. 후자는 작성 폼에서
  `invalidateQueries` 로 명시적으로 해소했다.
- **`refetchOnWindowFocus: false`**: 개발 중 탭을 자주 전환하면서 매번
  재요청이 발생해 로그가 시끄러웠다. 실서비스라면 켜는 편이 낫지만, 지금
  규모에선 끄는 쪽이 실용적이라고 판단했다.

### 리스크 · 알려진 이슈
- `ShortsFeed`(메인 피드)는 아직 이전 방식(`useState`+`useEffect`) 그대로다
  — 로드맵에 남아 있던 "컴포넌트마다 중복 페치" 문제가 가장 큰 화면인
  만큼, 다음 기회에 낙관적 업데이트 방식까지 함께 설계해서 옮기는 게 낫다고
  본다.
- React Query Devtools는 설치하지 않았다(개인 프로젝트 규모에서 번들 크기
  대비 이득이 크지 않다고 판단). 필요해지면 devDependency로 추가하면 된다.

### 후속 작업
- [ ] `ShortsFeed` 를 React Query로 전환 (낙관적 좋아요/댓글 카운트 갱신 설계 필요)
- [ ] 상세 페이지(`LongformDetail`, `CommunityDetail`) 캐싱 여부 재검토

### 참고 링크
- [078 — 메시지 실시간화 (WebSocket)](./078-messages-realtime-ws.md) — 이번에 캐시로 옮긴 WS 구독의 원본 구현
- [로드맵](../features/roadmap.md)

---

## 작성 체크리스트

- [x] 문서 번호·파일명 규칙 준수
- [ ] 인덱스 표 업데이트 (`commits/README.md`)
- [ ] CHANGELOG 반영 여부 결정
- [x] Git 해시 기입 (TBD 해소)
- [x] 민감 정보(키, 비밀번호, 개인정보) 없음
